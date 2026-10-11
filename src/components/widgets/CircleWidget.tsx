import { borderStyle, widgetStyle, type WidgetProps } from "./types";
export function CircleWidget({ element }: WidgetProps) {
  return (
    <div
      style={{
        ...widgetStyle(element),
        ...borderStyle(element, 0, 0),
        background:
          element.shapeFilled === false ? "transparent" : element.background,
      }}
    />
  );
}
