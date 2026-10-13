import { ProjectTree } from "./ProjectTree";
import { useState } from "react";
import {
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  MousePointer2,
  Plus,
  Search,
  Settings2,
  Trash2,
  Variable as VariableIcon,
  HandMetal,
} from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { labels } from "../../model";
import {
  groupedWidgets,
  widgetRegistry,
  type WidgetCategory,
} from "../../registry/widgetRegistry";
import { SYSTEM_VARIABLES } from "../../services/systemVariables";
import { clone } from "../../utils/project";

export function LeftPanel() {
  const [varCategory, setVarCategory] = useState<"project" | "system">(
    "project",
  );
  const [collapsed, setCollapsed] = useState<WidgetCategory[]>([]);
  const {
    project,
    running,
    values,
    setValues,
    communicationMode,
    communicationSnapshot,
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
    addVariable,
    deleteVariable,
  } = useEditorContext();
  const groups = groupedWidgets(search);
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
      <ProjectTree />
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
              onChange={(e) => {
                setSearch(e.target.value);
                setCollapsed([]);
              }}
            />
            <kbd>⌕</kbd>
          </div>
          <div className="library">
            <div className="library-label">
              COMPONENTS <span>元件庫</span>
            </div>
            {groups.map((group) => (
              <section
                className="widget-category"
                key={group.id}
                aria-label={group.label}
              >
                <button
                  className="widget-category-heading"
                  aria-expanded={!collapsed.includes(group.id)}
                  aria-controls={`widget-group-${group.id}`}
                  onClick={() =>
                    setCollapsed((old) =>
                      old.includes(group.id)
                        ? old.filter((id) => id !== group.id)
                        : [...old, group.id],
                    )
                  }
                >
                  {collapsed.includes(group.id) ? (
                    <ChevronRight size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                  <span>{group.label}</span>
                  <span className="widget-category-count">
                    {group.kinds.length}
                  </span>
                </button>
                <div
                  className="component-grid"
                  id={`widget-group-${group.id}`}
                  hidden={collapsed.includes(group.id)}
                >
                  {group.kinds.flatMap((k) => {
                    const Icon = widgetRegistry[k].icon;
                    const items = [
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
                      </button>,
                    ];
                    if (
                      k === "button" &&
                      (!search ||
                        "jog 點動 點動按鈕".includes(search.toLowerCase()) ||
                        search.toLowerCase().includes("jog") ||
                        search.toLowerCase().includes("點動"))
                    ) {
                      items.push(
                        <button
                          key="jog-library-item"
                          disabled={running}
                          title="點動按鈕 (JOG - 按住 ON／放開 OFF)"
                          onClick={() =>
                            addElement("button", undefined, undefined, {
                              name: "點動按鈕",
                              text: "JOG 點動",
                              action: "momentary",
                              actionValue: "true",
                              background: "#0284c7",
                            })
                          }
                        >
                          <HandMetal size={21} strokeWidth={1.5} />
                          <span>點動按鈕</span>
                        </button>,
                      );
                    }
                    return items;
                  })}
                </div>
              </section>
            ))}
            {!groups.length && (
              <p className="library-empty" role="status">
                找不到符合的元件
              </p>
            )}
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
          <div className="variable-source-tabs">
            <button
              className={varCategory === "project" ? "active" : ""}
              onClick={() => setVarCategory("project")}
            >
              專案變數 ({project.variables.length})
            </button>
            <button
              className={varCategory === "system" ? "active" : ""}
              onClick={() => setVarCategory("system")}
            >
              系統變數 $SYS ({SYSTEM_VARIABLES.length})
            </button>
          </div>
          {varCategory === "project" ? (
            <>
              <div className="variable-heading">
                專案自訂變數
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
                        value={
                          communicationMode === "online" &&
                          v.modbus &&
                          communicationSnapshot?.tags[v.id]?.quality !== "good"
                            ? ""
                            : String(values[v.id] ?? "")
                        }
                        readOnly={
                          communicationMode === "online" && Boolean(v.modbus)
                        }
                        placeholder={
                          communicationMode === "online" && v.modbus
                            ? "資料失效"
                            : undefined
                        }
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
            </>
          ) : (
            <>
              <div className="variable-heading">
                系統內部接點與暫存器
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                  唯讀 (RO)
                </span>
              </div>
              <div className="search-box">
                <Search size={14} />
                <input
                  aria-label="搜尋系統變數"
                  placeholder="搜尋系統變數…"
                  value={variableSearch}
                  onChange={(e) => setVariableSearch(e.target.value)}
                />
              </div>
              {SYSTEM_VARIABLES.filter((s) =>
                (s.id + " " + s.name + " " + s.description).includes(
                  variableSearch,
                ),
              ).map((s) => (
                <div className="variable-card" key={s.id}>
                  <div>
                    <VariableIcon size={14} />
                    <b>{s.id}</b>
                    <span className="variable-type">{s.type}</span>
                  </div>
                  <div className="system-variable-name">{s.name}</div>
                  <div className="system-variable-value">
                    即時值：{String(values[s.id] ?? "--")}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
      <div className="left-footer">
        <span className="version-dot" />
        ViewGP<span>v0.2.0</span>
      </div>
    </aside>
  );
}
