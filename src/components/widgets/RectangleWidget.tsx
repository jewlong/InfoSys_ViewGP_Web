import { borderStyle, widgetStyle, type WidgetProps } from "./types";
export function RectangleWidget({ element }: WidgetProps) {
  return (
    <div
      style={{
        ...widgetStyle(element),
        ...borderStyle(element, 1, 12),
        background:
          element.shapeFilled === false ? "transparent" : element.background,
      }}
    />
  );
}
