import { useEffect, useRef, useState } from "react";
import type { AlarmEvent, AlarmSession } from "../types/runtime";
import { AlarmHistoryWriter } from "../services/alarmHistory";

export function useAlarmPersistence(
  projectId: string,
  session: AlarmSession | undefined,
  events: AlarmEvent[],
  persisted: boolean,
) {
  const [status, setStatus] = useState({ error: "", pending: 0 });
  const [writer] = useState(
    () =>
      new AlarmHistoryWriter(undefined, undefined, (error, pending) =>
        setStatus({ error, pending }),
      ),
  );
  const latest = useRef(events);
  latest.current = events;
  useEffect(() => {
    if (!session || !persisted) return;
    writer.observe(projectId, session, latest.current);
    void writer.flush();
    return () => {
      writer.finish(projectId, session);
      void writer.flush();
    };
  }, [writer, projectId, session?.id, persisted]);
  useEffect(() => {
    if (!session || !persisted) return;
    writer.observe(projectId, session, events);
    void writer.flush();
  }, [writer, projectId, session, events, persisted]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (writer.pendingCount()) void writer.flush();
    }, 5000);
    const leave = (event: BeforeUnloadEvent) => {
      if (writer.pendingCount()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    const pageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) writer.endOnPageHide();
    };
    window.addEventListener("pagehide", pageHide);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("beforeunload", leave);
      window.removeEventListener("pagehide", pageHide);
    };
  }, [writer]);
  return {
    alarmHistoryError: status.error,
    alarmHistoryPending: status.pending,
    retryAlarmHistory: () => writer.flush(),
  };
}
