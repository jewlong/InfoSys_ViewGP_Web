import { useEffect, useRef, useState } from "react";
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
import { useAlarmPersistence } from "./useAlarmPersistence";
import { canInherit, isPopup, screenReferences } from "../services/screenRules";
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
    activeDialogId,
    closeActiveDialog,
    action,
    momentaryAction,
    input,
    resetSimulation,
    trendData,
    alarmEvents,
    acknowledgeAlarm,
    popupIds,
    showPopup,
    closePopup,
    popupDrafts,
    confirmPopup,
    screenValues,
    alarmSession,
    alarmRuntimeProblems,
    communicationMode,
    setCommunicationMode,
    communicationSnapshot,
    communicationError,
    communicationPending,
    runtimeElementDisabled,
    runtimeDataInvalid,
    writeValue,
  } = useSimulation({
    project,
    screenId: screen.id,
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
  const alarmPersistence = useAlarmPersistence(
    project.id,
    alarmSession,
    alarmEvents,
    revision > 0,
  );
  const imageResources = useImageResources(project, change, running, notify);
  const screenCount = project.screens.length;
  function change(fn: (project: Project) => void) {
    if (!running) historyState.change(fn);
  }
  function undo() {
    if (!running) historyState.undo();
  }
  function redo() {
    if (!running) historyState.redo();
  }
  // Keep the selection across undo/redo; drop ids that no longer exist.
  useEffect(() => {
    const ids = new Set(project.screens.flatMap((s) => s.elements.map((e) => e.id)));
    setSelected((old) => (old.every((id) => ids.has(id)) ? old : old.filter((id) => ids.has(id))));
  }, [project]);
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
    setCommunicationMode("offline");
    setValues(initialValues(p));
    setDialog(null);
  }
  function addElement(
    kind: Kind,
    x?: number,
    y?: number,
    template?: Partial<Element>,
  ) {
    const base = widgetRegistry[kind].create(
      x ??
        Math.min(120 + (screen.elements.length % 5) * 20, screen.width - 160),
      y ??
        Math.min(120 + (screen.elements.length % 5) * 20, screen.height - 80),
    );
    const e = template ? { ...base, ...template } : base;
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
        "slider",
        "arc",
        "spinbox",
        "dropdown",
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
    pasteItems(clipboard);
  }
  function duplicate() {
    pasteItems(clone(screen.elements.filter((e) => selected.includes(e.id))));
  }
  function pasteItems(source: Element[]) {
    if (!source.length) return;
    const groups = new Map<string, string>();
    const items = source.map((e) => {
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
  function newScreen(duplicate = false, popup = false) {
    const s = duplicate
      ? clone(screen)
      : {
          id: uid(),
          name: `畫面 ${screenCount + 1}`,
          width: popup ? 480 : 960,
          height: popup ? 300 : 600,
          type: popup ? ("popup" as const) : ("normal" as const),
          background: "#101c2e",
          elements: [],
        };
    s.id = uid();
    if (popup && !duplicate) s.name = `對話盒 ${screenCount + 1}`;
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
  function newDialog() {
    newScreen(false, true);
  }
  function deleteScreen() {
    const references = screenReferences(project, screen.id);
    if (references.length) {
      notify(`此畫面仍被引用：${references.join("、")}`, true);
      return;
    }
    if (
      !isPopup(screen) &&
      project.screens.filter((s) => !isPopup(s)).length === 1
    ) {
      notify("專案至少需要一個一般畫面", true);
      return;
    }
    if (screenCount === 1) {
      notify("專案至少需要一個畫面", true);
      return;
    }
    if (!window.confirm(`確定刪除「${screen.name}」？`)) return;
    change((p) => {
      p.screens = p.screens.filter((s) => s.id !== screen.id);
      if (p.startScreenId === screen.id)
        p.startScreenId = p.screens.find((s) => !isPopup(s))!.id;
    });
    setScreenId("");
    setSelected([]);
  }
  function setScreenType(type: "normal" | "popup") {
    if (type === "popup" && screen.id === project.startScreenId) {
      notify("請先將其他一般畫面設為起始畫面", true);
      return;
    }
    const actions = type === "popup" ? ["screen"] : ["popup", "openDialog"];
    if (
      project.screens.some((s) =>
        s.elements.some(
          (e) =>
            e.kind === "button" &&
            actions.includes(e.action) &&
            e.targetScreenId === screen.id,
        ),
      )
    ) {
      notify("請先解除指向此畫面的按鈕動作，再變更類別", true);
      return;
    }
    editScreen((s) => {
      s.type = type;
    });
  }
  function setParentScreen(id: string) {
    if (id && !canInherit(project, screen.id, id)) {
      notify("繼承畫面不存在或形成循環", true);
      return;
    }
    editScreen((s) => {
      s.parentScreenId = id || undefined;
      delete s.inheritsScreenId;
    });
    setSelected([]);
  }
  function start(next: "preview" | "run") {
    const errors = check();
    if (errors.length) {
      setDialog("check");
      notify("請先修正專案檢查項目", true);
      return;
    }
    if (
      communicationMode === "online" &&
      !project.devices?.some(
        (d) =>
          d.enabled &&
          project.variables.some((v) => v.modbus?.deviceId === d.id),
      )
    ) {
      setDialog("communication");
      notify("請先設定啟用設備與標籤位址", true);
      return;
    }
    resetSimulation();
    if (next === "run" || isPopup(screen)) setScreenId(project.startScreenId);
    if (next === "preview" && isPopup(screen)) showPopup(screen.id);
    setSelected([]);
    setMode(next);
    setMenu(null);
    notify(
      (next === "run" ? "專案開始執行" : "預覽目前畫面") +
        " · " +
        (communicationMode === "online" ? "設備連線" : "使用模擬資料"),
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
    const used =
      project.alarmAreas?.some(
        (a) => a.variableId === id || a.maskVariableId === id,
      ) ||
      project.screens.some((s) =>
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
    ...alarmPersistence,
    communicationMode,
    setCommunicationMode,
    communicationSnapshot,
    communicationError,
    communicationPending,
    runtimeElementDisabled,
    runtimeDataInvalid,
    writeValue,
    alarmRuntimeProblems,
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
    newDialog,
    deleteScreen,
    check,
    start,
    action,
    momentaryAction,
    input,
    activeDialogId,
    closeActiveDialog,
    resetSimulation,
    trendData,
    alarmEvents,
    acknowledgeAlarm,
    popupIds,
    showPopup,
    closePopup,
    popupDrafts,
    confirmPopup,
    screenValues,
    duplicate,
    setScreenType,
    setParentScreen,
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
