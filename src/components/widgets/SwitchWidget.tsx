import { LvglSurface, drawLvglRoundedPart } from "./LvglCanvas";
import type { WidgetProps } from "./types";

export function SwitchWidget({
  element,
  values,
  running,
  disabled,
  onAction,
}: WidgetProps) {
  const value = Boolean(values[element.variableId ?? ""]);
  return (
    <button
      aria-label={element.name}
      data-lvgl-class="lv_switch"
      className={"runtime-switch " + (value ? "on" : "")}
      style={{ width: "100%", height: "100%", position: "relative" }}
      disabled={!running || disabled}
      onClick={onAction}
    >
      <LvglSurface
        element={element}
        lvglClass="lv_switch"
        deps={[value, disabled]}
        draw={(ctx, w, h) => {
          const r = Math.min(w, h) / 2;
          // LV_PART_INDICATOR track
          drawLvglRoundedPart(
            ctx,
            1,
            1,
            w - 2,
            h - 2,
            r,
            value ? element.fillColor ?? "#38bdf8" : element.trackColor ?? "#334155",
          );
          // LV_PART_KNOB
          const pad = Math.max(3, Math.round(h * 0.1));
          const knobD = Math.max(6, h - pad * 2);
          const knobX = value ? Math.max(pad, w - knobD - pad) : pad;
          drawLvglRoundedPart(ctx, knobX, pad, knobD, knobD, knobD / 2, "#ffffff");
        }}
      />
      <span />
    </button>
  );
}
