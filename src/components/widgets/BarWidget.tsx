import { scaleRatio, valueColor } from "../../services/advancedRules";
import { formatNumber } from "../../services/numberFormat";
import { widgetStyle, type WidgetProps } from "./types";
export function BarWidget({ element: e, values }: WidgetProps) {
  const value = values[e.variableId ?? ""],
    ratio = scaleRatio(value, e);
  const vertical = e.orientation === "vertical";
  return (
    <div
      className={`advanced-widget bar-widget ${vertical ? "vertical" : "horizontal"}`}
      style={{ ...widgetStyle(e), background: e.background }}
    >
      <div className="advanced-title">{e.text}</div>
      <div
        className="bar-track"
        role="meter"
        aria-label={e.name}
        aria-valuemin={e.scaleMin ?? 0}
        aria-valuemax={e.scaleMax ?? 100}
        aria-valuenow={
          ratio !== undefined
            ? Math.max(
                e.scaleMin ?? 0,
                Math.min(e.scaleMax ?? 100, value as number),
              )
            : undefined
        }
        aria-valuetext={formatNumber(value, e)}
        style={{ background: e.trackColor ?? "#334155" }}
      >
        <div
          className="bar-fill"
          data-ratio={ratio}
          style={{
            background: valueColor(value, e),
            ...(vertical
              ? { height: `${(ratio ?? 0) * 100}%`, width: "100%" }
              : { width: `${(ratio ?? 0) * 100}%`, height: "100%" }),
          }}
        />
      </div>
      {e.showScale !== false && (
        <div className="bar-scale">
          <span>{e.scaleMin ?? 0}</span>
          <span>{e.scaleMax ?? 100}</span>
        </div>
      )}
      {e.showValue !== false && (
        <div className="bar-value">{formatNumber(value, e)}</div>
      )}
    </div>
  );
}
