import { type Project } from "../model";

const DB_NAME = "ViewXStudio";
const STORE_NAME = "offlineDrafts";
const DB_VERSION = 1;

/**
 * 本機離線草稿（IndexedDB）。
 *
 * 用途：當 SQLite 自動儲存失敗、或使用者離頁／瀏覽器強制終止前尚未儲存時，
 * 將專案快照寫入瀏覽器本機，供下次開啟同一專案時詢問是否復原。
 */
export interface OfflineDraft {
  projectId: string;
  project: Project;
  updatedAt: number;
}

export interface OfflineDraftMeta {
  projectId: string;
  name: string;
  updatedAt: number;
  revision: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("此瀏覽器不支援 IndexedDB"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "projectId" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 寫入（或覆寫）指定專案的離線草稿快照。 */
export async function saveDraft(
  projectId: string,
  project: Project,
): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    await request(
      store.put({ projectId, project, updatedAt: Date.now() }),
    );
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** 讀取指定專案的離線草稿；不存在則回傳 undefined。 */
export async function loadDraft(
  projectId: string,
): Promise<OfflineDraft | undefined> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const result = await request(store.get(projectId));
    return result as OfflineDraft | undefined;
  } finally {
    db.close();
  }
}

/** 刪除指定專案的離線草稿（儲存成功或使用者選擇捨棄時呼叫）。 */
export async function deleteDraft(projectId: string): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    await request(store.delete(projectId));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** 列出所有離線草稿的中繼資料（供復原清單或除錯使用）。 */
export async function listDrafts(): Promise<OfflineDraftMeta[]> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const results = await request(store.getAll());
    return (results as OfflineDraft[]).map((d) => ({
      projectId: d.projectId,
      name: d.project.name,
      updatedAt: d.updatedAt,
      revision: d.project.schemaVersion,
    }));
  } finally {
    db.close();
  }
}

/** 清除所有離線草稿（僅供除錯/重置使用）。 */
export async function clearAllDrafts(): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    await request(store.clear());
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
