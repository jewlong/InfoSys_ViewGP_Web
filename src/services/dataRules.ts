import type { Element, Project, Variable } from "../model.ts";
import { getSystemVariable, isSystemVariable } from "./systemVariables.ts";

export function bindingTypes(e: Element): Variable["type"][] {
  if (
    ["number", "input", "gauge", "bar", "trend", "multistate"].includes(e.kind)
  )
    return ["number"];
  if (["indicator", "switch"].includes(e.kind)) return ["boolean"];
  if (["text", "datetime"].includes(e.kind))
    return ["number", "boolean", "string"];
  if (e.kind === "button") {
    if (
      ["screen", "previousScreen", "openDialog", "closeDialog"].includes(
        e.action,
      )
    )
      return [];
    if (["toggle", "momentary"].includes(e.action)) return ["boolean"];
    if (e.action === "increment") return ["number"];
    return ["number", "boolean", "string"];
  }
  return [];
}
export function parseNumber(raw: string): number | undefined {
  const text = raw.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text))
    return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}
export function inputError(e: Element, raw: string): string | undefined {
  const value = parseNumber(raw);
  if (value === undefined) return "請輸入有效數值，不能留白";
  if (
    e.inputMin !== undefined &&
    e.inputMax !== undefined &&
    e.inputMin > e.inputMax
  )
    return "最小值不可大於最大值";
  if (e.inputMin !== undefined && value < e.inputMin)
    return `數值不可小於 ${e.inputMin}`;
  if (e.inputMax !== undefined && value > e.inputMax)
    return `數值不可大於 ${e.inputMax}`;
  if (e.inputStep !== undefined) {
    if (!Number.isFinite(e.inputStep) || e.inputStep <= 0)
      return "輸入步距必須大於 0";
    const offset = (value - (e.inputMin ?? 0)) / e.inputStep;
    if (
      !Number.isFinite(offset) ||
      Math.abs(offset - Math.round(offset)) > 1e-8
    )
      return `請依 ${e.inputStep} 的步距輸入（起點 ${e.inputMin ?? 0}）`;
  }
  return undefined;
}
export function bindingProblems(e: Element, project: Project): string[] {
  const errors: string[] = [];
  const isSys = isSystemVariable(e.variableId);
  const sysVar = isSys ? getSystemVariable(e.variableId!) : undefined;
  const variable = isSys
    ? undefined
    : project.variables.find((v) => v.id === e.variableId);
  const types = bindingTypes(e);
  const isNavigationAction =
    e.kind === "button" &&
    ["screen", "previousScreen", "openDialog", "closeDialog"].includes(
      e.action,
    );
  const required =
    [
      "number",
      "input",
      "indicator",
      "switch",
      "gauge",
      "bar",
      "trend",
      "multistate",
    ].includes(e.kind) ||
    (e.kind === "button" && !isNavigationAction);

  if ((required || e.variableId) && !isNavigationAction) {
    if (isSys) {
      if (!sysVar) errors.push("未綁定有效系統變數");
      else if (types.length && !types.includes(sysVar.type))
        errors.push(`綁定類型不符，需使用 ${types.join("／")} 變數`);
      if (
        e.kind === "button" &&
        ["set", "increment", "toggle", "reset", "momentary"].includes(e.action)
      )
        errors.push("系統變數為唯讀，不可寫入");
    } else {
      if (!variable) errors.push("未綁定有效變數");
      else if (types.length && !types.includes(variable.type))
        errors.push(`綁定類型不符，需使用 ${types.join("／")} 變數`);
    }
  }

  for (const [id, name] of [
    [e.conditionId, "顯示"],
    [e.enabledId, "啟用"],
  ] as const) {
    if (id) {
      const conditionSys = isSystemVariable(id)
        ? getSystemVariable(id)
        : undefined;
      const conditionUser = project.variables.find((v) => v.id === id);
      const isBool =
        conditionSys?.type === "boolean" || conditionUser?.type === "boolean";
      if (!isBool) errors.push(`${name}條件需綁定有效布林變數`);
    }
  }

  if (e.kind === "button") {
    if (
      e.action === "screen" &&
      !project.screens.some((s) => s.id === e.targetScreenId)
    )
      errors.push("未選擇有效目標畫面");
    if (
      e.action === "openDialog" &&
      !project.screens.some((s) => s.id === e.targetScreenId)
    )
      errors.push("未選擇有效目標對話盒");
    if (variable && ["set", "increment"].includes(e.action)) {
      if (
        variable.type === "number" &&
        parseNumber(e.actionValue) === undefined
      )
        errors.push("設定值／增減量需為有效數字，不能留白");
      if (
        variable.type === "boolean" &&
        e.action === "set" &&
        !["true", "false"].includes(e.actionValue)
      )
        errors.push("布林設定值需為 true 或 false");
    }
  }
  if (e.kind === "input") {
    if (
      e.inputMin !== undefined &&
      e.inputMax !== undefined &&
      e.inputMin > e.inputMax
    )
      errors.push("最小值不可大於最大值");
    else if (variable?.type === "number") {
      const error = inputError(e, String(variable.initial));
      if (error) errors.push(`初始值：${error}`);
    }
  }
  return errors;
}
export function bindingPatch(
  e: Element,
  id: string | undefined,
  variables: Variable[],
): Partial<Element> {
  const variable = variables.find((v) => v.id === id);
  return {
    variableId: id,
    ...(e.kind === "button" && e.action === "set" && variable
      ? { actionValue: String(variable.initial) }
      : {}),
  };
}
export function actionPatch(
  e: Element,
  action: Element["action"],
  variables: Variable[],
): Partial<Element> {
  const types = bindingTypes({ ...e, action });
  const variable =
    variables.find((v) => v.id === e.variableId && types.includes(v.type)) ??
    variables.find((v) => types.includes(v.type));
  return {
    action,
    variableId: [
      "screen",
      "previousScreen",
      "openDialog",
      "closeDialog",
    ].includes(action)
      ? undefined
      : variable?.id,
    ...(action === "screen" || action === "openDialog"
      ? { targetScreenId: e.targetScreenId }
      : {}),
    ...(action === "set" && variable
      ? { actionValue: String(variable.initial) }
      : action === "increment" && parseNumber(e.actionValue) === undefined
        ? { actionValue: "1" }
        : {}),
  };
}

export function evaluateAction(
  e: Element,
  project: Project,
  values: Record<string, unknown>,
):
  | { error: string }
  | { screenId: string }
  | { actionType: "previousScreen" | "closeDialog" }
  | { actionType: "openDialog"; dialogId: string }
  | { variableId: string; value: number | boolean | string } {
  const errors = bindingProblems(e, project);
  if (errors.length) return { error: errors[0] };
  if (e.kind === "button" && e.action === "screen")
    return { screenId: e.targetScreenId! };
  if (e.kind === "button" && e.action === "previousScreen")
    return { actionType: "previousScreen" };
  if (e.kind === "button" && e.action === "openDialog")
    return { actionType: "openDialog", dialogId: e.targetScreenId! };
  if (e.kind === "button" && e.action === "closeDialog")
    return { actionType: "closeDialog" };
  const variable = project.variables.find((v) => v.id === e.variableId);
  if (!variable) return { error: "元件未綁定有效變數" };
  let value: number | boolean | string;
  if (e.kind === "switch" || e.action === "toggle") {
    if (variable.type !== "boolean" || typeof values[variable.id] !== "boolean")
      return { error: "切換需使用布林值" };
    value = !values[variable.id];
  } else if (e.action === "momentary") {
    if (variable.type !== "boolean") return { error: "點動需使用布林值" };
    value = e.actionValue === "false" ? false : true;
  } else if (e.action === "reset") value = variable.initial;
  else if (e.action === "increment") {
    const previous = values[variable.id];
    if (typeof previous !== "number") return { error: "加減需使用數值" };
    value = previous + parseNumber(e.actionValue)!;
  } else
    value =
      variable.type === "number"
        ? parseNumber(e.actionValue)!
        : variable.type === "boolean"
          ? e.actionValue === "true"
          : e.actionValue;
  if (typeof value === "number" && !Number.isFinite(value))
    return { error: "動作結果超出有效數值範圍" };
  return { variableId: variable.id, value };
}

