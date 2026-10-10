import { widgetStyle, type WidgetProps } from "./types";
export function TextWidget({ element }: WidgetProps) {
  return (
    <div className="visual-text" style={widgetStyle(element)}>
      {element.text}
    </div>
  );
}
