import { useRef, useState } from "react";
import {
  demoProject,
  uid,
  type Element,
  type Kind,
  type Project,
  type Variable,
} from "../model";
import { createEditorMenus, editingMenus } from "../registry/editorMenus";
import { widgetRegistry } from "../registry/widgetRegistry";
import { checkProject } from "../services/projectValidation";
import type { Dialog } from "../types/editor";
import { clone, initialValues } from "../utils/project";
import { useEditorShortcuts } from "./useEditorShortcuts";
import { useImageResources } from "./useImageResources";
import { useHistory } from "./useHistory";
import { useNotifications } from "./useNotifications";
import { useProjectPersistence } from "./useProjectPersistence";
import { useSelection } from "./useSelection";
import { useSimulation } from "./useSimulation";
export function useEditorCore() {
  const historyState = useHistory(demoProject);
  const {
    project,
    setProject,
    history,
    future,
    setHistory,
    setFuture,
    recordSnapshot,
  } = historyState;
  const [screenId, setScreenId] = useState("");
  const screen =
    project.screens.find((s) => s.id === screenId) ?? project.screens[0];
  const { notice, setNotice, logs, setLogs, notify } = useNotifications();
  const {
    mode,
    setMode,
    running,
    values,
    setValues,
    action,
    input,
    resetSimulation,
    trendData,
    alarmEvents,
    acknowledgeAlarm,
  } = useSimulation({
    project,
    setScreenId,
    notify,
    setLogs,
  });
  const [zoom, setZoom] = useState(0.75),
    [grid, setGrid] = useState(true),
    [snap, setSnap] = useState(true);
  const [left, setLeft] = useState(true),
    [right, setRight] = useState(true),
    [leftTab, setLeftTab] = useState<"components" | "variables">("components");
  const [search, setSearch] = useState(""),
    [menu, setMenu] = useState<string | null>(null),
    [dialog, setDialog] = useState<Dialog>(null);
  const [bottom, setBottom] = useState(false);
  const [variableDraft, setVariableDraft] = useState<Variable | null>(null),
    [variableSearch, setVariableSearch] = useState("");
  const [clipboard, setClipboard] = useState<Element[]>([]);
  const importRef = useRef<HTMLInputElement>(null),
    imageRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null),
    workspaceRef = useRef<HTMLDivElement>(null);
  const {
    selected,
    setSelected,
    down,
    move,
    endDrag,
    beginResize,
    marquee,
    beginMarquee,
    moveMarquee,
    endMarquee,
    cancelMarquee,
  } = useSelection({
    project,
    screen,
    running,
    zoom,
    snap,
    setProject,
    recordSnapshot,
  });
  const current = screen.elements.find((e) => e.id === selected[0]);
  const persistence = useProjectPersistence({
    project,
    setProject,
    setHistory,
    setFuture,
    setDialog,
    resetProject,
    notify,
    dialog,
    running,
  });
  const {
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
  } = persistence;
  const imageResources = useImageResources(project, change, running, notify);
  const screenCount = project.screens.length;
  function change(fn: (project: Project) => void) {
    if (!running) historyState.change(fn);
  }
  function undo() {
    if (!running && historyState.undo()) setSelected([]);
  }
  function redo() {
    if (!running && historyState.redo()) setSelected([]);
  }
  function check() {
    return checkProject(project);
  }
  function editScreen(fn: (s: typeof screen) => void) {
    change((p) => fn(p.screens.find((s) => s.id === screen.id)!));
  }
  function patch(props: Partial<Element>) {
    editScreen((s) =>
      s.elements.forEach((e) => {
        if (
          selected.includes(e.id) &&
          (!e.locked || props.locked === false || props.visible !== undefined)
        )
          Object.assign(e, props);
      }),
    );
  }
  function resetProject(p: Project, rev = 0, saved = false) {
    persistence.retryAutoSave();
    setProject(p);
    setScreenId(p.startScreenId);
    setSelected([]);
    setClipboard([]);
    setHistory([]);
    setFuture([]);
    setRevision(rev);
    setSavedSnapshot(saved ? JSON.stringify(p) : "");
    setMode("edit");
    setValues(initialValues(p));
    setDialog(null);
  }
  function addElement(kind: Kind, x?: number, y?: number) {
    const e = widgetRegistry[kind].create(
      x ??
        Math.min(120 + (screen.elements.length % 5) * 20, screen.width - 160),
      y ??
        Math.min(120 + (screen.elements.length % 5) * 20, screen.height - 80),
    );
    if (
      [
        "number",
        "input",
        "indicator",
        "switch",
        "button",
        "gauge",
        "bar",
        "trend",
      ].includes(kind)
    )
      e.variableId = project.variables.find((v) =>
        ["indicator", "switch", "button"].includes(kind)
          ? v.type === "boolean"
          : v.type === "number",
      )?.id;
    e.width = Math.min(e.width, screen.width);
    e.height = Math.min(e.height, screen.height);
    e.x = Math.max(0, Math.min(e.x, screen.width - e.width));
    e.y = Math.max(0, Math.min(e.y, screen.height - e.height));
    if (kind === "alarm") {
      const variable =
        project.variables.find((v) => v.type === "boolean") ??
        project.variables.find((v) => v.type === "number");
      if (variable)
        e.alarmRules = [
          {
            id: uid(),
            message: `${variable.name}警報`,
            variableId: variable.id,
            operator: variable.type === "boolean" ? "true" : "gte",
            ...(variable.type === "number" ? { threshold: 100 } : {}),
            severity: "warning",
            enabled: true,
          },
        ];
    }
    editScreen((s) => s.elements.push(e));
    setSelected([e.id]);
  }
  function remove() {
    const ids = screen.elements
      .filter((e) => selected.includes(e.id) && !e.locked)
      .map((e) => e.id);
    if (!ids.length) return;
    editScreen(
      (s) => (s.elements = s.elements.filter((e) => !ids.includes(e.id))),
    );
    setSelected([]);
  }
  function copy(cut = false) {
    const items = clone(screen.elements.filter((e) => selected.includes(e.id)));
    for (const item of items) {
      if (item.imageAssetId)
        item.image =
          project.assets?.find((a) => a.id === item.imageAssetId)?.data ??
          item.image;
    }
    setClipboard(items);
    if (cut) remove();
    if (items.length)
      notify(`已${cut ? "剪下" : "複製"} ${items.length} 個元件`);
  }
  function paste() {
    if (!clipboard.length) return;
    const groups = new Map<string, string>();
    const items = clipboard.map((e) => {
      if (e.groupId && !groups.has(e.groupId)) groups.set(e.groupId, uid());
      const item = clone(e);
      if (item.imageAssetId) {
        if (project.assets?.some((a) => a.id === item.imageAssetId))
          delete item.image;
        else delete item.imageAssetId;
      }
      return {
        ...item,
        id: uid(),
        name: e.name + " 副本",
        x: Math.min(e.x + 20, screen.width - e.width),
        y: Math.min(e.y + 20, screen.height - e.height),
        locked: false,
        groupId: e.groupId ? groups.get(e.groupId) : undefined,
      };
    });
    editScreen((s) => s.elements.push(...items));
    setSelected(items.map((e) => e.id));
  }
  function newScreen(duplicate = false) {
    const s = duplicate
      ? clone(screen)
      : {
          id: uid(),
          name: `畫面 ${screenCount + 1}`,
          width: 960,
          height: 600,
          background: "#101c2e",
          elements: [],
        };
    s.id = uid();
    if (duplicate) {
      s.name += " 副本";
      const groups = new Map<string, string>();
      s.elements.forEach((e) => {
        e.id = uid();
        if (e.groupId) {
          if (!groups.has(e.groupId)) groups.set(e.groupId, uid());
          e.groupId = groups.get(e.groupId);
        }
      });
    }
    change((p) => p.screens.push(s));
    setScreenId(s.id);
    setSelected([]);
  }
  function deleteScreen() {
    if (screenCount === 1) {
      notify("專案至少需要一個畫面", true);
      return;
    }
    if (!window.confirm(`確定刪除「${screen.name}」？`)) return;
    change((p) => {
      p.screens = p.screens.filter((s) => s.id !== screen.id);
      if (p.startScreenId === screen.id) p.startScreenId = p.screens[0].id;
    });
    setScreenId("");
    setSelected([]);
  }
  function start(next: "preview" | "run") {
    const errors = check();
    if (errors.length) {
      setDialog("check");
      notify("請先修正專案檢查項目", true);
      return;
    }
    resetSimulation();
    if (next === "run") setScreenId(project.startScreenId);
    setSelected([]);
    setMode(next);
    setMenu(null);
    notify(
      next === "run"
        ? "專案開始執行 · 使用模擬資料"
        : "預覽目前畫面 · 使用模擬資料",
    );
  }
  function align(kind: string) {
    const items = screen.elements.filter(
      (e) => selected.includes(e.id) && !e.locked,
    );
    if (items.length < 2) {
      notify("請選取至少兩個未鎖定元件", true);
      return;
    }
    const minX = Math.min(...items.map((e) => e.x)),
      maxX = Math.max(...items.map((e) => e.x + e.width)),
      minY = Math.min(...items.map((e) => e.y)),
      maxY = Math.max(...items.map((e) => e.y + e.height));
    editScreen((s) => {
      const list = s.elements.filter((e) => items.some((i) => i.id === e.id));
      list.forEach((e) => {
        if (kind === "left") e.x = minX;
        if (kind === "right") e.x = maxX - e.width;
        if (kind === "top") e.y = minY;
        if (kind === "bottom") e.y = maxY - e.height;
        if (kind === "center") e.x = (minX + maxX - e.width) / 2;
        if (kind === "middle") e.y = (minY + maxY - e.height) / 2;
        if (kind === "width") e.width = items[0].width;
        if (kind === "height") e.height = items[0].height;
      });
      if (kind === "horizontal" || kind === "vertical") {
        const axis = kind === "horizontal" ? "x" : "y";
        const size = kind === "horizontal" ? "width" : "height";
        list.sort((a, b) => a[axis] - b[axis]);
        const first = list[0][axis];
        const last = list[list.length - 1];
        const gap =
          (last[axis] +
            last[size] -
            first -
            list.reduce((sum, e) => sum + e[size], 0)) /
          (list.length - 1);
        let pos = first;
        list.forEach((e) => {
          e[axis] = pos;
          pos += e[size] + gap;
        });
      }
    });
  }
  function order(up: boolean) {
    editScreen((s) => {
      if (up) {
        for (let i = s.elements.length - 2; i >= 0; i--)
          if (
            selected.includes(s.elements[i].id) &&
            !selected.includes(s.elements[i + 1].id)
          )
            [s.elements[i], s.elements[i + 1]] = [
              s.elements[i + 1],
              s.elements[i],
            ];
      } else {
        for (let i = 1; i < s.elements.length; i++)
          if (
            selected.includes(s.elements[i].id) &&
            !selected.includes(s.elements[i - 1].id)
          )
            [s.elements[i], s.elements[i - 1]] = [
              s.elements[i - 1],
              s.elements[i],
            ];
      }
    });
  }
  function extremeOrder(front: boolean) {
    editScreen((s) => {
      const items = s.elements.filter((e) => selected.includes(e.id)),
        rest = s.elements.filter((e) => !selected.includes(e.id));
      s.elements = front ? [...rest, ...items] : [...items, ...rest];
    });
  }
  function fit() {
    const r = workspaceRef.current?.getBoundingClientRect();
    if (r)
      setZoom(
        Math.max(
          0.1,
          Math.min(
            1.5,
            (r.width - 100) / screen.width,
            (r.height - 110) / screen.height,
          ),
        ),
      );
  }
  function addVariable() {
    setVariableDraft({
      id: uid(),
      name: `變數 ${project.variables.length + 1}`,
      type: "number",
      initial: 0,
    });
    setDialog("variable");
  }
  function deleteVariable(id: string) {
    const used = project.screens.some((s) =>
      s.elements.some(
        (e) =>
          e.variableId === id ||
          e.conditionId === id ||
          e.enabledId === id ||
          e.alarmRules?.some((rule) => rule.variableId === id),
      ),
    );
    if (used) {
      notify("此變數仍被元件引用，請先解除綁定", true);
      return;
    }
    change((p) => (p.variables = p.variables.filter((v) => v.id !== id)));
  }
  return {
    ...persistence,
    ...imageResources,
    project,
    setProject,
    screenId,
    setScreenId,
    screen,
    selected,
    setSelected,
    current,
    history,
    setHistory,
    future,
    setFuture,
    revision,
    setRevision,
    savedSnapshot,
    setSavedSnapshot,
    dirty,
    mode,
    setMode,
    running,
    values,
    setValues,
    zoom,
    setZoom,
    grid,
    setGrid,
    snap,
    setSnap,
    left,
    setLeft,
    right,
    setRight,
    leftTab,
    setLeftTab,
    search,
    setSearch,
    menu,
    setMenu,
    dialog,
    setDialog,
    notice,
    setNotice,
    logs,
    setLogs,
    bottom,
    setBottom,
    saving,
    rows,
    loading,
    variableDraft,
    setVariableDraft,
    variableSearch,
    setVariableSearch,
    clipboard,
    setClipboard,
    importRef,
    imageRef,
    canvasRef,
    workspaceRef,
    screenCount,
    notify,
    change,
    editScreen,
    patch,
    undo,
    redo,
    guard,
    resetProject,
    save,
    openProjects,
    openProject,
    exportProject,
    importProject,
    addElement,
    remove,
    copy,
    paste,
    newScreen,
    deleteScreen,
    check,
    start,
    action,
    input,
    resetSimulation,
    trendData,
    alarmEvents,
    acknowledgeAlarm,
    align,
    order,
    extremeOrder,
    fit,
    down,
    move,
    endDrag,
    addVariable,
    deleteVariable,
    beginResize,
    marquee,
    beginMarquee,
    moveMarquee,
    endMarquee,
    cancelMarquee,
  };
}
export type EditorCore = ReturnType<typeof useEditorCore>;
export function useEditor() {
  const core = useEditorCore();
  useEditorShortcuts(core);
  return { ...core, menuItems: createEditorMenus(core), editingMenus };
}
export type EditorController = ReturnType<typeof useEditor>;
