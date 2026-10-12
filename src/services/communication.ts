import type { Project } from "../model";
export type TagSample = {
  value: unknown;
  quality: "good" | "bad" | "waiting";
  updatedAt: number | null;
  error: string | null;
};
export type CommunicationSnapshot = {
  sessionId: string;
  projectId: string;
  tags: Record<string, TagSample>;
  devices: {
    id: string;
    state: string;
    lastSuccessAt: number | null;
    error: string | null;
  }[];
};
export async function communicationRequest<T>(
  path: string,
  body?: unknown,
  timeoutMs = 5000,
): Promise<T> {
  const response = await fetch(
    `/api/communication/${path}`,
    body === undefined
      ? { signal: AbortSignal.timeout(timeoutMs) }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "通訊服務無法使用");
  return data as T;
}
export const startCommunication = (project: Project) =>
  communicationRequest<CommunicationSnapshot>("sessions", { project });
export const stopCommunication = (id: string) =>
  communicationRequest(`sessions/${encodeURIComponent(id)}/end`, {}, 30000);
