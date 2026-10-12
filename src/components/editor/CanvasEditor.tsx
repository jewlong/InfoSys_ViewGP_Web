import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  PanelLeftClose,
  PanelRightClose,
  Plus,
  X,
} from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { labels, type Kind } from "../../model";
import { initialValues } from "../../utils/project";
import { Tool } from "../ui/Controls";
import { WidgetRenderer } from "../widgets/WidgetRenderer";
import { screenElements } from "../../services/screenRules";
import { RuntimePopups } from "./RuntimePopups";
export function CanvasEditor() {
  const {
    project,
    screen,
    selected,
    setSelected,
    setDialog,
    current,
    autoSaveError,
    retryAutoSave,
    saving,
    revision,
    dirty,
    running,
    values,
    setValues,
    zoom,
    grid,
    snap,
    left,
    setLeft,
    right,
    setRight,
    logs,
    bottom,
    setBottom,
    canvasRef,
    workspaceRef,
    addElement,
    newScreen,
    action,
    input,
    trendData,
    alarmEvents,
    acknowledgeAlarm,
    down,
    move,
    endDrag,
    beginResize,
    marquee,
    beginMarquee,
    moveMarquee,
    endMarquee,
    cancelMarquee,
    popupIds,
    notify,
  } = useEditorContext();
  return (
    <main className="editor">
      <div className="canvas-tabs">
        <div className="canvas-tab">
          <LayoutDashboard size={14} />
          {screen.name}
          {dirty && <span className="tab-dot" />}
        </div>
        <button
          disabled={running}
          onClick={() => newScreen()}
          aria-label="新增畫面頁籤"
        >
          <Plus size={15} />
        </button>
        <div className="canvas-tabs-right">
          <span>
            {screen.width} × {screen.height}
          </span>
          <Tool
            icon={PanelLeftClose}
            label="切換左側面板"
            onClick={() => setLeft(!left)}
          />
          <Tool
            icon={PanelRightClose}
            label="切換屬性面板"
            onClick={() => setRight(!right)}
          />
        </div>
      </div>
      <div className="workspace" ref={workspaceRef}>
        <div className="workspace-heading">
          <div>
            <span className="eyebrow">
              {running ? "RUNTIME PREVIEW" : "SCREEN EDITOR"}
            </span>
            <span>
              {screen.name}
              <ChevronRight size={12} />
              {running ? "互動模擬" : "畫面設計"}
            </span>
          </div>
          <span className="workspace-hint">
            {running ? "可操作按鈕與輸入欄位" : "空白處拖曳框選 · 元件拖曳移動"}
          </span>
        </div>
        <div className="canvas-scroll">
          <div
            className="canvas-container"
            style={{
              width: screen.width * zoom,
              height: screen.height * zoom,
            }}
          >
            <div
              ref={canvasRef}
              inert={running && popupIds.length > 0}
              className={
                "design-canvas " + (grid && !running ? "show-grid" : "")
              }
              style={{
                width: screen.width,
                height: screen.height,
                backgroundColor: screen.background,
                transform: `scale(${zoom})`,
              }}
              onPointerDown={beginMarquee}
              onPointerMove={moveMarquee}
              onPointerUp={endMarquee}
              onPointerCancel={cancelMarquee}
              onLostPointerCapture={cancelMarquee}
              onDragOver={(e) => {
                if (!running) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const k = e.dataTransfer.getData("viewx-kind") as Kind;
                if (running || !(k in labels)) return;
                const rect = canvasRef.current!.getBoundingClientRect();
                addElement(
                  k,
                  Math.max(
                    0,
                    Math.min(
                      screen.width - 160,
                      Math.round((e.clientX - rect.left) / zoom),
                    ),
                  ),
                  Math.max(
                    0,
                    Math.min(
                      screen.height - 80,
                      Math.round((e.clientY - rect.top) / zoom),
                    ),
                  ),
                );
              }}
            >
              {screenElements(project, screen.id)
                .filter(
                  ({ element: e }) =>
                    e.visible &&
                    (!running || !e.conditionId || values[e.conditionId]),
                )
                .map(({ element: e, ownerScreenId }) => (
                  <div
                    key={e.id}
                    data-inherited={ownerScreenId !== screen.id || undefined}
                    title={
                      !running && ownerScreenId !== screen.id
                        ? "繼承元件，請到父畫面編輯"
                        : undefined
                    }
                    className={
                      "canvas-element " +
                      (!running && selected.includes(e.id)
                        ? "is-selected"
                        : "") +
                      (!running && e.locked ? " is-locked" : "")
                    }
                    style={{
                      left: e.x,
                      top: e.y,
                      width: e.width,
                      height: e.height,
                      cursor: running
                        ? "default"
                        : e.locked || ownerScreenId !== screen.id
                          ? "not-allowed"
                          : "move",
                      pointerEvents:
                        running &&
                        !["button", "input", "switch"].includes(e.kind) &&
                        e.enabledId &&
                        !values[e.enabledId]
                          ? "none"
                          : undefined,
                      opacity:
                        running &&
                        !["button", "input", "switch"].includes(e.kind) &&
                        e.enabledId &&
                        !values[e.enabledId]
                          ? 0.5
                          : 1,
                    }}
                    onContextMenu={(ev) => {
                      if (running) return;
                      ev.preventDefault();
                      ev.stopPropagation();
                      if (ownerScreenId !== screen.id) {
                        setSelected([]);
                        notify("繼承元件請到父畫面編輯");
                        return;
                      }
                      setSelected([e.id]);
                      setDialog("element");
                    }}
                    onPointerDown={(ev) => {
                      if (!running && ownerScreenId !== screen.id) {
                        ev.stopPropagation();
                        setSelected([]);
                        return;
                      }
                      down(ev, e);
                    }}
                    onPointerMove={move}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  >
                    <WidgetRenderer
                      assets={project.assets}
                      element={e}
                      values={running ? values : initialValues(project)}
                      running={running}
                      disabled={Boolean(
                        running && e.enabledId && !values[e.enabledId],
                      )}
                      onAction={() => action(e, screen.id)}
                      onInput={(val) => input(e, val, screen.id)}
                      samples={trendData[e.id]}
                      alarmEvents={alarmEvents.filter(
                        (event) => event.elementId === e.id,
                      )}
                      onAcknowledge={acknowledgeAlarm}
                    />
                    {!running && selected.includes(e.id) && (
                      <>
                        <span className="selection-label">{e.name}</span>
                        {["nw", "ne", "sw", "se"].map((c) => (
                          <span
                            key={c}
                            className={"selection-handle " + c}
                            onPointerDown={(ev) => beginResize(ev, e, c)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                ))}
              {marquee && (
                <div
                  className="selection-marquee"
                  style={marquee}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
          <div className="canvas-caption">
            <span>
              {running
                ? "瀏覽器模擬執行 · 不連接實際設備"
                : "畫布內容即為執行畫面"}
            </span>
            <span>{screenElements(project, screen.id).length} 個元件</span>
          </div>
        </div>
      </div>
      {bottom && (
        <div className="log-panel">
          <div>
            <span>執行紀錄</span>
            <button onClick={() => setBottom(false)}>
              <X size={14} />
            </button>
          </div>
          {logs.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      )}
      <footer className="status-bar">
        <button onClick={() => setBottom(!bottom)}>
          <span className="status-dot" />
          {running ? "模擬執行中" : "就緒"}
          <ChevronDown size={12} />
        </button>
        <span>
          {selected.length ? `已選取 ${selected.length} 個元件` : "未選取元件"}
        </span>
        <div className="status-right">
          <span>{snap ? "吸附：10 px" : "吸附：關閉"}</span>
          {project.autoSave && (
            <span title={autoSaveError}>
              {saving
                ? "自動儲存：儲存中"
                : autoSaveError
                  ? "自動儲存：已暫停"
                  : dirty
                    ? "自動儲存：等待儲存"
                    : "自動儲存：已同步"}
            </span>
          )}
          {project.autoSave && autoSaveError && (
            <button onClick={retryAutoSave}>重試自動儲存</button>
          )}
          <span>{revision ? `SQLite · v${revision}` : "尚未儲存"}</span>
          <span>{Math.round(zoom * 100)}%</span>
        </div>
      </footer>
      <RuntimePopups />
    </main>
  );
}
