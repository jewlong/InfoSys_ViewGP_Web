import {
  makeElement,
  uid,
  type CommunicationDevice,
  type Project,
  type Screen,
  type Variable,
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

  const mainScreenId = uid();
  const variables: Variable[] = [];
  const screens: Screen[] = [];

  if (templateId === "pump") {
    const runVarId = uid();
    const tempVarId = uid();
    variables.push(
      { id: runVarId, name: "泵浦運轉", type: "boolean", initial: false },
      { id: tempVarId, name: "泵浦溫度", type: "number", initial: 36.5 },
    );
    screens.push({
      id: mainScreenId,
      name: "泵浦監控",
      width,
      height,
      background: "#101c2e",
      elements: [
        {
          ...makeElement("text", 32, 24),
          name: "標題",
          text: "泵浦與馬達監控",
          width: 320,
          height: 40,
          fontSize: 24,
        },
        {
          ...makeElement("indicator", 32, 84),
          name: "狀態燈",
          variableId: runVarId,
        },
        {
          ...makeElement("gauge", 100, 84),
          name: "溫度錶頭",
          text: "泵浦溫度",
          variableId: tempVarId,
          unit: "°C",
        },
        {
          ...makeElement("button", 340, 84),
          name: "JOG 點動",
          text: "JOG 點動",
          variableId: runVarId,
          action: "momentary",
          actionValue: "true",
          background: "#0284c7",
        },
      ],
    });
  } else if (templateId === "alarm") {
    const wordVarId = uid();
    const maskVarId = uid();
    variables.push(
      { id: wordVarId, name: "警報區 Word", type: "number", initial: 0 },
      { id: maskVarId, name: "警報區 遮罩", type: "number", initial: 0 },
    );
    screens.push({
      id: mainScreenId,
      name: "警報監控",
      width,
      height,
      background: "#101c2e",
      elements: [
        {
          ...makeElement("text", 32, 24),
          name: "標題",
          text: "全域警報監控中心",
          width: 340,
          height: 40,
          fontSize: 24,
        },
        {
          ...makeElement("alarm", 32, 84),
          name: "警報清單",
          alarmSource: "all",
          alarmRules: [
            {
              id: uid(),
              message: "警報 Word 異常",
              variableId: wordVarId,
              operator: "gt",
              threshold: 0,
              severity: "warning",
              enabled: true,
            },
          ],
        },
      ],
    });
  } else if (templateId === "trend") {
    const flowVarId = uid();
    variables.push({
      id: flowVarId,
      name: "產線流量",
      type: "number",
      initial: 50,
    });
    screens.push({
      id: mainScreenId,
      name: "趨勢看板",
      width,
      height,
      background: "#101c2e",
      elements: [
        {
          ...makeElement("text", 32, 24),
          name: "標題",
          text: "產線多曲線趨勢與產量統計",
          width: 400,
          height: 40,
          fontSize: 24,
        },
        {
          ...makeElement("trend", 32, 84),
          name: "趨勢圖",
          text: "流量趨勢",
          variableId: flowVarId,
        },
      ],
    });
  } else {
    screens.push({
      id: mainScreenId,
      name: "主畫面",
      width,
      height,
      background: "#101c2e",
      elements: [],
    });
  }

  const devices: CommunicationDevice[] = [];
  if (transport === "tcp") {
    devices.push({
      id: uid(),
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
      id: uid(),
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
    id: uid(),
    name: name || "未命名專案",
    description: description ?? "",
    startScreenId: mainScreenId,
    screens,
    variables,
    ...(devices.length ? { devices } : {}),
    autoSave,
    ...(autoSave ? { autoSaveIntervalMs: 2000 } : {}),
    maxPopupDepth: 16,
  };
}
