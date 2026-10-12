import type { AlarmEvent } from "../../types/runtime";

const labels = { info: "資訊", warning: "警告", critical: "嚴重" };
const reasons = {
  condition: "條件恢復",
  masked: "遮罩抑制",
  disabled: "停用",
  invalidValue: "無效 Word",
  sessionEnded: "模擬結束",
};
export function AlarmEventTable({
  events,
  onAcknowledge,
}: {
  events: AlarmEvent[];
  onAcknowledge?: (id: string) => void;
}) {
  const time = (value?: number) =>
    value === undefined ? "—" : new Date(value).toLocaleString("zh-TW");
  return (
    <div className="alarm-history-scroll">
      <table className="alarm-event-table">
        <thead>
          <tr>
            <th>發生時間</th>
            <th>來源／群組</th>
            <th>訊息</th>
            <th>等級</th>
            <th>解除時間／原因</th>
            <th>確認時間</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} data-severity={event.severity}>
              <td>{time(event.raisedAt)}</td>
              <td>
                {event.areaName ?? "元件警報"}
                <small>
                  {event.group || "未分類"}
                  {event.bit !== undefined ? ` · Bit ${event.bit}` : ""}
                </small>
              </td>
              <td>
                {event.message}
                <small>發生值：{String(event.value)}</small>
              </td>
              <td>{labels[event.severity]}</td>
              <td>
                {event.clearedAt === undefined
                  ? "發生中"
                  : time(event.clearedAt)}
                <small>
                  {event.clearedReason ? reasons[event.clearedReason] : ""}
                </small>
              </td>
              <td>
                {event.acknowledgedAt !== undefined ? (
                  time(event.acknowledgedAt)
                ) : onAcknowledge ? (
                  <button
                    onClick={() => onAcknowledge(event.id)}
                    aria-label={`確認 ${event.message}`}
                  >
                    確認
                  </button>
                ) : (
                  "未確認"
                )}
              </td>
            </tr>
          ))}
          {!events.length && (
            <tr>
              <td colSpan={6}>目前沒有警報紀錄</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
