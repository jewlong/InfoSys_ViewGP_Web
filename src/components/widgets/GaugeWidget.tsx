import { scaleRatio, valueColor } from "../../services/advancedRules";
import { formatNumber } from "../../services/numberFormat";
import { widgetStyle, type WidgetProps } from "./types";
export function GaugeWidget({ element: e, values }: WidgetProps) {
  const value = values[e.variableId ?? ""],
    ratio = scaleRatio(value, e);
  const angle = Math.PI * (1 + (ratio ?? 0));
  return (
    <div
      className="advanced-widget gauge-widget"
      style={{ ...widgetStyle(e), background: e.background }}
    >
      <svg
        viewBox="0 0 240 180"
        role="img"
        aria-label={`${e.text}：${formatNumber(value, e)}`}
      >
        <text x="120" y="22" textAnchor="middle" fill={e.color}>
          {e.text}
        </text>
        <path
          d="M34 120 A86 86 0 0 1 206 120"
          fill="none"
          stroke={e.trackColor ?? "#334155"}
          strokeWidth="14"
          strokeLinecap="round"
        />
        {ratio !== undefined && (
          <>
            <path
              d="M34 120 A86 86 0 0 1 206 120"
              fill="none"
              stroke={valueColor(value, e)}
              strokeWidth="14"
              pathLength="100"
              strokeDasharray={`${ratio * 100} 100`}
            />
            <line
              className="gauge-needle"
              x1="120"
              y1="120"
              x2={120 + Math.cos(angle) * 70}
              y2={120 + Math.sin(angle) * 70}
              stroke={e.color}
              strokeWidth="3"
              data-ratio={ratio}
            />
            <circle cx="120" cy="120" r="6" fill={e.color} />
          </>
        )}
        {e.showScale !== false && (
          <g fontSize="12" fill={e.color}>
            <text x="32" y="146">
              {e.scaleMin ?? 0}
            </text>
            <text x="208" y="146" textAnchor="end">
              {e.scaleMax ?? 100}
            </text>
          </g>
        )}
        {e.showValue !== false && (
          <text
            className="gauge-value"
            x="120"
            y="167"
            textAnchor="middle"
            fill={valueColor(value, e)}
            fontSize={Math.min(30, e.fontSize)}
          >
            {formatNumber(value, e)}
          </text>
        )}
      </svg>
    </div>
  );
}
