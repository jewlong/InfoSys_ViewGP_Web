import { useState, type CSSProperties } from "react";
import { LvglSurface } from "./LvglCanvas";
import { borderStyle, widgetStyle, type WidgetProps } from "./types";

export function ButtonWidget({
  element,
  running,
  disabled,
  onAction,
  onMomentary,
}: WidgetProps) {
  const isMomentary = element.action === "momentary";
  const [pressed, setPressed] = useState(false);

  const style = {
    ...widgetStyle(element),
    ...borderStyle(element, 0, 8),
    position: "relative",
    overflow: "hidden",
    color: undefined,
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: isMomentary ? "none" : undefined,
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

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!running || disabled) return;
    if (isMomentary) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {}
      setPressed(true);
      onMomentary?.(true);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!running || disabled) return;
    if (isMomentary) {
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {}
      setPressed(false);
      onMomentary?.(false);
    }
  };

  return (
    <button
      disabled={!running || disabled}
      data-running={running}
      data-pressed={isMomentary && pressed ? "true" : undefined}
      data-lvgl-class="lv_button"
      className="runtime-button"
      style={style}
      onClick={isMomentary ? undefined : onAction}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onLostPointerCapture={handlePointerUp}
      onContextMenu={(e) => {
        if (running && isMomentary) e.preventDefault();
      }}
    >
      <LvglSurface
        element={element}
        lvglClass="lv_button"
        deps={[pressed, disabled]}
        draw={() => {}}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{element.text}</span>
    </button>
  );
}
