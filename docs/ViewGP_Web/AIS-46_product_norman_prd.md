# AIS-46 產品需求與 PRD 定義 — InfoSys_ViewGP_Web (MVP)

**執行代理：** CEO-Bezos (agent 38c7ebb9-1f96-4dc9-97eb-2d9ed4044673)
**公司：** fb0c80b0-0d50-43e2-a8f0-574bf6224dd3 (auto-co-meta)
**父任務：** AIS-42 InfoSys_ViewGP_Web 規劃器人性化與商業化 (14 agent 職責拆解)
**上游輸入：** AIS-44 產品點子與商業模式評估 (已完成)，AIS-43 市場調查與競品分析 (已完成)
**狀態：** MVP 定義完成
**日期：** 2026-11-26

---

## 1. 產品定位與目標

InfoSys_ViewGP_Web 定位為「超低成本嵌入式 HMI 輕量規劃與執行平台」。使用者透過網頁瀏覽器（零安裝）規劃 HMI 畫面，匯出 project.json，部署至 Raspberry Pi Zero W / Zero 2 W 裸機 (µC/OS-II + LVGL 9.4) 執行，並透過內建 Modbus TCP / COM RTU 與警報引擎監控設備。

**目標市場：** 小型設備廠商、系統整合商、機台製造商。
**戰略排除（不切）：** 大型廠房全廠 SCADA、桌面軟體。

核心差異化：網頁零安裝、免編譯 project.json 匯出、內建 Modbus 與警報引擎、Pi Zero 裸機終端 (硬體 ~$10~15 美元)。

---

## 2. 使用者人物與場景

| 人物 | 角色 | 核心需求 |
|---|---|---|
| 系統整合商 | 為客戶機台加裝監控畫面 | 快速規劃與部署，避免編譯韌體與專用開發鏈 |
| 小型設備廠商 | 提供機台前端監控與警報 | 超低硬體成本 (Pi Zero)、一體化 HMI 執行階段 |
| 機台操作員 | 查看設備狀態、趨勢與警報 | 瀏覽器即時檢視，無須安裝客戶端 |

典型場景：整合商在瀏覽器中規劃機台監控畫面 → 匯出 project.json → 部署至機台旁 Pi Zero → 操作員透過瀏覽器或終端監控溫度/壓力與警報。

---

## 3. MVP 功能範圍 (Phase 1)

### 3.1 納入 (P0)

| 功能 | 說明 | 驗收標準 |
|---|---|---|
| 網頁規劃器 | TS+React 網頁，拖放元件、多畫面、Popup、全域警報 | 在 Chrome/Edge 可完成畫面規劃並匯出 project.json |
| 免編譯 project.json 匯出 | 規劃結果匯出為 JSON，無須編譯 C 碼/韌體 | project.json 可被 Pi Zero 裸機執行階段直接讀取 |
| 內建 Modbus TCP / COM RTU | C# 後端讀寫 PLC 設備 | 能連線並正確讀取/寫入暫存器 |
| 警報引擎 | 全域 16-bit Word 警報、元件級門檻、警報跑馬燈、警報歷史 (SQLite) | 警報門檻觸發正確，歷史可查詢 |
| Pi Zero 裸機執行階段 | project.json 在 Pi Zero W / Zero 2 W (µC/OS-II + LVGL 9.4) 執行 | 畫面與警報正確顯示，終端硬體成本 ~$10~15 美元 |
| 登入 / HTTPS / 存取控制 | 對外部署前的必要門檻 | 支援使用者登入、角色權限、HTTPS 傳輸 |

### 3.2 中優先 (Phase 2+ 商業化後)

- 非 Modbus PLC 驅動擴展
- 伺服器持續警報／趨勢採集 (Enterprise 模組付費點)
- 訂閱／授權管理後台 (分層訂閱、模組啟用、授權續期)
- 多國語言、多人協作、IndexedDB 離線草稿

### 3.3 明確不做 (戰略性排除，Say No)

1. **大型廠房全廠 SCADA** — 與 Ignition/WinCC/FactoryTalk/Wonderware 功能廣度無法競爭，亦非 Pi Zero 嵌入式終端定位。
2. **桌面軟體** — 網頁零安裝是核心差異化；桌面形式喪失遠端部署與多用戶 SaaS 便利。
3. **短期內非 Modbus PLC 驅動** — 資源稀釋；先把 Modbus 與警報做穩，再視需求擴展。
4. **設備正常運行 / 生產 SLA / 零停機保證** — 嵌入式終端可靠性有邊界，承諾 SLA 帶來法律責任與品牌風險；僅做產品層級風險揭露。

---

## 4. 技術概要 (摘要)

- 前端：TypeScript + React，網頁即用，零安裝
- 後端：C# + ASP.NET Core，SQLite 儲存
- 執行階段：Raspberry Pi Zero W / Zero 2 W，µC/OS-II + LVGL 9.4，project.json 驅動
- 通訊：Modbus TCP / COM RTU
- 預設：離線模擬；對外部署需 HTTPS 與存取控制

詳細技術選型與多租戶架構交由 **AIS-49 技術架構 (cto-vogels)**。

---

## 5. 成功指標 (MVP 驗收)

- project.json 可正常匯出並於 Pi Zero W / Zero 2 W 執行
- Modbus 讀寫無誤，連線中斷時顯示「連線中斷」而非舊值
- 警報觸發與警報歷史正確
- 使用者能在瀏覽器中完成畫面規劃與部署，無須編譯 C 碼/韌體
- 登入/HTTPS/存取控制可用 (對外部署前提)

---

## 6. 與後續子任務的銜接

- **AIS-45 風險評估 (Pre-Mortem)** 與本 PRD 並行推進；風控邊界 (安全、Pi Zero 可靠性、Modbus 中斷、無 SLA) 會反向影響 PRD 內容。
- 完成後進入 **AIS-49 技術架構** → **AIS-47 使用者流程** → **AIS-48 UI/UX 設計系統** → **AIS-50 程式碼實作** → **AIS-51 測試與品質閘門**。
- 定價與單位經濟參照 **AIS-54 銷售定價** 與 **AIS-56 單位經濟**。

---

**交付物：** /root/AIS-46_product_norman_prd.md
**相關：** /root/AIS-44_ceo_bezos_evaluation.md (戰略決策依據)