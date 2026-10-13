import { useEffect, useRef, useState } from "react";
import {
  X,
  Delete,
  Check,
  RotateCcw,
  Plus,
  Minus,
  Calculator,
} from "lucide-react";
import type { Element } from "../../model";

export type KeypadDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  element: Element;
  currentValue?: number;
  variableName?: string;
  onCommit: (val: string) => string | undefined;
};

export function KeypadDialog({
  isOpen,
  onClose,
  element,
  currentValue,
  variableName,
  onCommit,
}: KeypadDialogProps) {
  const [buffer, setBuffer] = useState(() =>
    currentValue !== undefined && Number.isFinite(currentValue)
      ? String(currentValue)
      : "0",
  );
  const [isInitial, setIsInitial] = useState(true);
  const [error, setError] = useState<string>("");
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const initialText =
      currentValue !== undefined && Number.isFinite(currentValue)
        ? String(currentValue)
        : "0";
    setBuffer(initialText);
    setIsInitial(true);
    setError("");
  }, [isOpen, currentValue]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleCommit();
        return;
      }
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        inputDigit(e.key);
        return;
      }
      if (e.key === ".") {
        e.preventDefault();
        inputDot();
        return;
      }
      if (e.key === "-" || e.key === "+") {
        e.preventDefault();
        toggleSign();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
        return;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, buffer, isInitial]);

  if (!isOpen) return null;

  function inputDigit(digit: string) {
    setError("");
    if (isInitial) {
      setBuffer(digit);
      setIsInitial(false);
    } else {
      if (buffer === "0") {
        setBuffer(digit);
      } else if (buffer === "-0") {
        setBuffer("-" + digit);
      } else {
        if (buffer.length < 15) {
          setBuffer(buffer + digit);
        }
      }
    }
  }

  function inputDot() {
    setError("");
    if (isInitial) {
      setBuffer("0.");
      setIsInitial(false);
    } else if (!buffer.includes(".")) {
      setBuffer(buffer + ".");
    }
  }

  function toggleSign() {
    setError("");
    if (isInitial) setIsInitial(false);
    if (buffer.startsWith("-")) {
      setBuffer(buffer.slice(1));
    } else {
      if (buffer !== "0") {
        setBuffer("-" + buffer);
      }
    }
  }

  function backspace() {
    setError("");
    if (isInitial) {
      setBuffer("0");
      return;
    }
    if (buffer.length <= 1 || (buffer.length === 2 && buffer.startsWith("-"))) {
      setBuffer("0");
      setIsInitial(true);
    } else {
      setBuffer(buffer.slice(0, -1));
    }
  }

  function clearAll() {
    setError("");
    setBuffer("0");
    setIsInitial(true);
  }

  function setDirectValue(val: number) {
    setError("");
    setBuffer(String(val));
    setIsInitial(false);
  }

  function adjustStep(direction: 1 | -1) {
    setError("");
    const step = element.inputStep ?? 1;
    const current = Number(buffer) || 0;
    const next = current + step * direction;
    // avoid javascript floating point rounding artifacts
    const rounded = Math.round(next * 1000000) / 1000000;
    setBuffer(String(rounded));
    setIsInitial(false);
  }

  function handleCommit() {
    const err = onCommit(buffer);
    if (err) {
      setError(err);
    } else {
      onClose();
    }
  }

  const hasLimits =
    element.inputMin !== undefined || element.inputMax !== undefined;

  return (
    <div
      className="modal-backdrop keypad-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="觸控數字鍵盤"
        className="modal keypad-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header keypad-header">
          <div className="keypad-title-group">
            <Calculator size={18} className="keypad-title-icon" />
            <h2>觸控數字鍵盤 (Keypad)</h2>
            <span className="keypad-tag-badge">
              {variableName ?? element.name}
            </span>
          </div>
          <button
            aria-label="關閉數字鍵盤"
            className="keypad-close-btn"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body keypad-body">
          {/* LCD Digital Display */}
          <div className="keypad-display-wrapper">
            <div className="keypad-meta-row">
              <span className="keypad-meta-target">
                變數：{element.variableId ?? "未綁定"}
              </span>
              <span className="keypad-meta-limits">
                {hasLimits
                  ? `限制：${element.inputMin ?? "-∞"} ～ ${element.inputMax ?? "+∞"}`
                  : "範圍：無限制"}
                {element.inputStep ? ` · 步距：${element.inputStep}` : ""}
                {element.unit ? ` · 單位：${element.unit}` : ""}
              </span>
            </div>

            <div className="keypad-lcd-screen">
              <span className="keypad-lcd-text">{buffer}</span>
              <span className="keypad-lcd-cursor">_</span>
            </div>

            {error && (
              <div className="keypad-error-banner" role="alert">
                {error}
              </div>
            )}
          </div>

          {/* Quick bounds & Step helpers */}
          {(hasLimits || element.inputStep) && (
            <div className="keypad-quick-bar">
              {element.inputMin !== undefined && (
                <button
                  type="button"
                  className="keypad-quick-btn"
                  onClick={() => setDirectValue(element.inputMin!)}
                >
                  Min ({element.inputMin})
                </button>
              )}
              {element.inputStep && (
                <>
                  <button
                    type="button"
                    className="keypad-quick-btn"
                    onClick={() => adjustStep(-1)}
                  >
                    <Minus size={13} /> 步距
                  </button>
                  <button
                    type="button"
                    className="keypad-quick-btn"
                    onClick={() => adjustStep(1)}
                  >
                    <Plus size={13} /> 步距
                  </button>
                </>
              )}
              {element.inputMax !== undefined && (
                <button
                  type="button"
                  className="keypad-quick-btn"
                  onClick={() => setDirectValue(element.inputMax!)}
                >
                  Max ({element.inputMax})
                </button>
              )}
            </div>
          )}

          {/* Keypad Buttons Grid */}
          <div className="keypad-grid">
            <button
              type="button"
              className="keypad-btn num"
              onClick={() => inputDigit("7")}
            >
              7
            </button>
            <button
              type="button"
              className="keypad-btn num"
              onClick={() => inputDigit("8")}
            >
              8
            </button>
            <button
              type="button"
              className="keypad-btn num"
              onClick={() => inputDigit("9")}
            >
              9
            </button>
            <button
              type="button"
              className="keypad-btn fn backspace"
              title="倒退一格 (Backspace)"
              onClick={backspace}
            >
              <Delete size={18} />
              <span>BS</span>
            </button>

            <button
              type="button"
              className="keypad-btn num"
              onClick={() => inputDigit("4")}
            >
              4
            </button>
            <button
              type="button"
              className="keypad-btn num"
              onClick={() => inputDigit("5")}
            >
              5
            </button>
            <button
              type="button"
              className="keypad-btn num"
              onClick={() => inputDigit("6")}
            >
              6
            </button>
            <button
              type="button"
              className="keypad-btn fn clear"
              title="清空 (Clear)"
              onClick={clearAll}
            >
              <RotateCcw size={16} />
              <span>CLR</span>
            </button>

            <button
              type="button"
              className="keypad-btn num"
              onClick={() => inputDigit("1")}
            >
              1
            </button>
            <button
              type="button"
              className="keypad-btn num"
              onClick={() => inputDigit("2")}
            >
              2
            </button>
            <button
              type="button"
              className="keypad-btn num"
              onClick={() => inputDigit("3")}
            >
              3
            </button>
            <button
              type="button"
              className="keypad-btn fn sign"
              title="正負號切換"
              onClick={toggleSign}
            >
              ±
            </button>

            <button
              type="button"
              className="keypad-btn num zero"
              onClick={() => inputDigit("0")}
            >
              0
            </button>
            <button
              type="button"
              className="keypad-btn num dot"
              onClick={inputDot}
            >
              .
            </button>
            <button
              type="button"
              className="keypad-btn fn cancel"
              onClick={onClose}
            >
              ESC
            </button>
            <button
              type="button"
              className="keypad-btn action-enter"
              onClick={handleCommit}
            >
              <Check size={18} />
              <span>ENT</span>
            </button>
          </div>
        </div>

        <div className="modal-footer keypad-footer">
          <span className="keypad-hint">
            支援觸控點選或實體鍵盤 (0-9、Enter 確定、Esc 取消)。
          </span>
          <div className="keypad-footer-actions">
            <button
              type="button"
              className="secondary-btn keypad-cancel-btn"
              onClick={onClose}
            >
              取消 (Esc)
            </button>
            <button
              type="button"
              className="primary-btn keypad-confirm-btn"
              onClick={handleCommit}
            >
              確認寫入 (Enter)
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
