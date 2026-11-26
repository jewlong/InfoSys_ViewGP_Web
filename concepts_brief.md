# InfoSys_ViewGP_Web 人性化升級與設計系統程式修改規格書 (AIS-47 / AIS-48)

* **Author:** Antigravity (EGM Brainstorm Engine)
* **Date:** 2026-11-26

## Overview

本規格書依據 [AIS-47_ViewGP_人性化升級_使用者流程與互動設計.md](file:///d:/Dropbox/Infosystem/InfoSys_ViewGP_Web/Code/InfoSys_ViewGP_Web/docs/ViewGP_Web/AIS-47_ViewGP_人性化升級_使用者流程與互動設計.md) 與 [AIS-48_DESIGN_SYSTEM.md](file:///d:/Dropbox/Infosystem/InfoSys_ViewGP_Web/Code/InfoSys_ViewGP_Web/docs/ViewGP_Web/AIS-48_DESIGN_SYSTEM.md) 制定 `InfoSys_ViewGP_Web` 的具體程式修改規格。目標對象為廠務／設備工程師、系統整合商 (SI)、現場操作員與維護人員。

所有修改遵循兩項強制邊界原則：
1. **既有程式行為與自動化測試優先原則**：凡 `AIS-47` 或 `AIS-48` 與目前程式碼既有行為、工控安全防護或 Playwright 測試斷言衝突之處，一律以目前程式既有行為為主，不破壞既有功能，新增功能皆採向下相容或可選啟用 (Opt-In) 方式擴充。
2. **工控領域純淨原則**：全面剔除 `AIS-47` 中誤植之金融／台股／券商下單／保證獲利免責聲明文字，所有狀態揭露皆聚焦於工業 HMI 設備連線新鮮度、未儲存變更與警報同步狀態。

---

## Analysis

經由 6 個 Goldfish 審查視角（`egm-design`、`egm-codebase-details`、`egm-zoom-out`、`egm-comprehension`、`egm-implementation-readiness`、`egm-structural`）交叉壓力測試後，確立以下架構分析與程式修改規格：

### 1. 衝突解決與既有行為保護分析

| 議題項目 | AIS-47 / AIS-48 原始要求 | 現有程式碼與測試約束 | 最終規格決策（以現有程式為主） |
| :--- | :--- | :--- | :--- |
| **F3 對話盒 (Popup) 交易流程** | 對話盒內設值先暫存本地，點「確定」才寫入變數，「取消」捨棄。 | `useSimulation.ts` 與 `tests/screens-browser.mjs` 要求 Popup 內按鈕預設立即修改變數，且支援 `momentary` (JOG 點動)。 | `Screen` 新增可選欄位 `popupCommitMode?: "immediate" \| "transactional"`（**預設 `"immediate"`**，保留現有即時寫入行為）。僅在設為 `"transactional"` 時啟用 `popupDrafts` 暫存與底部「確定／取消」提交列；且 `momentary` 點動按鈕永遠即時觸發不暫存。 |
| **F3 對話盒模態／非模態** | 支援模態與非模態切換並標示背景可否操作。 | `CanvasEditor.tsx` 與 `tests/screens-browser.mjs` 驗證 Popup 開啟時背景 `design-canvas.inert === true`。 | `Screen` 新增可選欄位 `popupModal?: boolean`（**預設 `true`**，維持背景 `inert` 鎖定）。僅當明確設為 `false` 時允許點擊背景畫面。 |
| **F4 自動儲存與初始狀態** | 自動儲存預設開啟，閒置 2 秒寫入 SQLite。 | `tests/browser.mjs` 與 `tests/management.mjs` 驗證初始或匯入專案為 `revision === 0`（「尚未儲存」），由專案設定勾選「啟用自動儲存」。 | 維持 `newProject()` / `demoProject()` 初始 `revision === 0` 不自動偷寫入後端 SQLite；新增 **IndexedDB 本機離線草稿 (`offlineDraftStore.ts`)** 在背景自動保護未儲存修改，並於新「專案精靈」建立專案時預設勾選 `autoSave: true`。 |
| **F6 離線待送佇列** | 裝置離線時設值變更進入佇列，重連後自動續傳。 | `useSimulation.ts` 與 `server/CommunicationRuntime.cs` 規定設備斷線時停用寫入元件，且寫入失敗絕不自動重送。 | **嚴格維持現有 Modbus 斷線停用寫入與不自動重送控制指令之安全機制**。狀態列之「待送 N 筆」與離線佇列續傳僅適用於 **警報歷史同步佇列 (`useAlarmPersistence.ts`)** 與 **本機離線專案草稿同步**。 |
| **AIS-48 設計系統與主題** | `src/styles.css` 定義 `--ds-*` Token（含 8px/9px 微字），採用淺色人性化主題。 | `App.tsx` 預設使用 `.engineering-shell` (`src/engineering.css`)，且既有測試依賴現有 DOM 與樣式結構。 | 於 `src/styles.css` `:root` 補齊完整 `--ds-*` CSS Custom Properties，但**預設保留 `.engineering-shell` 工程工作台主題與現有合理字級 (≥11px)**，於「檢視」選單提供切換至人性化主題之選項。 |

---

### 2. 資料模型與雙端驗證修改規格 (`src/model.ts` & `server/ProjectValidator.cs`)

為確保前後端契約測試（`npm test` 與 `npm run test:server`）100% 一致，所有新增欄位均為 `schemaVersion: 1` 的**可選欄位 (Optional Fields)**：

#### 2.1 前端型別擴充 (`src/model.ts`)
```ts
// 1. Action 新增 "confirmPopup"（用於交易式對話盒內之「確定」按鈕動作）
export type Action =
  | "toggle"
  | "set"
  | "increment"
  | "screen"
  | "reset"
  | "momentary"
  | "previousScreen"
  | "openDialog"
  | "closeDialog"
  | "popup"
  | "closePopup"
  | "confirmPopup";

// 2. Screen 新增可選對話盒交易與模態屬性
export type Screen = {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  type?: "screen" | "dialog" | "normal" | "popup";
  parentScreenId?: string;
  inheritsScreenId?: string;
  popupCommitMode?: "immediate" | "transactional";
  popupModal?: boolean;
  elements: Element[];
};

// 3. Project 新增可選自動儲存間隔、巢狀上限與警報留存策略
export type AlarmRetentionPolicy = {
  maxDays?: number;     // 1 ~ 3650
  maxRecords?: number;  // 100 ~ 100000
  autoPrune?: boolean;
};

export type Project = {
  devices?: CommunicationDevice[];
  alarmAreas?: AlarmArea[];
  alarmTicker?: AlarmTickerSettings;
  alarmRetention?: AlarmRetentionPolicy;
  assets?: ImageAsset[];
  autoSave?: boolean;
  autoSaveIntervalMs?: number; // 1000 ~ 60000, 預設 2000
  maxPopupDepth?: number;      // 1 ~ 16, 預設 16
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  startScreenId: string;
  screens: Screen[];
  variables: Variable[];
};
```

#### 2.2 後端驗證器同步 (`server/ProjectValidator.cs`)
* `Actions` 集合加入 `"confirmPopup"`。
* `IsValid(JsonElement project)` 新增對可選欄位之型別與範圍檢查：
  * `autoSaveIntervalMs`：整數 `1000..60000`。
  * `maxPopupDepth`：整數 `1..16`。
  * `alarmRetention`：物件，含可選 `maxDays` (`1..3650`)、`maxRecords` (`100..100000`)、`autoPrune` (`bool`)。
  * `screen.popupCommitMode`：`"immediate"` 或 `"transactional"`。
  * `screen.popupModal`：`bool`。

---

### 3. 前端模組修改規格 (Frontend Modules)

#### 模組 A：安全儲存、IndexedDB 離線草稿與版本比對 (對應 AIS-47 F4)
1. **新增 `src/services/offlineDraftStore.ts`**：
   * 使用原生 IndexedDB（資料庫 `viewx-offline-store`、Object Store `drafts`），若執行環境無 `indexedDB`（如 Node.js 單元測試）則自動退回記憶體 Map。
   * 介面：`saveOfflineDraft(project: Project, revision: number)`、`getOfflineDraft(projectId: string)`、`clearOfflineDraft(projectId: string)`。
2. **修改 `src/hooks/useProjectPersistence.ts`**：
   * 自動儲存計時器使用 `project.autoSaveIntervalMs ?? 2000` 毫秒。
   * 當 `dirty === true` 時，於編輯停止 1 秒後自動寫入 `offlineDraftStore`；當 `save()` 成功寫入 SQLite 時，呼叫 `clearOfflineDraft(project.id)`。
   * 當開啟專案 (`openProject`) 時，若發現 IndexedDB 內有較新的未同步離線草稿，記錄 `pendingDraft` 狀態供介面呈現「復原離線草稿／捨棄」提示列。
3. **新增 `src/utils/projectDiff.ts` 與擴充 `src/components/dialogs/VersionHistoryDialog.tsx`**：
   * 實作 `diffProjects(base: Project, target: Project)`：計算畫面新增／刪除／修改數、各畫面元件差異（新增、刪除、位置或屬性變更）、變數與通訊設備變更摘要。
   * 在 `VersionHistoryDialog.tsx` 新增「版本差異比對」檢視區塊、「版本標註 (`label`)」輸入與「下載 SQLite 完整備份 (`GET /api/backup/sqlite`)」按鈕。

#### 模組 B：可選交易式對話盒 (Transactional Popup) 與層級保護 (對應 AIS-47 F3)
1. **修改 `src/hooks/useSimulation.ts`**：
   * 新增 `popupDrafts: Record<string, Record<string, unknown>>` 狀態。
   * 當目標畫面 `screen.popupCommitMode === "transactional"` 時：
     * 一般按鈕動作（`set`、`toggle`、`increment`、`reset`）與數值輸入（`input`）將變更寫入 `popupDrafts[sourceScreenId][variableId]`，不立即呼叫 `writeValue()`。
     * `momentary`（JOG 點動）不受暫存影響，維持即時按住 ON／放開 OFF。
     * 新增 `confirmPopup(screenId?: string)`：將 `popupDrafts[targetId]` 內所有暫存變數批次透過 `writeValue()` 寫入，清除暫存、關閉該對話盒，並呼叫 `notify("設定已套用，變數已寫入")`。
     * `closePopup()`：若該對話盒有未提交之 `popupDrafts`，清除暫存並呼叫 `notify("已捨棄對話盒變更")`。
   * `openPopup` 檢查 `project.maxPopupDepth ?? 16` 上限，超限時提示具體層級限制。
2. **修改 `src/components/editor/RuntimePopups.tsx` 與 `src/components/editor/ScreenStructureFields.tsx`**：
   * 在 `ScreenStructureFields.tsx` 當畫面類別為 Popup 時，顯示「寫入模式（即時生效／確定後批次寫入）」與「背景鎖定（模態／非模態）」設定。
   * 在 `RuntimePopups.tsx` 當 `screen.popupCommitMode === "transactional"` 時，將該 Popup 的有效顯示值合併 `popupDrafts[screen.id]`，並於對話盒底部顯示標準「確定」(`primary-btn`) 與「取消」(`secondary-btn`) 工具列。

#### 模組 C：專案精靈與範本快速上手 (對應 AIS-47 F0)
1. **新增 `src/services/projectTemplates.ts` 與 `src/components/dialogs/ProjectWizardDialog.tsx`**：
   * 提供 4 種內建工控範本：`空白專案`、`泵浦與馬達監控範本`、`全域警報中心範本`、`產線趨勢與歷史監看範本`。
   * 提供 3 步驟建立流程（1. 命名與解析度／自動儲存設定 → 2. 選擇畫面範本 → 3. 選擇離線模擬或 Modbus TCP/RTU 設備）與 3 張可關閉的操作導覽提示卡。
   * 從「檔案 → 新增專案精靈…」開啟（保留原「檔案 → 新增專案」直接重設空白專案之行為，確保既有測試零衝突）。

#### 模組 D：畫布對齊輔助線、跨畫面撤銷、快捷鍵與元件庫增強 (對應 AIS-47 F1 & F2)
1. **新增 `src/utils/alignmentGuides.ts` 與修改 `src/hooks/useSelection.ts`、`src/components/editor/CanvasEditor.tsx`**：
   * 拖曳或縮放元件時，即時計算與同畫面其他可見元件（及畫布中心線）的邊緣／中心對齊關係（誤差 `±4px` 內），在畫布上渲染對齊輔助線 (`alignment-guide-x` / `alignment-guide-y`)。
2. **修改 `src/hooks/useEditor.ts` 與 `src/hooks/useHistory.ts`**：
   * 歷史堆疊上限由 50 步擴充至 100 步。
   * `undo()` 與 `redo()` 後保留仍存在於當前畫面之 `selected` 元件 ID，不再無條件清空選取上下文。
3. **擴充 `src/hooks/useEditorShortcuts.ts`**：
   * 新增 `Ctrl+G`（群組）、`Ctrl+Shift+G`（取消群組）、`Ctrl+L`（切換鎖定）、`Ctrl+D`（快速複製並偏移貼上選取元件）。
4. **擴充 `src/registry/widgetRegistry.ts` 與 `src/components/editor/LeftPanel.tsx`**：
   * 為 22 種元件加上中文功能別名關鍵字 (`keywords`)，支援搜尋如「錶頭」、「燈號」、「微調」、「配方」、「趨勢」等詞彙。
   * 於 `LeftPanel.tsx` 新增可收合之「最近使用 / 常用收藏」快捷列（儲存在 `localStorage`），同時保持下方 `.component-grid` 內 `<button>` 的 DOM 結構與 `aria-label` / 文字完全不變（避免影響 `getByRole("button", { name, exact: true })` 測試）。

#### 模組 E：裝置連線測試、警報自動清理與全域狀態列強化 (對應 AIS-47 F5 & F6)
1. **修改 `src/components/dialogs/CommunicationDialog.tsx`**：
   * 為每台 Modbus TCP / RTU 設備卡片新增「測試連線」按鈕，呼叫 `POST /api/communication/test` 並即時顯示延遲毫秒數或人話失敗原因。
2. **修改 `src/components/dialogs/AlarmManagementDialog.tsx`**：
   * 新增「歷史留存策略 (`alarmRetention`)」設定（保留天數、最大筆數、立即清理按鈕）與「匯出警報歷史 (CSV/JSON)」按鈕。
3. **修改 `src/components/editor/CanvasEditor.tsx` 狀態列**：
   * 顯示資料新鮮度時間戳（`資料更新：HH:mm:ss`）、待送警報歷史筆數（`待送 N 筆`）與離線草稿保護狀態。

---

### 4. UI/UX 設計系統修改規格 (`AIS-48_DESIGN_SYSTEM.md`)

1. **修改 `src/styles.css`**：
   * 於 `:root` 集中定義 `AIS-48` 第 2～6 節的所有 CSS Custom Properties（`--ds-color-*`、`--ds-font-*`、`--ds-text-*`、`--ds-space-*`、`--ds-radius-*`、`--ds-shadow-*`、`--ds-z-*`）。
   * 將 `src/styles.css` 內對應之硬編碼色碼與圓角替換為 `var(--ds-*, <原值>)`。
2. **保留 `src/engineering.css` 為預設主題**：
   * `src/App.tsx` 預設維持 `engineering-shell` class，確保現有工程工作台外觀與所有瀏覽器測試相容；於「檢視」選單新增「切換人性化／工程師主題」開關。

---

### 5. 後端 C# ASP.NET Core 與 SQLite 擴充規格 (`server/`)

| 新增／修改端點 | 檔案位置 | 功能規格 |
| :--- | :--- | :--- |
| `GET /api/backup/sqlite` | `server/Program.cs`, `server/ProjectStore.cs` | 使用 SQLite Online Backup API (`BackupDatabase`) 將目前資料庫匯出至暫存檔並以 `application/octet-stream` 下載 `.db` 備份檔，不中斷 WAL 讀寫。 |
| `POST /api/communication/test` | `server/Program.cs`, `server/CommunicationRuntime.cs` | 接收單一 `CommunicationDevice` 設定，依 `timeoutMs` 進行單次非破壞性連線握手與讀取測試，回傳 `{ ok, latencyMs, message }`。 |
| `POST /api/projects/{id}/versions/{rev}/label` | `server/Program.cs`, `server/ProjectStore.cs` | 於 `versions` 資料表自動遷移新增可選 `label TEXT` 欄位，支援為重要版本加上文字標記。 |
| `POST /api/projects/{id}/alarm-events/prune` | `server/Program.cs`, `server/AlarmHistoryStore.cs` | 依 `maxDays` 或 `maxRecords` 清除過期之「已解除 (`cleared_at IS NOT NULL`)」歷史警報，保留所有發生中警報。 |

---

## Goals vs. Non-Goals

* **In-Scope Goals:**
  * 實作與現有程式 100% 向下相容之 `AIS-47` 六大流程增強（F0 專案精靈、F1 對齊輔助線與快捷鍵、F2 元件庫收藏／最近使用／中文別名搜尋、F3 可選交易式與非模態對話盒、F4 IndexedDB 離線草稿復原／版本 Diff／SQLite 一鍵備份、F5/F6 裝置連線測試／警報歷史留存清理／全域狀態列時間戳與待送筆數）。
  * 實作 `AIS-48` 之 `:root` `--ds-*` CSS Design Tokens 於 `src/styles.css`，並與預設 `.engineering-shell` 共存。
  * 同步擴充前端 `src/model.ts` 與後端 `server/ProjectValidator.cs` 的 `schema-v1` 可選欄位驗證。
* **Out-of-Scope Non-Goals:**
  * **不改變既有預設 Popup 行為**：未勾選交易模式之既有 Popup 維持即時寫入變數；JOG 點動按鈕永不進入暫存交易。
  * **不實作斷線後自動補送 PLC/Modbus 控制寫入指令**：維持斷線即停用控制寫入之工控安全機制。
  * **不包含任何金融／台股／券商下單／獲利免責聲明文字**。
  * **不實作跨裝置多人即時協同編輯與原生手機 App**（依 `AIS-47` Won't v1 排除）。

---

## Alternatives Weighed

1. **強制所有 Popup 採用交易式確認（Rejected）**：
   * *拒絕原因*：會直接破壞 Popup 內的 JOG 點動按鈕 (`action: "momentary"`) 與多層導覽，且導致既有 `tests/screens-browser.mjs` 整合測試失敗。改採 `popupCommitMode: "immediate" | "transactional"`（預設 `"immediate"`）可兼顧既有行為與新交易需求。
2. **將 Modbus 離線期間的設備寫入指令排入 IndexedDB 佇列並於重連後自動重送（Rejected）**：
   * *拒絕原因*：違反工業控制安全規範（延遲重送馬達啟動或閥門開關會引發工安事故），且與 `tests/communication-browser.mjs` 驗證之行為衝突。離線待送佇列僅用於「警報歷史紀錄」與「專案編輯草稿」。
3. **以 `AIS-48` 淺色主題全面移除 `src/engineering.css`（Rejected）**：
   * *拒絕原因*：現有系統預設載入 `.engineering-shell`，移除將大幅改變所有現有畫面的佈局尺寸與測試斷言。改為在 `src/styles.css` 實作 `--ds-*` Token 並保留 `.engineering-shell` 為預設主題（提供主題切換開關）。

---

## Key Decisions & Staging for Next Steps

1. **有衝突處一律以目前程式為主**：所有既有 Playwright 測試之 `aria-label`、按鈕名稱、預設 `revision === 0` 狀態、Popup 即時動作與 Modbus 斷線停用寫入均維持不變。
2. **剔除金融免責文字**：規格書與介面均移除所有非工控領域之金融免責條款。
3. **分階段實作順序**：
   * **Phase 1**：雙端 Schema 擴充（`src/model.ts` + `server/ProjectValidator.cs`）與 `:root` CSS Design Tokens（`src/styles.css`）。
   * **Phase 2**：IndexedDB 離線草稿 (`offlineDraftStore.ts`)、版本比對 (`projectDiff.ts`) 與後端 SQLite 備份／版本標註／連線測試／警報清理 API。
   * **Phase 3**：可選交易式 Popup (`popupCommitMode`)、畫布對齊輔助線 (`alignmentGuides.ts`)、元件庫收藏／別名搜尋與專案精靈 (`ProjectWizardDialog.tsx`)。
   * **Phase 4**：單元測試與 Playwright 整合測試驗證。
