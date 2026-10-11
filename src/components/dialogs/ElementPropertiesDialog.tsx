import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { ElementProperties } from "../editor/ElementProperties";

export function ElementPropertiesDialog() {
  const { current, running, setDialog } = useEditorContext();
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    if (!current || running) setDialog(null);
  }, [current, running, setDialog]);
  if (!current || running) return null;
  return (
    <div className="modal-backdrop" onClick={() => setDialog(null)}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="元件屬性設定"
        className="modal element-properties-dialog"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            dialogRef.current!.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
            ),
          );
          const first = controls[0],
            last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="modal-header">
          <h2>元件屬性設定</h2>
          <button aria-label="關閉對話框" onClick={() => setDialog(null)}>
            <X size={19} />
          </button>
        </div>
        <div className="modal-body">
          <ElementProperties />
        </div>
        <div className="modal-footer">
          <span className="muted">修改即時套用，可在關閉後復原。</span>
          <button className="primary-btn" onClick={() => setDialog(null)}>
            完成
          </button>
        </div>
      </section>
    </div>
  );
}
