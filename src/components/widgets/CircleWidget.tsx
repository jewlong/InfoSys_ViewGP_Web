import { widgetStyle, type WidgetProps } from "./types";
export function CircleWidget({ element }: WidgetProps) {
  return (
    <div
      style={{
        ...widgetStyle(element),
        background: element.background,
        borderRadius: "50%",
      }}
    />
  );
}
