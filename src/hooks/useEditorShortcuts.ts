import { useEffect } from "react";
import type { EditorCore } from "./useEditor";
export function useEditorShortcuts(editor: EditorCore) {
  const {
    screen,
    selected,
    setSelected,
    setMode,
    running,
    menu,
    setMenu,
    dialog,
    setDialog,
    editScreen,
    undo,
    redo,
    save,
    remove,
    copy,
    paste,
    duplicate,
    patch,
    current,
  } = editor;
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (e.key === "Escape") {
        if (dialog) {
          if (!editor.saving) setDialog(null);
        } else if (menu) setMenu(null);
        else if (running && editor.popupIds.length) editor.closePopup();
        else if (running) setMode("edit");
        else setSelected([]);
        return;
      }
      if (target.closest('input,textarea,select,[contenteditable="true"]'))
        return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
        return;
      }
      if (running || dialog) return;
      if (mod) {
        const k = e.key.toLowerCase();
        if (["z", "y", "c", "v", "x", "a", "d", "g", "l"].includes(k)) e.preventDefault();
        if (k === "z") e.shiftKey ? redo() : undo();
        if (k === "y") redo();
        if (k === "c") copy();
        if (k === "x") copy(true);
        if (k === "v") paste();
        if (k === "a") setSelected(screen.elements.map((e) => e.id));
        if (k === "d") duplicate();
        if (k === "g") {
          if (e.shiftKey) patch({ groupId: undefined });
          else if (selected.length > 1) patch({ groupId: crypto.randomUUID() });
        }
        if (k === "l" && selected.length) patch({ locked: !current?.locked });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove();
      } else if (e.key.startsWith("Arrow") && selected.length) {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        editScreen((s) =>
          s.elements.forEach((el) => {
            if (selected.includes(el.id) && !el.locked) {
              if (e.key === "ArrowLeft") el.x = Math.max(0, el.x - delta);
              if (e.key === "ArrowRight")
                el.x = Math.min(s.width - el.width, el.x + delta);
              if (e.key === "ArrowUp") el.y = Math.max(0, el.y - delta);
              if (e.key === "ArrowDown")
                el.y = Math.min(s.height - el.height, el.y + delta);
            }
          }),
        );
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
}
