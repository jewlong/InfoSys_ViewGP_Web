import type { WidgetProps } from "./types";
export function SwitchWidget({
  element,
  values,
  running,
  onAction,
}: WidgetProps) {
  const value = values[element.variableId ?? ""];
  return (
    <button
      aria-label={element.name}
      className={"runtime-switch " + (value ? "on" : "")}
      style={{ width: "100%", height: "100%" }}
      disabled={!running}
      onClick={onAction}
    >
      <span />
    </button>
  );
}
