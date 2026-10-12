import type { AlarmRule, Element, Project } from "../model";
import type { AlarmEvent } from "../types/runtime";
export function scaleRatio(value: unknown, e: Element): number | undefined {
  const min = e.scaleMin ?? 0,
    max = e.scaleMax ?? 100;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    max <= min ||
    !Number.isFinite(max - min)
  )
    return undefined;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}
export function valueColor(value: unknown, e: Element): string {
  if (typeof value === "number") {
    if (e.criticalThreshold !== undefined && value >= e.criticalThreshold)
      return "#ef4444";
    if (e.warningThreshold !== undefined && value >= e.warningThreshold)
      return "#f59e0b";
  }
  return e.fillColor ?? "#38bdf8";
}
export function alarmRuleProblems(rule: AlarmRule, project: Project): string[] {
  if (rule.enabled === false) return [];
  const variable = project.variables.find((v) => v.id === rule.variableId);
  if (!variable) return ["未綁定有效警報變數"];
  if (["true", "false"].includes(rule.operator))
    return variable.type === "boolean"
      ? []
      : ["TRUE／FALSE 條件需使用布林變數"];
  if (variable.type !== "number") return ["數值比較需使用數值變數"];
  return rule.threshold !== undefined && Number.isFinite(rule.threshold)
    ? []
    : ["數值警報需設定有效門檻"];
}
export function advancedProblems(e: Element, project: Project): string[] {
  const problems: string[] = [];
  if (["gauge", "bar", "trend"].includes(e.kind)) {
    const min = e.scaleMin ?? 0,
      max = e.scaleMax ?? 100;
    if (max <= min || !Number.isFinite(max - min))
      problems.push("量程最大值須大於最小值，且跨度須為有限數值");
    for (const [value, name] of [
      [e.warningThreshold, "警戒"],
      [e.criticalThreshold, "危險"],
    ] as const)
      if (value !== undefined && (value < min || value > max))
        problems.push(`${name}門檻須在量程內`);
    if (
      e.warningThreshold !== undefined &&
      e.criticalThreshold !== undefined &&
      e.warningThreshold > e.criticalThreshold
    )
      problems.push("警戒門檻不可大於危險門檻");
  }
  if (e.kind === "alarm") {
    if ((!e.alarmSource || e.alarmSource === "local") && !e.alarmRules?.length)
      problems.push("請至少設定一項警報規則");
    for (const rule of e.alarmSource === "global" ? [] : (e.alarmRules ?? []))
      for (const problem of alarmRuleProblems(rule, project))
        problems.push(`${rule.message || "未命名警報"}：${problem}`);
  }
  return problems;
}
export function alarmIsActive(
  rule: AlarmRule,
  values: Record<string, unknown>,
): boolean {
  if (rule.enabled === false) return false;
  const value = values[rule.variableId];
  if (rule.operator === "true") return value === true;
  if (rule.operator === "false") return value === false;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    rule.threshold === undefined
  )
    return false;
  switch (rule.operator) {
    case "gt":
      return value > rule.threshold;
    case "gte":
      return value >= rule.threshold;
    case "lt":
      return value < rule.threshold;
    case "lte":
      return value <= rule.threshold;
    case "eq":
      return value === rule.threshold;
    case "ne":
      return value !== rule.threshold;
  }
}
export function updateAlarmEvents(
  previous: AlarmEvent[],
  project: Project,
  values: Record<string, unknown>,
  now: number,
): AlarmEvent[] {
  const activeEvents = new Map(
    previous
      .filter((event) => event.clearedAt === undefined)
      .map((event) => [JSON.stringify([event.elementId, event.ruleId]), event]),
  );
  const additions: AlarmEvent[] = [];
  const clearedIds = new Set<string>();
  for (const e of project.screens
    .flatMap((s) => s.elements)
    .filter((e) => e.kind === "alarm" && e.alarmSource !== "global")) {
    for (const rule of e.alarmRules ?? []) {
      const existing = activeEvents.get(JSON.stringify([e.id, rule.id]));
      const active =
        alarmRuleProblems(rule, project).length === 0 &&
        alarmIsActive(rule, values);
      if (active && !existing)
        additions.push({
          id: crypto.randomUUID(),
          elementId: e.id,
          ruleId: rule.id,
          message: rule.message,
          severity: rule.severity,
          value: values[rule.variableId] as number | boolean,
          raisedAt: now,
        });
      else if (!active && existing) clearedIds.add(existing.id);
    }
  }
  if (!additions.length && !clearedIds.size) return previous;
  const events = [
    ...additions.reverse(),
    ...previous.map((event) =>
      clearedIds.has(event.id) ? { ...event, clearedAt: now } : event,
    ),
  ];
  const cleared = events
    .filter((event) => event.clearedAt !== undefined)
    .slice(0, 1000);
  const retained = new Set(cleared.map((event) => event.id));
  return events.filter(
    (event) =>
      event.clearedAt === undefined ||
      event.clearedAt === now ||
      retained.has(event.id),
  );
}
