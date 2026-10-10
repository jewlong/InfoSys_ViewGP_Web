# ViewX Studio

Web 畫面規劃工具：**TypeScript + React 前端、C# + ASP.NET Core 後端、SQLite 儲存**。瀏覽器執行使用模擬資料，無須舊 `.vxf` 或原有 HMI。

## 必要工具

- Node.js **24 以上**（前端工具與測試）。
- **.NET 10 SDK**（不是只有 Runtime）。`dotnet --version` 應顯示 `10.0.x`；SDK 選擇由 `global.json` 管理。

以下指令都在儲存庫根目錄執行，可用於 Windows PowerShell、macOS 與 Linux。

## 開發模式

第一次準備：

```sh
npm ci
dotnet restore server/ViewX.Server.csproj --locked-mode
```

開兩個終端機：

```sh
# 終端機 1：C# API，port 5000
npm run dev:server
# 等同 dotnet run --project server/ViewX.Server.csproj
```

```sh
# 終端機 2：React / Vite，port 3000
npm run dev
```

瀏覽器開啟 **http://localhost:3000**。Vite 將 `/api` 請求轉送至 C# 的 http://localhost:5000，因此不需要設定 CORS。儲存時若顯示連線失敗，先確認 API 終端機已啟動。

## 單一服務執行

```sh
npm ci
npm run build
npm start
```

`npm start` 使用 C# 同時提供建置後的網頁與 API，瀏覽器開啟 **http://localhost:3000**；不需要啟動 Vite。這個指令沒有使用 Bash 環境變數語法，可在 Windows 執行。

若只需要 C# 後端，可直接執行 `dotnet run --project server/ViewX.Server.csproj`。正式網頁需先 `npm run build`。

## 發布

```sh
npm run build
npm run publish:server
```

輸出位於 `artifacts/server`，包含前端 `wwwroot` 及 C# 伺服器。部署機器需要 .NET 10 ASP.NET Core Runtime，前端建置完成後不再需要 Node.js。

```sh
cd artifacts/server
dotnet ViewX.Server.dll --urls http://localhost:3000
```

## 功能與手動測試

- 檔案、編輯、檢視、畫面、元件、排列、變數、執行、說明選單。
- 多畫面管理、起始畫面設定、10 種基本元件。
- 拖拉、調整尺寸、多選、對齊、群組、圖層、鎖定、格線、復原／重做。
- 數值／布林／文字變數、資料綁定、顯示／啟用條件、模擬值監看。
- SQLite 專案保存、版本紀錄、版本衝突保護、JSON 匯入／匯出。

首次開啟會顯示尚未儲存的示範產線：按「執行專案」→「啟動／停止」，指示燈應改變；按「＋計數」，數值應增加。停止後新增元件、修改屬性、儲存，再從專案清單重開確認設定保留。

## 自動測試

```sh
npm run build
npm test
npm run test:server
npm run test:api
npx playwright install chromium
npm run test:browser
npm run test:dev
```

- `npm test`：前端 JSON 資料格式驗證。
- `npm run test:server`：C# 驗證器、SQLite 保存／版本及並行寫入測試。
- `npm run test:api`：以舊 Node.js 建立的 SQLite 檔案驗證 C# 讀寫相容性、重啟保存、驗證器一致性、HTTP 狀態、請求大小限制及靜態網頁。
- `npm run test:browser`：透過 C# 後端實際測試編輯、模擬、儲存／重開、匯入／匯出及畫面切換。

`npm run test:dev` 另驗證 Vite 開發代理及前後端分開啟動時的儲存／重開流程。

整合與瀏覽器測試會自行啟動隔離 C# 服務並使用暫存 SQLite，不修改使用者的專案資料。可用 `VIEWX_BROWSER_PATH` 指向已安裝的 Chromium；若 `dotnet` 不在 PATH，可設定 `VIEWX_DOTNET_PATH`。

## 既有資料與設定

原本 `.data/viewx.db` **直接沿用**；`projects`、`versions` 資料表與 JSON 格式不變，不需要轉換或刪除資料。每次儲存會增加版本；過期版本寫入回傳 HTTP 409。圖片仍內嵌於 JSON，單張上限 3 MB，請求上限 20 MB。

| 設定                  | 說明                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `VIEWX_DB_PATH`       | SQLite 檔案路徑；預設為儲存庫的 `.data/viewx.db`，發布後為執行目錄的 `.data/viewx.db`。相對路徑依 C# 工作目錄解析，建議使用絕對路徑。 |
| `VIEWX_API_URL`       | Vite 開發代理的後端位置；預設 `http://localhost:5000`。                                                                               |
| ASP.NET Core `--urls` | C# 監聽位址，例如 `dotnet run --project server/ViewX.Server.csproj --no-launch-profile -- --urls http://localhost:5100`。             |

舊 Node.js 的 `HOST`、`PORT`、`NODE_ENV` 不再用於啟動後端。健康檢查仍為 `GET /api/health`，回傳 `{ "status": "ok", "storage": "sqlite" }`。

資料庫不納入 Git。備份應使用 SQLite Online Backup API 或關閉服務後備份；運行中不要僅複製 `.db` 而忽略 WAL 資料。發布產物不包含專案資料，部署時須保留／指向原有資料庫。

## 目前範圍

這是單人模擬版本。PLC／設備通訊、背景採集、警報、多國語言、趨勢圖、登入權限、多人協作、版本還原介面及 IndexedDB 草稿尚未實作。預設僅監聽本機，正式對外部署前需要身分驗證、HTTPS 與存取控制。
