import { widgetStyle, type WidgetProps } from "./types";
export function LineWidget({ element }: WidgetProps) {
  if (
    element.borderWidth === undefined &&
    element.borderStyle === undefined &&
    element.borderColor === undefined
  )
    return (
      <div
        style={{ ...widgetStyle(element), background: element.background }}
      />
    );
  return (
    <div
      style={{ ...widgetStyle(element), display: "flex", alignItems: "center" }}
    >
      <div
        style={{
          width: "100%",
          borderTop: `${element.borderWidth ?? element.height}px ${element.borderStyle ?? "solid"} ${element.borderColor ?? element.background}`,
        }}
      />
    </div>
  );
}
