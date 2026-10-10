import { useState } from "react";
import type { Project } from "../model";
import { clone } from "../utils/project";
export function useHistory(initialProject: () => Project) {
  const [project, setProject] = useState<Project>(initialProject);
  const [history, setHistory] = useState<Project[]>([]),
    [future, setFuture] = useState<Project[]>([]);
  function recordSnapshot(snapshot: Project) {
    setHistory((h) => [...h.slice(-49), clone(snapshot)]);
    setFuture([]);
  }
  function change(fn: (p: Project) => void) {
    recordSnapshot(project);
    const next = clone(project);
    fn(next);
    setProject(next);
  }
  function undo() {
    if (!history.length) return false;
    setFuture((f) => [clone(project), ...f]);
    setProject(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    return true;
  }
  function redo() {
    if (!future.length) return false;
    setHistory((h) => [...h, clone(project)]);
    setProject(future[0]);
    setFuture((f) => f.slice(1));
    return true;
  }
  return {
    project,
    setProject,
    history,
    future,
    setHistory,
    setFuture,
    recordSnapshot,
    change,
    undo,
    redo,
  };
}
