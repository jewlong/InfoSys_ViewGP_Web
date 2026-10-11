import { useRef, useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
export function ManagementDialog({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { setDialog, saving } = useEditorContext();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div className="modal-backdrop" onClick={() => !saving && setDialog(null)}>
      <section
        ref={ref}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            ref.current!.querySelectorAll<HTMLElement>(
              "button:not(:disabled), input:not(:disabled):not([hidden]), select:not(:disabled)",
            ),
          ).filter((node) => !node.closest("[inert]"));
          const first = controls[0],
            last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        className="modal management-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            aria-label="關閉對話框"
            disabled={saving}
            onClick={() => setDialog(null)}
          >
            <X size={19} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
