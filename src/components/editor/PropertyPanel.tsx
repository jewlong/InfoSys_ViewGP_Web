import {
  Activity,
  Eye,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Lock,
  MousePointer2,
  Plus,
  Settings2,
  Trash2,
  Unlock,
} from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { labels, type Element } from "../../model";
import { widgetRegistry } from "../../registry/widgetRegistry";
import { initialValues } from "../../utils/project";
import {
  ColorField,
  Field,
  NumberField,
  PropertySection,
} from "../ui/Controls";
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
    grid,
    right,
    imageRef,
    notify,
    change,
    editScreen,
    patch,
    remove,
    action,
    addVariable,
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
        <div className="properties">
          <div className="selected-object">
            <div>
              {(() => {
                const Icon = widgetRegistry[current.kind].icon;
                return <Icon size={18} />;
              })()}
            </div>
            <span>
              {current.name}
              <small>
                {selected.length > 1
                  ? `已選取 ${selected.length} 個元件`
                  : `${labels[current.kind]}元件`}
              </small>
            </span>
            <button aria-label="刪除選取元件" onClick={remove}>
              <Trash2 size={15} />
            </button>
          </div>
          <PropertySection title="基本設定">
            <Field label="名稱">
              <input
                value={current.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>
            <div className="property-grid">
              {(["x", "y", "width", "height"] as const).map((key, i) => (
                <Field
                  label={["X 座標", "Y 座標", "寬度", "高度"][i]}
                  key={key}
                >
                  <NumberField
                    value={current[key]}
                    min={key === "width" || key === "height" ? 1 : 0}
                    onChange={(v) => patch({ [key]: v })}
                    suffix="px"
                  />
                </Field>
              ))}
            </div>
          </PropertySection>
          <PropertySection title="外觀">
            <Field label="文字 / 標籤">
              <input
                value={current.text}
                onChange={(e) => patch({ text: e.target.value })}
              />
            </Field>
            <div className="property-grid">
              <Field label="文字顏色">
                <ColorField
                  value={current.color}
                  onChange={(v) => patch({ color: v })}
                />
              </Field>
              <Field label="背景顏色">
                <ColorField
                  value={current.background}
                  onChange={(v) => patch({ background: v })}
                />
              </Field>
            </div>
            <Field label="字型大小">
              <NumberField
                value={current.fontSize}
                min={8}
                onChange={(v) => patch({ fontSize: v })}
                suffix="px"
              />
            </Field>
            {current.kind === "image" && (
              <button
                className="secondary-btn full"
                onClick={() => imageRef.current?.click()}
              >
                <ImageIcon size={14} />
                選擇圖片
              </button>
            )}
          </PropertySection>
          <PropertySection title="資料綁定">
            <Field label="綁定變數">
              <select
                value={current.variableId ?? ""}
                onChange={(e) =>
                  patch({ variableId: e.target.value || undefined })
                }
              >
                <option value="">未綁定</option>
                {project.variables.map((v) => (
                  <option value={v.id} key={v.id}>
                    {v.name} ({v.type})
                  </option>
                ))}
              </select>
            </Field>
            {current.kind === "number" && (
              <div className="property-grid">
                <Field label="小數位數">
                  <NumberField
                    value={current.decimals ?? 0}
                    min={0}
                    max={6}
                    onChange={(v) => patch({ decimals: Math.round(v) })}
                  />
                </Field>
                <Field label="單位">
                  <input
                    value={current.unit ?? ""}
                    onChange={(e) => patch({ unit: e.target.value })}
                  />
                </Field>
              </div>
            )}
            <button className="text-link" onClick={addVariable}>
              <Plus size={13} />
              新增專案變數
            </button>
          </PropertySection>
          {(current.kind === "button" || current.kind === "switch") && (
            <PropertySection title="互動動作">
              <Field label="動作">
                <select
                  value={current.kind === "switch" ? "toggle" : current.action}
                  disabled={current.kind === "switch"}
                  onChange={(e) =>
                    patch({ action: e.target.value as Element["action"] })
                  }
                >
                  <option value="toggle">切換開關</option>
                  <option value="set">設定值</option>
                  <option value="increment">加減數值</option>
                  <option value="screen">切換畫面</option>
                </select>
              </Field>
              {current.action === "screen" && current.kind === "button" ? (
                <Field label="目標畫面">
                  <select
                    value={current.targetScreenId ?? ""}
                    onChange={(e) => patch({ targetScreenId: e.target.value })}
                  >
                    <option value="">請選擇</option>
                    {project.screens.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                current.action !== "toggle" && (
                  <Field
                    label={current.action === "increment" ? "增減量" : "設定值"}
                  >
                    <input
                      value={current.actionValue}
                      onChange={(e) => patch({ actionValue: e.target.value })}
                    />
                  </Field>
                )
              )}
            </PropertySection>
          )}
          <PropertySection title="狀態與條件">
            <Field label="顯示條件（布林）">
              <select
                value={current.conditionId ?? ""}
                onChange={(e) =>
                  patch({ conditionId: e.target.value || undefined })
                }
              >
                <option value="">永遠顯示</option>
                {project.variables
                  .filter((v) => v.type === "boolean")
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="啟用條件（布林）">
              <select
                value={current.enabledId ?? ""}
                onChange={(e) =>
                  patch({ enabledId: e.target.value || undefined })
                }
              >
                <option value="">永遠啟用</option>
                {project.variables
                  .filter((v) => v.type === "boolean")
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
              </select>
            </Field>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={current.locked}
                onChange={(e) => patch({ locked: e.target.checked })}
              />
              鎖定元件
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={current.visible}
                onChange={(e) => patch({ visible: e.target.checked })}
              />
              顯示元件
            </label>
          </PropertySection>
        </div>
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
