import { widgetStyle, type WidgetProps } from "./types";
export function NumberWidget({ element, values }: WidgetProps) {
  const value = values[element.variableId ?? ""];
  const formatted =
    typeof value === "number"
      ? value.toLocaleString(
          "en-US",
          element.decimals !== undefined
            ? {
                minimumFractionDigits: element.decimals,
                maximumFractionDigits: element.decimals,
              }
            : { maximumFractionDigits: 3 },
        )
      : String(value ?? "—");
  return (
    <div className="visual-text" style={widgetStyle(element)}>
      {formatted + (element.unit ? " " + element.unit : "")}
    </div>
  );
}
