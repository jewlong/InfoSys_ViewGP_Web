import type { CSSProperties } from "react";
import { borderStyle, widgetStyle, type WidgetProps } from "./types";
export function ButtonWidget({
  element,
  running,
  disabled,
  onAction,
}: WidgetProps) {
  const style = {
    ...widgetStyle(element),
    ...borderStyle(element, 0, 8),
    color: undefined,
    "--button-background": element.background,
    "--button-color": element.color,
    "--button-hover-background":
      element.buttonHoverBackground ?? element.background,
    "--button-hover-color": element.buttonHoverColor ?? element.color,
    "--button-pressed-background":
      element.buttonPressedBackground ?? element.background,
    "--button-pressed-color": element.buttonPressedColor ?? element.color,
    "--button-disabled-background":
      element.buttonDisabledBackground ?? "#475569",
    "--button-disabled-color": element.buttonDisabledColor ?? "#94a3b8",
  } as CSSProperties;
  return (
    <button
      disabled={!running || disabled}
      data-running={running}
      className="runtime-button"
      style={style}
      onClick={onAction}
    >
      {element.text}
    </button>
  );
}
