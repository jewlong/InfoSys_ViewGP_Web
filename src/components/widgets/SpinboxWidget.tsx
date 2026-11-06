import { useState } from "react";
import { formatNumber } from "../../services/numberFormat";
import { LvglCanvas, drawLvglRoundedPart } from "./LvglCanvas";
import { widgetStyle, type WidgetProps } from "./types";

export function SpinboxWidget({
  element: e,
  values,
  running,
  disabled,
  onInput,
}: WidgetProps) {
  const rawValue = values[e.variableId ?? ""];
  const step = e.inputStep ?? 1;
  const min = e.inputMin;
  const max = e.inputMax;
  const decimals = e.decimals ?? (Number.isInteger(step) ? 0 : 2);
  const currentNum =
    typeof rawValue === "number" && Number.isFinite(rawValue)
      ? rawValue
      : (min ?? 0);
  const [error, setError] = useState("");

  function adjust(delta: number) {
    if (!running || disabled) return;
    let next = Number((currentNum + delta).toFixed(6));
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;
    const err = onInput(String(next));
    setError(err ?? "");
  }

  const btnWidth = Math.max(28, Math.min(44, Math.round(e.width * 0.22)));

  return (
    <LvglCanvas
      element={e}
      lvglClass="lv_spinbox"
      bgColor={e.background}
      deps={[currentNum, decimals, disabled, btnWidth]}
      className="spinbox-widget"
      style={widgetStyle(e)}
      draw={(ctx, w, h) => {
        // LV_PART_MAIN container
        drawLvglRoundedPart(
          ctx,
          0,
          0,
          w,
          h,
          e.borderRadius ?? 6,
          e.background || "#18263b",
          e.borderColor ?? "#475569",
          e.borderWidth ?? 1,
          e.borderStyle ?? "solid",
        );
        // Left (-) and Right (+) LVGL button backgrounds
        drawLvglRoundedPart(
          ctx,
          2,
          2,
          btnWidth - 2,
          h - 4,
          Math.max(2, (e.borderRadius ?? 6) - 2),
          "#26344d",
        );
        drawLvglRoundedPart(
          ctx,
          w - btnWidth,
          2,
          btnWidth - 2,
          h - 4,
          Math.max(2, (e.borderRadius ?? 6) - 2),
          "#26344d",
        );
        // LVGL spinbox digit cursor highlight bar at bottom center
        const centerW = Math.max(16, w - btnWidth * 2 - 12);
        ctx.fillStyle = e.fillColor ?? "#38bdf8";
        ctx.fillRect((w - centerW) / 2, h - 4, centerW, 2);
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateColumns: `${btnWidth}px 1fr ${btnWidth}px`,
          alignItems: "center",
        }}
      >
        <button
          type="button"
          aria-label={`減少 ${e.name}`}
          disabled={!running || disabled || (min !== undefined && currentNum <= min)}
          onClick={() => adjust(-step)}
          style={{
            height: "100%",
            background: "transparent",
            border: "none",
            color: e.color,
            fontSize: Math.max(14, e.fontSize),
            fontWeight: "bold",
            cursor: !running || disabled ? "default" : "pointer",
          }}
        >
          −
        </button>
        <div
          role="spinbutton"
          aria-label={e.name}
          aria-valuenow={currentNum}
          aria-valuemin={min}
          aria-valuemax={max}
          style={{
            textAlign: "center",
            color: e.color,
            fontSize: e.fontSize,
            fontFamily: e.fontFamily || "monospace",
            fontWeight: e.fontWeight ?? "bold",
            userSelect: "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {formatNumber(currentNum, { ...e, decimals })}
        </div>
        <button
          type="button"
          aria-label={`增加 ${e.name}`}
          disabled={!running || disabled || (max !== undefined && currentNum >= max)}
          onClick={() => adjust(step)}
          style={{
            height: "100%",
            background: "transparent",
            border: "none",
            color: e.color,
            fontSize: Math.max(14, e.fontSize),
            fontWeight: "bold",
            cursor: !running || disabled ? "default" : "pointer",
          }}
        >
          ＋
        </button>
      </div>
      {error && (
        <span className="numeric-input-error" role="alert">
          {error}
        </span>
      )}
    </LvglCanvas>
  );
}
