import type { Project } from "../model";
export function checkProject(project: Project) {
  const problems: string[] = [];
  project.screens.forEach((s) =>
    s.elements.forEach((e) => {
      if (
        ["number", "input", "indicator", "switch", "button"].includes(e.kind) &&
        !(e.kind === "button" && e.action === "screen") &&
        !project.variables.some((v) => v.id === e.variableId)
      )
        problems.push(`${s.name} / ${e.name}：未綁定有效變數`);
      if (
        e.action === "screen" &&
        e.kind === "button" &&
        !project.screens.some((s) => s.id === e.targetScreenId)
      )
        problems.push(`${s.name} / ${e.name}：未選擇目標畫面`);
      if (
        e.kind === "text" &&
        e.variableId &&
        !project.variables.some((v) => v.id === e.variableId)
      )
        problems.push(`${s.name} / ${e.name}：文字綁定變數不存在`);
      const v = project.variables.find((v) => v.id === e.variableId);
      if (v && ["input", "number"].includes(e.kind) && v.type !== "number")
        problems.push(`${s.name} / ${e.name}：需綁定數值變數`);
      if (v && ["indicator", "switch"].includes(e.kind) && v.type !== "boolean")
        problems.push(`${s.name} / ${e.name}：需綁定布林變數`);
      if (
        v &&
        e.kind === "button" &&
        e.action === "increment" &&
        v.type !== "number"
      )
        problems.push(`${s.name} / ${e.name}：加減值需使用數值變數`);
      if (
        v &&
        e.kind === "button" &&
        e.action === "toggle" &&
        v.type !== "boolean"
      )
        problems.push(`${s.name} / ${e.name}：切換需使用布林變數`);
      if (
        v &&
        e.kind === "button" &&
        ["set", "increment"].includes(e.action) &&
        v.type === "number" &&
        !Number.isFinite(Number(e.actionValue))
      )
        problems.push(`${s.name} / ${e.name}：設定值需為有效數字`);
      if (
        v &&
        e.kind === "button" &&
        e.action === "set" &&
        v.type === "boolean" &&
        !["true", "false"].includes(e.actionValue)
      )
        problems.push(`${s.name} / ${e.name}：布林設定值需為 true 或 false`);
      for (const id of [e.conditionId, e.enabledId])
        if (
          id &&
          !project.variables.some((v) => v.id === id && v.type === "boolean")
        )
          problems.push(`${s.name} / ${e.name}：條件需綁定有效布林變數`);
      if (e.kind === "image" && !e.image)
        problems.push(`${s.name} / ${e.name}：尚未設定圖片`);
      if (
        e.x < 0 ||
        e.y < 0 ||
        e.x + e.width > s.width ||
        e.y + e.height > s.height
      )
        problems.push(`${s.name} / ${e.name}：超出畫面範圍`);
    }),
  );
  return problems;
}
