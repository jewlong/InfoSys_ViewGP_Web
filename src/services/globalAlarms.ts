import type { AlarmArea, Element, Project } from "../model.ts";
import type { AlarmEvent } from "../types/runtime.ts";

export const isWord = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 65535;

export function validateAlarmSettings(project: Project): boolean {
  const ticker = project.alarmTicker;
  if (
    ticker !== undefined &&
    (!ticker ||
      typeof ticker.enabled !== "boolean" ||
      !["top", "bottom"].includes(ticker.position) ||
      !Number.isInteger(ticker.intervalMs) ||
      ticker.intervalMs < 1000 ||
      ticker.intervalMs > 60000)
  )
    return false;
  if (project.alarmAreas === undefined) return true;
  if (!Array.isArray(project.alarmAreas) || project.alarmAreas.length > 100)
    return false;
  const ids = new Set<string>();
  return project.alarmAreas.every((area) => {
    if (
      !area ||
      typeof area.id !== "string" ||
      !area.id.trim() ||
      ids.has(area.id) ||
      typeof area.name !== "string" ||
      !area.name.trim() ||
      area.name.length > 200 ||
      typeof area.variableId !== "string" ||
      (area.maskVariableId !== undefined &&
        typeof area.maskVariableId !== "string") ||
      typeof area.group !== "string" ||
      area.group.length > 200 ||
      typeof area.enabled !== "boolean" ||
      !Number.isInteger(area.updateIntervalMs) ||
      area.updateIntervalMs < 100 ||
      area.updateIntervalMs > 60000 ||
      !Array.isArray(area.rules) ||
      area.rules.length > 16
    )
      return false;
    ids.add(area.id);
    const bits = new Set<number>(),
      rules = new Set<string>();
    return area.rules.every((rule) => {
      if (
        !rule ||
        typeof rule.id !== "string" ||
        !rule.id.trim() ||
        rules.has(rule.id) ||
        !Number.isInteger(rule.bit) ||
        rule.bit < 0 ||
        rule.bit > 15 ||
        bits.has(rule.bit) ||
        typeof rule.message !== "string" ||
        !rule.message.trim() ||
        rule.message.length > 2000 ||
        !["info", "warning", "critical"].includes(rule.severity) ||
        (rule.enabled !== undefined && typeof rule.enabled !== "boolean")
      )
        return false;
      bits.add(rule.bit);
      rules.add(rule.id);
      return true;
    });
  });
}

export function globalAlarmProblems(
  project: Project,
  values?: Record<string, unknown>,
): string[] {
  const errors: string[] = [];
  for (const area of project.alarmAreas ?? []) {
    if (!area.enabled) continue;
    if (!area.rules.length) errors.push(`${area.name}：請至少設定一個警報位元`);
    for (const [id, label] of [
      [area.variableId, "警報 Word"],
      [area.maskVariableId, "遮罩 Word"],
    ] as const) {
      if (label === "遮罩 Word" && id === undefined) continue;
      const variable = project.variables.find(
        (v) => v.id === id && v.type === "number",
      );
      if (!variable) errors.push(`${area.name}：${label}需綁定數值變數`);
      else if (!isWord(values ? values[id!] : variable.initial))
        errors.push(`${area.name}：${label}須為 0～65535 的整數`);
    }
  }
  return errors;
}

export function updateGlobalAlarmEvents(
  previous: AlarmEvent[],
  areas: AlarmArea[],
  values: Record<string, unknown>,
  now: number,
  lastChecks: Map<string, number>,
  unavailable: ReadonlySet<string> = new Set(),
): AlarmEvent[] {
  const active = new Map(
    previous
      .filter((e) => e.areaId && e.clearedAt === undefined)
      .map((e) => [JSON.stringify([e.areaId, e.ruleId]), e]),
  );
  const additions: AlarmEvent[] = [],
    cleared = new Map<string, AlarmEvent["clearedReason"]>();
  for (const area of areas) {
    if (
      unavailable.has(area.variableId) ||
      (area.maskVariableId && unavailable.has(area.maskVariableId))
    )
      continue;
    if (now - (lastChecks.get(area.id) ?? -Infinity) < area.updateIntervalMs)
      continue;
    lastChecks.set(area.id, now);
    const word = values[area.variableId],
      mask = area.maskVariableId ? values[area.maskVariableId] : 0;
    for (const rule of area.rules) {
      const existing = active.get(JSON.stringify([area.id, rule.id]));
      const valid = isWord(word) && isWord(mask);
      const masked = valid && Boolean(mask & (1 << rule.bit));
      const triggered =
        area.enabled &&
        rule.enabled !== false &&
        valid &&
        !masked &&
        Boolean(word & (1 << rule.bit));
      if (triggered && !existing)
        additions.push({
          id: crypto.randomUUID(),
          areaId: area.id,
          areaName: area.name,
          group: area.group,
          ruleId: rule.id,
          bit: rule.bit,
          message: rule.message,
          severity: rule.severity,
          value: word,
          raisedAt: now,
        });
      else if (!triggered && existing)
        cleared.set(
          existing.id,
          !area.enabled || rule.enabled === false
            ? "disabled"
            : !valid
              ? "invalidValue"
              : masked
                ? "masked"
                : "condition",
        );
    }
  }
  if (!additions.length && !cleared.size) return previous;
  const events = [
    ...additions.reverse(),
    ...previous.map((event) =>
      cleared.has(event.id)
        ? { ...event, clearedAt: now, clearedReason: cleared.get(event.id) }
        : event,
    ),
  ];
  const clearedIds = new Set(
    events
      .filter((event) => event.clearedAt !== undefined)
      .slice(0, 1000)
      .map((event) => event.id),
  );
  return events.filter(
    (event) =>
      event.clearedAt === undefined ||
      event.clearedAt === now ||
      clearedIds.has(event.id),
  );
}

export function widgetAlarmEvents(
  element: Element,
  events: AlarmEvent[],
): AlarmEvent[] {
  const source = element.alarmSource ?? "local";
  return events.filter(
    (event) =>
      (source === "all" ||
        (source === "global"
          ? Boolean(event.areaId)
          : event.elementId === element.id)) &&
      (!element.alarmGroup || event.group === element.alarmGroup),
  );
}
