import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { uid, validateProject, type Project } from "../model";
import * as projectApi from "../services/projectApi";
import {
  deleteDraft,
  loadDraft,
  saveDraft,
  type OfflineDraft,
} from "../services/offlineDraft";
import { downloadProject } from "../services/projectFiles";
import {
  clearOfflineDraft,
  getLatestOfflineDraft,
  saveOfflineDraft,
} from "../services/offlineDraftStore";
import type { Dialog, ProjectRow } from "../types/editor";
import { clone } from "../utils/project";

export type RecoverableDraftState = {
  projectId: string;
  project: Project;
  baseRevision: number;
  updatedAt: number;
  draft: OfflineDraft;
};

type Options = {
  dialog: Dialog;
  running: boolean;
  project: Project;
  setProject: Dispatch<SetStateAction<Project>>;
  setHistory: Dispatch<SetStateAction<Project[]>>;
  setFuture: Dispatch<SetStateAction<Project[]>>;
  setDialog: Dispatch<SetStateAction<Dialog>>;
  resetProject: (project: Project, revision?: number, saved?: boolean) => void;
  notify: (text: string, error?: boolean) => void;
};

export function useProjectPersistence({
  project,
  dialog,
  running,
  setProject,
  setHistory,
  setFuture,
  setDialog,
  resetProject,
  notify,
}: Options) {
  const [revision, setRevision] = useState(0),
    [savedSnapshot, setSavedSnapshot] = useState("");
  const [recoverableDraft, setRecoverableDraft] =
    useState<RecoverableDraftState | null>(null);
  const dirty = JSON.stringify(project) !== savedSnapshot;
  const [saving, setSaving] = useState(false),
    [rows, setRows] = useState<ProjectRow[]>([]),
    [loading, setLoading] = useState(false);
  const saveInFlight = useRef(false);
  const [autoSaveError, setAutoSaveError] = useState("");
  const latestSave = useRef(save);
  latestSave.current = save;
  const lastSaveAt = useRef(0);

  useEffect(() => {
    setAutoSaveError("");
  }, [project.id]);

  useEffect(() => {
    if (
      !project.autoSave ||
      !dirty ||
      saving ||
      running ||
      dialog ||
      autoSaveError ||
      !validateProject(project)
    )
      return;
    const timer = window.setTimeout(
      () => void latestSave.current(false, true),
      project.autoSaveIntervalMs ?? 2000,
    );
    return () => window.clearTimeout(timer);
  }, [project, dirty, saving, running, dialog, autoSaveError]);

  // Offline draft: mirror unsaved edits to IndexedDB so a closed tab is recoverable.
  useEffect(() => {
    if (!dirty || running) return;
    const timer = window.setTimeout(() => {
      const now = Date.now();
      void saveOfflineDraft({
        projectId: project.id,
        project,
        baseRevision: revision,
        updatedAt: now,
      });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [project, dirty, running, revision]);

  useEffect(() => {
    void getLatestOfflineDraft().then((draft) => {
      if (draft && JSON.stringify(draft.project) !== JSON.stringify(project)) {
        setRecoverableDraft({
          projectId: draft.projectId,
          project: draft.project,
          baseRevision: draft.baseRevision,
          updatedAt: draft.updatedAt,
          draft: {
            projectId: draft.projectId,
            project: draft.project,
            updatedAt: draft.updatedAt,
          },
        });
      }
    });
    // Check once at application start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function recoverOfflineDraft() {
    if (!recoverableDraft) return;
    resetProject(
      recoverableDraft.project,
      recoverableDraft.baseRevision,
      false,
    );
    void clearOfflineDraft(recoverableDraft.projectId);
    setRecoverableDraft(null);
    notify("已復原離線草稿，請儲存專案");
  }

  function discardOfflineDraft() {
    if (recoverableDraft) {
      void clearOfflineDraft(recoverableDraft.projectId);
      void deleteDraft(recoverableDraft.projectId).catch(() => {});
    }
    setRecoverableDraft(null);
  }

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    function onVisibilityChange() {
      if (
        document.hidden &&
        dirty &&
        !saveInFlight.current &&
        !running &&
        !dialog &&
        validateProject(project)
      ) {
        void saveDraft(project.id, project).catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [dirty, running, dialog, project, saveInFlight]);

  function guard() {
    if (saveInFlight.current) {
      notify("正在儲存，請稍候");
      return false;
    }
    return !dirty || window.confirm("目前有未儲存的變更，確定離開此專案？");
  }

  async function save(asNew = false, automatic = false) {
    if (saveInFlight.current) return;
    if (!validateProject(project)) {
      notify("專案資料格式錯誤，請修正後再儲存", true);
      return;
    }
    saveInFlight.current = true;
    setSaving(true);
    const snapshot = clone(project);
    if (asNew) {
      snapshot.id = uid();
      snapshot.name += "（副本）";
    }
    try {
      const body = await projectApi.saveProject(snapshot, asNew ? 0 : revision);
      if (asNew) {
        setProject((prev) => ({
          ...prev,
          id: snapshot.id,
          name: prev.name === project.name ? snapshot.name : prev.name,
        }));
        setHistory([]);
        setFuture([]);
      }
      setRevision(body.revision);
      setSavedSnapshot(JSON.stringify(snapshot));
      void clearOfflineDraft(snapshot.id);
      setAutoSaveError("");
      lastSaveAt.current = Date.now();
      await deleteDraft(project.id).catch(() => {});
      notify(
        `${automatic ? "已自動儲存" : "已儲存至 SQLite"} · 版本 ${body.revision}`,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "儲存失敗";
      setAutoSaveError(message);
      notify(message, true);
      try {
        await saveDraft(project.id, project);
      } catch {
        // Ignore IndexedDB error during save failure reporting
      }
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  async function restore(sourceRevision: number) {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    setSaving(true);
    try {
      const data = await projectApi.restoreVersion(
        project.id,
        sourceRevision,
        revision,
      );
      resetProject(data.project, data.revision, true);
      setAutoSaveError("");
      notify(`已還原，建立版本 ${data.revision}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "還原失敗";
      setAutoSaveError(message);
      throw e;
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  async function openProjects() {
    setDialog("projects");
    setLoading(true);
    try {
      setRows(await projectApi.listProjects());
    } catch (e) {
      notify(String(e), true);
    } finally {
      setLoading(false);
    }
  }

  async function openProject(id: string) {
    if (!guard()) return;
    try {
      const draft = await loadDraft(id).catch(() => undefined);
      if (draft) {
        setRecoverableDraft({
          projectId: id,
          project: draft.project,
          baseRevision: 0,
          updatedAt: draft.updatedAt,
          draft,
        });
        setDialog("offlineDraft");
        return;
      }
      const data = await projectApi.getProject(id);
      resetProject(data.project, data.revision, true);
      notify("專案已開啟");
    } catch (e) {
      notify(String(e), true);
    }
  }

  async function restoreRecoverableDraft() {
    if (!recoverableDraft) return;
    const { projectId, draft } = recoverableDraft;
    try {
      resetProject(draft.project, 0, false);
      await deleteDraft(projectId).catch(() => {});
      void clearOfflineDraft(projectId);
      setDialog(null);
      setRecoverableDraft(null);
      notify(
        `已從離線草稿復原「${draft.project.name}」，請儲存以建立新版本`,
      );
    } catch (e) {
      notify(String(e), true);
    }
  }

  async function discardRecoverableDraft() {
    if (!recoverableDraft) return;
    const { projectId } = recoverableDraft;
    try {
      await deleteDraft(projectId).catch(() => {});
      void clearOfflineDraft(projectId);
      setRecoverableDraft(null);
      setDialog(null);
      await openProject(projectId);
    } catch (e) {
      notify(String(e), true);
    }
  }

  function cancelRecoverableDraft() {
    setRecoverableDraft(null);
    setDialog(null);
  }

  function exportProject() {
    downloadProject(project);
    notify("專案已匯出");
  }

  async function importProject(file?: File) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      notify("檔案超過 20 MB", true);
      return;
    }
    try {
      const p = JSON.parse(await file.text());
      if (!validateProject(p)) throw new Error("專案格式錯誤或版本不支援");
      if (!guard()) return;
      p.id = uid();
      resetProject(p);
      notify("專案已匯入，請儲存以建立新專案");
    } catch (e) {
      notify(String(e), true);
    }
  }

  return {
    restore,
    recoverableDraft,
    recoverOfflineDraft,
    discardOfflineDraft,
    restoreRecoverableDraft,
    discardRecoverableDraft,
    cancelRecoverableDraft,
    autoSaveError,
    retryAutoSave: () => setAutoSaveError(""),
    revision,
    setRevision,
    savedSnapshot,
    setSavedSnapshot,
    dirty,
    saving,
    rows,
    loading,
    guard,
    save,
    openProjects,
    openProject,
    exportProject,
    importProject,
  };
}
