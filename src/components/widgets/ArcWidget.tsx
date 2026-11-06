import { scaleRatio, valueColor } from "../../services/advancedRules";
import { formatNumber } from "../../services/numberFormat";
import { LvglCanvas, drawLvglRoundedPart } from "./LvglCanvas";
import { widgetStyle, type WidgetProps } from "./types";

export function ArcWidget({
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
  const activeColor = valueColor(numValue, e);
  const trackColor = e.trackColor ?? "#334155";

  const updateFromPointer = (clientX: number, clientY: number, rect: DOMRect) => {
    if (!running || disabled || max <= min) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.54;
    let deg = (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    // LVGL lv_arc default sweep: 135 deg to 405 deg (270 deg span)
    let normDeg = deg < 90 ? deg + 360 : deg;
    normDeg = Math.max(135, Math.min(405, normDeg));
    const nextRatio = (normDeg - 135) / 270;
    const raw = min + nextRatio * (max - min);
    const snapped =
      step > 0 ? Math.round((raw - min) / step) * step + min : raw;
    const clamped = Math.max(min, Math.min(max, Number(snapped.toFixed(6))));
    onInput(String(clamped));
  };

  return (
    <LvglCanvas
      element={e}
      lvglClass="lv_arc"
      bgColor={e.background}
      deps={[numValue, ratio, min, max, e.showValue, e.showScale, disabled]}
      className="advanced-widget arc-widget"
      style={widgetStyle(e)}
      draw={(ctx, w, h) => {
        drawLvglRoundedPart(
          ctx,
          0,
          0,
          w,
          h,
          e.borderRadius ?? 10,
          e.background || "#18263b",
          e.borderColor ?? "#334155",
          e.borderWidth ?? 1,
          e.borderStyle ?? "solid",
        );

        const cx = w / 2;
        const cy = h * 0.54;
        const radius = Math.max(16, Math.min(w, h) * 0.36);
        const thickness = Math.max(8, radius * 0.22);
        const startRad = (135 * Math.PI) / 180;
        const endRad = (405 * Math.PI) / 180;
        const valRad = startRad + ratio * (endRad - startRad);

        // LV_PART_MAIN background arc
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startRad, endRad, false);
        ctx.strokeStyle = trackColor;
        ctx.lineWidth = thickness;
        ctx.lineCap = "round";
        ctx.stroke();

        // LV_PART_INDICATOR foreground arc
        if (ratio > 0) {
          ctx.beginPath();
          ctx.arc(cx, cy, radius, startRad, valRad, false);
          ctx.strokeStyle = activeColor;
          ctx.lineWidth = thickness;
          ctx.lineCap = "round";
          ctx.stroke();
        }

        // LV_PART_KNOB
        const kx = cx + Math.cos(valRad) * radius;
        const ky = cy + Math.sin(valRad) * radius;
        ctx.beginPath();
        ctx.arc(kx, ky, thickness * 0.72, 0, Math.PI * 2);
        ctx.fillStyle = "#f8fafc";
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = activeColor;
        ctx.stroke();
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 8px",
          pointerEvents: "none",
          color: e.color,
        }}
      >
        <span style={{ fontSize: Math.max(11, e.fontSize - 3) }}>{e.text}</span>
        {e.showValue !== false && (
          <span
            className="arc-value"
            style={{
              fontSize: Math.max(13, e.fontSize),
              fontWeight: 700,
              color: activeColor,
              marginTop: "auto",
              marginBottom: e.showScale !== false ? 14 : 8,
            }}
          >
            {formatNumber(numValue, e)}
          </span>
        )}
        {e.showScale !== false && (
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              opacity: 0.85,
            }}
          >
            <span>{min}</span>
            <span>{max}</span>
          </div>
        )}
      </div>
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
        onPointerDown={(ev) => {
          if (!running || disabled) return;
          const rect = ev.currentTarget.getBoundingClientRect();
          updateFromPointer(ev.clientX, ev.clientY, rect);
        }}
        onPointerMove={(ev) => {
          if (!running || disabled || (ev.buttons & 1) === 0) return;
          const rect = ev.currentTarget.getBoundingClientRect();
          updateFromPointer(ev.clientX, ev.clientY, rect);
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          cursor: !running || disabled ? "default" : "grab",
          margin: 0,
        }}
      />
    </LvglCanvas>
  );
}
