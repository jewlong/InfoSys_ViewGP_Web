import type {
  Project,
  Screen,
  Variable,
  CommunicationDevice as Device,
  Element,
  Kind,
  Action,
} from "../model";

export type ProjectTemplateId = "blank" | "pump" | "alarm" | "trend";

export interface ProjectTemplateOptions {
  name: string;
  description?: string;
  templateId: ProjectTemplateId;
  width: number;
  height: number;
  autoSave: boolean;
  transport: "offline" | "tcp" | "rtu";
  tcpHost?: string;
  tcpPort?: number;
  rtuPort?: string;
  rtuBaud?: number;
}

function makeElement(
  kind: Kind,
  x: number,
  y: number,
  width: number,
  height: number,
  overrides: Partial<Element> = {},
): Element {
  return {
    id: crypto.randomUUID(),
    kind,
    name: "",
    x,
    y,
    width,
    height,
    text: "",
    color: "#000000",
    background: "#ffffff",
    fontSize: 12,
    action: "toggle",
    actionValue: "",
    locked: false,
    visible: true,
    ...overrides,
  };
}

function blankScreen(width: number, height: number): Screen {
  return {
    id: "screen-main",
    name: "主畫面",
    width,
    height,
    background: "#ffffff",
    elements: [],
  };
}

function pumpScreen(width: number, height: number): Screen {
  return {
    id: "screen-pump",
    name: "泵浦監控",
    width,
    height,
    background: "#f5f6fa",
    elements: [
      makeElement("text", 20, 20, 300, 30, {
        name: "標題",
        text: "泵浦與馬達監控",
        fontSize: 16,
      }),
      makeElement("indicator", 20, 70, 40, 40, {
        name: "狀態燈",
        background: "#54b998",
      }),
      makeElement("gauge", 80, 70, 140, 140, {
        name: "溫度錶頭",
        text: "",
        color: "#54b998",
        background: "#ffffff",
        fontSize: 12,
      }),
      makeElement("button", 240, 70, 100, 50, {
        name: "JOG 點動",
        text: "JOG 點動",
        action: "momentary",
        actionValue: "true",
        background: "#0284c7",
        color: "#ffffff",
        fontSize: 12,
      }),
    ],
  };
}

function alarmScreen(width: number, height: number): Screen {
  return {
    id: "screen-alarm",
    name: "警報監控",
    width,
    height,
    background: "#f5f6fa",
    elements: [
      makeElement("text", 20, 20, 300, 30, {
        name: "標題",
        text: "全域警報監控中心",
        fontSize: 16,
      }),
      makeElement("alarm", 20, 70, 400, 200, {
        name: "警報清單",
      }),
    ],
  };
}

function trendScreen(width: number, height: number): Screen {
  return {
    id: "screen-trend",
    name: "趨勢看板",
    width,
    height,
    background: "#f5f6fa",
    elements: [
      makeElement("text", 20, 20, 300, 30, {
        name: "標題",
        text: "產線多曲線趨勢與產量統計",
        fontSize: 16,
      }),
      makeElement("trend", 20, 70, 500, 300, {
        name: "趨勢圖",
      }),
    ],
  };
}

export function createProjectFromTemplate(
  options: ProjectTemplateOptions,
): Project {
  const {
    name,
    description,
    templateId,
    width,
    height,
    autoSave,
    transport,
    tcpHost,
    tcpPort,
    rtuPort,
    rtuBaud,
  } = options;

  const now = Date.now();
  const screen =
    templateId === "pump"
      ? pumpScreen(width, height)
      : templateId === "alarm"
        ? alarmScreen(width, height)
        : templateId === "trend"
          ? trendScreen(width, height)
          : blankScreen(width, height);

  const variables: Variable[] = [];
  const devices: Device[] = [];

  if (transport === "tcp") {
    devices.push({
      id: "dev-1",
      name: "Modbus TCP 設備",
      transport: "tcp",
      host: tcpHost ?? "127.0.0.1",
      port: tcpPort ?? 502,
      unitId: 1,
      enabled: true,
      pollIntervalMs: 1000,
      timeoutMs: 2000,
    });
  } else if (transport === "rtu") {
    devices.push({
      id: "dev-1",
      name: "COM Modbus RTU 設備",
      transport: "rtu",
      serialPort: rtuPort ?? "COM1",
      baudRate: rtuBaud ?? 9600,
      parity: "even",
      dataBits: 8,
      stopBits: 1,
      unitId: 1,
      enabled: true,
      pollIntervalMs: 1000,
      timeoutMs: 2000,
    });
  }

  return {
    schemaVersion: 1,
    id: `proj-${now}`,
    name,
    description: description ?? "",
    startScreenId: screen.id,
    screens: [screen],
    variables,
    devices,
    alarmAreas: [],
    alarmTicker: { enabled: true, position: "top", intervalMs: 3000 },
    autoSave,
    autoSaveIntervalMs: autoSave ? 2000 : undefined,
    maxPopupDepth: 16,
    createdAt: now.toString(),
    updatedAt: now.toString(),
  };
}
