import { LvglSurface } from "./LvglCanvas";
import { widgetStyle, type WidgetProps } from "./types";

export function TextWidget({ element, values }: WidgetProps) {
  const content = element.variableId
    ? String(values[element.variableId] ?? element.text)
    : element.text;
  return (
    <div
      className="visual-text"
      data-lvgl-class="lv_label"
      style={{
        ...widgetStyle(element),
        position: "relative",
        fontFamily: element.fontFamily,
        fontWeight: element.fontWeight ?? "normal",
        fontStyle: element.italic ? "italic" : "normal",
        textDecoration: element.underline ? "underline" : "none",
        textAlign: element.textAlign ?? "left",
        alignItems: (
          { top: "flex-start", middle: "center", bottom: "flex-end" } as const
        )[element.verticalAlign ?? "middle"],
        whiteSpace: element.wordWrap === false ? "pre" : "pre-wrap",
        overflowWrap: element.wordWrap === false ? "normal" : "anywhere",
        lineHeight: element.lineHeight ?? 1.25,
        background: element.textBackground ? element.background : "transparent",
      }}
    >
      <LvglSurface
        element={element}
        lvglClass="lv_label"
        deps={[content, element.textBackground]}
        draw={(ctx, w, h) => {
          if (element.textBackground) {
            ctx.fillStyle = element.background;
            ctx.fillRect(0, 0, w, h);
          }
        }}
      />
      <span style={{ width: "100%", minWidth: 0, position: "relative", zIndex: 1 }}>
        {content}
      </span>
    </div>
  );
}
