import { createContext, useContext, type ReactNode } from "react";
import type { EditorController } from "../hooks/useEditor";
const EditorContext = createContext<EditorController | null>(null);
export function EditorProvider({
  value,
  children,
}: {
  value: EditorController;
  children: ReactNode;
}) {
  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}
export function useEditorContext() {
  const editor = useContext(EditorContext);
  if (!editor)
    throw new Error("Editor components must be inside EditorProvider");
  return editor;
}
