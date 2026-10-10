import { widgetStyle, type WidgetProps } from "./types";
export function IndicatorWidget({ element, values }: WidgetProps) {
  const value = values[element.variableId ?? ""];
  return (
    <div
      className={"lamp " + (value ? "on" : "")}
      style={{
        ...widgetStyle(element),
        background: value ? "#58d3ac" : "#42516a",
        borderRadius: "50%",
      }}
    />
  );
}
