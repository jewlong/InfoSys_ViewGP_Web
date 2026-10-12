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
import {
  ColorField,
  Field,
  NumberField,
  PropertySection,
} from "../ui/Controls";
import { ElementProperties } from "./ElementProperties";
import { ScreenStructureFields } from "./ScreenStructureFields";
import { isPopup, screenElements } from "../../services/screenRules";
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
    communicationMode,
    communicationSnapshot,
    communicationError,
    setDialog,
    resetSimulation,
    notify,
    change,
    editScreen,
    setScreenId,
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
            <b>
              {communicationMode === "online" ? "設備連線執行中" : "模擬執行中"}
            </b>
            <span>
              {communicationMode === "online"
                ? "映射標籤使用設備資料"
                : "所有資料為本機模擬值"}
            </span>
          </div>
          {communicationMode === "online" && (
            <>
              <button
                className="secondary-btn full"
                onClick={() => setDialog("communication")}
              >
                通訊狀態
              </button>
              {communicationError && (
                <p className="communication-error">{communicationError}</p>
              )}
            </>
          )}
          <h4>變數監看</h4>
          {project.variables.map((v) => (
            <div className="watch-row" key={v.id}>
              <label>
                {v.name}
                <small>{v.type}</small>
              </label>
              {communicationMode === "online" && v.modbus ? (
                <span
                  className="communication-watch-value"
                  title={communicationSnapshot?.tags[v.id]?.error ?? undefined}
                >
                  {communicationSnapshot?.tags[v.id]?.quality === "good"
                    ? String(values[v.id])
                    : "資料失效"}
                  <small>
                    {communicationSnapshot?.tags[v.id]?.quality === "good"
                      ? "設備即時值"
                      : "等待連線／通訊異常"}
                  </small>
                </span>
              ) : v.type === "boolean" ? (
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
              resetSimulation();
              notify(
                communicationMode === "online"
                  ? "設備連線重新開始"
                  : "模擬資料已重設",
              );
            }}
          >
            {communicationMode === "online"
              ? "重新開始設備連線"
              : "重設模擬資料"}
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
            <ScreenStructureFields />
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
              disabled={isPopup(screen)}
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
            <span className="muted">
              {screenElements(project, screen.id).length}
            </span>
          </div>
          <div className="layers-list">
            {screenElements(project, screen.id)
              .filter((item) => item.ownerScreenId !== screen.id)
              .reverse()
              .map(({ element, ownerScreenId }) => (
                <div className="layer-row inherited-layer" key={element.id}>
                  <button
                    className="layer-name"
                    title="到父畫面編輯"
                    onClick={() => {
                      setScreenId(ownerScreenId);
                      setSelected([]);
                    }}
                  >
                    <Lock size={13} />
                    <span>
                      {element.name} · 繼承自{" "}
                      {
                        project.screens.find((s) => s.id === ownerScreenId)
                          ?.name
                      }
                    </span>
                  </button>
                </div>
              ))}
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
