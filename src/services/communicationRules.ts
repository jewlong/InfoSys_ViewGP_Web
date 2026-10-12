import type {
  Project,
  Variable,
  ModbusMapping,
  CommunicationDevice,
} from "../model.ts";

export const modbusAreas = {
  coil: "Coil（可讀寫接點）",
  discreteInput: "Discrete Input（唯讀接點）",
  holdingRegister: "Holding Register（可讀寫暫存器）",
  inputRegister: "Input Register（唯讀暫存器）",
};
export const registerTypes = [
  "uint16",
  "int16",
  "uint32",
  "int32",
  "float32",
] as const;
export const wordCount = (type: ModbusMapping["dataType"]) =>
  ["uint32", "int32", "float32"].includes(type) ? 2 : 1;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max = 200) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const integer = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
export function validDevice(value: unknown): value is CommunicationDevice {
  if (!object(value)) return false;
  const d = value;
  if (
    !text(d.id) ||
    !text(d.name) ||
    typeof d.enabled !== "boolean" ||
    !integer(d.unitId, 0, 255) ||
    !integer(d.pollIntervalMs, 100, 60000) ||
    !integer(d.timeoutMs, 100, 10000)
  )
    return false;
  if (d.transport === "tcp")
    return (
      text(d.host, 253) &&
      /^[A-Za-z0-9.:_-]+$/.test(d.host as string) &&
      integer(d.port, 1, 65535)
    );
  if (d.transport === "rtu")
    return (
      integer(d.unitId, 1, 247) &&
      text(d.serialPort, 200) &&
      /^[A-Za-z0-9_./-]+$/.test(d.serialPort as string) &&
      [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].includes(
        d.baudRate as number,
      ) &&
      ["none", "even", "odd"].includes(d.parity as string) &&
      d.dataBits === 8 &&
      [1, 2].includes(d.stopBits as number)
    );
  return false;
}
export function validMapping(
  value: unknown,
  variableType: Variable["type"],
): value is ModbusMapping {
  if (!object(value)) return false;
  const m = value;
  const bit = m.area === "coil" || m.area === "discreteInput";
  return (
    text(m.deviceId) &&
    Object.hasOwn(modbusAreas, String(m.area)) &&
    (bit
      ? variableType === "boolean" && m.dataType === "bool"
      : variableType === "number" &&
        registerTypes.includes(m.dataType as (typeof registerTypes)[number])) &&
    integer(
      m.address,
      0,
      65536 - wordCount(m.dataType as ModbusMapping["dataType"]),
    ) &&
    ["highFirst", "lowFirst"].includes(m.wordOrder as string) &&
    typeof m.scale === "number" &&
    Number.isFinite(m.scale) &&
    Math.abs(m.scale) >= 1e-12 &&
    Math.abs(m.scale) <= 1e12 &&
    typeof m.offset === "number" &&
    Number.isFinite(m.offset) &&
    Math.abs(m.offset) <= 1e12 &&
    (!bit || (m.scale === 1 && m.offset === 0)) &&
    ["read", "readWrite"].includes(m.access as string) &&
    (!(m.area === "discreteInput" || m.area === "inputRegister") ||
      m.access === "read")
  );
}
export function validateCommunicationSettings(p: Project): boolean {
  if (
    p.devices !== undefined &&
    (!Array.isArray(p.devices) || p.devices.length > 32)
  )
    return false;
  const ids = new Set<string>(),
    ports = new Set<string>();
  for (const d of p.devices ?? []) {
    if (!validDevice(d) || ids.has(d.id)) return false;
    ids.add(d.id);
    if (d.transport === "rtu" && d.enabled) {
      if (ports.has(d.serialPort.toLowerCase())) return false;
      ports.add(d.serialPort.toLowerCase());
    }
  }
  if (p.variables.filter((v) => v?.modbus !== undefined).length > 1000)
    return false;
  return p.variables.every(
    (v) =>
      v?.modbus === undefined ||
      (typeof v.id === "string" &&
        !v.id.startsWith("$SYS.") &&
        validMapping(v.modbus, v.type) &&
        ids.has(v.modbus.deviceId)),
  );
}
export function communicationProblems(p: Project): string[] {
  if (!validateCommunicationSettings(p))
    return ["設備通訊或標籤位址設定無效（請檢查設備、型別、位址與讀寫權限）"];
  const problems: string[] = [];
  for (const area of p.alarmAreas ?? [])
    for (const id of [area.variableId, area.maskVariableId]) {
      const v = p.variables.find((v) => v.id === id),
        m = v?.modbus;
      if (m && (m.dataType !== "uint16" || m.scale !== 1 || m.offset !== 0))
        problems.push(
          `${area.name}：Word 警報／遮罩標籤需使用 uint16、倍率 1、偏移 0`,
        );
    }
  return problems;
}
export function defaultMapping(
  deviceId: string,
  type: Variable["type"],
): ModbusMapping {
  return {
    deviceId,
    area: type === "boolean" ? "coil" : "holdingRegister",
    address: 0,
    dataType: type === "boolean" ? "bool" : "uint16",
    wordOrder: "highFirst",
    scale: 1,
    offset: 0,
    access: "read",
  };
}
export function mappingWriteError(
  m: ModbusMapping,
  value: unknown,
): string | undefined {
  if (m.access !== "readWrite") return "設備標籤為唯讀";
  if (m.dataType === "bool")
    return typeof value === "boolean" ? undefined : "接點需寫入布林值";
  if (typeof value !== "number" || !Number.isFinite(value))
    return "需寫入有限數值";
  const raw = (value - m.offset) / m.scale;
  const ranges = {
    uint16: [0, 65535],
    int16: [-32768, 32767],
    uint32: [0, 4294967295],
    int32: [-2147483648, 2147483647],
    float32: [-3.4028234663852886e38, 3.4028234663852886e38],
  };
  const [min, max] = ranges[m.dataType];
  if (
    !Number.isFinite(raw) ||
    raw < min ||
    raw > max ||
    (m.dataType !== "float32" && Math.abs(raw - Math.round(raw)) > 1e-7)
  )
    return "寫入值超出資料型別範圍，或倍率換算後不是整數";
}
