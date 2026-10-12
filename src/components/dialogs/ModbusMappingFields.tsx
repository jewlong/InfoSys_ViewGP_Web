import type { CommunicationDevice, ModbusMapping, Variable } from "../../model";
import {
  defaultMapping,
  modbusAreas,
  registerTypes,
} from "../../services/communicationRules";
import { Field, NumberField } from "../ui/Controls";
export function ModbusMappingFields({
  variable,
  devices,
  onChange,
  disabled = false,
}: {
  variable: Variable;
  devices: CommunicationDevice[];
  onChange: (mapping: ModbusMapping | undefined) => void;
  disabled?: boolean;
}) {
  const m = variable.modbus;
  const patch = (p: Partial<ModbusMapping>) => {
    if (m) onChange({ ...m, ...p });
  };
  return (
    <fieldset className="communication-fields" disabled={disabled}>
      <legend>標籤來源與 Modbus 位址</legend>
      <Field label="資料來源">
        <select
          aria-label="標籤設備"
          value={m?.deviceId ?? ""}
          onChange={(e) =>
            onChange(
              e.target.value
                ? {
                    ...defaultMapping(e.target.value, variable.type),
                    ...m,
                    deviceId: e.target.value,
                  }
                : undefined,
            )
          }
        >
          <option value="">內部模擬變數</option>
          {variable.type !== "string" &&
            devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} · {d.transport.toUpperCase()}
              </option>
            ))}
        </select>
      </Field>
      {variable.type === "string" && (
        <p className="muted">目前 Modbus 映射支援布林及數值標籤。</p>
      )}
      {!devices.length && (
        <p className="muted">請先在「通訊設備與標籤」新增設備。</p>
      )}
      {m && (
        <>
          <div className="property-grid">
            <Field label="資料區">
              <select
                aria-label="Modbus 資料區"
                value={m.area}
                onChange={(e) => {
                  const area = e.target.value as ModbusMapping["area"];
                  patch({
                    area,
                    access:
                      area === "discreteInput" || area === "inputRegister"
                        ? "read"
                        : m.access,
                  });
                }}
              >
                {Object.entries(modbusAreas)
                  .filter(([area]) =>
                    variable.type === "boolean"
                      ? ["coil", "discreteInput"].includes(area)
                      : ["holdingRegister", "inputRegister"].includes(area),
                  )
                  .map(([area, label]) => (
                    <option key={area} value={area}>
                      {label}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="位址（從 0 起算）">
              <NumberField
                value={m.address}
                min={0}
                max={m.dataType.endsWith("32") ? 65534 : 65535}
                onChange={(address) => patch({ address })}
              />
            </Field>
          </div>
          <div className="property-grid">
            <Field label="資料型別">
              <select
                aria-label="Modbus 資料型別"
                value={m.dataType}
                onChange={(e) =>
                  patch({
                    dataType: e.target.value as ModbusMapping["dataType"],
                  })
                }
              >
                {(variable.type === "boolean" ? ["bool"] : registerTypes).map(
                  (t) => (
                    <option key={t}>{t}</option>
                  ),
                )}
              </select>
            </Field>
            <Field label="讀寫權限">
              <select
                aria-label="標籤讀寫權限"
                value={m.access}
                onChange={(e) =>
                  patch({ access: e.target.value as ModbusMapping["access"] })
                }
              >
                <option value="read">唯讀</option>
                {["coil", "holdingRegister"].includes(m.area) && (
                  <option value="readWrite">讀寫</option>
                )}
              </select>
            </Field>
          </div>
          {variable.type === "number" && (
            <>
              <Field label="32 位元暫存器順序">
                <select
                  aria-label="暫存器順序"
                  value={m.wordOrder}
                  onChange={(e) =>
                    patch({
                      wordOrder: e.target.value as ModbusMapping["wordOrder"],
                    })
                  }
                >
                  <option value="highFirst">高 Word 在前</option>
                  <option value="lowFirst">低 Word 在前</option>
                </select>
              </Field>
              <div className="property-grid">
                <Field label="倍率">
                  <input
                    aria-label="標籤倍率"
                    type="number"
                    step="any"
                    value={m.scale}
                    onChange={(e) => patch({ scale: Number(e.target.value) })}
                  />
                </Field>
                <Field label="偏移">
                  <input
                    aria-label="標籤偏移"
                    type="number"
                    step="any"
                    value={m.offset}
                    onChange={(e) => patch({ offset: Number(e.target.value) })}
                  />
                </Field>
              </div>
            </>
          )}
          <p className="muted">
            顯示值＝設備原始值 × 倍率＋偏移。手冊的 40001 通常對應 Holding
            Register 位址 0；以設備文件為準。Word 警報使用 uint16、倍率 1、偏移
            0。
          </p>
        </>
      )}
    </fieldset>
  );
}
