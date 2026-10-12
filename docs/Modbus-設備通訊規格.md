# Modbus 設備通訊與標籤映射

目前支援 Modbus TCP 與 COM／Modbus RTU，使用相同標籤映射、PDU 編解碼、輪詢及寫入規則。舊 schemaVersion 1 專案不必遷移，沒有設備設定時維持離線模擬。

## 操作流程

1. 開啟「檔案 → 通訊設備與標籤」，新增設備。
2. TCP：設定後端可存取的 IP／主機名稱、Port（預設 502）及 Unit ID。
3. RTU：設定後端的 COM 埠（Windows 如 COM3；Linux 如 /dev/ttyUSB0）、鮑率、同位元檢查、停止位元與站號。可掃描後端串列埠；服務帳號需具有該埠存取權。
4. 切到「標籤映射」，將既有布林或數值變數對應至設備資料區、位址及型別。也可從變數設定視窗編輯。新映射預設唯讀，需要操作時明確改成讀寫。
5. 儲存專案，選擇「設備連線」，關閉設定後按「執行專案」或「預覽」。
6. 從右側變數監看及「通訊狀態」查看值、失效狀態與最後成功時間。停止執行會關閉本頁通訊工作階段。

執行來源選擇屬於目前頁面的操作狀態，不隨專案保存；開啟／匯入另一專案時回到離線模式，載入專案或啟動後端不會自行連接設備。沒有映射的標籤在連線模式仍為內部記憶體變數。

## 通訊位置

React 瀏覽器透過同來源 API 取得 C# 後端的通訊快照（約每 500 ms）；C# 負責設備輪詢及讀寫。IP 與 COM 名稱均相對於後端所在電腦。

若設備位於使用者端、後端位於其他網路，必須讓後端具備到現場設備的路由／VPN，或在現場執行後端。本次未加入現場代理程式、Web Serial 或穿透 NAT 功能。

## devices[] 設備欄位

設備最多 32 個。每個設備代表一個站號；目前每個啟用 RTU 設備必須使用獨立串列埠，同埠多站輪詢尚未支援。

| 欄位           | 型別    | 規格                                                               |
| -------------- | ------- | ------------------------------------------------------------------ |
| id             | string  | 非空、唯一，最多 200 字元                                          |
| name           | string  | 非空，最多 200 字元                                                |
| transport      | string  | tcp／rtu                                                           |
| enabled        | boolean | 是否啟用；停用設備的映射標籤標示失效                               |
| unitId         | integer | TCP：0–255；RTU：1–247，不提供 RTU 站號 0 廣播寫入                 |
| pollIntervalMs | integer | 100–60000 ms；完整輪詢完成後的等待間隔，通訊耗時會影響實際更新週期 |
| timeoutMs      | integer | 100–10000 ms；單次交換的逾時                                       |
| host           | string  | TCP 必填，主機名稱或 IP，不填 URL，最多 253 字元                   |
| port           | integer | TCP 必填，1–65535，預設 502                                        |
| serialPort     | string  | RTU 必填，後端作業系統串列埠名稱                                   |
| baudRate       | integer | RTU：1200／2400／4800／9600／19200／38400／57600／115200           |
| parity         | string  | RTU：none／even／odd                                               |
| dataBits       | integer | RTU 固定 8                                                         |
| stopBits       | integer | RTU：1／2                                                          |

## variables[].modbus 標籤映射

可選欄位；省略時為內部變數。專案最多 1000 個映射標籤，設備 ID 必須存在。系統變數不能映射到設備，文字／ASCII 暫存器尚未提供。

| 欄位      | 型別    | 規格                                                      |
| --------- | ------- | --------------------------------------------------------- |
| deviceId  | string  | 對應 devices[].id                                         |
| area      | string  | coil／discreteInput／holdingRegister／inputRegister       |
| address   | integer | 通訊封包的 **0 起算位址**，0–65535；32 位元資料最大 65534 |
| dataType  | string  | 接點：bool；暫存器：uint16／int16／uint32／int32／float32 |
| wordOrder | string  | highFirst／lowFirst；32 位元的高／低 Word 順序            |
| scale     | number  | 有限非零倍率，絕對值 1e-12–1e12；接點固定 1               |
| offset    | number  | 有限偏移，絕對值不超過 1e12；接點固定 0                   |
| access    | string  | read／readWrite；Discrete Input、Input Register 強制唯讀  |

- 暫存器內每個 Word 採 Modbus 大端序；32 位元只支援高低 Word 交換，不提供單 Word 內 byte swap。
- 顯示值＝設備原始值 × scale＋offset；寫入時反向換算。整數型別換算後必須為整數且在該型別範圍內（允許 1e-7 浮點誤差）。
- float32 採 IEEE 754；讀取 NaN／Infinity 或換算後非有限值會標記設備資料失效。
- 40001 通常表示 Holding Register 位址 0，30001 通常表示 Input Register 位址 0；廠商可能採不同編號，設定需以設備手冊為準。
- 同資料區的相鄰／重疊標籤合併讀取，不跨未映射間隙。每包最多 125 Words 或 2000 Bits。32 位元標籤完整讀取，不拆開。
- 讀取功能碼：01／02／03／04。寫入功能碼：05（單 Coil）、06（單 Word）、16（雙 Word）。

例如將暫存器 40001 的原始值 265 顯示為 26.5：

```json
{
  "id": "temperature",
  "name": "溫度",
  "type": "number",
  "initial": 0,
  "modbus": {
    "deviceId": "plc",
    "area": "holdingRegister",
    "address": 0,
    "dataType": "uint16",
    "wordOrder": "highFirst",
    "scale": 0.1,
    "offset": 0,
    "access": "readWrite"
  }
}
```

## 狀態、寫入與警報

每個設備的讀取與寫入序列化執行。TCP 驗證 transaction ID、protocol ID、Unit ID、長度及功能碼；RTU 驗證站號、CRC、長度及功能碼。

- 讀取失敗使該設備全部映射標籤失效，下次輪詢重新建立連線。後端保留最後成功值／時間，但網頁使用失效標示並停用寫入，不以 0 取代。
- 寫入必須綁定可寫資料區、設定 readWrite，且已有有效讀取。輸入框、按鈕及開關的寫入由後端驗證，再執行設備寫入與讀回。畫面採實際讀回值，不預先修改成輸入值。
- 寫入回應或讀回失敗會提示「寫入未能確認」，不自動重送。設備可能已接受指令；操作者需檢查實際狀態。
- 點動按鈕按下寫 true、放開寫 false；正常失焦、畫面切換／停止會嘗試釋放。瀏覽器強制關閉、斷線或設備失聯無法保證釋放送達；設備端仍須自行處理命令逾時與互鎖。
- Word 警報與遮罩可直接綁定設備 uint16 標籤，倍率 1、偏移 0。當 Word 或遮罩資料失效時，暫停該區判斷並保留原警報；恢復有效讀取後才重新判斷。元件級警報同樣跳過失效標籤，趨勢不採集失效值。
- 警報判斷、跑馬燈、確認操作及事件同步仍在開啟的網頁中執行；關閉網頁後不持續監控。若要求現場離線持續警報與歷史補傳，需另建現場代理及採集服務。

## API 與生命週期

| 方法／路徑                                         | 用途                                                    |
| -------------------------------------------------- | ------------------------------------------------------- |
| GET /api/communication/serial-ports                | 列出後端串列埠名稱                                      |
| POST /api/communication/sessions                   | body：{ project }；驗證目前專案快照並開始輪詢           |
| GET /api/communication/sessions/{sessionId}        | 快照與保活                                              |
| POST /api/communication/sessions/{sessionId}/write | body：{ variableId, value }；寫入並讀回，回傳 { value } |
| POST /api/communication/sessions/{sessionId}/end   | body：{}；停止，重複呼叫仍成功                          |

快照含 sessionId、projectId、devices 與 tags。TagSample 為 { value, quality, updatedAt, error }；quality 為 waiting／good／bad，updatedAt 是最後成功 UTC Unix 毫秒。DeviceSample 為 { id, state, lastSuccessAt, error }，state 為 connecting／connected／error／disabled／unmapped（未綁定標籤）。

目前頁面各自建立隨機 ID 工作階段（全後端最多 16 個）。RTU 串列埠由一個工作階段獨占。正常停止及離頁會結束；超過 30 秒沒有快照／寫入請求的工作階段自動回收，後端重啟也不會恢復連線。瀏覽器背景節流可能造成工作階段回收，需停止後重新執行。

寫入 API 延用同來源及 application/json 限制；目前應用仍沒有登入權限機制，工作階段 ID 不代替使用者驗證。部署存取方式沿用既有單人環境。

## SQLite 保存與驗證

設備設定與位址映射保存於 projects.content 及 versions.content JSON；還原版本及 JSON 匯入／匯出包含設定。通訊工作階段、即時值與連線錯誤只在記憶體，不新增 SQL 資料表。現有警報歷史仍保存在 alarm_sessions／alarm_events。

驗證指令：

- npm test：模型相容、映射限制、寫入範圍與資料失效時保留警報。
- npm run test:server：PDU 編解碼、32 位元精度、批次分段、CRC、TCP 分段接收及交易編號驗證。
- npm run build && npm run test:communication：隔離 Modbus TCP peer、API 及 Chromium，包含資料區、讀寫、故障重連、前端控制、Word 遮罩與 SQLite 警報歷史。
- Linux 上的 test:communication 另使用 Python 3 與 PTY 執行實際 System.IO.Ports RTU 讀寫、CRC 拒收及重連。其他平台跳過 PTY 部分。

測試沒有連接實體 PLC／RS-485 硬體；正式設備仍需核對廠商位址、站號、序列參數與暫存器順序。
