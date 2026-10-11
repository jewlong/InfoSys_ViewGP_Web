import { useEffect, useId, useState } from "react";
import { widgetStyle, type WidgetProps } from "./types";
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
  const errorId = useId();
  useEffect(() => {
    setDraft(text);
    setError("");
  }, [text, running, disabled, element.variableId]);
  function commit() {
    if (!running || disabled || draft === text) return;
    const message = onInput(draft);
    setError(message ?? "");
    if (message) setDraft(text);
    else setDraft(String(Number(draft)));
  }
  return (
    <div className="numeric-input-widget" style={widgetStyle(element)}>
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
        onBlur={commit}
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
      {error && (
        <span id={errorId} className="numeric-input-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
