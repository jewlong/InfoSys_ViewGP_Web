import {
  cloneElement,
  isValidElement,
  useState,
  useRef,
  useEffect,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FilePlus,
  FolderOpen,
  Grid2X2,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Lock,
  Maximize,
  Minus,
  MousePointer2,
  Play,
  Plus,
  Redo2,
  Save,
  Search,
  Settings2,
  Square,
  StopCircle,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Variable as VariableIcon,
  X,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  Circle,
  ToggleLeft,
  Hash,
  TextCursorInput,
  PanelLeftClose,
  PanelRightClose,
  HelpCircle,
} from "lucide-react";
import {
  demoProject,
  newProject,
  makeElement,
  labels,
  uid,
  validateProject,
  type Project,
  type Element,
  type Kind,
  type Variable,
} from "./model";
const icons: Record<Kind, typeof Square> = {
  text: Type,
  rectangle: Square,
  circle: Circle,
  line: Minus,
  image: ImageIcon,
  button: MousePointer2,
  indicator: Activity,
  number: Hash,
  input: TextCursorInput,
  switch: ToggleLeft,
};
const clone = <T,>(v: T): T => structuredClone(v);
const initialValues = (p: Project) =>
  Object.fromEntries(p.variables.map((v) => [v.id, v.initial]));
const fmt = (v: unknown) =>
  typeof v === "number"
    ? v.toLocaleString("en-US", { maximumFractionDigits: 3 })
    : String(v ?? "—");
type Dialog =
  "projects" | "project" | "screen" | "variable" | "help" | "check" | null;
type ProjectRow = {
  id: string;
  name: string;
  revision: number;
  updated_at: string;
};
type Notice = { text: string; error?: boolean };
function Visual({
  element: e,
  values,
  running,
  onAction,
  onInput,
}: {
  element: Element;
  values: Record<string, unknown>;
  running: boolean;
  onAction: () => void;
  onInput: (value: string) => void;
}) {
  const v = values[e.variableId ?? ""];
  const style: CSSProperties = {
    width: "100%",
    height: "100%",
    fontSize: e.fontSize,
    color: e.color,
  };
  if (e.kind === "rectangle")
    return (
      <div
        style={{
          ...style,
          background: e.background,
          borderRadius: 12,
          border: "1px solid #ffffff09",
        }}
      />
    );
  if (e.kind === "circle")
    return (
      <div
        style={{ ...style, background: e.background, borderRadius: "50%" }}
      />
    );
  if (e.kind === "line")
    return <div style={{ ...style, background: e.background }} />;
  if (e.kind === "image")
    return e.image ? (
      <img
        alt={e.text}
        src={e.image}
        style={{ ...style, objectFit: "contain" }}
        draggable={false}
      />
    ) : (
      <div className="image-placeholder" style={style}>
        <ImageIcon size={24} />
        圖片
      </div>
    );
  if (e.kind === "indicator")
    return (
      <div
        className={"lamp " + (v ? "on" : "")}
        style={{
          ...style,
          background: v ? "#58d3ac" : "#42516a",
          borderRadius: "50%",
        }}
      />
    );
  if (e.kind === "switch")
    return (
      <button
        aria-label={e.name}
        className={"runtime-switch " + (v ? "on" : "")}
        style={{ width: "100%", height: "100%" }}
        disabled={!running}
        onClick={onAction}
      >
        <span />
      </button>
    );
  if (e.kind === "button")
    return (
      <button
        disabled={!running}
        className="runtime-button"
        style={{ ...style, background: e.background }}
        onClick={onAction}
      >
        {e.text}
      </button>
    );
  if (e.kind === "input")
    return (
      <input
        aria-label={e.name}
        className="runtime-input"
        type="number"
        style={{ ...style, background: e.background }}
        value={typeof v === "number" ? v : 0}
        readOnly={!running}
        onChange={(ev) => onInput(ev.target.value)}
      />
    );
  return (
    <div className="visual-text" style={style}>
      {e.kind === "number"
        ? (typeof v === "number" && e.decimals !== undefined
            ? v.toLocaleString("en-US", {
                minimumFractionDigits: e.decimals,
                maximumFractionDigits: e.decimals,
              })
            : fmt(v)) + (e.unit ? " " + e.unit : "")
        : e.text}
    </div>
  );
}
export default function App() {
  const [project, setProject] = useState<Project>(demoProject);
  const [screenId, setScreenId] = useState("");
  const screen =
    project.screens.find((s) => s.id === screenId) ?? project.screens[0];
  const [selected, setSelected] = useState<string[]>([]);
  const current = screen.elements.find((e) => e.id === selected[0]);
  const [history, setHistory] = useState<Project[]>([]),
    [future, setFuture] = useState<Project[]>([]);
  const [revision, setRevision] = useState(0),
    [savedSnapshot, setSavedSnapshot] = useState("");
  const dirty = JSON.stringify(project) !== savedSnapshot;
  const [mode, setMode] = useState<"edit" | "preview" | "run">("edit");
  const running = mode !== "edit";
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    initialValues(project),
  );
  const [zoom, setZoom] = useState(0.75),
    [grid, setGrid] = useState(true),
    [snap, setSnap] = useState(true);
  const [left, setLeft] = useState(true),
    [right, setRight] = useState(true),
    [leftTab, setLeftTab] = useState<"components" | "variables">("components");
  const [search, setSearch] = useState(""),
    [menu, setMenu] = useState<string | null>(null),
    [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<Notice | null>(null),
    [logs, setLogs] = useState<string[]>([
      "編輯器就緒。可點選左側元件加入畫面。",
    ]);
  const [bottom, setBottom] = useState(false),
    [saving, setSaving] = useState(false),
    [rows, setRows] = useState<ProjectRow[]>([]),
    [loading, setLoading] = useState(false);
  const [variableDraft, setVariableDraft] = useState<Variable | null>(null);
  const [variableSearch, setVariableSearch] = useState("");
  const [clipboard, setClipboard] = useState<Element[]>([]);
  const importRef = useRef<HTMLInputElement>(null),
    imageRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null),
    workspaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    x: number;
    y: number;
    ids: string[];
    snapshot: Project;
    changed: boolean;
  } | null>(null);
  const saveInFlight = useRef(false);
  const screenCount = project.screens.length;
  function notify(text: string, error = false) {
    setNotice({ text, error });
    setLogs((l) =>
      [`${new Date().toLocaleTimeString("zh-TW")}  ${text}`, ...l].slice(0, 50),
    );
  }
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(t);
  }, [notice]);
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
  function change(fn: (p: Project) => void) {
    if (running) return;
    setHistory((h) => [...h.slice(-49), clone(project)]);
    setFuture([]);
    const p = clone(project);
    fn(p);
    setProject(p);
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
  function undo() {
    if (running || !history.length) return;
    setFuture((f) => [clone(project), ...f]);
    setProject(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setSelected([]);
  }
  function redo() {
    if (running || !future.length) return;
    setHistory((h) => [...h, clone(project)]);
    setProject(future[0]);
    setFuture((f) => f.slice(1));
    setSelected([]);
  }
  function guard() {
    if (saveInFlight.current) {
      notify("正在儲存，請稍候");
      return false;
    }
    return !dirty || window.confirm("目前有未儲存的變更，確定離開此專案？");
  }
  function resetProject(p: Project, rev = 0, saved = false) {
    setProject(p);
    setScreenId(p.startScreenId);
    setSelected([]);
    setHistory([]);
    setFuture([]);
    setRevision(rev);
    setSavedSnapshot(saved ? JSON.stringify(p) : "");
    setMode("edit");
    setValues(initialValues(p));
    setDialog(null);
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
      const res = await fetch(`/api/projects/${snapshot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: snapshot,
          revision: asNew ? 0 : revision,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
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
      const r = await fetch("/api/projects");
      if (!r.ok) throw new Error("無法讀取專案清單");
      setRows(await r.json());
    } catch (e) {
      notify(String(e), true);
    } finally {
      setLoading(false);
    }
  }
  async function openProject(id: string) {
    if (!guard()) return;
    try {
      const r = await fetch(`/api/projects/${id}`);
      if (!r.ok) throw new Error("無法開啟專案");
      const data = await r.json();
      if (!validateProject(data.project)) throw new Error("專案格式不支援");
      resetProject(data.project, data.revision, true);
      notify("專案已開啟");
    } catch (e) {
      notify(String(e), true);
    }
  }
  function exportProject() {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = project.name + ".viewx.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  function addElement(kind: Kind, x?: number, y?: number) {
    const e = makeElement(
      kind,
      x ??
        Math.min(120 + (screen.elements.length % 5) * 20, screen.width - 160),
      y ??
        Math.min(120 + (screen.elements.length % 5) * 20, screen.height - 80),
    );
    if (["number", "input", "indicator", "switch", "button"].includes(kind))
      e.variableId = project.variables.find((v) =>
        ["indicator", "switch", "button"].includes(kind)
          ? v.type === "boolean"
          : v.type === "number",
      )?.id;
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
      return {
        ...clone(e),
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
  function check() {
    const problems: string[] = [];
    project.screens.forEach((s) =>
      s.elements.forEach((e) => {
        if (
          ["number", "input", "indicator", "switch", "button"].includes(
            e.kind,
          ) &&
          !(e.kind === "button" && e.action === "screen") &&
          !project.variables.some((v) => v.id === e.variableId)
        )
          problems.push(`${s.name} / ${e.name}：未綁定有效變數`);
        if (
          e.action === "screen" &&
          e.kind === "button" &&
          !project.screens.some((s) => s.id === e.targetScreenId)
        )
          problems.push(`${s.name} / ${e.name}：未選擇目標畫面`);
        const v = project.variables.find((v) => v.id === e.variableId);
        if (v && ["input", "number"].includes(e.kind) && v.type !== "number")
          problems.push(`${s.name} / ${e.name}：需綁定數值變數`);
        if (
          v &&
          ["indicator", "switch"].includes(e.kind) &&
          v.type !== "boolean"
        )
          problems.push(`${s.name} / ${e.name}：需綁定布林變數`);
        if (
          v &&
          e.kind === "button" &&
          e.action === "increment" &&
          v.type !== "number"
        )
          problems.push(`${s.name} / ${e.name}：加減值需使用數值變數`);
        if (
          v &&
          e.kind === "button" &&
          e.action === "toggle" &&
          v.type !== "boolean"
        )
          problems.push(`${s.name} / ${e.name}：切換需使用布林變數`);
        if (
          v &&
          e.kind === "button" &&
          ["set", "increment"].includes(e.action) &&
          v.type === "number" &&
          !Number.isFinite(Number(e.actionValue))
        )
          problems.push(`${s.name} / ${e.name}：設定值需為有效數字`);
        if (
          v &&
          e.kind === "button" &&
          e.action === "set" &&
          v.type === "boolean" &&
          !["true", "false"].includes(e.actionValue)
        )
          problems.push(`${s.name} / ${e.name}：布林設定值需為 true 或 false`);
        for (const id of [e.conditionId, e.enabledId])
          if (
            id &&
            !project.variables.some((v) => v.id === id && v.type === "boolean")
          )
            problems.push(`${s.name} / ${e.name}：條件需綁定有效布林變數`);
        if (e.kind === "image" && !e.image)
          problems.push(`${s.name} / ${e.name}：尚未設定圖片`);
        if (
          e.x < 0 ||
          e.y < 0 ||
          e.x + e.width > s.width ||
          e.y + e.height > s.height
        )
          problems.push(`${s.name} / ${e.name}：超出畫面範圍`);
      }),
    );
    return problems;
  }
  function start(next: "preview" | "run") {
    const errors = check();
    if (errors.length) {
      setDialog("check");
      notify("請先修正專案檢查項目", true);
      return;
    }
    setValues(initialValues(project));
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
  function action(e: Element) {
    if (!running) return;
    if (e.enabledId && !values[e.enabledId]) return;
    if (e.action === "screen" && e.kind === "button") {
      if (e.targetScreenId) setScreenId(e.targetScreenId);
      return;
    }
    const variable = project.variables.find((v) => v.id === e.variableId);
    if (!variable) {
      notify("元件未綁定變數", true);
      return;
    }
    setValues((old) => {
      let value: unknown = old[variable.id];
      if (e.kind === "switch" || e.action === "toggle") {
        if (variable.type !== "boolean") return old;
        value = !value;
      } else if (e.action === "increment") {
        if (
          variable.type !== "number" ||
          !Number.isFinite(Number(e.actionValue))
        )
          return old;
        value = Number(value) + Number(e.actionValue);
      } else {
        value =
          variable.type === "number"
            ? Number(e.actionValue)
            : variable.type === "boolean"
              ? e.actionValue === "true"
              : e.actionValue;
        if (variable.type === "number" && !Number.isFinite(value)) return old;
      }
      return { ...old, [variable.id]: value };
    });
    setLogs((l) => [`${e.name} · 動作：${e.action}`, ...l].slice(0, 50));
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
  function down(ev: ReactPointerEvent, e: Element) {
    if (running) return;
    ev.stopPropagation();
    const group = e.groupId
      ? screen.elements.filter((i) => i.groupId === e.groupId).map((i) => i.id)
      : [e.id];
    const ids = ev.shiftKey
      ? Array.from(new Set([...selected, ...group]))
      : selected.includes(e.id)
        ? selected
        : group;
    setSelected(ids);
    if (e.locked) return;
    dragRef.current = {
      x: ev.clientX,
      y: ev.clientY,
      ids,
      snapshot: clone(project),
      changed: false,
    };
    ev.currentTarget.setPointerCapture(ev.pointerId);
  }
  function move(ev: ReactPointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dx = (ev.clientX - d.x) / zoom,
      dy = (ev.clientY - d.y) / zoom;
    if (Math.abs(dx) + Math.abs(dy) < 2 && !d.changed) return;
    d.changed = true;
    const p = clone(d.snapshot),
      s = p.screens.find((s) => s.id === screen.id)!;
    const movable = s.elements.filter((e) => d.ids.includes(e.id) && !e.locked);
    if (!movable.length) return;
    let offsetX = snap ? Math.round(dx / 10) * 10 : dx,
      offsetY = snap ? Math.round(dy / 10) * 10 : dy;
    const minX = Math.min(...movable.map((e) => e.x)),
      maxX = Math.max(...movable.map((e) => e.x + e.width)),
      minY = Math.min(...movable.map((e) => e.y)),
      maxY = Math.max(...movable.map((e) => e.y + e.height));
    offsetX = Math.max(-minX, Math.min(s.width - maxX, offsetX));
    offsetY = Math.max(-minY, Math.min(s.height - maxY, offsetY));
    movable.forEach((e) => {
      e.x = Math.round(e.x + offsetX);
      e.y = Math.round(e.y + offsetY);
    });
    setProject(p);
  }
  function endDrag() {
    const d = dragRef.current;
    if (d?.changed) {
      setHistory((h) => [...h.slice(-49), d.snapshot]);
      setFuture([]);
    }
    dragRef.current = null;
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
          e.variableId === id || e.conditionId === id || e.enabledId === id,
      ),
    );
    if (used) {
      notify("此變數仍被元件引用，請先解除綁定", true);
      return;
    }
    change((p) => (p.variables = p.variables.filter((v) => v.id !== id)));
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest('input,textarea,select,[contenteditable="true"]'))
        return;
      if (e.key === "Escape") {
        if (dialog) setDialog(null);
        else if (menu) setMenu(null);
        else if (running) setMode("edit");
        else setSelected([]);
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
        return;
      }
      if (running || dialog) return;
      if (mod) {
        const k = e.key.toLowerCase();
        if (["z", "y", "c", "v", "x", "a"].includes(k)) e.preventDefault();
        if (k === "z") e.shiftKey ? redo() : undo();
        if (k === "y") redo();
        if (k === "c") copy();
        if (k === "x") copy(true);
        if (k === "v") paste();
        if (k === "a") setSelected(screen.elements.map((e) => e.id));
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove();
      } else if (e.key.startsWith("Arrow") && selected.length) {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        editScreen((s) =>
          s.elements.forEach((el) => {
            if (selected.includes(el.id) && !el.locked) {
              if (e.key === "ArrowLeft") el.x = Math.max(0, el.x - delta);
              if (e.key === "ArrowRight")
                el.x = Math.min(s.width - el.width, el.x + delta);
              if (e.key === "ArrowUp") el.y = Math.max(0, el.y - delta);
              if (e.key === "ArrowDown")
                el.y = Math.min(s.height - el.height, el.y + delta);
            }
          }),
        );
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const menuItems: Record<
    string,
    { label: string; fn: () => void; shortcut?: string; disabled?: boolean }[]
  > = {
    檔案: [
      {
        label: "新增專案",
        fn: () => {
          if (guard()) resetProject(newProject());
        },
        shortcut: "",
        disabled: running,
      },
      { label: "開啟專案…", fn: () => void openProjects(), disabled: running },
      { label: "儲存", fn: () => void save(), shortcut: "Ctrl S" },
      { label: "另存新專案", fn: () => void save(true) },
      {
        label: "匯入專案…",
        fn: () => importRef.current?.click(),
        disabled: running,
      },
      { label: "匯出專案", fn: exportProject },
      { label: "專案設定", fn: () => setDialog("project"), disabled: running },
    ],
    編輯: [
      {
        label: "復原",
        fn: undo,
        shortcut: "Ctrl Z",
        disabled: !history.length,
      },
      {
        label: "重做",
        fn: redo,
        shortcut: "Ctrl Shift Z",
        disabled: !future.length,
      },
      {
        label: "剪下",
        fn: () => copy(true),
        shortcut: "Ctrl X",
        disabled: !selected.length,
      },
      {
        label: "複製",
        fn: () => copy(),
        shortcut: "Ctrl C",
        disabled: !selected.length,
      },
      {
        label: "貼上",
        fn: paste,
        shortcut: "Ctrl V",
        disabled: !clipboard.length,
      },
      {
        label: "刪除",
        fn: remove,
        shortcut: "Delete",
        disabled: !selected.length,
      },
      {
        label: "全選",
        fn: () => setSelected(screen.elements.map((e) => e.id)),
        shortcut: "Ctrl A",
      },
    ],
    檢視: [
      { label: "放大", fn: () => setZoom((z) => Math.min(2, z + 0.1)) },
      { label: "縮小", fn: () => setZoom((z) => Math.max(0.1, z - 0.1)) },
      { label: "符合畫面", fn: fit },
      { label: (grid ? "✓ " : "") + "顯示格線", fn: () => setGrid(!grid) },
      { label: (snap ? "✓ " : "") + "吸附格線", fn: () => setSnap(!snap) },
      { label: (left ? "✓ " : "") + "左側面板", fn: () => setLeft(!left) },
      { label: (right ? "✓ " : "") + "屬性面板", fn: () => setRight(!right) },
      {
        label: (bottom ? "✓ " : "") + "執行紀錄",
        fn: () => setBottom(!bottom),
      },
    ],
    畫面: [
      { label: "新增畫面", fn: () => newScreen() },
      { label: "複製畫面", fn: () => newScreen(true) },
      { label: "重新命名 / 畫面設定", fn: () => setDialog("screen") },
      { label: "刪除畫面", fn: deleteScreen },
      {
        label: "設定為起始畫面",
        fn: () => change((p) => (p.startScreenId = screen.id)),
      },
    ],
    元件: Object.entries(labels).map(([k, label]) => ({
      label,
      fn: () => addElement(k as Kind),
    })),
    排列: [
      { label: "靠左對齊", fn: () => align("left") },
      { label: "靠右對齊", fn: () => align("right") },
      { label: "靠上對齊", fn: () => align("top") },
      { label: "靠下對齊", fn: () => align("bottom") },
      { label: "水平置中", fn: () => align("center") },
      { label: "垂直置中", fn: () => align("middle") },
      { label: "水平等距", fn: () => align("horizontal") },
      { label: "垂直等距", fn: () => align("vertical") },
      { label: "相同寬度", fn: () => align("width") },
      { label: "相同高度", fn: () => align("height") },
      { label: "上一層", fn: () => order(true) },
      { label: "下一層", fn: () => order(false) },
      { label: "移至最上層", fn: () => extremeOrder(true) },
      { label: "移至最下層", fn: () => extremeOrder(false) },
      {
        label: "群組",
        fn: () => {
          if (selected.length > 1) patch({ groupId: uid() });
          else notify("請選取至少兩個元件", true);
        },
      },
      { label: "取消群組", fn: () => patch({ groupId: undefined }) },
      { label: "鎖定", fn: () => patch({ locked: true }) },
      { label: "解鎖", fn: () => patch({ locked: false }) },
    ],
    變數: [
      { label: "新增變數", fn: addVariable },
      {
        label: "管理 / 搜尋變數",
        fn: () => {
          setLeft(true);
          setLeftTab("variables");
        },
      },
      { label: "檢查引用", fn: () => setDialog("check") },
    ],
    執行: [
      { label: "專案檢查", fn: () => setDialog("check") },
      { label: "預覽目前畫面", fn: () => start("preview") },
      { label: "執行完整專案", fn: () => start("run") },
      { label: "停止執行", fn: () => setMode("edit"), disabled: !running },
      {
        label: "重設模擬資料",
        fn: () => {
          setValues(initialValues(project));
          notify("模擬資料已重設");
        },
        disabled: !running,
      },
    ],
    說明: [
      { label: "操作說明 / 快捷鍵", fn: () => setDialog("help") },
      { label: "版本資訊", fn: () => setDialog("help") },
    ],
  };
  const editingMenus = ["編輯", "畫面", "元件", "排列", "變數"];
  return (
    <div
      className="app-shell"
      onPointerDown={() => {
        if (menu) setMenu(null);
      }}
    >
      <header className="app-header">
        <div className="brand-mark">
          <Layers size={22} />
        </div>
        <div className="brand">
          ViewX<span>STUDIO</span>
        </div>
        <span className="header-divider" />
        <div className="project-header">
          <span>{project.name}</span>
          <span className="project-badge">PROJECT</span>
          {dirty && <span className="dirty-dot" title="尚未儲存" />}
        </div>
        <div className="header-right">
          <span className="connection">
            <span />
            本機工作區
          </span>
          <button className="avatar" title="本機單人模式">
            VX
          </button>
        </div>
      </header>
      <nav className="menu-bar" aria-label="主選單">
        {Object.entries(menuItems).map(([name, items]) => (
          <div
            className="menu-wrap"
            key={name}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              className={menu === name ? "active" : ""}
              disabled={running && editingMenus.includes(name)}
              onClick={() => setMenu(menu === name ? null : name)}
            >
              {name}
            </button>
            {menu === name && (
              <div className="menu-dropdown">
                {items.map((item) => (
                  <button
                    key={item.label}
                    disabled={item.disabled}
                    onClick={() => {
                      setMenu(null);
                      item.fn();
                    }}
                  >
                    <span>{item.label}</span>
                    <kbd>{item.shortcut}</kbd>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        <span className="menu-right">
          {running ? "SIMULATION MODE" : "DESIGN WORKSPACE"}
        </span>
      </nav>
      <div className="toolbar">
        <div className="tool-group">
          <Tool
            icon={FilePlus}
            label="新增專案"
            disabled={running}
            onClick={() => {
              if (guard()) resetProject(newProject());
            }}
          />
          <Tool
            icon={FolderOpen}
            label="開啟專案"
            disabled={running}
            onClick={() => void openProjects()}
          />
          <Tool
            icon={Save}
            label="儲存專案"
            disabled={saving}
            onClick={() => void save()}
          />
        </div>
        <div className="tool-group">
          <Tool
            icon={Undo2}
            label="復原"
            disabled={running || !history.length}
            onClick={undo}
          />
          <Tool
            icon={Redo2}
            label="重做"
            disabled={running || !future.length}
            onClick={redo}
          />
        </div>
        <div className="tool-group">
          <Tool
            icon={MousePointer2}
            label="選取工具"
            active={!running}
            onClick={() => setMode("edit")}
          />
          <Tool
            icon={Grid2X2}
            label="顯示格線"
            active={grid}
            onClick={() => setGrid(!grid)}
          />
          <Tool
            icon={Lock}
            label="吸附格線"
            active={snap}
            onClick={() => setSnap(!snap)}
          />
        </div>
        <div className="tool-group zoom-group">
          <Tool
            icon={ZoomOut}
            label="縮小"
            onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
          />
          <button className="zoom-value" onClick={fit}>
            {Math.round(zoom * 100)}%<ChevronDown size={12} />
          </button>
          <Tool
            icon={ZoomIn}
            label="放大"
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
          />
          <Tool icon={Maximize} label="符合畫面" onClick={fit} />
        </div>
        <div className="toolbar-end">
          {running ? (
            <>
              <span className="simulation-pill">
                <span />
                模擬資料
              </span>
              <button
                className="secondary-btn"
                onClick={() => {
                  setMode("edit");
                  notify("已停止執行");
                }}
              >
                <StopCircle size={15} />
                停止執行
              </button>
            </>
          ) : (
            <>
              <button
                className="secondary-btn"
                onClick={() => start("preview")}
              >
                <Eye size={15} />
                預覽
              </button>
              <button className="primary-btn" onClick={() => start("run")}>
                <Play size={14} fill="currentColor" />
                執行專案
              </button>
            </>
          )}
        </div>
      </div>
      <div className="main-layout">
        {left && (
          <aside className="left-panel">
            <div className="section-heading">
              <span>
                <LayoutDashboard size={15} />
                畫面管理
              </span>
              <button
                title="新增畫面"
                aria-label="新增畫面"
                disabled={running}
                onClick={() => newScreen()}
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="screen-list">
              {project.screens.map((s, i) => (
                <button
                  key={s.id}
                  className={
                    "screen-row " + (screen.id === s.id ? "selected" : "")
                  }
                  onClick={() => {
                    setScreenId(s.id);
                    setSelected([]);
                  }}
                >
                  <LayoutDashboard size={15} />
                  <span>{s.name}</span>
                  {s.id === project.startScreenId ? (
                    <span className="start-tag">起始</span>
                  ) : (
                    <span className="row-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="left-tabs">
              <button
                className={leftTab === "components" ? "active" : ""}
                onClick={() => setLeftTab("components")}
              >
                元件庫
              </button>
              <button
                className={leftTab === "variables" ? "active" : ""}
                onClick={() => setLeftTab("variables")}
              >
                變數 <span>{project.variables.length}</span>
              </button>
            </div>
            {leftTab === "components" ? (
              <>
                <div className="search-box">
                  <Search size={14} />
                  <input
                    aria-label="搜尋元件"
                    placeholder="搜尋元件…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <kbd>⌕</kbd>
                </div>
                <div className="library">
                  <div className="library-label">
                    BASIC COMPONENTS <span>基本元件</span>
                  </div>
                  <div className="component-grid">
                    {(Object.keys(labels) as Kind[])
                      .filter((k) => labels[k].includes(search))
                      .map((k) => {
                        const Icon = icons[k];
                        return (
                          <button
                            key={k}
                            disabled={running}
                            draggable={!running}
                            onDragStart={(e) =>
                              e.dataTransfer.setData("viewx-kind", k)
                            }
                            onClick={() => addElement(k)}
                          >
                            <Icon size={21} strokeWidth={1.5} />
                            <span>{labels[k]}</span>
                          </button>
                        );
                      })}
                  </div>
                  <div className="library-tip">
                    <MousePointer2 size={16} />
                    <span>
                      點選或拖曳元件至畫布
                      <br />
                      按住 Shift 可選取多個元件
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="variable-panel">
                <div className="variable-heading">
                  專案變數
                  <button disabled={running} onClick={addVariable}>
                    <Plus size={15} />
                    新增
                  </button>
                </div>
                <div className="search-box">
                  <Search size={14} />
                  <input
                    aria-label="搜尋變數"
                    placeholder="搜尋變數…"
                    value={variableSearch}
                    onChange={(e) => setVariableSearch(e.target.value)}
                  />
                </div>
                {project.variables
                  .filter((v) =>
                    (v.name + " " + (v.category ?? "")).includes(
                      variableSearch,
                    ),
                  )
                  .map((v) => (
                    <div className="variable-card" key={v.id}>
                      <div>
                        <VariableIcon size={14} />
                        <b>{v.name}</b>
                        <span>{v.type}</span>
                      </div>
                      {running ? (
                        <input
                          aria-label={`模擬值 ${v.name}`}
                          type={v.type === "number" ? "number" : "text"}
                          value={String(values[v.id])}
                          onChange={(e) => {
                            const val =
                              v.type === "number"
                                ? Number(e.target.value)
                                : v.type === "boolean"
                                  ? e.target.value === "true"
                                  : e.target.value;
                            setValues((old) => ({ ...old, [v.id]: val }));
                          }}
                        />
                      ) : (
                        <div className="variable-meta">
                          <span>
                            {v.category ? `${v.category} · ` : ""}初始值：
                            {String(v.initial)}
                          </span>
                          <button
                            aria-label={`編輯 ${v.name}`}
                            onClick={() => {
                              setVariableDraft(clone(v));
                              setDialog("variable");
                            }}
                          >
                            <Settings2 size={13} />
                          </button>
                          <button
                            aria-label={`刪除 ${v.name}`}
                            onClick={() => deleteVariable(v.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
            <div className="left-footer">
              <span className="version-dot" />
              ViewX Studio<span>v0.1.0</span>
            </div>
          </aside>
        )}
        <main className="editor">
          <div className="canvas-tabs">
            <div className="canvas-tab">
              <LayoutDashboard size={14} />
              {screen.name}
              {dirty && <span className="tab-dot" />}
            </div>
            <button
              disabled={running}
              onClick={() => newScreen()}
              aria-label="新增畫面頁籤"
            >
              <Plus size={15} />
            </button>
            <div className="canvas-tabs-right">
              <span>
                {screen.width} × {screen.height}
              </span>
              <Tool
                icon={PanelLeftClose}
                label="切換左側面板"
                onClick={() => setLeft(!left)}
              />
              <Tool
                icon={PanelRightClose}
                label="切換屬性面板"
                onClick={() => setRight(!right)}
              />
            </div>
          </div>
          <div className="workspace" ref={workspaceRef}>
            <div className="workspace-heading">
              <div>
                <span className="eyebrow">
                  {running ? "RUNTIME PREVIEW" : "SCREEN EDITOR"}
                </span>
                <span>
                  {screen.name}
                  <ChevronRight size={12} />
                  {running ? "互動模擬" : "畫面設計"}
                </span>
              </div>
              <span className="workspace-hint">
                {running ? "可操作按鈕與輸入欄位" : "拖曳以移動 · 方向鍵微調"}
              </span>
            </div>
            <div className="canvas-scroll">
              <div
                className="canvas-container"
                style={{
                  width: screen.width * zoom,
                  height: screen.height * zoom,
                }}
              >
                <div
                  ref={canvasRef}
                  className={
                    "design-canvas " + (grid && !running ? "show-grid" : "")
                  }
                  style={{
                    width: screen.width,
                    height: screen.height,
                    backgroundColor: screen.background,
                    transform: `scale(${zoom})`,
                  }}
                  onPointerDown={() => setSelected([])}
                  onDragOver={(e) => {
                    if (!running) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const k = e.dataTransfer.getData("viewx-kind") as Kind;
                    if (running || !(k in labels)) return;
                    const rect = canvasRef.current!.getBoundingClientRect();
                    addElement(
                      k,
                      Math.max(
                        0,
                        Math.min(
                          screen.width - 160,
                          Math.round((e.clientX - rect.left) / zoom),
                        ),
                      ),
                      Math.max(
                        0,
                        Math.min(
                          screen.height - 80,
                          Math.round((e.clientY - rect.top) / zoom),
                        ),
                      ),
                    );
                  }}
                >
                  {screen.elements
                    .filter(
                      (e) =>
                        e.visible &&
                        (!running || !e.conditionId || values[e.conditionId]),
                    )
                    .map((e) => (
                      <div
                        key={e.id}
                        className={
                          "canvas-element " +
                          (!running && selected.includes(e.id)
                            ? "is-selected"
                            : "") +
                          (!running && e.locked ? " is-locked" : "")
                        }
                        style={{
                          left: e.x,
                          top: e.y,
                          width: e.width,
                          height: e.height,
                          cursor: running
                            ? "default"
                            : e.locked
                              ? "not-allowed"
                              : "move",
                          pointerEvents:
                            running && e.enabledId && !values[e.enabledId]
                              ? "none"
                              : undefined,
                          opacity:
                            running && e.enabledId && !values[e.enabledId]
                              ? 0.5
                              : 1,
                        }}
                        onPointerDown={(ev) => down(ev, e)}
                        onPointerMove={move}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                      >
                        <Visual
                          element={e}
                          values={running ? values : initialValues(project)}
                          running={running}
                          onAction={() => action(e)}
                          onInput={(val) => {
                            const v = project.variables.find(
                              (v) => v.id === e.variableId,
                            );
                            if (
                              v?.type === "number" &&
                              Number.isFinite(Number(val))
                            )
                              setValues((old) => ({
                                ...old,
                                [v.id]: Number(val),
                              }));
                          }}
                        />
                        {!running && selected.includes(e.id) && (
                          <>
                            <span className="selection-label">{e.name}</span>
                            {["nw", "ne", "sw", "se"].map((c) => (
                              <span
                                key={c}
                                className={"selection-handle " + c}
                                onPointerDown={(ev) => {
                                  ev.stopPropagation();
                                  if (e.locked) return;
                                  const startX = ev.clientX,
                                    startY = ev.clientY,
                                    snapshot = clone(project);
                                  ev.currentTarget.setPointerCapture(
                                    ev.pointerId,
                                  );
                                  const target = ev.currentTarget;
                                  let changed = false;
                                  const handleMove = (ev: PointerEvent) => {
                                    changed = true;
                                    const dx = (ev.clientX - startX) / zoom,
                                      dy = (ev.clientY - startY) / zoom;
                                    const p = clone(snapshot),
                                      item = p.screens
                                        .find((s) => s.id === screen.id)!
                                        .elements.find((i) => i.id === e.id)!;
                                    const west = c.includes("w"),
                                      north = c.includes("n");
                                    const w = Math.max(
                                        16,
                                        Math.min(
                                          west
                                            ? e.x + e.width
                                            : screen.width - e.x,
                                          e.width + (west ? -dx : dx),
                                        ),
                                      ),
                                      h = Math.max(
                                        8,
                                        Math.min(
                                          north
                                            ? e.y + e.height
                                            : screen.height - e.y,
                                          e.height + (north ? -dy : dy),
                                        ),
                                      );
                                    item.width = Math.round(w);
                                    item.height = Math.round(h);
                                    if (west)
                                      item.x = Math.round(e.x + e.width - w);
                                    if (north)
                                      item.y = Math.round(e.y + e.height - h);
                                    setProject(p);
                                  };
                                  const finish = () => {
                                    target.removeEventListener(
                                      "pointermove",
                                      handleMove,
                                    );
                                    target.removeEventListener(
                                      "pointerup",
                                      finish,
                                    );
                                    target.removeEventListener(
                                      "pointercancel",
                                      finish,
                                    );
                                    if (changed) {
                                      setHistory((h) => [
                                        ...h.slice(-49),
                                        snapshot,
                                      ]);
                                      setFuture([]);
                                    }
                                  };
                                  target.addEventListener(
                                    "pointermove",
                                    handleMove,
                                  );
                                  target.addEventListener("pointerup", finish);
                                  target.addEventListener(
                                    "pointercancel",
                                    finish,
                                  );
                                }}
                              />
                            ))}
                          </>
                        )}
                      </div>
                    ))}
                </div>
              </div>
              <div className="canvas-caption">
                <span>
                  {running
                    ? "瀏覽器模擬執行 · 不連接實際設備"
                    : "畫布內容即為執行畫面"}
                </span>
                <span>{screen.elements.length} 個元件</span>
              </div>
            </div>
          </div>
          {bottom && (
            <div className="log-panel">
              <div>
                <span>執行紀錄</span>
                <button onClick={() => setBottom(false)}>
                  <X size={14} />
                </button>
              </div>
              {logs.map((l, i) => (
                <p key={i}>{l}</p>
              ))}
            </div>
          )}
          <footer className="status-bar">
            <button onClick={() => setBottom(!bottom)}>
              <span className="status-dot" />
              {running ? "模擬執行中" : "就緒"}
              <ChevronDown size={12} />
            </button>
            <span>
              {selected.length
                ? `已選取 ${selected.length} 個元件`
                : "未選取元件"}
            </span>
            <div className="status-right">
              <span>{snap ? "吸附：10 px" : "吸附：關閉"}</span>
              <span>{revision ? `SQLite · v${revision}` : "尚未儲存"}</span>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
          </footer>
        </main>
        {right && (
          <aside className="right-panel">
            <div className="section-heading">
              <span>
                <Settings2 size={15} />
                {running ? "執行狀態" : "屬性設定"}
              </span>
              <span className="muted">
                {current ? labels[current.kind] : "畫面"}
              </span>
            </div>
            {running ? (
              <div className="runtime-panel">
                <div className="runtime-status">
                  <Activity size={22} />
                  <b>模擬執行中</b>
                  <span>所有資料為本機模擬值</span>
                </div>
                <h4>變數監看</h4>
                {project.variables.map((v) => (
                  <div className="watch-row" key={v.id}>
                    <label>
                      {v.name}
                      <small>{v.type}</small>
                    </label>
                    {v.type === "boolean" ? (
                      <button
                        className={
                          "boolean-value " + (values[v.id] ? "on" : "")
                        }
                        onClick={() =>
                          setValues((old) => ({ ...old, [v.id]: !old[v.id] }))
                        }
                      >
                        {values[v.id] ? "TRUE" : "FALSE"}
                      </button>
                    ) : (
                      <input
                        aria-label={`執行值 ${v.name}`}
                        type={v.type === "number" ? "number" : "text"}
                        value={String(values[v.id])}
                        onChange={(e) =>
                          setValues((old) => ({
                            ...old,
                            [v.id]:
                              v.type === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                          }))
                        }
                      />
                    )}
                  </div>
                ))}
                <button
                  className="secondary-btn full"
                  onClick={() => {
                    setValues(initialValues(project));
                    notify("模擬資料已重設");
                  }}
                >
                  重設模擬資料
                </button>
              </div>
            ) : current ? (
              <div className="properties">
                <div className="selected-object">
                  <div>
                    {(() => {
                      const Icon = icons[current.kind];
                      return <Icon size={18} />;
                    })()}
                  </div>
                  <span>
                    {current.name}
                    <small>
                      {selected.length > 1
                        ? `已選取 ${selected.length} 個元件`
                        : `${labels[current.kind]}元件`}
                    </small>
                  </span>
                  <button aria-label="刪除選取元件" onClick={remove}>
                    <Trash2 size={15} />
                  </button>
                </div>
                <PropertySection title="基本設定">
                  <Field label="名稱">
                    <input
                      value={current.name}
                      onChange={(e) => patch({ name: e.target.value })}
                    />
                  </Field>
                  <div className="property-grid">
                    {(["x", "y", "width", "height"] as const).map((key, i) => (
                      <Field
                        label={["X 座標", "Y 座標", "寬度", "高度"][i]}
                        key={key}
                      >
                        <NumberField
                          value={current[key]}
                          min={key === "width" || key === "height" ? 1 : 0}
                          onChange={(v) => patch({ [key]: v })}
                          suffix="px"
                        />
                      </Field>
                    ))}
                  </div>
                </PropertySection>
                <PropertySection title="外觀">
                  <Field label="文字 / 標籤">
                    <input
                      value={current.text}
                      onChange={(e) => patch({ text: e.target.value })}
                    />
                  </Field>
                  <div className="property-grid">
                    <Field label="文字顏色">
                      <ColorField
                        value={current.color}
                        onChange={(v) => patch({ color: v })}
                      />
                    </Field>
                    <Field label="背景顏色">
                      <ColorField
                        value={current.background}
                        onChange={(v) => patch({ background: v })}
                      />
                    </Field>
                  </div>
                  <Field label="字型大小">
                    <NumberField
                      value={current.fontSize}
                      min={8}
                      onChange={(v) => patch({ fontSize: v })}
                      suffix="px"
                    />
                  </Field>
                  {current.kind === "image" && (
                    <button
                      className="secondary-btn full"
                      onClick={() => imageRef.current?.click()}
                    >
                      <ImageIcon size={14} />
                      選擇圖片
                    </button>
                  )}
                </PropertySection>
                <PropertySection title="資料綁定">
                  <Field label="綁定變數">
                    <select
                      value={current.variableId ?? ""}
                      onChange={(e) =>
                        patch({ variableId: e.target.value || undefined })
                      }
                    >
                      <option value="">未綁定</option>
                      {project.variables.map((v) => (
                        <option value={v.id} key={v.id}>
                          {v.name} ({v.type})
                        </option>
                      ))}
                    </select>
                  </Field>
                  {current.kind === "number" && (
                    <div className="property-grid">
                      <Field label="小數位數">
                        <NumberField
                          value={current.decimals ?? 0}
                          min={0}
                          max={6}
                          onChange={(v) => patch({ decimals: Math.round(v) })}
                        />
                      </Field>
                      <Field label="單位">
                        <input
                          value={current.unit ?? ""}
                          onChange={(e) => patch({ unit: e.target.value })}
                        />
                      </Field>
                    </div>
                  )}
                  <button className="text-link" onClick={addVariable}>
                    <Plus size={13} />
                    新增專案變數
                  </button>
                </PropertySection>
                {(current.kind === "button" || current.kind === "switch") && (
                  <PropertySection title="互動動作">
                    <Field label="動作">
                      <select
                        value={
                          current.kind === "switch" ? "toggle" : current.action
                        }
                        disabled={current.kind === "switch"}
                        onChange={(e) =>
                          patch({ action: e.target.value as Element["action"] })
                        }
                      >
                        <option value="toggle">切換開關</option>
                        <option value="set">設定值</option>
                        <option value="increment">加減數值</option>
                        <option value="screen">切換畫面</option>
                      </select>
                    </Field>
                    {current.action === "screen" &&
                    current.kind === "button" ? (
                      <Field label="目標畫面">
                        <select
                          value={current.targetScreenId ?? ""}
                          onChange={(e) =>
                            patch({ targetScreenId: e.target.value })
                          }
                        >
                          <option value="">請選擇</option>
                          {project.screens.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ) : (
                      current.action !== "toggle" && (
                        <Field
                          label={
                            current.action === "increment" ? "增減量" : "設定值"
                          }
                        >
                          <input
                            value={current.actionValue}
                            onChange={(e) =>
                              patch({ actionValue: e.target.value })
                            }
                          />
                        </Field>
                      )
                    )}
                  </PropertySection>
                )}
                <PropertySection title="狀態與條件">
                  <Field label="顯示條件（布林）">
                    <select
                      value={current.conditionId ?? ""}
                      onChange={(e) =>
                        patch({ conditionId: e.target.value || undefined })
                      }
                    >
                      <option value="">永遠顯示</option>
                      {project.variables
                        .filter((v) => v.type === "boolean")
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <Field label="啟用條件（布林）">
                    <select
                      value={current.enabledId ?? ""}
                      onChange={(e) =>
                        patch({ enabledId: e.target.value || undefined })
                      }
                    >
                      <option value="">永遠啟用</option>
                      {project.variables
                        .filter((v) => v.type === "boolean")
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={current.locked}
                      onChange={(e) => patch({ locked: e.target.checked })}
                    />
                    鎖定元件
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={current.visible}
                      onChange={(e) => patch({ visible: e.target.checked })}
                    />
                    顯示元件
                  </label>
                </PropertySection>
              </div>
            ) : (
              <div className="properties">
                <div className="selected-object">
                  <div>
                    <LayoutDashboard size={18} />
                  </div>
                  <span>
                    {screen.name}
                    <small>畫面屬性</small>
                  </span>
                </div>
                <PropertySection title="畫面設定">
                  <Field label="畫面名稱">
                    <input
                      value={screen.name}
                      onChange={(e) =>
                        editScreen((s) => (s.name = e.target.value))
                      }
                    />
                  </Field>
                  <div className="property-grid">
                    <Field label="寬度">
                      <NumberField
                        value={screen.width}
                        min={100}
                        max={4096}
                        onChange={(v) => editScreen((s) => (s.width = v))}
                        suffix="px"
                      />
                    </Field>
                    <Field label="高度">
                      <NumberField
                        value={screen.height}
                        min={100}
                        max={4096}
                        onChange={(v) => editScreen((s) => (s.height = v))}
                        suffix="px"
                      />
                    </Field>
                  </div>
                  <Field label="背景顏色">
                    <ColorField
                      value={screen.background}
                      onChange={(v) => editScreen((s) => (s.background = v))}
                    />
                  </Field>
                  <button
                    className="secondary-btn full"
                    onClick={() => change((p) => (p.startScreenId = screen.id))}
                  >
                    <LayoutDashboard size={14} />
                    {screen.id === project.startScreenId
                      ? "已設為起始畫面"
                      : "設為起始畫面"}
                  </button>
                </PropertySection>
                <div className="empty-selection">
                  <MousePointer2 size={24} />
                  <p>選取元件以編輯屬性</p>
                  <span>也可按住 Shift 多選元件</span>
                </div>
              </div>
            )}
            {!running && (
              <div className="layers-section">
                <div className="section-heading">
                  <span>
                    <Layers size={15} />
                    圖層
                  </span>
                  <span className="muted">{screen.elements.length}</span>
                </div>
                <div className="layers-list">
                  {[...screen.elements].reverse().map((e) => {
                    const Icon = icons[e.kind];
                    return (
                      <div
                        className={
                          "layer-row " +
                          (selected.includes(e.id) ? "selected" : "")
                        }
                        key={e.id}
                      >
                        <button
                          className="layer-name"
                          onClick={(ev) =>
                            setSelected(
                              ev.shiftKey
                                ? Array.from(new Set([...selected, e.id]))
                                : [e.id],
                            )
                          }
                        >
                          <Icon size={13} />
                          <span>{e.name}</span>
                        </button>
                        <button
                          title="切換鎖定"
                          onClick={() =>
                            editScreen((s) => {
                              s.elements.find((i) => i.id === e.id)!.locked =
                                !e.locked;
                            })
                          }
                        >
                          {e.locked ? <Lock size={12} /> : <Unlock size={12} />}
                        </button>
                        <button
                          title="切換顯示"
                          className={!e.visible ? "hidden-layer" : ""}
                          onClick={() =>
                            editScreen((s) => {
                              s.elements.find((i) => i.id === e.id)!.visible =
                                !e.visible;
                            })
                          }
                        >
                          <Eye size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
      {notice && (
        <div role="status" className={"toast " + (notice.error ? "error" : "")}>
          {notice.error ? <AlertCircle size={17} /> : <Check size={17} />}
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)}>
            <X size={14} />
          </button>
        </div>
      )}
      <input
        ref={importRef}
        hidden
        type="file"
        accept=".json,.viewx"
        onChange={(e) => {
          void importProject(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={imageRef}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (file.size > 3 * 1024 * 1024) {
            notify("圖片不可超過 3 MB", true);
            return;
          }
          if (
            !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
              file.type,
            )
          ) {
            notify("僅支援 PNG、JPEG、WebP、GIF", true);
            return;
          }
          const target = current?.id;
          const reader = new FileReader();
          reader.onload = () => {
            editScreen((s) => {
              const item = s.elements.find((i) => i.id === target);
              if (item) item.image = String(reader.result);
            });
          };
          reader.readAsDataURL(file);
        }}
      />
      {dialog && (
        <div className="modal-backdrop" onClick={() => setDialog(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={
              {
                projects: "開啟專案",
                project: "專案設定",
                screen: "畫面設定",
                variable: "變數設定",
                help: "操作說明",
                check: "專案檢查",
              }[dialog]
            }
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {
                  {
                    projects: "開啟專案",
                    project: "專案設定",
                    screen: "畫面設定",
                    variable: "變數設定",
                    help: "操作說明",
                    check: "專案檢查",
                  }[dialog]
                }
              </h2>
              <button aria-label="關閉對話框" onClick={() => setDialog(null)}>
                <X size={19} />
              </button>
            </div>
            <div className="modal-body">
              {dialog === "projects" &&
                (loading ? (
                  <p>讀取中…</p>
                ) : rows.length ? (
                  <div className="project-list">
                    {rows.map((row) => (
                      <button
                        key={row.id}
                        onClick={() => void openProject(row.id)}
                      >
                        <FolderOpen size={22} />
                        <span>
                          <b>{row.name}</b>
                          <small>
                            {new Date(row.updated_at).toLocaleString("zh-TW")} ·
                            版本 {row.revision}
                          </small>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="modal-empty">
                    <FolderOpen size={32} />
                    <p>尚未儲存任何專案</p>
                    <span>關閉此視窗後，按「儲存」建立第一個專案。</span>
                  </div>
                ))}
              {dialog === "project" && (
                <>
                  <Field label="專案名稱">
                    <input
                      value={project.name}
                      onChange={(e) => change((p) => (p.name = e.target.value))}
                    />
                  </Field>
                  <Field label="專案說明">
                    <textarea
                      value={project.description}
                      onChange={(e) =>
                        change((p) => (p.description = e.target.value))
                      }
                    />
                  </Field>
                  <Field label="起始畫面">
                    <select
                      value={project.startScreenId}
                      onChange={(e) =>
                        change((p) => (p.startScreenId = e.target.value))
                      }
                    >
                      {project.screens.map((s) => (
                        <option value={s.id} key={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <p className="info-box">
                    格式版本 1 · SQLite 本機儲存 · JSON 匯入／匯出
                  </p>
                </>
              )}
              {dialog === "screen" && (
                <>
                  <Field label="畫面名稱">
                    <input
                      value={screen.name}
                      onChange={(e) =>
                        editScreen((s) => (s.name = e.target.value))
                      }
                    />
                  </Field>
                  <div className="property-grid">
                    <Field label="寬度">
                      <NumberField
                        value={screen.width}
                        min={100}
                        max={4096}
                        onChange={(v) => editScreen((s) => (s.width = v))}
                      />
                    </Field>
                    <Field label="高度">
                      <NumberField
                        value={screen.height}
                        min={100}
                        max={4096}
                        onChange={(v) => editScreen((s) => (s.height = v))}
                      />
                    </Field>
                  </div>
                  <Field label="背景顏色">
                    <ColorField
                      value={screen.background}
                      onChange={(v) => editScreen((s) => (s.background = v))}
                    />
                  </Field>
                </>
              )}
              {dialog === "variable" && variableDraft && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (
                      !variableDraft.name.trim() ||
                      project.variables.some(
                        (v) =>
                          v.id !== variableDraft.id &&
                          v.name === variableDraft.name.trim(),
                      )
                    ) {
                      notify("變數名稱不能空白或重複", true);
                      return;
                    }
                    change((p) => {
                      const i = p.variables.findIndex(
                        (v) => v.id === variableDraft.id,
                      );
                      if (i < 0)
                        p.variables.push({
                          ...variableDraft,
                          name: variableDraft.name.trim(),
                        });
                      else
                        p.variables[i] = {
                          ...variableDraft,
                          name: variableDraft.name.trim(),
                        };
                    });
                    setDialog(null);
                    setLeftTab("variables");
                    notify("變數設定已更新");
                  }}
                >
                  <Field label="變數名稱">
                    <input
                      required
                      value={variableDraft.name}
                      onChange={(e) =>
                        setVariableDraft({
                          ...variableDraft,
                          name: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="資料型別">
                    <select
                      value={variableDraft.type}
                      onChange={(e) => {
                        const type = e.target.value as Variable["type"];
                        setVariableDraft({
                          ...variableDraft,
                          type,
                          initial:
                            type === "number"
                              ? 0
                              : type === "boolean"
                                ? false
                                : "",
                        });
                      }}
                    >
                      <option value="number">數值（number）</option>
                      <option value="boolean">布林（boolean）</option>
                      <option value="string">文字（string）</option>
                    </select>
                  </Field>
                  <Field label="分類">
                    <input
                      placeholder="例如：設備狀態"
                      value={variableDraft.category ?? ""}
                      onChange={(e) =>
                        setVariableDraft({
                          ...variableDraft,
                          category: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="初始值">
                    {variableDraft.type === "boolean" ? (
                      <select
                        value={String(variableDraft.initial)}
                        onChange={(e) =>
                          setVariableDraft({
                            ...variableDraft,
                            initial: e.target.value === "true",
                          })
                        }
                      >
                        <option value="false">False / 關閉</option>
                        <option value="true">True / 開啟</option>
                      </select>
                    ) : (
                      <input
                        type={
                          variableDraft.type === "number" ? "number" : "text"
                        }
                        step="any"
                        required={variableDraft.type === "number"}
                        value={String(variableDraft.initial)}
                        onChange={(e) =>
                          setVariableDraft({
                            ...variableDraft,
                            initial:
                              variableDraft.type === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                          })
                        }
                      />
                    )}
                  </Field>
                  <button className="primary-btn full" type="submit">
                    儲存變數設定
                  </button>
                </form>
              )}
              {dialog === "check" && (
                <>
                  <p className="check-summary">
                    {check().length ? (
                      <>
                        <AlertCircle size={20} />
                        {check().length} 個項目需要處理
                      </>
                    ) : (
                      <>
                        <Check size={20} />
                        專案檢查通過，可以執行
                      </>
                    )}
                  </p>
                  {check().map((msg, i) => (
                    <div className="check-item" key={i}>
                      <AlertCircle size={14} />
                      {msg}
                    </div>
                  ))}
                  {!check().length && (
                    <p className="muted">
                      已檢查變數綁定、資料型別、畫面範圍與切換目標。
                    </p>
                  )}
                </>
              )}
              {dialog === "help" && (
                <>
                  <p>
                    ViewX Studio <b>v0.1.0</b> · 瀏覽器畫面規劃工具
                  </p>
                  <ol className="help-steps">
                    <li>從左側加入元件，拖曳定位或調整四角控制點。</li>
                    <li>在右側設定外觀、綁定變數及按鈕動作。</li>
                    <li>
                      按「儲存」保存至 SQLite；使用「檔案」匯入／匯出 JSON。
                    </li>
                    <li>
                      按「預覽」或「執行專案」測試互動，右側可修改模擬值。
                    </li>
                  </ol>
                  <div className="shortcut-list">
                    {[
                      ["儲存", "Ctrl / ⌘ S"],
                      ["復原", "Ctrl / ⌘ Z"],
                      ["重做", "Ctrl / ⌘ Shift Z"],
                      ["複製 / 貼上", "Ctrl / ⌘ C / V"],
                      ["刪除", "Delete"],
                      ["多選", "Shift + 點選"],
                      ["微調位置", "方向鍵（Shift：10 px）"],
                      ["離開執行模式", "Esc"],
                    ].map(([label, key]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <kbd>{key}</kbd>
                      </div>
                    ))}
                  </div>
                  <p className="info-box">
                    此版本使用模擬資料，不連接 PLC
                    或實際設備。部署於內網多人使用前，需加入身分驗證與權限管理。
                  </p>
                </>
              )}
            </div>
            {dialog !== "variable" && (
              <div className="modal-footer">
                <button className="primary-btn" onClick={() => setDialog(null)}>
                  完成
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function Tool({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  active = false,
}: {
  icon: typeof Square;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      className={"tool-button " + (active ? "active" : "")}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={17} strokeWidth={1.7} />
    </button>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {isValidElement(children) && typeof children.type === "string"
        ? cloneElement(
            children as React.ReactElement<{ "aria-label"?: string }>,
            { "aria-label": label },
          )
        : children}
    </label>
  );
}
function PropertySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="property-section">
      <h4>
        {title}
        <ChevronDown size={12} />
      </h4>
      {children}
    </section>
  );
}
function NumberField({
  value,
  onChange,
  suffix,
  min = 0,
  max = 10000,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="number-field">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
      />
      {suffix && <span>{suffix}</span>}
    </div>
  );
}
function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="color-field">
      <input
        aria-label="選擇顏色"
        type="color"
        value={/^#[\da-f]{6}$/i.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        aria-label="色碼"
        value={value}
        maxLength={7}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
