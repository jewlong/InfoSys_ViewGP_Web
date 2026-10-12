import { useEffect, useRef, useState } from "react";
import type { Project } from "../model";
import { updateAlarmEvents } from "../services/advancedRules";
import type { AlarmEvent, AlarmSession, TrendPoint } from "../types/runtime";
import {
  updateGlobalAlarmEvents,
  globalAlarmProblems,
} from "../services/globalAlarms";

export function useRuntimeData(
  project: Project,
  values: Record<string, unknown>,
  running: boolean,
  epoch: number,
) {
  const [trendData, setTrendData] = useState<Record<string, TrendPoint[]>>({});
  const [alarmEvents, setAlarmEvents] = useState<AlarmEvent[]>([]);
  const [alarmSession, setAlarmSession] = useState<AlarmSession>();
  const lastChecks = useRef(new Map<string, number>());
  const valuesRef = useRef(values);
  valuesRef.current = values;
  useEffect(() => {
    setTrendData({});
    setAlarmEvents([]);
    lastChecks.current.clear();
    setAlarmSession(
      running ? { id: crypto.randomUUID(), startedAt: Date.now() } : undefined,
    );
    if (!running) return;
    const trends = project.screens
      .flatMap((s) => s.elements)
      .filter((e) => e.kind === "trend");
    const lastSample = new Map<string, number>();
    const sample = () => {
      const now = Date.now();
      const due = trends.filter(
        (e) => now - (lastSample.get(e.id) ?? 0) >= (e.sampleInterval ?? 1000),
      );
      if (!due.length) return;
      const points: Record<string, TrendPoint> = {};
      for (const e of due) {
        lastSample.set(e.id, now);
        const value = valuesRef.current[e.variableId ?? ""];
        if (typeof value === "number" && Number.isFinite(value))
          points[e.id] = { time: now, value };
      }
      if (!Object.keys(points).length) return;
      setTrendData((previous) => {
        const next = { ...previous };
        for (const e of due)
          if (points[e.id])
            next[e.id] = [...(previous[e.id] ?? []), points[e.id]].slice(
              -(e.historyPoints ?? 120),
            );
        return next;
      });
    };
    sample();
    if (!trends.length) return;
    const timer = window.setInterval(sample, 100);
    return () => window.clearInterval(timer);
  }, [project, running, epoch]);
  useEffect(() => {
    if (running)
      setAlarmEvents((previous) =>
        updateAlarmEvents(previous, project, values, Date.now()),
      );
  }, [project, values, running, epoch]);
  useEffect(() => {
    if (!running || !project.alarmAreas?.length) return;
    const check = () =>
      setAlarmEvents((previous) =>
        updateGlobalAlarmEvents(
          previous,
          project.alarmAreas ?? [],
          valuesRef.current,
          Date.now(),
          lastChecks.current,
        ),
      );
    check();
    const timer = window.setInterval(check, 100);
    return () => window.clearInterval(timer);
  }, [project, running, epoch]);
  function acknowledgeAlarm(id: string) {
    if (!running) return;
    setAlarmEvents((previous) =>
      previous.map((event) =>
        event.id === id && event.acknowledgedAt === undefined
          ? { ...event, acknowledgedAt: Date.now() }
          : event,
      ),
    );
  }
  function clearRuntimeData() {
    setTrendData({});
    setAlarmEvents([]);
    setAlarmSession(undefined);
  }
  return {
    trendData,
    alarmEvents,
    acknowledgeAlarm,
    alarmSession,
    clearRuntimeData,
    alarmRuntimeProblems: running ? globalAlarmProblems(project, values) : [],
  };
}
