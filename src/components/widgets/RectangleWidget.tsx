import { LvglSurface, drawLvglRoundedPart } from "./LvglCanvas";
import { borderStyle, widgetStyle, type WidgetProps } from "./types";

export function RectangleWidget({ element }: WidgetProps) {
  const filled = element.shapeFilled !== false;
  return (
    <div
      data-lvgl-class="lv_obj"
      style={{
        ...widgetStyle(element),
        ...borderStyle(element, 1, 12),
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
          drawLvglRoundedPart(
            ctx,
            0,
            0,
            w,
            h,
            element.borderRadius ?? 12,
            filled ? element.background : "transparent",
          );
        }}
      />
    </div>
  );
}
