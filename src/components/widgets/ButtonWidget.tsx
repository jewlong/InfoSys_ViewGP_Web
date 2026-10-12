import type { CSSProperties } from "react";
import { borderStyle, widgetStyle, type WidgetProps } from "./types";
export function ButtonWidget({
  element,
  running,
  disabled,
  onAction,
  onMomentary,
}: WidgetProps) {
  const isMomentary = element.action === "momentary";
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

  const handlePointerDown = () => {
    if (!running || disabled) return;
    if (isMomentary) onMomentary?.(true);
  };

  const handlePointerUp = () => {
    if (!running || disabled) return;
    if (isMomentary) onMomentary?.(false);
  };

  return (
    <button
      disabled={!running || disabled}
      data-running={running}
      className="runtime-button"
      style={style}
      onClick={isMomentary ? undefined : onAction}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {element.text}
    </button>
  );
}

