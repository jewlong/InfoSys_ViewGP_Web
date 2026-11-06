import { LvglSurface } from "./LvglCanvas";
import { widgetStyle, type WidgetProps } from "./types";

export function LineWidget({ element }: WidgetProps) {
  if (
    element.borderWidth === undefined &&
    element.borderStyle === undefined &&
    element.borderColor === undefined
  )
    return (
      <div
        data-lvgl-class="lv_line"
        style={{
          ...widgetStyle(element),
          position: "relative",
          background: element.background,
        }}
      >
        <LvglSurface
          element={element}
          lvglClass="lv_line"
          draw={(ctx, w, h) => {
            ctx.fillStyle = element.background;
            ctx.fillRect(0, 0, w, h);
          }}
        />
      </div>
    );
  return (
    <div
      data-lvgl-class="lv_line"
      style={{
        ...widgetStyle(element),
        position: "relative",
        display: "flex",
        alignItems: "center",
      }}
    >
      <LvglSurface
        element={element}
        lvglClass="lv_line"
        draw={(ctx, w, h) => {
          ctx.strokeStyle = element.borderColor ?? element.background;
          ctx.lineWidth = element.borderWidth ?? element.height;
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.stroke();
        }}
      />
      <div
        style={{
          width: "100%",
          position: "relative",
          zIndex: 1,
          borderTop: `${element.borderWidth ?? element.height}px ${element.borderStyle ?? "solid"} ${element.borderColor ?? element.background}`,
        }}
      />
    </div>
  );
}
