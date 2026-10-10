import { validateProject, type Project } from "../model";
import type { ProjectRow } from "../types/editor";
export async function listProjects(): Promise<ProjectRow[]> {
  const response = await fetch("/api/projects");
  if (!response.ok) throw new Error("無法讀取專案清單");
  return response.json();
}
export async function getProject(
  id: string,
): Promise<{ project: Project; revision: number }> {
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error("無法開啟專案");
  const data = await response.json();
  if (!validateProject(data.project)) throw new Error("專案格式不支援");
  return data;
}
export async function saveProject(
  project: Project,
  revision: number,
): Promise<{ revision: number; updatedAt: string }> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(project.id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project, revision }),
    },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}
