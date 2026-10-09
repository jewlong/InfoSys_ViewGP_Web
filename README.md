# ViewX Studio

Web 畫面規劃工具第一版：TypeScript + React 編輯器、Node.js API、SQLite 本機儲存。無須舊 `.vxf` 或原有 HMI；瀏覽器執行使用模擬資料。

## 開發與執行

需要 Node.js 24 以上（使用內建 `node:sqlite`）。在本儲存庫目錄執行：

```sh
npm ci --cache /tmp/viewx-npm-cache
npm run dev
```

服務預設監聽 port 3000。開發模式由同一個 Node 服務提供 Vite 介面與 `/api`，無須另外啟動資料庫。Node 可能顯示 SQLite experimental 警告。

```sh
npm run build
npm test
npm start
```

`npm start` 提供建置後的介面。`PORT`、`HOST` 可覆寫監聽設定。此版本沒有登入驗證，預設 `HOST=127.0.0.1`；只有在受控開發環境需要遠端存取時才設定 `HOST=0.0.0.0`。正式部署或工廠內網多人使用前需加入身分驗證、存取控制及 HTTPS。

## 第一版功能

- 檔案、編輯、檢視、畫面、元件、排列、變數、執行、說明選單。
- 多畫面管理與起始畫面設定。
- 文字、圖片、矩形、圓形、直線、按鈕、指示燈、數值顯示／輸入與開關。
- 拖拉、四角調整尺寸、多選、對齊、等距、群組、圖層、鎖定、格線、復原／重做。
- 數值、布林、文字變數；元件綁定與顯示／啟用條件。
- 模擬預覽：按鈕切換／設定／加減值與畫面切換、輸入值、變數監看。
- SQLite 專案保存與版本紀錄、過期版本寫入衝突檢查。
- JSON 專案匯入／匯出（格式版本 1），圖片內嵌於 JSON；單張圖片上限 3 MB，專案上限 20 MB。

首次開啟會顯示尚未儲存的示範產線。按「執行專案」，操作「啟動／停止」或「＋計數」，指示燈／數值會同步變動。Esc 返回編輯。

瀏覽器自動測試：先 `npm run build`，再 `npm run test:browser`。需要 Playwright Chromium（`npx playwright install chromium`），或設定 `VIEWX_BROWSER_PATH` 指向已安裝的 Chromium。測試會啟動隔離服務與暫存 SQLite，不更動工作區專案資料。

## 資料

SQLite 位於 `.data/viewx.db`，不納入 Git。可設定 `VIEWX_DB_PATH` 使用其他本機路徑。每次儲存保留一個版本；前端透過後端 API 存取資料庫。不要將資料庫放在公開靜態檔案目錄或網路共享磁碟。

備份應使用 SQLite Online Backup API 或關閉服務後連同 SQLite 所需檔案備份；運行中不要僅複製 `.db`。目前無版本還原介面與自動版本清理。

## 驗證

`npm run build` 執行 TypeScript 檢查與正式建置。`npm test` 驗證 SQLite 重啟後的保存、版本增加與寫入衝突保護。

`GET /api/health` 回傳 `{ "status": "ok", "storage": "sqlite" }`。實際操作驗證：新增元件／變數 → 綁定 → 儲存 → 從開啟專案清單重開 → 執行 → 操作按鈕確認變數與畫面更新。

## 後續範圍

PLC／設備通訊、背景資料採集、警報、多國語言、趨勢圖、身分驗證與多人協作尚未實作。未加入旋轉、IndexedDB 自動草稿與完整設備輸出。設備通訊可另外加入 C# 服務，沿用本專案的 JSON 模型與 API 邊界。
