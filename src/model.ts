import { screenProblems } from "./services/screenRules.ts";
import { validateCommunicationSettings } from "./services/communicationRules.ts";
import { validateAlarmSettings } from "./services/globalAlarms.ts";

export type Kind =
  | "text"
  | "rectangle"
  | "circle"
  | "line"
  | "image"
  | "button"
  | "indicator"
  | "number"
  | "input"
  | "switch"
  | "gauge"
  | "bar"
  | "trend"
  | "alarm"
  | "datetime"
  | "multistate"
  | "scale"
  | "table";
export type Action =
  | "toggle"
  | "set"
  | "increment"
  | "screen"
  | "reset"
  | "momentary"
  | "previousScreen"
  | "openDialog"
  | "closeDialog"
  | "popup"
  | "closePopup";
export type MultistateItem = {
  value: number;
  label: string;
  color: string;
  textColor?: string;
};
export type CommunicationDevice = {
  id: string;
  name: string;
  enabled: boolean;
  unitId: number;
  pollIntervalMs: number;
  timeoutMs: number;
} & (
  | { transport: "tcp"; host: string; port: number }
  | {
      transport: "rtu";
      serialPort: string;
      baudRate: number;
      parity: "none" | "even" | "odd";
      dataBits: 8;
      stopBits: 1 | 2;
    }
);
export type ModbusMapping = {
  deviceId: string;
  area: "coil" | "discreteInput" | "holdingRegister" | "inputRegister";
  address: number;
  dataType: "bool" | "uint16" | "int16" | "uint32" | "int32" | "float32";
  wordOrder: "highFirst" | "lowFirst";
  scale: number;
  offset: number;
  access: "read" | "readWrite";
};
export type Variable = {
  modbus?: ModbusMapping;
  id: string;
  name: string;
  type: "number" | "boolean" | "string";
  category?: string;
  initial: number | boolean | string;
};
export type AlarmRule = {
  id: string;
  message: string;
  variableId: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "ne" | "true" | "false";
  threshold?: number;
  severity: "info" | "warning" | "critical";
  enabled?: boolean;
};
export type WordAlarmRule = {
  id: string;
  bit: number;
  message: string;
  severity: AlarmRule["severity"];
  enabled?: boolean;
};
export type AlarmArea = {
  id: string;
  name: string;
  variableId: string;
  maskVariableId?: string;
  group: string;
  updateIntervalMs: number;
  enabled: boolean;
  rules: WordAlarmRule[];
};
export type AlarmTickerSettings = {
  enabled: boolean;
  position: "top" | "bottom";
  intervalMs: number;
};
export type Element = {
  id: string;
  kind: Kind;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
  background: string;
  fontSize: number;
  variableId?: string;
  action: Action;
  actionValue: string;
  targetScreenId?: string;
  locked: boolean;
  visible: boolean;
  groupId?: string;
  image?: string;
  imageAssetId?: string;
  unit?: string;
  decimals?: number;
  numberFormat?: "decimal" | "integer" | "percent" | "scientific";
  useGrouping?: boolean;
  numberPrefix?: string;
  numberLocale?: "en-US" | "zh-TW" | "de-DE";
  inputMin?: number;
  inputMax?: number;
  inputStep?: number;
  scaleMin?: number;
  scaleMax?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  fillColor?: string;
  trackColor?: string;
  orientation?: "horizontal" | "vertical";
  showValue?: boolean;
  showScale?: boolean;
  sampleInterval?: number;
  historyPoints?: number;
  alarmRules?: AlarmRule[];
  alarmMaxRows?: number;
  alarmSource?: "local" | "global" | "all";
  alarmGroup?: string;
  conditionId?: string;
  enabledId?: string;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  italic?: boolean;
  underline?: boolean;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  wordWrap?: boolean;
  lineHeight?: number;
  textBackground?: boolean;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
  borderRadius?: number;
  shapeFilled?: boolean;
  imageFit?: "contain" | "cover" | "fill" | "none";
  imagePosition?: "center" | "top" | "bottom" | "left" | "right";
  buttonHoverBackground?: string;
  buttonHoverColor?: string;
  buttonPressedBackground?: string;
  buttonPressedColor?: string;
  buttonDisabledBackground?: string;
  buttonDisabledColor?: string;
  dateTimeFormat?: string;
  multistateItems?: MultistateItem[];
  scaleOrientation?: "horizontal" | "vertical";
  scaleMajorTicks?: number;
  scaleMinorTicks?: number;
  scaleShowAxis?: boolean;
  scaleShowLabels?: boolean;
  tableCols?: number;
  tableRows?: number;
  tableDiagonal?: boolean;
  gridColor?: string;
};
export type Screen = {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  type?: "screen" | "dialog" | "normal" | "popup";
  parentScreenId?: string;
  inheritsScreenId?: string;
  elements: Element[];
};
export type ImageAsset = { id: string; name: string; data: string };
export type Project = {
  devices?: CommunicationDevice[];
  alarmAreas?: AlarmArea[];
  alarmTicker?: AlarmTickerSettings;
  assets?: ImageAsset[];
  autoSave?: boolean;
  schemaVersion: 1;
  id: string;
  name: string;
  description: string;
  startScreenId: string;
  screens: Screen[];
  variables: Variable[];
};
export const uid = () => crypto.randomUUID();
export const labels: Record<Kind, string> = {
  text: "文字",
  rectangle: "矩形",
  circle: "圓形",
  line: "直線",
  image: "圖片",
  button: "按鈕",
  indicator: "指示燈",
  number: "數值顯示",
  input: "數值輸入",
  switch: "開關",
  gauge: "儀表",
  bar: "長條顯示",
  trend: "趨勢圖",
  alarm: "警報清單",
  datetime: "時間/日期",
  multistate: "多狀態指示燈",
  scale: "刻度",
  table: "表格",
};
export const makeElement = (kind: Kind, x = 120, y = 120): Element => ({
  id: uid(),
  kind,
  name: labels[kind],
  x,
  y,
  width:
    kind === "alarm"
      ? 480
      : kind === "table"
        ? 320
        : kind === "trend"
          ? 400
          : kind === "gauge"
            ? 220
            : kind === "bar" || kind === "scale"
              ? 240
              : kind === "datetime"
                ? 220
                : kind === "line"
                  ? 160
                  : kind === "indicator" || kind === "multistate"
                    ? 44
                    : kind === "circle"
                      ? 80
                      : 160,
  height:
    kind === "alarm"
      ? 220
      : kind === "trend"
        ? 200
        : kind === "table"
          ? 180
          : kind === "gauge"
            ? 180
            : kind === "bar"
              ? 100
              : kind === "scale" || kind === "datetime"
                ? 44
                : kind === "line"
                  ? 4
                  : kind === "indicator" || kind === "multistate"
                    ? 44
                    : kind === "circle"
                      ? 80
                      : 48,
  text:
    kind === "button"
      ? "啟動"
      : kind === "text"
        ? "文字內容"
        : kind === "datetime"
          ? "YYYY/MM/DD HH:mm:ss"
          : kind === "multistate"
            ? "停止"
            : labels[kind],
  color: "#e2e8f0",
  background:
    kind === "button"
      ? "#5268ee"
      : kind === "rectangle"
        ? "#26344d"
        : "#18263b",
  fontSize: kind === "number" ? 32 : 16,
  action: "toggle",
  actionValue: "1",
  locked: false,
  visible: true,
  ...(["gauge", "bar", "trend"].includes(kind)
    ? {
        scaleMin: 0,
        scaleMax: 100,
        fillColor: "#38bdf8",
        trackColor: "#334155",
      }
    : {}),
  ...(kind === "bar" ? { orientation: "horizontal" as const } : {}),
  ...(kind === "trend" ? { sampleInterval: 1000, historyPoints: 120 } : {}),
  ...(kind === "alarm" ? { alarmRules: [], alarmMaxRows: 20 } : {}),
  ...(kind === "datetime" ? { dateTimeFormat: "YYYY/MM/DD HH:mm:ss" } : {}),
  ...(kind === "multistate"
    ? {
        borderRadius: 22,
        background: "#64748b",
        multistateItems: [
          { value: 0, label: "停止", color: "#64748b", textColor: "#ffffff" },
          { value: 1, label: "運轉", color: "#22c55e", textColor: "#ffffff" },
          { value: 2, label: "異常", color: "#ef4444", textColor: "#ffffff" },
        ],
      }
    : {}),
  ...(kind === "scale"
    ? {
        scaleOrientation: "horizontal" as const,
        scaleMajorTicks: 5,
        scaleMinorTicks: 4,
        scaleMin: 0,
        scaleMax: 100,
        scaleShowAxis: true,
        scaleShowLabels: true,
        color: "#94a3b8",
      }
    : {}),
  ...(kind === "table"
    ? {
        tableCols: 3,
        tableRows: 4,
        tableDiagonal: false,
        borderWidth: 1,
        borderColor: "#475569",
        gridColor: "#334155",
        background: "#1e293b",
      }
    : {}),
});
export function newProject(): Project {
  const id = uid();
  return {
    schemaVersion: 1,
    id: uid(),
    name: "未命名專案",
    description: "",
    startScreenId: id,
    screens: [
      {
        id,
        name: "主畫面",
        width: 960,
        height: 600,
        background: "#101c2e",
        elements: [],
      },
    ],
    variables: [],
  };
}
export function demoProject(): Project {
  const p = newProject();
  p.name = "智慧產線監控";
  p.description = "Production line dashboard";
  p.variables = [
    { id: "running", name: "運轉狀態", type: "boolean", initial: false },
    { id: "temperature", name: "溫度", type: "number", initial: 26.5 },
    { id: "count", name: "生產數量", type: "number", initial: 1280 },
    { id: "target", name: "目標數量", type: "number", initial: 2000 },
  ];
  const add = (kind: Kind, x: number, y: number, props: Partial<Element>) => ({
    ...makeElement(kind, x, y),
    ...props,
  });
  p.screens[0].elements = [
    add("text", 36, 28, {
      text: "PRODUCTION LINE  /  01",
      width: 500,
      height: 28,
      fontSize: 13,
      color: "#91a1bb",
    }),
    add("text", 36, 66, {
      text: "產線即時監控",
      width: 440,
      height: 50,
      fontSize: 30,
    }),
    add("rectangle", 36, 150, {
      name: "溫度卡片",
      width: 276,
      height: 190,
      background: "#19283e",
    }),
    add("rectangle", 332, 150, {
      name: "產量卡片",
      width: 276,
      height: 190,
      background: "#19283e",
    }),
    add("rectangle", 628, 150, {
      name: "目標卡片",
      width: 296,
      height: 190,
      background: "#19283e",
    }),
    add("text", 58, 174, { text: "環境溫度", color: "#91a1bb", height: 28 }),
    add("number", 58, 219, {
      name: "溫度數值",
      variableId: "temperature",
      width: 200,
      height: 62,
      fontSize: 44,
      color: "#7bd8ce",
    }),
    add("text", 58, 290, {
      text: "°C  /  感測器 A01",
      fontSize: 12,
      color: "#91a1bb",
    }),
    add("text", 354, 174, { text: "累計生產", color: "#91a1bb", height: 28 }),
    add("number", 354, 219, {
      name: "生產數量",
      variableId: "count",
      width: 220,
      height: 62,
      fontSize: 44,
    }),
    add("text", 354, 290, {
      text: "PCS  /  本班次",
      fontSize: 12,
      color: "#91a1bb",
    }),
    add("text", 650, 174, { text: "目標產量", color: "#91a1bb", height: 28 }),
    add("number", 650, 219, {
      name: "目標數值",
      variableId: "target",
      width: 230,
      height: 62,
      fontSize: 44,
      color: "#b7a6fa",
    }),
    add("text", 650, 290, {
      text: "PCS  /  每日目標",
      fontSize: 12,
      color: "#91a1bb",
    }),
    add("rectangle", 36, 364, {
      name: "操作面板",
      width: 888,
      height: 186,
      background: "#19283e",
    }),
    add("text", 58, 384, { text: "設備控制", fontSize: 18 }),
    add("indicator", 60, 446, {
      name: "運轉指示燈",
      variableId: "running",
      width: 22,
      height: 22,
    }),
    add("text", 98, 437, { text: "運轉狀態", color: "#91a1bb" }),
    add("switch", 230, 435, {
      name: "運轉開關",
      variableId: "running",
      width: 80,
      height: 44,
    }),
    add("button", 490, 435, {
      text: "啟動 / 停止",
      variableId: "running",
      width: 180,
      height: 52,
    }),
    add("button", 694, 435, {
      text: "＋ 計數",
      variableId: "count",
      action: "increment",
      width: 204,
      height: 52,
      background: "#294452",
      color: "#7bd8ce",
    }),
  ];
  return p;
}
export function validateProject(value: unknown): value is Project {
  if (!value || typeof value !== "object") return false;
  const p = value as Project;
  if (
    p.schemaVersion !== 1 ||
    typeof p.id !== "string" ||
    typeof p.name !== "string" ||
    typeof p.description !== "string" ||
    !Array.isArray(p.screens) ||
    !p.screens.length ||
    !Array.isArray(p.variables)
  )
    return false;
  if (p.autoSave !== undefined && typeof p.autoSave !== "boolean") return false;
  if (!validateAlarmSettings(p) || !validateCommunicationSettings(p))
    return false;
  const assetIds = new Set<string>();
  if (
    p.assets !== undefined &&
    (!Array.isArray(p.assets) ||
      p.assets.length > 100 ||
      !p.assets.every(
        (a) =>
          a &&
          typeof a.id === "string" &&
          a.id.length > 0 &&
          !assetIds.has(a.id) &&
          (assetIds.add(a.id), true) &&
          typeof a.name === "string" &&
          a.name.trim().length > 0 &&
          a.name.length <= 200 &&
          typeof a.data === "string" &&
          a.data.length <= 4 * 1024 * 1024 + 30 &&
          /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}(?![\s\S])/.test(
            a.data,
          ),
      ))
  )
    return false;
  const ids = new Set<string>();
  const unique = (id: unknown) =>
    typeof id === "string" &&
    id.length > 0 &&
    !ids.has(id) &&
    (ids.add(id), true);
  if (
    !p.variables.every(
      (v) =>
        v &&
        unique(v.id) &&
        typeof v.name === "string" &&
        ["number", "boolean", "string"].includes(v.type) &&
        typeof v.initial === v.type &&
        (v.type !== "number" || Number.isFinite(v.initial)),
    )
  )
    return false;
  return (
    p.screens.some((s) => s && s.id === p.startScreenId) &&
    p.screens.every(
      (s) =>
        s &&
        unique(s.id) &&
        typeof s.name === "string" &&
        Number.isFinite(s.width) &&
        s.width >= 100 &&
        s.width <= 4096 &&
        Number.isFinite(s.height) &&
        s.height >= 100 &&
        s.height <= 4096 &&
        typeof s.background === "string" &&
        (s.type === undefined ||
          ["screen", "dialog", "normal", "popup"].includes(s.type)) &&
        (s.inheritsScreenId === undefined ||
          typeof s.inheritsScreenId === "string") &&
        Array.isArray(s.elements) &&
        s.elements.length <= 2000 &&
        s.elements.every(
          (e) =>
            e &&
            unique(e.id) &&
            (e.imageAssetId === undefined || assetIds.has(e.imageAssetId)) &&
            validateAppearance(e) &&
            validateDataSettings(e) &&
            validateAdvancedSettings(e) &&
            Object.hasOwn(labels, e.kind) &&
            ["name", "text", "color", "background", "actionValue"].every(
              (k) => typeof e[k as keyof Element] === "string",
            ) &&
            ["x", "y", "width", "height", "fontSize"].every((k) =>
              Number.isFinite(e[k as keyof Element]),
            ) &&
            e.width > 0 &&
            e.height > 0 &&
            e.width <= 4096 &&
            e.height <= 4096 &&
            e.x >= 0 &&
            e.y >= 0 &&
            e.fontSize >= 8 &&
            e.fontSize <= 1000 &&
            [
              "variableId",
              "targetScreenId",
              "groupId",
              "conditionId",
              "enabledId",
              "image",
              "unit",
              "dateTimeFormat",
              "gridColor",
              "scaleOrientation",
            ].every(
              (k) =>
                e[k as keyof Element] === undefined ||
                typeof e[k as keyof Element] === "string",
            ) &&
            (e.decimals === undefined ||
              (Number.isInteger(e.decimals) &&
                e.decimals >= 0 &&
                e.decimals <= 6)) &&
            typeof e.locked === "boolean" &&
            typeof e.visible === "boolean" &&
            [
              "toggle",
              "set",
              "increment",
              "screen",
              "reset",
              "momentary",
              "previousScreen",
              "openDialog",
              "closeDialog",
              "popup",
              "closePopup",
            ].includes(e.action) &&
            (!e.image ||
              (typeof e.image === "string" &&
                /^data:image\/(png|jpeg|webp|gif);base64,/.test(e.image))),
        ),
    ) &&
    screenProblems(p).length === 0
  );
}

// Optional appearance fields keep existing schema-v1 projects readable.
export function validateAppearance(e: Element): boolean {
  const enums = {
    fontWeight: ["normal", "bold"],
    textAlign: ["left", "center", "right"],
    verticalAlign: ["top", "middle", "bottom"],
    borderStyle: ["none", "solid", "dashed", "dotted"],
    imageFit: ["contain", "cover", "fill", "none"],
    imagePosition: ["center", "top", "bottom", "left", "right"],
  };
  for (const [key, allowed] of Object.entries(enums)) {
    const value = e[key as keyof Element];
    if (value !== undefined && !allowed.includes(value as string)) return false;
  }
  for (const key of [
    "italic",
    "underline",
    "wordWrap",
    "textBackground",
    "shapeFilled",
  ] as const)
    if (e[key] !== undefined && typeof e[key] !== "boolean") return false;
  for (const [key, min, max] of [
    ["lineHeight", 1, 3],
    ["borderWidth", 0, 20],
    ["borderRadius", 0, 1000],
  ] as const) {
    const value = e[key];
    if (
      value !== undefined &&
      (!Number.isFinite(value) || value < min || value > max)
    )
      return false;
  }
  if (
    e.fontFamily !== undefined &&
    (typeof e.fontFamily !== "string" ||
      !e.fontFamily.length ||
      e.fontFamily.length > 200)
  )
    return false;
  for (const key of [
    "borderColor",
    "buttonHoverBackground",
    "buttonHoverColor",
    "buttonPressedBackground",
    "buttonPressedColor",
    "buttonDisabledBackground",
    "buttonDisabledColor",
  ] as const)
    if (
      e[key] !== undefined &&
      (typeof e[key] !== "string" || !/^#[\da-f]{6}$/i.test(e[key]))
    )
      return false;
  return true;
}

export function validateDataSettings(e: Element): boolean {
  if (
    e.numberFormat !== undefined &&
    !["decimal", "integer", "percent", "scientific"].includes(e.numberFormat)
  )
    return false;
  if (
    e.numberLocale !== undefined &&
    !["en-US", "zh-TW", "de-DE"].includes(e.numberLocale)
  )
    return false;
  if (e.useGrouping !== undefined && typeof e.useGrouping !== "boolean")
    return false;
  if (e.numberPrefix !== undefined && typeof e.numberPrefix !== "string")
    return false;
  for (const key of ["inputMin", "inputMax", "inputStep"] as const)
    if (e[key] !== undefined && !Number.isFinite(e[key])) return false;
  return e.inputStep === undefined || e.inputStep > 0;
}

export function validateAdvancedSettings(e: Element): boolean {
  if (
    e.alarmSource !== undefined &&
    !["local", "global", "all"].includes(e.alarmSource)
  )
    return false;
  if (
    e.alarmGroup !== undefined &&
    (typeof e.alarmGroup !== "string" || e.alarmGroup.length > 200)
  )
    return false;
  for (const key of [
    "scaleMin",
    "scaleMax",
    "warningThreshold",
    "criticalThreshold",
  ] as const)
    if (e[key] !== undefined && !Number.isFinite(e[key])) return false;
  for (const key of ["fillColor", "trackColor"] as const)
    if (
      e[key] !== undefined &&
      (typeof e[key] !== "string" || !/^#[\da-f]{6}$/i.test(e[key]))
    )
      return false;
  for (const key of ["showValue", "showScale"] as const)
    if (e[key] !== undefined && typeof e[key] !== "boolean") return false;
  if (
    e.orientation !== undefined &&
    !["horizontal", "vertical"].includes(e.orientation)
  )
    return false;
  if (
    e.scaleOrientation !== undefined &&
    !["horizontal", "vertical"].includes(e.scaleOrientation)
  )
    return false;
  if (
    e.gridColor !== undefined &&
    (typeof e.gridColor !== "string" || !/^#[\da-f]{6}$/i.test(e.gridColor))
  )
    return false;
  if (
    e.dateTimeFormat !== undefined &&
    (typeof e.dateTimeFormat !== "string" || e.dateTimeFormat.length > 100)
  )
    return false;
  for (const key of [
    "scaleShowAxis",
    "scaleShowLabels",
    "tableDiagonal",
  ] as const)
    if (e[key] !== undefined && typeof e[key] !== "boolean") return false;
  for (const [key, min, max] of [
    ["tableCols", 1, 50],
    ["tableRows", 1, 50],
    ["scaleMajorTicks", 1, 50],
    ["scaleMinorTicks", 0, 50],
  ] as const)
    if (
      e[key] !== undefined &&
      (!Number.isInteger(e[key]) || e[key]! < min || e[key]! > max)
    )
      return false;
  if (e.multistateItems !== undefined) {
    if (!Array.isArray(e.multistateItems) || e.multistateItems.length > 20)
      return false;
    for (const item of e.multistateItems) {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.value !== "number" ||
        !Number.isFinite(item.value) ||
        typeof item.label !== "string" ||
        item.label.length > 50 ||
        typeof item.color !== "string" ||
        !/^#[\da-f]{6}$/i.test(item.color) ||
        (item.textColor !== undefined &&
          (typeof item.textColor !== "string" ||
            !/^#[\da-f]{6}$/i.test(item.textColor)))
      )
        return false;
    }
  }
  for (const [key, min, max] of [
    ["sampleInterval", 100, 60000],
    ["historyPoints", 10, 600],
    ["alarmMaxRows", 1, 100],
  ] as const)
    if (
      e[key] !== undefined &&
      (!Number.isInteger(e[key]) || e[key]! < min || e[key]! > max)
    )
      return false;
  if (e.alarmRules === undefined) return true;
  if (!Array.isArray(e.alarmRules) || e.alarmRules.length > 20) return false;
  const ids = new Set<string>();
  return e.alarmRules.every((rule) => {
    if (
      !rule ||
      typeof rule !== "object" ||
      typeof rule.id !== "string" ||
      !rule.id ||
      ids.has(rule.id)
    )
      return false;
    ids.add(rule.id);
    return (
      typeof rule.message === "string" &&
      typeof rule.variableId === "string" &&
      ["gt", "gte", "lt", "lte", "eq", "ne", "true", "false"].includes(
        rule.operator,
      ) &&
      ["info", "warning", "critical"].includes(rule.severity) &&
      (rule.threshold === undefined || Number.isFinite(rule.threshold)) &&
      (rule.enabled === undefined || typeof rule.enabled === "boolean")
    );
  });
}
