import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Bell } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";

export function AlarmTicker({ position }: { position: "top" | "bottom" }) {
  const { project, running, alarmEvents, setDialog, alarmRuntimeProblems } =
    useEditorContext();
  const [index, setIndex] = useState(0);
  const windowRef = useRef<HTMLDivElement>(null),
    messageRef = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);
  const active = alarmEvents
    .filter((e) => e.clearedAt === undefined)
    .sort(
      (a, b) =>
        ({ critical: 3, warning: 2, info: 1 })[b.severity] -
          { critical: 3, warning: 2, info: 1 }[a.severity] ||
        a.raisedAt - b.raisedAt,
    );
  const enabled = Boolean(
    running &&
    project.alarmTicker?.enabled &&
    project.alarmTicker.position === position,
  );
  useEffect(() => {
    if (!enabled || active.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((old) => old + 1),
      project.alarmTicker?.intervalMs ?? 3000,
    );
    return () => window.clearInterval(timer);
  }, [enabled, active.length, project.alarmTicker?.intervalMs]);
  const event = active.length ? active[index % active.length] : undefined;
  useEffect(() => {
    const measure = () =>
      setDistance(
        Math.max(
          0,
          (messageRef.current?.scrollWidth ?? 0) -
            (windowRef.current?.clientWidth ?? 0),
        ),
      );
    measure();
    const observer = new ResizeObserver(measure);
    if (windowRef.current) observer.observe(windowRef.current);
    return () => observer.disconnect();
  }, [
    enabled,
    event?.id,
    event?.message,
    event?.acknowledgedAt,
    alarmRuntimeProblems.join(";"),
  ]);
  if (!enabled) return null;
  return (
    <div
      className="global-alarm-ticker"
      data-severity={event?.severity ?? "info"}
    >
      <Bell size={17} />
      <span>{active.length} 項發生中</span>
      <div
        className="alarm-ticker-window"
        ref={windowRef}
        aria-live="polite"
        style={
          {
            "--alarm-scroll-distance": `${distance}px`,
            "--alarm-scroll-duration": `${project.alarmTicker?.intervalMs ?? 3000}ms`,
          } as CSSProperties
        }
      >
        <span
          ref={messageRef}
          key={event?.id}
          className={event ? "alarm-ticker-message" : ""}
        >
          {alarmRuntimeProblems.length
            ? alarmRuntimeProblems.join("；")
            : event
              ? `${event.group ? `[${event.group}] ` : ""}${event.message}${event.acknowledgedAt !== undefined ? "（已確認）" : ""}`
              : "目前沒有發生中的警報"}
        </span>
      </div>
      <button onClick={() => setDialog("alarms")}>警報中心</button>
    </div>
  );
}
