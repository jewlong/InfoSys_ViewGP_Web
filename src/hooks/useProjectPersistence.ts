import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { uid, validateProject, type Project } from "../model";
import * as projectApi from "../services/projectApi";
import { downloadProject } from "../services/projectFiles";
import type { Dialog, ProjectRow } from "../types/editor";
import { clone } from "../utils/project";
type Options = {
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
  setProject,
  setHistory,
  setFuture,
  setDialog,
  resetProject,
  notify,
}: Options) {
  const [revision, setRevision] = useState(0),
    [savedSnapshot, setSavedSnapshot] = useState("");
  const dirty = JSON.stringify(project) !== savedSnapshot;
  const [saving, setSaving] = useState(false),
    [rows, setRows] = useState<ProjectRow[]>([]),
    [loading, setLoading] = useState(false);
  const saveInFlight = useRef(false);
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
  function guard() {
    if (saveInFlight.current) {
      notify("正在儲存，請稍候");
      return false;
    }
    return !dirty || window.confirm("目前有未儲存的變更，確定離開此專案？");
  }
  async function save(asNew = false) {
    if (saveInFlight.current) return;
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
          name: snapshot.name,
        }));
        setHistory([]);
        setFuture([]);
      }
      setRevision(body.revision);
      setSavedSnapshot(JSON.stringify(snapshot));
      notify(`已儲存至 SQLite · 版本 ${body.revision}`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "儲存失敗", true);
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
      const data = await projectApi.getProject(id);
      resetProject(data.project, data.revision, true);
      notify("專案已開啟");
    } catch (e) {
      notify(String(e), true);
    }
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
