import {
  ChevronDown,
  Eye,
  FilePlus,
  FolderOpen,
  Grid2X2,
  Lock,
  Maximize,
  MousePointer2,
  Play,
  Redo2,
  Save,
  StopCircle,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { newProject } from "../../model";
import { Tool } from "../ui/Controls";
export function Toolbar() {
  const {
    history,
    future,
    setMode,
    running,
    zoom,
    setZoom,
    grid,
    setGrid,
    snap,
    setSnap,
    saving,
    notify,
    undo,
    redo,
    guard,
    resetProject,
    save,
    openProjects,
    start,
    fit,
  } = useEditorContext();
  return (
    <div className="toolbar">
      <div className="tool-group">
        <Tool
          icon={FilePlus}
          label="新增專案"
          disabled={running}
          onClick={() => {
            if (guard()) resetProject(newProject());
          }}
        />
        <Tool
          icon={FolderOpen}
          label="開啟專案"
          disabled={running}
          onClick={() => void openProjects()}
        />
        <Tool
          icon={Save}
          label="儲存專案"
          disabled={saving}
          onClick={() => void save()}
        />
      </div>
      <div className="tool-group">
        <Tool
          icon={Undo2}
          label="復原"
          disabled={running || !history.length}
          onClick={undo}
        />
        <Tool
          icon={Redo2}
          label="重做"
          disabled={running || !future.length}
          onClick={redo}
        />
      </div>
      <div className="tool-group">
        <Tool
          icon={MousePointer2}
          label="選取工具"
          active={!running}
          onClick={() => setMode("edit")}
        />
        <Tool
          icon={Grid2X2}
          label="顯示格線"
          active={grid}
          onClick={() => setGrid(!grid)}
        />
        <Tool
          icon={Lock}
          label="吸附格線"
          active={snap}
          onClick={() => setSnap(!snap)}
        />
      </div>
      <div className="tool-group zoom-group">
        <Tool
          icon={ZoomOut}
          label="縮小"
          onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
        />
        <button className="zoom-value" onClick={fit}>
          {Math.round(zoom * 100)}%<ChevronDown size={12} />
        </button>
        <Tool
          icon={ZoomIn}
          label="放大"
          onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
        />
        <Tool icon={Maximize} label="符合畫面" onClick={fit} />
      </div>
      <div className="toolbar-end">
        {running ? (
          <>
            <span className="simulation-pill">
              <span />
              模擬資料
            </span>
            <button
              className="secondary-btn"
              onClick={() => {
                setMode("edit");
                notify("已停止執行");
              }}
            >
              <StopCircle size={15} />
              停止執行
            </button>
          </>
        ) : (
          <>
            <button className="secondary-btn" onClick={() => start("preview")}>
              <Eye size={15} />
              預覽
            </button>
            <button className="primary-btn" onClick={() => start("run")}>
              <Play size={14} fill="currentColor" />
              執行專案
            </button>
          </>
        )}
      </div>
    </div>
  );
}
