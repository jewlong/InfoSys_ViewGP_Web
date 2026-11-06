import { scaleRatio, valueColor } from "../../services/advancedRules";
import { formatNumber } from "../../services/numberFormat";
import { LvglCanvas, drawLvglRoundedPart } from "./LvglCanvas";
import { widgetStyle, type WidgetProps } from "./types";

export function SliderWidget({
  element: e,
  values,
  running,
  disabled,
  onInput,
}: WidgetProps) {
  const rawValue = values[e.variableId ?? ""];
  const min = e.scaleMin ?? 0;
  const max = e.scaleMax ?? 100;
  const step = e.inputStep ?? 1;
  const numValue =
    typeof rawValue === "number" && Number.isFinite(rawValue)
      ? rawValue
      : min;
  const ratio = scaleRatio(numValue, e) ?? 0;
  const vertical = e.orientation === "vertical";
  const activeColor = valueColor(numValue, e);
  const trackColor = e.trackColor ?? "#334155";

  return (
    <LvglCanvas
      element={e}
      lvglClass="lv_slider"
      bgColor={e.background}
      deps={[numValue, ratio, vertical, min, max, e.showValue, disabled]}
      className={`advanced-widget slider-widget ${vertical ? "vertical" : "horizontal"}`}
      style={widgetStyle(e)}
      draw={(ctx, w, h) => {
        drawLvglRoundedPart(
          ctx,
          0,
          0,
          w,
          h,
          e.borderRadius ?? 8,
          e.background || "#18263b",
          e.borderColor ?? "#334155",
          e.borderWidth ?? 1,
          e.borderStyle ?? "solid",
        );

        if (vertical) {
          const trackW = Math.max(8, Math.min(16, w * 0.22));
          const padY = 18;
          const trackH = Math.max(12, h - padY * 2);
          const trackX = (w - trackW) / 2;
          const trackY = padY;
          drawLvglRoundedPart(ctx, trackX, trackY, trackW, trackH, trackW / 2, trackColor);
          const fillH = trackH * ratio;
          drawLvglRoundedPart(
            ctx,
            trackX,
            trackY + trackH - fillH,
            trackW,
            fillH,
            trackW / 2,
            activeColor,
          );
          const knobY = trackY + trackH * (1 - ratio);
          const knobR = Math.max(7, trackW * 0.85);
          ctx.beginPath();
          ctx.arc(w / 2, knobY, knobR, 0, Math.PI * 2);
          ctx.fillStyle = "#f8fafc";
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = activeColor;
          ctx.stroke();
        } else {
          const padX = 16;
          const trackH = Math.max(8, Math.min(14, h * 0.26));
          const trackW = Math.max(16, w - padX * 2);
          const trackX = padX;
          const trackY = e.showValue !== false ? h * 0.62 - trackH / 2 : (h - trackH) / 2;
          drawLvglRoundedPart(ctx, trackX, trackY, trackW, trackH, trackH / 2, trackColor);
          const fillW = trackW * ratio;
          drawLvglRoundedPart(ctx, trackX, trackY, fillW, trackH, trackH / 2, activeColor);
          const knobX = trackX + fillW;
          const knobY = trackY + trackH / 2;
          const knobR = Math.max(7, trackH * 0.85);
          ctx.beginPath();
          ctx.arc(knobX, knobY, knobR, 0, Math.PI * 2);
          ctx.fillStyle = "#f8fafc";
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = activeColor;
          ctx.stroke();
        }
      }}
    >
      {e.showValue !== false && (
        <div
          className="slider-header"
          style={{
            position: "absolute",
            top: 4,
            left: 10,
            right: 10,
            display: "flex",
            justifyContent: "space-between",
            fontSize: Math.max(10, Math.min(14, e.fontSize - 2)),
            color: e.color,
            pointerEvents: "none",
          }}
        >
          <span>{e.text}</span>
          <span className="slider-value" style={{ color: activeColor, fontWeight: 600 }}>
            {formatNumber(numValue, e)}
          </span>
        </div>
      )}
      <input
        type="range"
        aria-label={e.name}
        min={min}
        max={max}
        step={step}
        value={Math.max(min, Math.min(max, numValue))}
        disabled={!running || disabled}
        data-ratio={ratio}
        onChange={(ev) => {
          if (!running || disabled) return;
          onInput(ev.target.value);
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          cursor: !running || disabled ? "default" : "pointer",
          margin: 0,
        }}
      />
    </LvglCanvas>
  );
}
