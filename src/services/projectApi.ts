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
  const body = JSON.stringify({ project, revision });
  if (new Blob([body]).size > 20 * 1024 * 1024)
    throw new Error("專案超過 20 MB，請移除未使用圖片");
  const response = await fetch(
    `/api/projects/${encodeURIComponent(project.id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}

export type VersionRow = {
  revision: number;
  createdAt: string;
  label?: string | null;
};
export async function updateVersionLabel(
  id: string,
  revision: number,
  label: string,
): Promise<{ revision: number; label: string }> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(id)}/versions/${revision}/label`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "無法更新版本標註");
  return data;
}
export async function listVersions(id: string): Promise<VersionRow[]> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(id)}/versions`,
  );
  if (!response.ok) throw new Error("無法讀取版本紀錄，請先儲存專案");
  return response.json();
}
export async function getVersion(
  id: string,
  revision: number,
): Promise<{ project: Project; revision: number; updatedAt: string }> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(id)}/versions/${revision}`,
  );
  if (!response.ok) throw new Error("無法讀取版本");
  const data = await response.json();
  if (!validateProject(data.project)) throw new Error("此版本格式不支援");
  return data;
}
export async function restoreVersion(
  id: string,
  sourceRevision: number,
  revision: number,
): Promise<{ project: Project; revision: number }> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(id)}/restore`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceRevision, revision }),
    },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  if (!validateProject(data.project)) throw new Error("此版本格式不支援");
  return data;
}
