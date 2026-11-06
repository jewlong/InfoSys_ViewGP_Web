import { scaleRatio, valueColor } from "../../services/advancedRules";
import { formatNumber } from "../../services/numberFormat";
import { LvglSurface, drawLvglRoundedPart } from "./LvglCanvas";
import { widgetStyle, type WidgetProps } from "./types";

export function BarWidget({ element: e, values }: WidgetProps) {
  const value = values[e.variableId ?? ""],
    ratio = scaleRatio(value, e);
  const vertical = e.orientation === "vertical";
  const fillCol = valueColor(value, e);
  return (
    <div
      className={`advanced-widget bar-widget ${vertical ? "vertical" : "horizontal"}`}
      data-lvgl-class="lv_bar"
      style={{ ...widgetStyle(e), background: e.background, position: "relative" }}
    >
      <LvglSurface
        element={e}
        lvglClass="lv_bar"
        deps={[value, ratio, vertical, fillCol]}
        draw={(ctx, w, h) => {
          drawLvglRoundedPart(ctx, 0, 0, w, h, 8, e.background || "#18263b");
        }}
      />
      <div className="advanced-title" style={{ position: "relative", zIndex: 1 }}>
        {e.text}
      </div>
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
        style={{ background: e.trackColor ?? "#334155", position: "relative", zIndex: 1 }}
      >
        <div
          className="bar-fill"
          data-ratio={ratio}
          style={{
            background: fillCol,
            ...(vertical
              ? { height: `${(ratio ?? 0) * 100}%`, width: "100%" }
              : { width: `${(ratio ?? 0) * 100}%`, height: "100%" }),
          }}
        />
      </div>
      {e.showScale !== false && (
        <div className="bar-scale" style={{ position: "relative", zIndex: 1 }}>
          <span>{e.scaleMin ?? 0}</span>
          <span>{e.scaleMax ?? 100}</span>
        </div>
      )}
      {e.showValue !== false && (
        <div className="bar-value" style={{ position: "relative", zIndex: 1 }}>
          {formatNumber(value, e)}
        </div>
      )}
    </div>
  );
}
