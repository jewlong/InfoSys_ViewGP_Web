# ViewGP 操作手冊與教學檔案

一般使用者直接開啟以下檔案即可，不需要安裝文件產生工具。

- [PDF 操作手冊](../ViewGP-操作手冊.pdf)：適合閱讀、搜尋及列印，建議先讀第 2 章。
- [Word 操作手冊](../ViewGP-操作手冊.docx)：可編輯內容，首次開啟時可更新欄位與頁碼。
- [網頁操作手冊](../ViewGP-操作手冊.html)：可離線閱讀、以章節導覽跳轉，點擊圖片放大。
- [Markdown 原稿](../ViewGP-操作手冊.md)：供維護文件使用。
- [泵浦監控教學專案](examples/泵浦監控教學.json)：從 ViewGP「檔案 → 匯入專案…」載入，再儲存專案。
- [完整使用手冊套件](../ViewGP-使用手冊套件.zip)：包含 PDF、Word、網頁及教學專案。

手冊包含 12 個操作章節、3 個附錄及 22 張實際操作畫面，對應程式版本 4d3fbf1。教學專案預設離線，未配置設備映射，適合第一次操作。

## 維護者重新產生文件

在儲存庫根目錄依序執行：

```sh
npm ci
npm run build
npm run build:server
node scripts/generate-manual-screenshots.mjs
python3 scripts/render-user-manual.py
node scripts/print-user-manual.mjs
python3 scripts/package-user-manual.py
```

需要 Node.js 24、.NET 10 SDK、Chromium、Python 3 及 python-docx。可用 VIEWX_DOTNET_PATH 指定 dotnet 執行檔，用 VIEWX_BROWSER_PATH 指定 Chromium 執行檔。

截圖工具使用獨立的暫存資料庫與本機模擬 Modbus 設備，不修改使用者資料庫，也不連線到截圖設定中的示例設備位址。圖片與截圖索引位於本目錄；HTML 與 Word 由 Markdown 產生，PDF 由 HTML 列印產生。更新系統版本時，請一併核對手冊內容、基準版本與日期。
