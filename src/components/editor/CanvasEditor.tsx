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
export function CanvasEditor() {
  const {
    project,
    screen,
    selected,
    setSelected,
    current,
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
    down,
    move,
    endDrag,
    beginResize,
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
            {running ? "可操作按鈕與輸入欄位" : "拖曳以移動 · 方向鍵微調"}
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
              className={
                "design-canvas " + (grid && !running ? "show-grid" : "")
              }
              style={{
                width: screen.width,
                height: screen.height,
                backgroundColor: screen.background,
                transform: `scale(${zoom})`,
              }}
              onPointerDown={() => setSelected([])}
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
              {screen.elements
                .filter(
                  (e) =>
                    e.visible &&
                    (!running || !e.conditionId || values[e.conditionId]),
                )
                .map((e) => (
                  <div
                    key={e.id}
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
                        : e.locked
                          ? "not-allowed"
                          : "move",
                      pointerEvents:
                        running && e.enabledId && !values[e.enabledId]
                          ? "none"
                          : undefined,
                      opacity:
                        running && e.enabledId && !values[e.enabledId]
                          ? 0.5
                          : 1,
                    }}
                    onPointerDown={(ev) => down(ev, e)}
                    onPointerMove={move}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  >
                    <WidgetRenderer
                      element={e}
                      values={running ? values : initialValues(project)}
                      running={running}
                      onAction={() => action(e)}
                      onInput={(val) => {
                        const v = project.variables.find(
                          (v) => v.id === e.variableId,
                        );
                        if (
                          v?.type === "number" &&
                          Number.isFinite(Number(val))
                        )
                          setValues((old) => ({
                            ...old,
                            [v.id]: Number(val),
                          }));
                      }}
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
            </div>
          </div>
          <div className="canvas-caption">
            <span>
              {running
                ? "瀏覽器模擬執行 · 不連接實際設備"
                : "畫布內容即為執行畫面"}
            </span>
            <span>{screen.elements.length} 個元件</span>
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
          <span>{revision ? `SQLite · v${revision}` : "尚未儲存"}</span>
          <span>{Math.round(zoom * 100)}%</span>
        </div>
      </footer>
    </main>
  );
}
