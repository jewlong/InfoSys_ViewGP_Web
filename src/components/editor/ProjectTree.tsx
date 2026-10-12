import { useState } from "react";
import {
  Bell,
  Cable,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Image,
  LayoutDashboard,
  PanelsTopLeft,
  Tags,
  Settings2,
} from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { isPopup, parentScreenId } from "../../services/screenRules";
export function ProjectTree() {
  const {
    project,
    screen,
    setScreenId,
    setSelected,
    running,
    popupIds,
    setDialog,
    setLeftTab,
  } = useEditorContext();
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const toggle = (id: string) =>
    setCollapsed((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
    );
  const groups = [
    { id: "screens", label: "一般畫面", popup: false },
    { id: "popups", label: "對話盒 / Popup", popup: true },
  ];
  return (
    <div className="project-tree">
      <div className="project-tree-root">
        <FolderOpen size={15} />
        <b title={project.name}>{project.name}</b>
        <button
          title="專案設定"
          aria-label="設定目前專案"
          disabled={running}
          onClick={() => setDialog("project")}
        >
          <Settings2 size={13} />
        </button>
      </div>
      {groups.map((g) => {
        const screens = project.screens.filter((s) => isPopup(s) === g.popup);
        return (
          <section className="project-tree-group" key={g.id}>
            <button
              className="project-tree-branch"
              aria-expanded={!collapsed.includes(g.id)}
              aria-controls={"tree-" + g.id}
              onClick={() => toggle(g.id)}
            >
              {collapsed.includes(g.id) ? (
                <ChevronRight size={12} />
              ) : (
                <ChevronDown size={12} />
              )}
              <FolderOpen size={14} />
              <span>{g.label}</span>
              <small>{screens.length}</small>
            </button>
            <div
              className="screen-list"
              id={"tree-" + g.id}
              hidden={collapsed.includes(g.id)}
            >
              {screens.map((s) => {
                const index = project.screens.findIndex((x) => x.id === s.id),
                  Icon = isPopup(s) ? PanelsTopLeft : LayoutDashboard;
                return (
                  <button
                    key={s.id}
                    disabled={running && (isPopup(s) || popupIds.length > 0)}
                    className={
                      "screen-row " + (screen.id === s.id ? "selected" : "")
                    }
                    onClick={() => {
                      setScreenId(s.id);
                      setSelected([]);
                    }}
                    title={
                      s.name + (parentScreenId(s) ? " · 繼承共通母片" : "")
                    }
                  >
                    <Icon size={13} />
                    <span>
                      {s.name}
                      {isPopup(s) ? " · Popup" : ""}
                      {parentScreenId(s) ? " · 繼承" : ""}
                    </span>
                    {s.id === project.startScreenId ? (
                      <span className="start-tag">起始</span>
                    ) : (
                      <span className="row-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    )}
                  </button>
                );
              })}
              {!screens.length && <div className="tree-empty">尚無對話盒</div>}
            </div>
          </section>
        );
      })}
      <div className="project-tree-settings">
        <button onClick={() => setDialog("communication")}>
          <Cable size={14} />
          <span>設備通訊</span>
          <small>{project.devices?.length ?? 0}</small>
        </button>
        <button onClick={() => setLeftTab("variables")}>
          <Tags size={14} />
          <span>標籤與系統變數</span>
          <small>{project.variables.length}</small>
        </button>
        <button onClick={() => setDialog("alarms")}>
          <Bell size={14} />
          <span>全域警報與歷史</span>
          <small>{project.alarmAreas?.length ?? 0}</small>
        </button>
        <button disabled={running} onClick={() => setDialog("assets")}>
          <Image size={14} />
          <span>圖片資源</span>
          <small>{project.assets?.length ?? 0}</small>
        </button>
      </div>
    </div>
  );
}
