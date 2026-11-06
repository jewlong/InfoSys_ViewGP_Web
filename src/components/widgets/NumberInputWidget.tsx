import { useEffect, useId, useState } from "react";
import { Calculator } from "lucide-react";
import { LvglSurface, drawLvglRoundedPart } from "./LvglCanvas";
import { widgetStyle, type WidgetProps } from "./types";
import { KeypadDialog } from "../dialogs/KeypadDialog";

export function NumberInputWidget({
  element,
  values,
  running,
  disabled,
  onInput,
}: WidgetProps) {
  const value = values[element.variableId ?? ""];
  const text = typeof value === "number" ? String(value) : "";
  const [draft, setDraft] = useState(text);
  const [error, setError] = useState("");
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const errorId = useId();

  useEffect(() => {
    setDraft(text);
    setError("");
  }, [text, running, disabled, element.variableId]);

  function commit(valToCommit?: string) {
    if (!running || disabled) return;
    const target = valToCommit !== undefined ? valToCommit : draft;
    if (valToCommit === undefined && draft === text) return;
    const message = onInput(target);
    setError(message ?? "");
    if (message) {
      if (valToCommit === undefined) setDraft(text);
      return message;
    } else {
      setDraft(String(Number(target)));
      return undefined;
    }
  }

  return (
    <div
      className="numeric-input-widget"
      data-lvgl-class="lv_textarea"
      style={{ ...widgetStyle(element), position: "relative" }}
    >
      <LvglSurface
        element={element}
        lvglClass="lv_textarea"
        deps={[draft, disabled]}
        draw={(ctx, w, h) => {
          drawLvglRoundedPart(
            ctx,
            0,
            0,
            w,
            h,
            element.borderRadius ?? 6,
            element.background || "#18263b",
          );
        }}
      />
      <div className="numeric-input-field-wrap" style={{ position: "relative", zIndex: 1 }}>
        <input
          aria-label={element.name}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="runtime-input"
          type="number"
          style={{ ...widgetStyle(element), background: element.background }}
          min={element.inputMin}
          max={element.inputMax}
          step={element.inputStep ?? "any"}
          value={running ? draft : text}
          readOnly={!running}
          disabled={disabled}
          onChange={(event) => {
            setDraft(event.target.value);
            setError("");
          }}
          onBlur={() => commit()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setDraft(text);
              setError("");
            }
          }}
        />
        {running && !disabled && (
          <button
            type="button"
            className="runtime-keypad-trigger-btn"
            title="開啟觸控數字鍵盤 (Keypad)"
            aria-label={`開啟 ${element.name} 觸控數字鍵盤`}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setIsKeypadOpen(true);
            }}
          >
            <Calculator size={13} />
          </button>
        )}
      </div>
      {error && (
        <span id={errorId} className="numeric-input-error" role="alert">
          {error}
        </span>
      )}
      {isKeypadOpen && (
        <KeypadDialog
          isOpen={isKeypadOpen}
          onClose={() => setIsKeypadOpen(false)}
          element={element}
          currentValue={typeof value === "number" ? value : undefined}
          onCommit={(val) => commit(val)}
        />
      )}
    </div>
  );
}
