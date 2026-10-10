import { widgetStyle, type WidgetProps } from "./types";
export function NumberInputWidget({
  element,
  values,
  running,
  onInput,
}: WidgetProps) {
  const value = values[element.variableId ?? ""];
  return (
    <input
      aria-label={element.name}
      className="runtime-input"
      type="number"
      style={{ ...widgetStyle(element), background: element.background }}
      value={typeof value === "number" ? value : 0}
      readOnly={!running}
      onChange={(event) => onInput(event.target.value)}
    />
  );
}
