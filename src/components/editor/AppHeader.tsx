import { useEditorContext } from "../../context/EditorContext";
import infosystemLogo from "../../assets/infosystem-logo.jpg";
export function AppHeader() {
  const {
    project,
    dirty,
    revision,
    running,
    communicationMode,
    communicationSnapshot,
    communicationError,
  } = useEditorContext();
  const state = !running
    ? "edit"
    : communicationMode === "offline"
      ? "simulation"
      : communicationError
        ? "error"
        : communicationSnapshot?.devices.some((d) => d.state === "connected")
          ? "connected"
          : "waiting";
  const status = {
    edit: "工程編輯",
    simulation: "離線模擬",
    error: "通訊異常",
    connected: "設備連線",
    waiting: "等待設備",
  }[state];
  return (
    <header className="app-header">
      <div className="brand-logo">
        <img src={infosystemLogo} alt="Infosystem" />
      </div>
      <span className="workbench-title">
        ViewGP <small>工程工作台</small>
      </span>
      <span className="header-divider" />
      <div className="project-header">
        <span title={project.name}>{project.name}</span>
        {dirty && <span className="dirty-dot" title="尚未儲存" />}
        <span className="project-badge">
          {dirty ? "已修改" : revision > 0 ? "已儲存" : "新專案"}
        </span>
      </div>
      <div className="header-right">
        <span className="header-revision">版本 {revision}</span>
        <span className="connection" data-state={state}>
          <span />
          {status}
        </span>
      </div>
    </header>
  );
}
