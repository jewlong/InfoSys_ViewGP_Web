import { scaleRatio } from "../../services/advancedRules";
import { formatNumber } from "../../services/numberFormat";
import { LvglSurface, drawLvglRoundedPart } from "./LvglCanvas";
import { widgetStyle, type WidgetProps } from "./types";

export function TrendWidget({
  element: e,
  values,
  running,
  samples = [],
}: WidgetProps) {
  const min = e.scaleMin ?? 0,
    max = e.scaleMax ?? 100;
  const data = running
    ? samples
    : Array.from({ length: 12 }, (_, i) => ({
        time: i * (e.sampleInterval ?? 1000),
        value: min + (max - min) * (0.5 + Math.sin(i / 2) * 0.25),
      }));
  const first = data[0]?.time ?? 0,
    last = data[data.length - 1]?.time ?? first;
  const points = data
    .map(
      (point) =>
        `${52 + (last === first ? 0 : (point.time - first) / (last - first)) * 330},${150 - (scaleRatio(point.value, e) ?? 0) * 110}`,
    )
    .join(" ");
  return (
    <div
      className="advanced-widget trend-widget"
      data-lvgl-class="lv_chart"
      style={{ ...widgetStyle(e), background: e.background, position: "relative" }}
    >
      <LvglSurface
        element={e}
        lvglClass="lv_chart"
        deps={[data.length, first, last, min, max]}
        draw={(ctx, w, h) => {
          drawLvglRoundedPart(ctx, 0, 0, w, h, 8, e.background || "#18263b");
        }}
      />
      <svg
        viewBox="0 0 400 200"
        role="img"
        aria-label={`${e.text}趨勢`}
        style={{ position: "relative", zIndex: 1 }}
      >
        <text x="12" y="22" fill={e.color}>
          {e.text}
        </text>
        {e.showValue !== false && (
          <text x="384" y="22" textAnchor="end" fill={e.fillColor ?? "#38bdf8"}>
            {formatNumber(values[e.variableId ?? ""], e)}
          </text>
        )}
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line
              x1="52"
              x2="382"
              y1={150 - ratio * 110}
              y2={150 - ratio * 110}
              stroke={e.trackColor ?? "#334155"}
            />
            {e.showScale !== false && (
              <text
                x="45"
                y={154 - ratio * 110}
                textAnchor="end"
                fill={e.color}
                fontSize="11"
              >
                {formatNumber(min + (max - min) * ratio, {
                  ...e,
                  unit: undefined,
                  numberPrefix: undefined,
                })}
              </text>
            )}
          </g>
        ))}
        {data.length > 1 && (
          <polyline
            className="trend-line"
            points={points}
            fill="none"
            stroke={e.fillColor ?? "#38bdf8"}
            strokeWidth="2"
            data-samples={data.length}
          />
        )}
        {data.length === 1 && (
          <circle
            cx="52"
            cy={150 - (scaleRatio(data[0].value, e) ?? 0) * 110}
            r="3"
            fill={e.fillColor ?? "#38bdf8"}
          />
        )}
        <text x="52" y="171" fill={e.color} fontSize="11">
          {running && data.length
            ? new Date(first).toLocaleTimeString()
            : "0 秒"}
        </text>
        <text x="382" y="171" textAnchor="end" fill={e.color} fontSize="11">
          {((last - first) / 1000).toFixed(1)} 秒
        </text>
        <text
          className="trend-status"
          x="200"
          y="191"
          textAnchor="middle"
          fill={e.color}
          fontSize="11"
        >
          {running
            ? `${samples.length} 筆 · ${(e.sampleInterval ?? 1000) / 1000} 秒／筆`
            : "示意資料 · 預覽後開始取樣"}
        </text>
      </svg>
    </div>
  );
}
