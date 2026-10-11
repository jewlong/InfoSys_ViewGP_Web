import {
  LayoutDashboard,
  MousePointer2,
  Plus,
  Search,
  Settings2,
  Trash2,
  Variable as VariableIcon,
} from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { labels, type Kind } from "../../model";
import { widgetRegistry } from "../../registry/widgetRegistry";
import { clone } from "../../utils/project";
export function LeftPanel() {
  const {
    project,
    setScreenId,
    screen,
    selected,
    setSelected,
    running,
    values,
    setValues,
    grid,
    left,
    leftTab,
    setLeftTab,
    search,
    setSearch,
    setDialog,
    setVariableDraft,
    variableSearch,
    setVariableSearch,
    addElement,
    newScreen,
    start,
    addVariable,
    deleteVariable,
  } = useEditorContext();
  return (
    <aside className="left-panel">
      <div className="section-heading">
        <span>
          <LayoutDashboard size={15} />
          畫面管理
        </span>
        <button
          title="新增畫面"
          aria-label="新增畫面"
          disabled={running}
          onClick={() => newScreen()}
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="screen-list">
        {project.screens.map((s, i) => (
          <button
            key={s.id}
            className={"screen-row " + (screen.id === s.id ? "selected" : "")}
            onClick={() => {
              setScreenId(s.id);
              setSelected([]);
            }}
          >
            <LayoutDashboard size={15} />
            <span>{s.name}</span>
            {s.id === project.startScreenId ? (
              <span className="start-tag">起始</span>
            ) : (
              <span className="row-number">
                {String(i + 1).padStart(2, "0")}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="left-tabs">
        <button
          className={leftTab === "components" ? "active" : ""}
          onClick={() => setLeftTab("components")}
        >
          元件庫
        </button>
        <button
          className={leftTab === "variables" ? "active" : ""}
          onClick={() => setLeftTab("variables")}
        >
          變數 <span>{project.variables.length}</span>
        </button>
      </div>
      {leftTab === "components" ? (
        <>
          <div className="search-box">
            <Search size={14} />
            <input
              aria-label="搜尋元件"
              placeholder="搜尋元件…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd>⌕</kbd>
          </div>
          <div className="library">
            <div className="library-label">
              COMPONENTS <span>元件庫</span>
            </div>
            <div className="component-grid">
              {(Object.keys(widgetRegistry) as Kind[])
                .filter((k) => labels[k].includes(search))
                .map((k) => {
                  const Icon = widgetRegistry[k].icon;
                  return (
                    <button
                      key={k}
                      disabled={running}
                      draggable={!running}
                      onDragStart={(e) =>
                        e.dataTransfer.setData("viewx-kind", k)
                      }
                      onClick={() => addElement(k)}
                    >
                      <Icon size={21} strokeWidth={1.5} />
                      <span>{labels[k]}</span>
                    </button>
                  );
                })}
            </div>
            <div className="library-tip">
              <MousePointer2 size={16} />
              <span>
                點選或拖曳元件至畫布
                <br />
                按住 Shift 可選取多個元件
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="variable-panel">
          <div className="variable-heading">
            專案變數
            <button disabled={running} onClick={addVariable}>
              <Plus size={15} />
              新增
            </button>
          </div>
          <div className="search-box">
            <Search size={14} />
            <input
              aria-label="搜尋變數"
              placeholder="搜尋變數…"
              value={variableSearch}
              onChange={(e) => setVariableSearch(e.target.value)}
            />
          </div>
          {project.variables
            .filter((v) =>
              (v.name + " " + (v.category ?? "")).includes(variableSearch),
            )
            .map((v) => (
              <div className="variable-card" key={v.id}>
                <div>
                  <VariableIcon size={14} />
                  <b>{v.name}</b>
                  <span>{v.type}</span>
                </div>
                {running ? (
                  <input
                    aria-label={`模擬值 ${v.name}`}
                    type={v.type === "number" ? "number" : "text"}
                    value={String(values[v.id])}
                    onChange={(e) => {
                      const val =
                        v.type === "number"
                          ? Number(e.target.value)
                          : v.type === "boolean"
                            ? e.target.value === "true"
                            : e.target.value;
                      setValues((old) => ({ ...old, [v.id]: val }));
                    }}
                  />
                ) : (
                  <div className="variable-meta">
                    <span>
                      {v.category ? `${v.category} · ` : ""}初始值：
                      {String(v.initial)}
                    </span>
                    <button
                      aria-label={`編輯 ${v.name}`}
                      onClick={() => {
                        setVariableDraft(clone(v));
                        setDialog("variable");
                      }}
                    >
                      <Settings2 size={13} />
                    </button>
                    <button
                      aria-label={`刪除 ${v.name}`}
                      onClick={() => deleteVariable(v.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
      <div className="left-footer">
        <span className="version-dot" />
        ViewX Studio<span>v0.2.0</span>
      </div>
    </aside>
  );
}
