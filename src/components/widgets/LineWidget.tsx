import { widgetStyle, type WidgetProps } from "./types";
export function LineWidget({ element }: WidgetProps) {
  return (
    <div style={{ ...widgetStyle(element), background: element.background }} />
  );
}
