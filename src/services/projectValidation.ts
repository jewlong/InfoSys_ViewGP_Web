import { communicationProblems } from "./communicationRules.ts";
import { advancedProblems } from "./advancedRules.ts";
import { bindingProblems } from "./dataRules.ts";
import type { Project } from "../model";
import { screenElements, screenProblems } from "./screenRules.ts";
import { globalAlarmProblems } from "./globalAlarms.ts";
export function checkProject(project: Project) {
  const problems: string[] = [
    ...screenProblems(project),
    ...communicationProblems(project),
    ...globalAlarmProblems(project),
  ];
  project.screens.forEach((s) =>
    screenElements(project, s.id).forEach(({ element: e, ownerScreenId }) => {
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
        problems.push(
          `${s.name} / ${e.name}${ownerScreenId !== s.id ? "（繼承）" : ""}：超出畫面範圍`,
        );
    }),
  );
  return problems;
}
