import { useState } from "react";
import { widgetStyle, type WidgetProps } from "./types";
const severityLabels = { info: "資訊", warning: "警告", critical: "嚴重" };
export function AlarmWidget({
  element: e,
  running,
  disabled,
  alarmEvents = [],
  onAcknowledge,
}: WidgetProps) {
  const [activeOnly, setActiveOnly] = useState(false);
  const rows = alarmEvents
    .filter((event) => !activeOnly || event.clearedAt === undefined)
    .slice(0, e.alarmMaxRows ?? 20);
  return (
    <div
      className="advanced-widget alarm-widget"
      style={{ ...widgetStyle(e), background: e.background }}
    >
      <div className="alarm-heading">
        <span>{e.text}</span>
        <label>
          <input
            type="checkbox"
            aria-label={`${e.name}只看發生中`}
            checked={activeOnly}
            disabled={!running || disabled}
            onChange={(event) => setActiveOnly(event.target.checked)}
          />
          只看發生中
        </label>
      </div>
      <div className="alarm-scroll">
        <table>
          <thead>
            <tr>
              <th>發生時間</th>
              <th>訊息</th>
              <th>等級</th>
              <th>狀態</th>
              <th>確認</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((event) => (
              <tr key={event.id} data-severity={event.severity}>
                <td title={new Date(event.raisedAt).toLocaleString()}>
                  {new Date(event.raisedAt).toLocaleTimeString()}
                </td>
                <td>
                  {event.message}
                  <small>發生值：{String(event.value)}</small>
                </td>
                <td>{severityLabels[event.severity]}</td>
                <td
                  title={
                    event.clearedAt
                      ? `解除：${new Date(event.clearedAt).toLocaleString()}`
                      : undefined
                  }
                >
                  {event.clearedAt === undefined ? "發生中" : "已解除"}
                </td>
                <td>
                  {event.acknowledgedAt !== undefined ? (
                    <span
                      title={new Date(event.acknowledgedAt).toLocaleString()}
                    >
                      已確認
                    </span>
                  ) : (
                    <button
                      aria-label={`確認 ${event.message}`}
                      disabled={!running || disabled}
                      onClick={() => onAcknowledge?.(event.id)}
                    >
                      確認
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="alarm-empty">
                  {running
                    ? "目前沒有符合條件的警報"
                    : `${e.alarmRules?.length ?? 0} 項規則 · 預覽後開始監看`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="alarm-summary">
        {alarmEvents.filter((event) => event.clearedAt === undefined).length}{" "}
        項發生中 ·{" "}
        {
          alarmEvents.filter((event) => event.acknowledgedAt === undefined)
            .length
        }{" "}
        項未確認
      </div>
    </div>
  );
}
