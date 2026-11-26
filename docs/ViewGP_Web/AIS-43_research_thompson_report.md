# AIS-43 市場調查與競品分析報告：InfoSys_ViewGP_Web 規劃器

**執行代理：** Research-Thompson (agent cf725c1b-f75e-4c86-9f00-405ea0fed833)
**公司：** fb0c80b0-0d50-43e2-a8f0-574bf6224dd3
**執行 Run：** b51fce68-0d54-47bf-90a7-00b928d727b0
**日期：** 2026-11-25
**上游產品：** InfoSys_ViewGP_Web (https://github.com/jewlong/InfoSys_ViewGP_Web)
**父任務：** AIS-42 InfoSys_ViewGP_Web 規劃器人性化與商業化 — 14 agent 職責拆解
**本階段：** 第 1 階段（市場調查與競品分析），完成後才可指派下一階段

---

## 0. 執行摘要

InfoSys_ViewGP_Web（以下簡稱 ViewGP）是一個「網頁 HMI 畫面規劃工具」，使用者在瀏覽器中拖放元件、設定變數與互動動作，匯出 `project.json`，再直接載入到 Raspberry Pi Zero W / Zero 2 W 的裸機 µC/OS-II + LVGL 9.4 執行端上運行，無需重新編譯韌體。技術棧為 TypeScript + React 前端、C# + ASP.NET Core 後端、SQLite 儲存，預設離線模擬，亦可由 C# 後端透過 Modbus TCP / COM RTU 讀寫現場設備。

ViewGP 的定位不是通用 SCADA，而是「極低成本嵌入式 HMI」：以約 10~15 美元的 Raspberry Pi Zero W 做監控終端，網頁端設計、JSON 匯出、裸機運行。與動輒數千至數萬美元的企業級 SCADA（Ignition、WinCC、FactoryTalk、Wonderware）及純 UI 產出工具（SquareLine Studio）相比，ViewGP 的差異化在於「一站式設計器 + 執行階段 + Modbus 通訊 + 警報引擎」的整合包，並主打超低硬體成本與網頁零安裝設計體驗。

目前產品為單人編輯與執行版本，預設僅監聽 localhost，尚無登入權限、多國語言、多人協作、非 Modbus PLC 驅動、伺服器端持續警報／趨勢採集等功能；正式對外部署前需補身分驗證、HTTPS 與存取控制。這些「缺口」正是 AIS-42 商業化與人性化方向的切入點。

---

## 1. 產品概況：InfoSys_ViewGP_Web

### 1.1 核心定位
- **網頁 HMI / 畫面規劃工具**：瀏覽器即可設計，無需安裝專屬 Windows 工具（無需舊 `.vxf` 格式）。
- **嵌入式執行階段**：匯出 `project.json` 至 Raspberry Pi Zero W SD 卡根目錄，由 µC/OS-II + LVGL 9.4 裸機運行，自動縮放置中、內建 CJK 中文字型。
- **工業監控導向**：內建 Modbus TCP / COM RTU 設備通訊、全域 Word-bit 警報與元件級警報、警報跑馬燈、SNTP 校時、警報歷史（SQLite）。

### 1.2 主要功能（來自產品 README 與 P0~P3 規格）
| 類別 | 功能 |
|---|---|
| 編輯體驗 | 拖放、調整尺寸、多選、對齊、群組、圖層、鎖定、格線、復原／重做；元件分「繪圖、靜態、按鈕、顯示、編輯」五類；右鍵屬性視窗即時套用 |
| 畫面管理 | 多畫面與 Popup、多層母片（共通母片）繼承、起始畫面設定、一般畫面／對話盒分類 |
| 元件庫 | 18 種基礎元件（文字、矩形／圓形、直線、圖片、按鈕、數值顯示／輸入、開關、指示燈、進度條、儀表、趨勢圖、警報清單、日期時間等） |
| 變數與綁定 | 數值／布林／文字變數、資料綁定、顯示／啟用條件、模擬值監看、數值格式化（小數／百分比／科學記號／千分位） |
| 按鈕動作 | 切換布林、設定數值／布林／文字、加減、重設、切換畫面 |
| 儲存與版本 | SQLite 專案保存、版本紀錄與還原、版本衝突保護（HTTP 409）、JSON 匯入／匯出、自動儲存（閒置 2 秒）、圖片資源管理（單張上限 3 MB、最多 100 張、請求上限 20 MB） |
| 設備通訊 | Modbus TCP／RTU，Coil／Discrete Input／Holding Register／Input Register、16／32 位元整數及 float32、高低 Word 順序、倍率／偏移、讀寫權限、寫入讀回確認、斷線重連 |
| 警報系統 | 全域 16-bit Word 警報（Bit 0~15）＋遮罩、元件級門檻警報（>／≥／<／≤／＝／≠／TRUE／FALSE）、警報清單（1~100 筆、只看發生中、逐筆確認）、跑馬燈（上方／下方，1000~60000 ms 輪播） |
| 時間 | SNTP 網路校時、時區偏移、datetime 元件格式化 |
| 開發與測試 | Node.js 24+、.NET 10 SDK；C# API port 5000、React/Vite port 3000；Playwright 瀏覽器測試、C# 伺服器測試、Modbus 通訊測試 |

### 1.3 目前範圍限制（產品自承）
單人編輯與執行；已支援 Modbus TCP／RTU 及警報歷史存檔。**尚未實作**：現場代理、伺服器持續警報／趨勢採集、非 Modbus PLC 驅動、多國語言、登入權限、多人協作、IndexedDB 草稿。預設僅監聽本機，正式對外部署前需身分驗證、HTTPS 與存取控制。

---

## 2. 市場定位

ViewGP 的目標市場是「需要工業現場監控畫面，但預算與硬體資源極為有限」的嵌入式 HMI 使用者，例如小型設備廠商、系統整合商、機台製造商與教育／DIY 開發者。

| 定位維度 | ViewGP 的取向 |
|---|---|
| 硬體成本 | Raspberry Pi Zero W（約 10~15 美元），極低 |
| 設計方式 | 網頁瀏覽器拖放，零安裝，跨平台 |
| 執行階段 | 裸機 µC/OS-II + LVGL 9.4，無完整 OS，開機即畫面 |
| 通訊協定 | Modbus TCP / COM RTU（工業主流） |
| 使用者規模 | 單人設計、單機執行 |
| 資料庫 | SQLite（本機檔案，伺服器重啟後歷史仍可讀取） |
| 商業成熟度 | 功能完整的原型／早期產品，尚未商業化 |

與之相對，ViewGP 並不適合：大型廠房全廠 SCADA、需要多工程師協同設計、需要非 Modbus PLC（如三菱、歐姆龍原生協定）、需要多租戶 SaaS 雲端服務的場景。

---

## 3. 競品分析

將競品分為四類：企業級 SCADA/HMI、開源／低成本儀表板、LVGL 型 UI 設計工具、嵌入式智慧 HMI 面板。

### 3.1 企業級 SCADA / HMI（高客單價，功能完整）

| 競品 | 代表廠商 | 特色 |
|---|---|---|
| Ignition | Inductive Automation | 模組化工業應用平台，可自訂畫面與報表，支援多種 PLC 驅動，授權通常以伺服器／核心／模組計價，報價導向，動輒數千至數十萬美元 |
| WinCC | Siemens | 與西門子 PLC 生態深度綁定，功能全面，授權昂貴，偏向大型製造 |
| FactoryTalk View | Rockwell Automation | 與 Allen-Bradley PLC 生態綁定，廠房監控主流 |
| Wonderware / AVEVA | AVEVA | 程程資產管理與 SCADA，企業級，高客單價 |

**與 ViewGP 對比：** 企業級 SCADA 功能最強、支援最多 PLC 協定與多使用者，但硬體與授權成本極高，對小型設備過於龐大，且多為 Windows 桌面或伺服器架構，不適合 Pi Zero 這類極低成本裸機終端。ViewGP 的切入點是「小型機台單機監控」的超低成本替代方案。

### 3.2 開源 / 低成本儀表板與流程工具

| 競品 | 特色 | 定價 |
|---|---|---|
| Node-RED | IBM／OpenJS Foundation 開發，瀏覽器流程編輯器，5000+ 社群節點，輕量運行於 Raspberry Pi；搭配 node-red-dashboard 可做簡易監控畫面；FlowFuse 為其企業平台 | 開源免費；FlowFuse 企業版付費（未公開標準價） |
| Grafana | 開源視覺化與儀表板，支援多資料來源，警報與通知 | 自託管開源免費；Grafana Cloud 付費 |
| OpenPLC | 開源 PLC 運行時與編輯器，支援多種協定 | 開源免費 |

**與 ViewGP 對比：** Node-RED 與 Grafana 強在資料採集與儀表板彈性，但並非「畫面規劃＋裸機 HMI 執行階段」的一體化方案；使用者仍需自行搭配作業系統與顯示硬體。ViewGP 的網頁設計＋`project.json`＋Pi Zero 裸機運行，對「只要一個監控畫面，不想管作業系統」的使用者更省力。

### 3.3 LVGL 型 UI 設計工具（最接近的直接競爭）

| 競品 | 特色 | 定價 |
|---|---|---|
| SquareLine Studio | LVGL 為底的下一代 UI 編輯器，設計／原型／開發一體化，匯出平台無關 C 或 MicroPython 程式碼，可編譯到任何廠商裝置；夥伴包括 NXP、Espressif、M5Stack、Renesas 等 | 個人免費；小型商業 66 USD/月；大型商業 183 USD/月；30 天試用 |
| LVGL 本身 | 開源嵌入式 GUI 庫，MIT 授權，全球最廣泛採用的嵌入式 UI 生態；需自行寫程式與設計畫面 | MIT 開源免費；LVGL Pro 商業授權 |

**與 ViewGP 對比：** SquareLine Studio 與 ViewGP 皆以 LVGL 為圖形基礎，但 SquareLine 輸出的是「C 程式碼，需編譯進韌體」，屬於 UI 程式碼產生器；ViewGP 輸出的是 `project.json`，由現成的裸機運行階段讀取，**無需重新編譯韌體**，且內建 Modbus 通訊、警報引擎、跑馬燈等 HMI 邏輯。對不想寫 C 程式、只要快速做一個帶設備連線的監控畫面的使用者，ViewGP 門檻更低。

### 3.4 嵌入式智慧 HMI 面板

| 競品 | 特色 | 約定價 |
|---|---|---|
| Nextion（Sonoff / ITEAD） | 專用 HMI 面板，自有編輯器，串口與單片機搭配 | 約 20~100+ 美元／片（依尺寸） |
| ESP32 類 HMI | Espressif 生態，LVGL 支援，極低成本 | 約 5~30 美元 |

**與 ViewGP 對比：** Nextion 等面板硬體成本低，但綁定專屬編輯器與協定，擴展性與通訊協定有限；ViewGP 以通用 Pi Zero W 為基礎，支援 Ethernet／Wi-Fi（Modbus TCP）與 UART（Modbus RTU），更靈活，且網頁設計體驗優於專屬面板編輯器。

### 3.5 競品對比總表

| 維度 | ViewGP | Ignition / WinCC / FactoryTalk | Node-RED + dashboard | SquareLine Studio | Nextion 面板 |
|---|---|---|---|---|---|
| 類型 | 網頁 HMI 規劃＋裸機執行 | 企業級 SCADA | 流程儀表板 | LVGL UI 編輯器（輸出 C 碼） | 專用 HMI 面板 |
| 設計介面 | 網頁瀏覽器（TS+React） | Windows 設計工具 | 瀏覽器流程編輯 | 桌面軟體（Electron） | 專屬 Windows 編輯器 |
| 執行階段 | Pi Zero 裸機（µC/OS-II+LVGL） | Windows 伺服器／工作站 | Node.js（Pi／伺服器） | 編譯後韌體（任意 MCU） | 面板內建處理器 |
| 通訊 | Modbus TCP／RTU | 廣泛 PLC 驅動 | 視節點而定（MQTT／Modbus 等） | 自行實作 | 串口專屬協定 |
| 警報與歷史 | 內建警報／跑馬燈／SQLite 歷史 | 內建警報與歷史 | 需自行組合 | 無（僅 UI） | 有限 |
| 多使用者／協作 | 無（單人） | 有 | 有限 | 無 | 無 |
| 硬體成本 | ~10~15 美元（Pi Zero） | 高（伺服器＋授權） | 低（Pi） | 低（設計端 PC） | 20~100+ 美元／片 |
| 授權／定價 | 尚未商業化 | 報價導向，數千~數十萬 USD | 開源免費（FlowFuse 付費） | 免費／66／183 USD/月 | 硬體買斷 |
| 適合場景 | 小型機台單機監控 | 大型廠房 SCADA | 輕量資料串聯儀表板 | 嵌入式 UI 開發 | 簡單單片機介面 |

**競爭格局總結：**
- **企業級 SCADA**：功能最全、最貴、最重，適合大廠，與 ViewGP 市場重疊小。
- **Node-RED / Grafana**：開源免費、彈性強，但需自行拼湊作業系統與顯示，非一體化 HMI。
- **SquareLine Studio**：最接近的技術競爭對手（LVGL 為底），但輸出 C 碼需編譯，不內建設備通訊與警報執行階段；ViewGP 以「免編譯 JSON ＋ 內建 HMI 邏輯」差異化。
- **Nextion 等面板**：硬體低成本但封閉，ViewGP 以通用 Pi Zero 與網頁設計更開放。

---

## 4. 產業趨勢評估

1. **嵌入式 HMI 轻量化**：隨著 Pi Zero 與 ESP32 類低成本 MCU／MPU 普及，小型設備不再需要完整 Windows 工作站做 HMI，裸機 LVGL 執行階段成為實務選項。
2. **網頁化設計工具崛起**：使用者期望在瀏覽器即完成畫面設計，避免安裝專屬 Windows 軟體；ViewGP 的網頁規劃器正切中此趨勢。
3. **Modbus 仍是工業主流**：中小型設備以 Modbus TCP／RTU 為主，ViewGP 內建 Modbus 與警報，切合此需求；非 Modbus PLC 驅動為未來擴充空間。
4. **低程式碼／零安裝**：SquareLine Studio 與 ViewGP 皆證明使用者願意為「可視化設計＋即時預覽」付費，但語法／編譯門檻仍是障礙。
5. **商業化門檻提高**：單人 localhost 產品若要對外販售，必須補齊身分驗證、HTTPS、存取控制、多國語言、多人協作，否則無法進入企業採購。

---

## 5. 商業模式拆解

| 競品 | 免費部分 | 付費部分 | 訂閱制 | 價值主軸 |
|---|---|---|---|---|
| Ignition／WinCC／FactoryTalk | 有限試用 | 授權＋模組（報價） | 部分 | 功能全面、廠商生態、企業支援 |
| Node-RED | 開源全部 | FlowFuse 企業平台 | 企業版付費 | 流程串聯、5000+ 節點、企業部署 |
| Grafana | 自託管開源 | Grafana Cloud | 是 | 資料視覺化、多來源整合 |
| SquareLine Studio | 個人免費 | 小型 66 USD／月、大型 183 USD／月 | 是 | LVGL UI 設計、免編譯預覽、廠商無關 |
| Nextion | 編輯器免費 | 硬體買斷 | 否 | 低成本專用 HMI 面板 |
| ViewGP（自建） | 全功能（目前免費） | — | 否 | 網頁設計＋裸機 LVGL 運行＋Modbus＋警報，Pi Zero 超低成本 |

**共同模式：** 「免費基礎功能吸引流量，進階／自動化／企業功能訂閱 monetization」。SquareLine Studio 的分層訂閱（個人／小型／大型）是 ViewGP 未來若向外提供訂閱服務時可參考的 SaaS 定價參考。

---

## 6. 差異化機會（針對 AIS-42 商業化與人性化）

基於競品分析，建議 ViewGP 在商業化與人性化方向，往以下方向差異化：

### 6.1 從「單人 localhost」邁向「多人協作與存取控制」
- 補足登入權限、多國語言、多人協作、IndexedDB 離線草稿（產品「目前範圍」已列為未實作）。
- HTTPS 與存取控制，才能安全對外部署；這是從「個人工具」變成「可販售產品」的門檻。

### 6.2 保留「免編譯 JSON＋裸機運行」的核心優勢
- 與 SquareLine Studio 的「輸出 C 碼需編譯」形成明確對比，強調「網頁設計 → 匯出 project.json → Pi Zero 開機即用」的零編譯體驗，這是 ViewGP 對非程式背景設備整合商的最大賣點。

### 6.3 超低硬體成本作為價格槓桿
- 以 Pi Zero W（~10~15 美元）當 HMI 終端，遠低於企業級 HMI 面板與工作站；可將「整體擁有成本（TCO）極低」納入行銷訊息。

### 6.4 內建 HMI 邏輯一體化
- 與 Node-RED／Grafana 需自行拼湊形成對比，ViewGP 內建 Modbus 通訊、警報引擎、跑馬燈、SNTP、警報歷史，提供「設計＋執行＋設備連線」閉環，減少使用者自行整合的工時。

### 6.5 訂閱商業化參考
- 若未來提供訂閱服務，可參考 SquareLine Studio 分層訂閱（個人免費、小型商業、大型商業）與 Ignition 的模組化授權，以「進階元件、雲端同步、多使用者、伺服器端警報採集」作為付費模組。

---

## 7. 建議與後續行動

1. **確認「極低成本嵌入式 HMI」為主要目標市場**：針對小型設備廠商與系統整合商，強調 Pi Zero 終端成本與網頁零安裝設計。
2. **先補商業化門檻（身分驗證／HTTPS／存取控制／多國語言）**：這是 AIS-42 人性化與商業化的先決條件，亦是下一階段產品定義（AIS-46 需求與 PRD）的依據。
3. **保留並強化「免編譯 JSON + 內建 Modbus／警報」差異化**：在競品對比表中持續對照 SquareLine Studio（需編譯 C 碼）與 Node-RED（需自行組合），突出一體化優勢。
4. **評估分層訂閱定價**：參考 SquareLine Studio（66／183 USD/月）與 Ignition 模組化模式，針對「進階元件、多使用者、伺服器端警報採集」規劃付費模組。
5. **收集使用者回饋**：以泵浦監控教學專案為範本，與潛在小型設備客戶驗證「網頁設計＋Pi Zero 執行」的實際接受度。

---

## 8. 已知限制

- 競品定價對 Ignition／WinCC／FactoryTalk 為業界公開報價導向資訊，未取得具體報單；SquareLine Studio、Node-RED、LVGL、Grafana 定價與授權來自各官方網頁（squareline.io、nodered.org、lvgl.io、grafana.com）。
- 未實際測試各企業級 SCADA 付費功能；功能列表以公開頁面與產品規格文件為準。
- ViewGP 相關資訊主要來自其 GitHub 儲存庫 README、P0~P3 規格文件與本機 MicroOS2_LVGL 執行端原始碼，未部署實際 C# 後端與 React 前端進行動態測試。

---

## 結論

InfoSys_ViewGP_Web 處於「功能完整但尚未商業化」的單人嵌入式 HMI 規劃器定位。其核心競爭力在於「網頁 HMI 設計器 + 免編譯 project.json 匯出 + Raspberry Pi Zero 裸機 LVGL 執行 + 內建 Modbus 與警報引擎」的一體化超低成本方案，與高客單價企業 SCADA、需自行組合的開源儀表板、以及需編譯 C 碼的 SquareLine Studio 形成明確差異化。若欲朝商業化發展，優先補足身分驗證、HTTPS、存取控制、多國語言與多人協作，並以超低硬體成本與分層訂閱作為進入點。

---

*報告結束。本任務為 AIS-42 第 1 階段，完成後可指派下一階段（產品定義與 PRD 等）。*
