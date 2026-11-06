import { LvglSurface } from "./LvglCanvas";
import { widgetStyle, type WidgetProps } from "./types";

export function IndicatorWidget({ element, values }: WidgetProps) {
  const value = Boolean(values[element.variableId ?? ""]);
  const activeColor = "#58d3ac";
  const offColor = "#42516a";

  return (
    <div
      className={"lamp " + (value ? "on" : "")}
      data-lvgl-class="lv_led"
      style={{
        ...widgetStyle(element),
        position: "relative",
        background: value ? activeColor : offColor,
        borderRadius: "50%",
        overflow: "hidden",
      }}
    >
      <LvglSurface
        element={element}
        lvglClass="lv_led"
        deps={[value]}
        draw={(ctx, w, h) => {
          const cx = w / 2;
          const cy = h / 2;
          const r = Math.max(2, Math.min(w, h) / 2 - 1);
          const grad = ctx.createRadialGradient(
            cx - r * 0.3,
            cy - r * 0.3,
            r * 0.1,
            cx,
            cy,
            r,
          );
          if (value) {
            grad.addColorStop(0, "#d1fae5");
            grad.addColorStop(0.55, activeColor);
            grad.addColorStop(1, "#0f766e");
          } else {
            grad.addColorStop(0, "#64748b");
            grad.addColorStop(1, "#1e293b");
          }
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }}
      />
    </div>
  );
}
