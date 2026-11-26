import type { Project } from "../model";

export type OfflineDraftRecord = {
  projectId: string;
  project: Project;
  baseRevision: number;
  updatedAt: number;
};

const DB_NAME = "viewx_offline_db";
const STORE = "project_drafts";
// Fallback for environments without IndexedDB (Node tests, private modes).
const memory = new Map<string, OfflineDraftRecord>();

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore(STORE, { keyPath: "projectId" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function saveOfflineDraft(record: OfflineDraftRecord) {
  if (!hasIndexedDb()) {
    memory.set(record.projectId, record);
    return;
  }
  try {
    await run("readwrite", (s) => s.put(record));
  } catch {
    memory.set(record.projectId, record);
  }
}

export async function getOfflineDraft(
  projectId: string,
): Promise<OfflineDraftRecord | null> {
  if (!hasIndexedDb()) return memory.get(projectId) ?? null;
  try {
    return (
      ((await run("readonly", (s) => s.get(projectId))) as
        | OfflineDraftRecord
        | undefined) ?? null
    );
  } catch {
    return memory.get(projectId) ?? null;
  }
}

export async function getLatestOfflineDraft(): Promise<OfflineDraftRecord | null> {
  let all: OfflineDraftRecord[];
  if (!hasIndexedDb()) all = [...memory.values()];
  else {
    try {
      all = (await run("readonly", (s) => s.getAll())) as OfflineDraftRecord[];
    } catch {
      all = [...memory.values()];
    }
  }
  return all.sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
}

export async function clearOfflineDraft(projectId: string) {
  memory.delete(projectId);
  if (!hasIndexedDb()) return;
  try {
    await run("readwrite", (s) => s.delete(projectId));
  } catch {
    // Draft cleanup failure must not block saving.
  }
}
