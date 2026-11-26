import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { ElementProperties } from "../editor/ElementProperties";
import { clone } from "../../utils/project";
import type { Element } from "../../model";

export function ElementPropertiesDialog() {
  const {
    current,
    screen,
    running,
    project,
    selected,
    imageRef,
    setDialog,
    editScreen,
    setSelected,
    notify,
  } = useEditorContext();
  const dialogRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<Element | null>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => previous?.focus();
  }, []);

  useEffect(() => {
    if (!current || running || screen == null) {
      setDraft(null);
      return;
    }
    // 對話框每次開啟以目前元件為基礎建立草稿，修改不即時寫入專案
    setDraft(clone(current));
  }, [current, running, screen]);

  function applyDraft() {
    if (!draft || !screen) return;
    editScreen((s) => {
      const i = s.elements.findIndex((e) => e.id === draft!.id);
      if (i >= 0) s.elements[i] = draft!;
    });
    notify(`已套用「${draft.name}」屬性`);
    setDialog(null);
  }

  function discardDraft() {
    setDraft(null);
    setDialog(null);
  }

  if (!current || !screen) return null;

  return (
    <div className="modal-backdrop" onClick={discardDraft}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="元件屬性設定"
        className="modal element-properties-dialog"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            discardDraft();
            return;
          }
          if (event.key !== "Tab") return;
          const controls = Array.from(
            dialogRef.current!.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
            ),
          );
          const first = controls[0];
          const last = controls[controls.length - 1];
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
          <button aria-label="關閉對話框（捨棄草稿）" onClick={discardDraft}>
            <X size={19} />
          </button>
        </div>
        <div className="modal-body">
          <ElementProperties
            element={draft ?? undefined}
            project={project}
            onPatch={(props) =>
              setDraft((d) => (d ? { ...d, ...props } : d))
            }
            onRemove={() => {
              editScreen((s) => {
                s.elements = s.elements.filter((e) => e.id !== current.id);
              });
              setSelected([]);
              notify("元件已刪除");
              setDialog(null);
            }}
            imageRef={imageRef}
            selectedCount={selected.length}
          />
        </div>
        <div className="modal-footer">
          <span className="muted">
            修改僅作為草稿，點「確定」才套用至專案；取消或關閉將捨棄。
          </span>
          <button className="secondary-btn" onClick={discardDraft}>
            取消
          </button>
          <button className="primary-btn" onClick={applyDraft}>
            確定
          </button>
        </div>
      </section>
    </div>
  );
}
