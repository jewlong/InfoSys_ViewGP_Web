import { widgetStyle, type WidgetProps } from "./types";
export function RectangleWidget({ element }: WidgetProps) {
  return (
    <div
      style={{
        ...widgetStyle(element),
        background: element.background,
        borderRadius: 12,
        border: "1px solid #ffffff09",
      }}
    />
  );
}
