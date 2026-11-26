import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { screenElements } from "../../services/screenRules";
import { widgetAlarmEvents } from "../../services/globalAlarms";
import { WidgetRenderer } from "../widgets/WidgetRenderer";
import type { Screen } from "../../model";

function PopupLayer({ screen, active }: { screen: Screen; active: boolean }) {
  const {
    project,
    values,
    runtimeElementDisabled,
    runtimeDataInvalid,
    action,
    input,
    closePopup,
    trendData,
    alarmEvents,
    acknowledgeAlarm,
    momentaryAction,
    popupDrafts,
    confirmPopup,
  } = useEditorContext();
  const transactional = screen.popupCommitMode === "transactional";
  const modal = screen.popupModal !== false;
  const draft = popupDrafts[screen.id] ?? {};
  const draftCount = Object.keys(draft).length;
  const shownValues = transactional ? { ...values, ...draft } : values;
  const ref = useRef<HTMLElement>(null);
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  useEffect(() => {
    const resize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    if (!active || !modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const focus = () =>
      ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    focus();
    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target))
        focus();
    };
    document.addEventListener("focusin", containFocus);
    return () => {
      document.removeEventListener("focusin", containFocus);
      if (previous?.isConnected) previous.focus();
    };
  }, [active, modal]);
  const scale = Math.min(
    1,
    Math.max(0.01, (viewport.width - 32) / screen.width),
    Math.max(0.01, (viewport.height - 100) / screen.height),
  );
  return (
    <div
      className="runtime-popup-backdrop"
      inert={!active}
      aria-hidden={!active}
      style={modal ? undefined : { pointerEvents: "none" }}
    >
      <section
        className="runtime-popup"
        style={{
          width: screen.width * scale + 2,
          ...(modal ? {} : { pointerEvents: "auto" }),
        }}
        ref={ref}
        role="dialog"
        aria-modal={(active && modal) || undefined}
        aria-label={screen.name}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            ref.current!.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
            ),
          );
          const first = controls[0],
            last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="runtime-popup-header">
          <span>{screen.name}</span>
          <button aria-label="關閉執行對話盒" onClick={closePopup}>
            <X size={18} />
          </button>
        </div>
        <div
          style={{ width: screen.width * scale, height: screen.height * scale }}
        >
          <div
            className="runtime-popup-canvas"
            style={{
              width: screen.width,
              height: screen.height,
              transform: `scale(${scale})`,
              background: screen.background,
            }}
          >
            {screenElements(project, screen.id)
              .filter(
                ({ element: e }) =>
                  e.visible && (!e.conditionId || values[e.conditionId]),
              )
              .map(({ element: e }) => (
                <div
                  key={e.id}
                  className="canvas-element"
                  style={{
                    left: e.x,
                    top: e.y,
                    width: e.width,
                    height: e.height,
                  }}
                >
                  <WidgetRenderer
                    element={e}
                    assets={project.assets}
                    values={shownValues}
                    running
                    disabled={Boolean(
                      (e.enabledId && !values[e.enabledId]) ||
                      runtimeElementDisabled(e),
                    )}
                    onAction={() => action(e, screen.id)}
                    onMomentary={(down) => momentaryAction(e, down, screen.id)}
                    onInput={(value) => input(e, value, screen.id)}
                    samples={trendData[e.id]}
                    alarmEvents={widgetAlarmEvents(e, alarmEvents)}
                    onAcknowledge={acknowledgeAlarm}
                  />
                  {runtimeDataInvalid(e) && (
                    <span className="communication-value-error">資料失效</span>
                  )}
                </div>
              ))}
          </div>
        </div>
        {transactional && (
          <div className="transactional-popup-footer">
            <span role="status">
              {draftCount ? `尚有 ${draftCount} 項未套用變更` : "尚無變更"}
            </span>
            <button className="secondary-btn" onClick={closePopup}>
              取消
            </button>
            <button
              className="primary-btn"
              disabled={!draftCount}
              onClick={() => confirmPopup(screen.id)}
            >
              確定
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export function RuntimePopups() {
  const { project, popupIds, running } = useEditorContext();
  if (!running) return null;
  return (
    <>
      {popupIds.map((id, index) => {
        const screen = project.screens.find((s) => s.id === id);
        return (
          screen && (
            <PopupLayer
              key={id}
              screen={screen}
              active={index === popupIds.length - 1}
            />
          )
        );
      })}
    </>
  );
}
