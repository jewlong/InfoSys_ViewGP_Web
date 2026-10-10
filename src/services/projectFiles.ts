import type { Project } from "../model";
export function downloadProject(project: Project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = project.name + ".viewx.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
