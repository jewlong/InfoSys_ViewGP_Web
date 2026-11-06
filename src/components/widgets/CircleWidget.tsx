import { LvglSurface } from "./LvglCanvas";
import { borderStyle, widgetStyle, type WidgetProps } from "./types";

export function CircleWidget({ element }: WidgetProps) {
  const filled = element.shapeFilled !== false;
  return (
    <div
      data-lvgl-class="lv_obj"
      style={{
        ...widgetStyle(element),
        ...borderStyle(element, 0, 0),
        position: "relative",
        overflow: "hidden",
        background: filled ? element.background : "transparent",
      }}
    >
      <LvglSurface
        element={element}
        lvglClass="lv_obj"
        deps={[filled]}
        draw={(ctx, w, h) => {
          if (!filled) return;
          ctx.beginPath();
          ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fillStyle = element.background;
          ctx.fill();
        }}
      />
    </div>
  );
}
