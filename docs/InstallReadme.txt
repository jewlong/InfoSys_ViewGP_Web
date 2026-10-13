
A. 必要軟體安裝
    # 1.  Node.js：v24.0.0 或以上（依 package.json 要求）。
    # 2. .NET SDK：.NET 10.0 SDK（依 global.json 10.0.100 要求）。

B. 安裝相依套件與建置
    # 1. 取得原始碼並切換至專案根目錄
    cd Code/InfoSys_ViewGP_Web

    # 2. 還原前端模組
    npm ci

    # 3. 還原 C# 後端 NuGet 套件
    dotnet restore server/ViewX.Server.csproj --locked-mode

    # 4. 編譯前端網頁
    npm run build


C.執行系統
    # 1. 單一服務模式（如同正式環境，由 C# 提供網頁與 API）：
     npm start


    # 2.若要執行專案，請依序執行：
     dotnet run server/ViewX.Server.csproj

    # 3. 啟動前端 React 開發伺服器（另開一個終端機）
     npm start
