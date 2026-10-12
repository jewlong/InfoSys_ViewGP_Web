import { demoProject } from "../../src/model.ts";
import { defaultMapping } from "../../src/services/communicationRules.ts";
export function communicationProject(port = 1502) {
  const p = demoProject();
  p.devices = [
    {
      id: "plc",
      name: "Modbus 測試設備",
      transport: "tcp",
      host: "127.0.0.1",
      port,
      unitId: 1,
      pollIntervalMs: 100,
      timeoutMs: 300,
      enabled: true,
    },
  ];
  p.variables.find((v) => v.id === "temperature").modbus = {
    ...defaultMapping("plc", "number"),
    scale: 0.1,
    access: "readWrite",
  };
  p.variables.find((v) => v.id === "running").modbus = {
    ...defaultMapping("plc", "boolean"),
    access: "readWrite",
  };
  return p;
}
