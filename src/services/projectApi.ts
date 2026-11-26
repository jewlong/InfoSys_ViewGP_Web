import { validateProject, type Project } from "../model";
import type { ProjectRow } from "../types/editor";

async function readJson<T>(
  response: Response,
  fallbackError: string,
): Promise<T> {
  const text = await response.text();
  let data: Record<string, unknown> | null = null;
  if (text.trim()) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = null;
    }
  }
  if (!response.ok) {
    const msg =
      (data && typeof data.error === "string" && data.error) ||
      (response.status >= 500 && !text.trim()
        ? "後端 C# 儲存服務尚未就緒（http://localhost:5000），請稍候幾秒或確認已啟動 npm run dev:server"
        : fallbackError);
    throw new Error(msg);
  }
  if (data === null) throw new Error(fallbackError);
  return data as unknown as T;
}

export async function listProjects(): Promise<ProjectRow[]> {
  let response: Response;
  try {
    response = await fetch("/api/projects");
  } catch {
    throw new Error("無法連線至後端伺服器（http://localhost:5000）");
  }
  return readJson<ProjectRow[]>(response, "無法讀取專案清單");
}

export async function getProject(
  id: string,
): Promise<{ project: Project; revision: number }> {
  const response = await fetch(`/api/projects/${encodeURIComponent(id)}`);
  const data = await readJson<{ project: Project; revision: number }>(
    response,
    "無法開啟專案",
  );
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
  let response: Response;
  try {
    response = await fetch(
      `/api/projects/${encodeURIComponent(project.id)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      },
    );
  } catch {
    throw new Error(
      "無法連線至後端 C# 伺服器（http://localhost:5000），變更已自動保存至本機離線草稿",
    );
  }
  return readJson<{ revision: number; updatedAt: string }>(
    response,
    "儲存專案失敗",
  );
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
  return readJson<{ revision: number; label: string }>(
    response,
    "無法更新版本標註",
  );
}

export async function listVersions(id: string): Promise<VersionRow[]> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(id)}/versions`,
  );
  return readJson<VersionRow[]>(
    response,
    "無法讀取版本紀錄，請先儲存專案",
  );
}

export async function getVersion(
  id: string,
  revision: number,
): Promise<{ project: Project; revision: number; updatedAt: string }> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(id)}/versions/${revision}`,
  );
  const data = await readJson<{
    project: Project;
    revision: number;
    updatedAt: string;
  }>(response, "無法讀取版本");
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
  const data = await readJson<{ project: Project; revision: number }>(
    response,
    "還原版本失敗",
  );
  if (!validateProject(data.project)) throw new Error("此版本格式不支援");
  return data;
}
