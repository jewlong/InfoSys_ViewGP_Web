import {
  Activity,
  Eye,
  Layers,
  LayoutDashboard,
  Lock,
  MousePointer2,
  Settings2,
  Unlock,
} from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { labels } from "../../model";
import { widgetRegistry } from "../../registry/widgetRegistry";
import { initialValues } from "../../utils/project";
import {
  ColorField,
  Field,
  NumberField,
  PropertySection,
} from "../ui/Controls";
import { ElementProperties } from "./ElementProperties";
export function PropertyPanel() {
  const {
    project,
    screen,
    selected,
    setSelected,
    current,
    running,
    values,
    setValues,
    notify,
    change,
    editScreen,
  } = useEditorContext();
  return (
    <aside className="right-panel">
      <div className="section-heading">
        <span>
          <Settings2 size={15} />
          {running ? "執行狀態" : "屬性設定"}
        </span>
        <span className="muted">{current ? labels[current.kind] : "畫面"}</span>
      </div>
      {running ? (
        <div className="runtime-panel">
          <div className="runtime-status">
            <Activity size={22} />
            <b>模擬執行中</b>
            <span>所有資料為本機模擬值</span>
          </div>
          <h4>變數監看</h4>
          {project.variables.map((v) => (
            <div className="watch-row" key={v.id}>
              <label>
                {v.name}
                <small>{v.type}</small>
              </label>
              {v.type === "boolean" ? (
                <button
                  className={"boolean-value " + (values[v.id] ? "on" : "")}
                  onClick={() =>
                    setValues((old) => ({ ...old, [v.id]: !old[v.id] }))
                  }
                >
                  {values[v.id] ? "TRUE" : "FALSE"}
                </button>
              ) : (
                <input
                  aria-label={`執行值 ${v.name}`}
                  type={v.type === "number" ? "number" : "text"}
                  value={String(values[v.id])}
                  onChange={(e) =>
                    setValues((old) => ({
                      ...old,
                      [v.id]:
                        v.type === "number"
                          ? Number(e.target.value)
                          : e.target.value,
                    }))
                  }
                />
              )}
            </div>
          ))}
          <button
            className="secondary-btn full"
            onClick={() => {
              setValues(initialValues(project));
              notify("模擬資料已重設");
            }}
          >
            重設模擬資料
          </button>
        </div>
      ) : current ? (
        <ElementProperties />
      ) : (
        <div className="properties">
          <div className="selected-object">
            <div>
              <LayoutDashboard size={18} />
            </div>
            <span>
              {screen.name}
              <small>畫面屬性</small>
            </span>
          </div>
          <PropertySection title="畫面設定">
            <Field label="畫面名稱">
              <input
                value={screen.name}
                onChange={(e) => editScreen((s) => (s.name = e.target.value))}
              />
            </Field>
            <div className="property-grid">
              <Field label="寬度">
                <NumberField
                  value={screen.width}
                  min={100}
                  max={4096}
                  onChange={(v) => editScreen((s) => (s.width = v))}
                  suffix="px"
                />
              </Field>
              <Field label="高度">
                <NumberField
                  value={screen.height}
                  min={100}
                  max={4096}
                  onChange={(v) => editScreen((s) => (s.height = v))}
                  suffix="px"
                />
              </Field>
            </div>
            <Field label="背景顏色">
              <ColorField
                value={screen.background}
                onChange={(v) => editScreen((s) => (s.background = v))}
              />
            </Field>
            <button
              className="secondary-btn full"
              onClick={() => change((p) => (p.startScreenId = screen.id))}
            >
              <LayoutDashboard size={14} />
              {screen.id === project.startScreenId
                ? "已設為起始畫面"
                : "設為起始畫面"}
            </button>
          </PropertySection>
          <div className="empty-selection">
            <MousePointer2 size={24} />
            <p>選取元件以編輯屬性</p>
            <span>也可按住 Shift 多選元件</span>
          </div>
        </div>
      )}
      {!running && (
        <div className="layers-section">
          <div className="section-heading">
            <span>
              <Layers size={15} />
              圖層
            </span>
            <span className="muted">{screen.elements.length}</span>
          </div>
          <div className="layers-list">
            {[...screen.elements].reverse().map((e) => {
              const Icon = widgetRegistry[e.kind].icon;
              return (
                <div
                  className={
                    "layer-row " + (selected.includes(e.id) ? "selected" : "")
                  }
                  key={e.id}
                >
                  <button
                    className="layer-name"
                    onClick={(ev) =>
                      setSelected(
                        ev.shiftKey
                          ? Array.from(new Set([...selected, e.id]))
                          : [e.id],
                      )
                    }
                  >
                    <Icon size={13} />
                    <span>{e.name}</span>
                  </button>
                  <button
                    title="切換鎖定"
                    onClick={() =>
                      editScreen((s) => {
                        s.elements.find((i) => i.id === e.id)!.locked =
                          !e.locked;
                      })
                    }
                  >
                    {e.locked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  <button
                    title="切換顯示"
                    className={!e.visible ? "hidden-layer" : ""}
                    onClick={() =>
                      editScreen((s) => {
                        s.elements.find((i) => i.id === e.id)!.visible =
                          !e.visible;
                      })
                    }
                  >
                    <Eye size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
