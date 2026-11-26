import type { AlarmEvent, AlarmSession } from "../types/runtime.ts";

async function post(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: false,
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "警報歷史保存失敗");
  }
}
export const saveAlarmBatch = (
  projectId: string,
  session: AlarmSession,
  events: AlarmEvent[],
) =>
  post(`/api/projects/${encodeURIComponent(projectId)}/alarm-events`, {
    sessionId: session.id,
    startedAt: session.startedAt,
    events,
  });
export const endAlarmSession = (projectId: string, session: AlarmSession) =>
  post(
    `/api/projects/${encodeURIComponent(projectId)}/alarm-sessions/${encodeURIComponent(session.id)}/end`,
    {},
  );
export type AlarmHistoryPage = {
  items: AlarmEvent[];
  total: number;
  offset: number;
  limit: number;
};
export async function listAlarmHistory(
  projectId: string,
  filters: Record<string, string | number> = {},
): Promise<AlarmHistoryPage> {
  const query = new URLSearchParams(
    Object.entries(filters)
      .filter(([, value]) => value !== "")
      .map(([key, value]) => [key, String(value)]),
  );
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/alarm-events?${query}`,
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "警報歷史讀取失敗");
  return {
    ...data,
    items: data.items.map((event: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(event).filter(([, value]) => value !== null),
      ),
    ),
  };
}

export async function pruneAlarmHistory(
  projectId: string,
  policy: { maxDays?: number; maxRecords?: number },
): Promise<{ deletedCount: number }> {
  const response = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/alarm-events/prune`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(policy),
    },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "警報清理失敗");
  return { deletedCount: data.deletedCount ?? 0 };
}

type Job = {
  projectId: string;
  session: AlarmSession;
  pending: Map<string, AlarmEvent>;
  known: Map<string, string>;
  started: boolean;
  ended: boolean;
};
// Coalesce event updates while preserving session order. Failed batches stay in memory for retry.
export class AlarmHistoryWriter {
  private jobs = new Map<string, Job>();
  private inFlight?: Promise<void>;
  private error = "";
  private save: typeof saveAlarmBatch;
  private end: typeof endAlarmSession;
  private state: (error: string, pending: number) => void;
  constructor(
    save = saveAlarmBatch,
    end = endAlarmSession,
    state: (error: string, pending: number) => void = () => {},
  ) {
    this.save = save;
    this.end = end;
    this.state = state;
  }
  observe(projectId: string, session: AlarmSession, events: AlarmEvent[]) {
    const key = JSON.stringify([projectId, session.id]);
    let job = this.jobs.get(key);
    if (!job) {
      job = {
        projectId,
        session,
        pending: new Map(),
        known: new Map(),
        started: false,
        ended: false,
      };
      this.jobs.set(key, job);
    }
    for (const event of events)
      if (job.known.get(event.id) !== JSON.stringify(event))
        job.pending.set(event.id, event);
    const current = new Set(events.map((event) => event.id));
    for (const id of job.known.keys())
      if (!current.has(id) && !job.pending.has(id)) job.known.delete(id);
  }
  finish(projectId: string, session: AlarmSession) {
    const job = this.jobs.get(JSON.stringify([projectId, session.id]));
    if (job) job.ended = true;
  }
  pendingCount() {
    return [...this.jobs.values()].reduce(
      (n, job) =>
        n + job.pending.size + (!job.started ? 1 : 0) + (job.ended ? 1 : 0),
      0,
    );
  }
  endOnPageHide() {
    for (const job of this.jobs.values()) if (job.started) {
      navigator.sendBeacon(`/api/projects/${encodeURIComponent(job.projectId)}/alarm-sessions/${encodeURIComponent(job.session.id)}/end`,
        new Blob(["{}"], { type: "application/json" }));
    }
  }
  flush(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.drain().finally(() => {
      this.inFlight = undefined;
      this.state(this.error, this.pendingCount());
      if (!this.error && this.pendingCount()) void this.flush();
    });
    return this.inFlight;
  }
  private async drain() {
    this.state(this.error, this.pendingCount());
    try {
      for (const [key, job] of this.jobs) {
        while (!job.started || job.pending.size) {
          const batch = [...job.pending.values()].slice(0, 200);
          await this.save(job.projectId, job.session, batch);
          job.started = true;
          for (const event of batch) {
            job.known.set(event.id, JSON.stringify(event));
            if (
              JSON.stringify(job.pending.get(event.id)) ===
              JSON.stringify(event)
            )
              job.pending.delete(event.id);
          }
        }
        if (job.ended) {
          await this.end(job.projectId, job.session);
          this.jobs.delete(key);
        }
      }
      this.error = "";
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    }
  }
}
