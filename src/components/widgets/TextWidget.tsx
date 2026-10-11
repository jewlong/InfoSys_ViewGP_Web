import { widgetStyle, type WidgetProps } from "./types";
export function TextWidget({ element, values }: WidgetProps) {
  const content = element.variableId
    ? String(values[element.variableId] ?? element.text)
    : element.text;
  return (
    <div
      className="visual-text"
      style={{
        ...widgetStyle(element),
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
      <span style={{ width: "100%", minWidth: 0 }}>{content}</span>
    </div>
  );
}
