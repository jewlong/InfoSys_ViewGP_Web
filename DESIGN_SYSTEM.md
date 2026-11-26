# InfoSys_ViewGP_Web — UI/UX 設計系統 (Design System)

**議題**：AIS-48 子任務：UI/UX 視覺設計與設計系統 (ui-duarte)  
**父議題**：AIS-42 InfoSys_ViewGP_Web 規劃器人性化與商業化  
**前置**：AIS-47 使用者流程與互動設計 (done)  
**對應 PRD**：AIS-46 InfoSys_ViewGP_Web 規劃器人性化升級 PRD  
**版本**：v1.0  
**語言**：繁體中文

---

## 1. 設計願景

將 InfoSys_ViewGP_Web 規劃器打造為「好上手、不易出錯、可安心長期使用」的人性化畫面規劃工具。設計系統提供統一的色系、字體、間距與元件外觀，降低新手學習門檻，提升現場設備工程師與操作員的設定效率與信心。

設計原則：
- **一致性**：相同元件在不同畫面呈現相同外觀與行為。
- **人性化**：以人為本，強調回饋清楚、狀態可視、錯誤預防與離線韌性。
- **工業實用**：適合廠房現場與長時間操作，高對比、易閱讀、操作回饋明確。
- **可維護**：設計透過 CSS 設計トクン (design tokens) 集中管理，方便主題切換與未來擴充。

---

## 2. 色系 (Color Palette)

### 2.1 語義色 token

| Token | 用途 | 值 (預設/人性化主題) | 備註 |
|-------|------|---------------------|------|
| `--ds-color-primary` | 主要動作按鈕、作用中標籤、選取狀態 | `#5b6be6` | 靛青，品牌主色 |
| `--ds-color-primary-hover` | 主要按鈕 hover | `#4a5ad0` | |
| `--ds-color-primary-active` | 主要按鈕 active | `#3e4dc4` | |
| `--ds-color-surface` | 卡片、彈窗、面板背景 | `#ffffff` | |
| `--ds-color-background` | App 整體背景 | `#f5f6fa` | 淺灰藍，降低長時間觀賞疲勞 |
| `--ds-color-border` | 一般邊框 | `#e0e4ed` | |
| `--ds-color-border-hover` | 聚焦/hover 邊框 | `#b7c1f2` | |
| `--ds-color-text-primary` | 主要文字 | `#263044` | 深暗，高可讀性 |
| `--ds-color-text-secondary` | 次要文字 | `#626d80` | |
| `--ds-color-text-muted` | 輔助/輔助說明文字 | `#8390a2` | |
| `--ds-color-text-light` | 淺色背景上的文字 | `#9aa3b3` | |
| `--ds-color-success` | 成功/連線正常/狀態正常 | `#54b998` | 綠 |
| `--ds-color-success-bg` | 成功狀態背景淺色 | `#eff9f4` | |
| `--ds-color-warning` | 警告/等待/斷線重連中 | `#b18325` | 橘 |
| `--ds-color-error` | 錯誤/失敗 | `#b63d32` | 紅 |
| `--ds-color-focus` | 鍵盤聚焦環 | `#6878ee` | 無障礙必須 |
| `--ds-color-canvas-bg` | 設計畫布背景 | `#101c2e` | 深色，讓元件突出 |
| `--ds-color-selected` | 元件選取框 | `#8a9cff` | |
| `--ds-color-selected-fill` | 選取標籤填充 | `#667ce6` | |

### 2.2 工程師主題 (engineering-shell)

保留既有 `engineering.css` 緊湊工作台色票：
- `--workbench-face: #ececec`、`--workbench-border: #a5a8ad`、`--workbench-accent: #1769a7`
- 連線狀態：正常 `#278148`、模擬/等待 `#b18325`、錯誤 `#b63d32`

### 2.3 語意對照表 (人性化主題)

| 狀態 | 色 token | 範例元件 |
|------|----------|----------|
| 連線正常 / 執行中 | `--ds-color-success` | 連線燈號、runtime-switch on |
| 模擬 / 等待 / 斷線重連 | `--ds-color-warning` | simulation-pill、連線燈號 |
| 錯誤 / 失敗 | `--ds-color-error` | toast.error、連線燈號 |
| 資料已異動 (dirty) | dirty-dot `#a8b1c1` | 頁籤、標題旁 |
| 元件被選取 | `--ds-color-selected` | canvas outline、selection handle |

---

## 3. 字體 (Typography)

### 3.1 字型族

```
--ds-font-family: Inter, "Noto Sans TC", system-ui, sans-serif;
--ds-font-family-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
```

- 中文介面預設「繁體中文」，預留英文／簡體中文切換 (PRD FR-8.3)。
- 數字採 `tabular-nums`，方便對齊數值與警報歷史。

### 3.2 字級尺度 (px)

| Token | 大小 | 行高 | 字重 | 典型用途 |
|-------|------|------|------|----------|
| `--ds-text-xs` | 8px | 1.2 | 600 | 標籤 (eyebrow)、區塊標題 |
| `--ds-text-sm` | 9px | 1.4 | 400~600 | 輔助說明、狀態列、小按鈕 |
| `--ds-text-base` | 10px | 1.5 | 400 | 欄位標籤、元件庫分類 |
| `--ds-text-md` | 11px | 1.6 | 400~600 | 一般表單輸入、單行文字 |
| `--ds-text-lg` | 12px | 1.6 | 500~600 | 欄位標題、按鈕文字、選單項目 |
| `--ds-text-xl` | 14px | 1.6 | 600 | 區塊標題、重要標籤 |
| `--ds-text-display` | 21px | 1.2 | 800 | 品牌標題 (Brand) |

### 3.3 字重

- 400 一般、500 強調、600 次級標題/按鈕、700 次要強調、800 品牌標題

---

## 4. 間距 (Spacing)

| Token | 值 | 典型用途 |
|-------|----|----------|
| `--ds-space-1` | 3px | 微間距、圖示與文字 |
| `--ds-space-2` | 4px | 緊湊內邊距 |
| `--ds-space-3` | 5px | 小間距 |
| `--ds-space-4` | 6px | 輸入欄位內縮 |
| `--ds-space-5` | 7px | 按鈕圖示間距 |
| `--ds-space-6` | 8px | 一般元件內邊距、格線 |
| `--ds-space-7` | 9px | 按鈕文字間距、欄位間距 |
| `--ds-space-8` | 10px | 欄區邊距 |
| `--ds-space-9` | 12px | 卡片內邊距、欄區間距 |
| `--ds-space-10` | 14px | 主要區塊邊距 |
| `--ds-space-11` | 16px | 面板內邊距 |
| `--ds-space-12` | 17px | 左右側欄內邊距 |
| `--ds-space-13` | 20px | 對話框內邊距、頁面邊距 |
| `--ds-space-14` | 24px | 大區塊間距、品牌標題間距 |
| `--ds-space-15` | 32px | 畫布外邊距、主要分區間距 |

---

## 5. 邊框與圓角 (Border & Radius)

| Token | 值 | 用途 |
|-------|----|------|
| `--ds-border-width` | 1px | 一般邊框 |
| `--ds-border-color` | `var(--ds-color-border)` | 一般邊框色 |
| `--ds-radius-sm` | 3px | 小元件、標籤 |
| `--ds-radius-md` | 5px | 輸入框、列表項目 |
| `--ds-radius-lg` | 6px | 按鈕、變數卡片 |
| `--ds-radius-xl` | 7px | 選取元件預覽、對話框 |
| `--ds-radius-2xl` | 8px | 運作按鈕、狀態卡片 |
| `--ds-radius-full` | 50% / 40px | 開關、圓形燈號 |

---

## 6. 陰影與層級 (Elevation & Shadow)

| Token | 值 | 用途 |
|-------|----|------|
| `--ds-shadow-xs` | `0 2px 3px #596ae217` | 主要按鈕 |
| `--ds-shadow-sm` | `0 3px 8px #00000010` | 運作按鈕 |
| `--ds-shadow-md` | `0 9px 28px #17244020` | 下拉選單 |
| `--ds-shadow-lg` | `0 5px 25px #25304a22` | 通知 (toast) |
| `--ds-shadow-xl` | `0 25px 90px #14203930` | 模態彈窗 |
| `--ds-z-toast` | 60 | 通知 |
| `--ds-z-modal-backdrop` | 50 | 模態底層 |

---

## 7. 元件規格 (Component Specs)

### 7.1 按鈕 (Button)

| 變體 | 背景 | 邊框 | 文字 | 圓角 | 內邊距 |
|------|------|------|------|------|--------|
| Primary | `--ds-color-primary` | 同上 | `#ffffff` | 6px | `9px 14px` (min-height 34px) |
| Secondary | `#ffffff` | `#dfe4ee` | `#66728a` | 6px | `8px 13px` (min-height 34px) |
| 工具列按鈕 | 透明 | 透明 | `#7b8598` | 5px | `29px x 29px` 正方 |

- Hover：primary 背景 brightness 降低；secondary 背景 `#f0f3fc`。
- Focus-visible：2px 實線 `--ds-color-focus`，偏移 2px。
- Disabled：opacity 0.4，pointer-events none。

### 7.2 輸入欄位 (Input / Select)

- 背景 `#fff`，邊框 1px `#e0e4ed`，圓角 5px，內邊距 `8px 9px`，字級 11px。
- Focus：邊框 `--ds-color-focus`，outline 2px 偏移 2px。

### 7.3 對話框 (Modal / Dialog)

- 底層 backdrop：`#13233d55`，backdrop-filter blur 3px。
- 彈窗：寬 520px，圓角 12px，陰影 `--ds-shadow-xl`，最大高度 85vh。
- 標題區：內邊距 `20px 24px`。

### 7.4 通知 (Toast)

- 固定定位底部置中，圓角 8px，陰影 `--ds-shadow-lg`，內邊距 `12px 15px`，字級 12px。
- 成功：邊框 `#d9e8df`，文字 `#458e73`；錯誤：邊框 `#f2d6d6`，文字 `#b65d5d`。

### 7.5 元件庫卡片 (Component Library Card)

- 高度 73px，圓角 6px，邊框 1px `#e6eaf2`，背景 `#fff`。
- Hover：背景 `#f5f6ff`，邊框 `#b7c1f2`，文字 `#5f6ee0`。

### 7.6 畫布與選取態

- 畫布背景 `--ds-color-canvas-bg` (`#101c2e`)，格線 radial gradient。
- 選取元件：outline 1.5px `--ds-color-selected`，偏移 1px。
- 選取把手：8px 正方，背景 `#fff`，邊框 1.5px `--ds-color-selected`。

---

## 8. 無障礙與國際化 (A11y & i18n)

- 全鍵盤導航：Tab 與方向鍵可操作畫布、元件庫、屬性編輯器 (PRD FR-8.1)。
- Focus-visible 環必須可見，顏色對比達 WCAG AA (正常文字 ≥ 4.5:1)。
- 支援高對比模式與字級縮放 (PRD FR-8.2)。
- 介面預設繁體中文，預留多語言切換 (PRD FR-8.3)。

---

## 9. 實作清單 (Implementation)

| 項目 | 檔案 | 狀態 |
|------|------|------|
| 設計系統文件 (本文件) | `DESIGN_SYSTEM.md` | done |
| CSS 設計トクン (custom properties) | `src/styles.css` `:root` | done |
| 以 token 重構 styles.css | `src/styles.css` | done |
| 工程師主題維護 | `src/engineering.css` | 保留現狀 |
| 新增人性化元件樣式 (toast/dialog 已有) | `src/styles.css` | 部分已有 |
| 建置驗證 (`npm run build` = tsc + vite) | `src/styles.css` + 元件 | done (無編譯錯誤) |

---

## 10. 驗收準則 (AIS-48 結案條件)

- [ ] 設計系統文件完成，涵蓋色系、字體、間距、圓角、陰影、元件規格。
- [ ] `src/styles.css` 以 CSS custom properties 集中定義設計トクン，硬編碼色碼大幅減少。
- [ ] 主題可透過修改 `:root` token 統一變更，無需逐處替換。
- [ ] 與 AIS-47 互動設計與 AIS-46 PRD 需求一致 (對話框交易流程、離線草稿提醒、專案精靈等視覺呈現)。
- [ ] `npm run build` (tsc + vite) 通過，無樣式相關編譯錯誤。

---

*本文件由 UI-Duarte (agent 0f5e3ca6-5cc7-4afd-8ef2-356760e11114) 撰寫，供 InfoSys_ViewGP_Web 規劃器人性化與商業化專案 (AIS-42) 使用。*
