import { useEditorContext } from "../../context/EditorContext";
import infosystemLogo from "../../assets/infosystem-logo.jpg";
export function AppHeader() {
  const { project, dirty, right } = useEditorContext();
  return (
    <header className="app-header">
      <div className="brand-logo">
        <img src={infosystemLogo} alt="Infosystem" />
      </div>
      <div className="brand">ViewGP</div>
      <span className="header-divider" />
      <div className="project-header">
        <span>{project.name}</span>
        <span className="project-badge">PROJECT</span>
        {dirty && <span className="dirty-dot" title="尚未儲存" />}
      </div>
      <div className="header-right">
        <span className="connection">
          <span />
          本機工作區
        </span>
        <button className="avatar" title="本機單人模式">
          GP
        </button>
      </div>
    </header>
  );
}
