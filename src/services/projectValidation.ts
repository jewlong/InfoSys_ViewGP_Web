import { advancedProblems } from "./advancedRules.ts";
import { bindingProblems } from "./dataRules.ts";
import type { Project } from "../model";
export function checkProject(project: Project) {
  const problems: string[] = [];
  project.screens.forEach((s) =>
    s.elements.forEach((e) => {
      for (const problem of [
        ...bindingProblems(e, project),
        ...advancedProblems(e, project),
      ])
        problems.push(`${s.name} / ${e.name}：${problem}`);
      if (
        e.kind === "image" &&
        !e.image &&
        !project.assets?.some((a) => a.id === e.imageAssetId)
      )
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
