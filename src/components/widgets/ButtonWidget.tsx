import { widgetStyle, type WidgetProps } from "./types";
export function ButtonWidget({ element, running, onAction }: WidgetProps) {
  return (
    <button
      disabled={!running}
      className="runtime-button"
      style={{ ...widgetStyle(element), background: element.background }}
      onClick={onAction}
    >
      {element.text}
    </button>
  );
}
