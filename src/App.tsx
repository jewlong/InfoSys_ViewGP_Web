import { ProjectDialogs } from "./components/dialogs/ProjectDialogs";
import { AppHeader } from "./components/editor/AppHeader";
import { CanvasEditor } from "./components/editor/CanvasEditor";
import { FileInputs } from "./components/editor/FileInputs";
import { LeftPanel } from "./components/editor/LeftPanel";
import { MenuBar } from "./components/editor/MenuBar";
import { Notifications } from "./components/editor/Notifications";
import { PropertyPanel } from "./components/editor/PropertyPanel";
import { WidgetToolbar } from "./components/editor/WidgetToolbar";
import { Toolbar } from "./components/editor/Toolbar";
import { EditorProvider } from "./context/EditorContext";
import { useEditor } from "./hooks/useEditor";
export default function App() {
  const editor = useEditor();
  return (
    <EditorProvider value={editor}>
      <div
        className="app-shell engineering-shell"
        onPointerDown={() => {
          if (editor.menu) editor.setMenu(null);
        }}
      >
        <AppHeader />
        <MenuBar />
        <Toolbar />
        <WidgetToolbar />
        <div className="main-layout">
          {editor.left && <LeftPanel />}
          <CanvasEditor />
          {editor.right && <PropertyPanel />}
        </div>
        <Notifications />
        <FileInputs />
        <ProjectDialogs />
      </div>
    </EditorProvider>
  );
}
