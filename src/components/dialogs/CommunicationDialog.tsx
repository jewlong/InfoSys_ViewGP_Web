import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { uid, type CommunicationDevice } from "../../model";
import {
  communicationProblems,
  validDevice,
} from "../../services/communicationRules";
import { communicationRequest } from "../../services/communication";
import { Field, NumberField } from "../ui/Controls";
import { ModbusMappingFields } from "./ModbusMappingFields";
export function CommunicationDialog() {
  const {
    project,
    running,
    change,
    setDialog,
    communicationMode,
    setCommunicationMode,
    communicationSnapshot,
    communicationError,
    notify,
  } = useEditorContext();
  const [selectedId, setSelectedId] = useState(project.devices?.[0]?.id ?? "");
  const [tab, setTab] = useState<"devices" | "tags" | "status">(
    running ? "status" : "devices",
  );
  const [ports, setPorts] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const devices = project.devices ?? [],
    device = devices.find((d) => d.id === selectedId);
  const patch = (partial: Partial<CommunicationDevice>) =>
    change((p) => {
      const d = p.devices?.find((d) => d.id === selectedId);
      if (d) Object.assign(d, partial);
    });
  function add() {
    const d: CommunicationDevice = {
      id: uid(),
      name: "設備 " + (devices.length + 1),
      transport: "tcp",
      host: "127.0.0.1",
      port: 502,
      unitId: 1,
      enabled: true,
      pollIntervalMs: 500,
      timeoutMs: 1000,
    };
    change((p) => {
      (p.devices ??= []).push(d);
    });
    setSelectedId(d.id);
  }
  const problems = communicationProblems(project);
  return (
    <div className="modal-backdrop" onClick={() => setDialog(null)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="通訊設備與標籤"
        className="modal communication-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>通訊設備與標籤</h2>
          <button aria-label="關閉對話框" onClick={() => setDialog(null)}>
            <X size={19} />
          </button>
        </div>
        <div className="modal-body">
          <Field label="執行資料來源">
            <select
              aria-label="執行資料來源"
              value={communicationMode}
              disabled={running}
              onChange={(e) =>
                setCommunicationMode(e.target.value as "offline" | "online")
              }
            >
              <option value="offline">離線模擬</option>
              <option value="online">設備連線（Modbus TCP／RTU）</option>
            </select>
          </Field>
          <p className="info-box">
            設備連線由後端電腦執行。設備 IP／COM
            埠需由後端存取；設定完成後按「執行專案」開始通訊。未映射的標籤保留為內部變數。
          </p>
          <div className="alarm-management-tabs">
            {(
              [
                ["devices", "設備設定"],
                ["tags", "標籤映射"],
                ["status", "連線狀態"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                className={tab === key ? "active" : ""}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {running && tab !== "status" && (
            <p className="muted">請先停止執行，再修改設備與標籤。</p>
          )}
          {tab === "devices" && (
            <>
              <div className="communication-device-list">
                <select
                  aria-label="選擇設備"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  <option value="">選擇設備…</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.transport.toUpperCase()}
                    </option>
                  ))}
                </select>
                <button
                  className="secondary-btn"
                  disabled={running || devices.length >= 32}
                  onClick={add}
                >
                  <Plus size={15} />
                  新增設備
                </button>
              </div>
              {device && (
                <fieldset className="communication-fields" disabled={running}>
                  <Field label="設備名稱">
                    <input
                      aria-label="設備名稱"
                      value={device.name}
                      maxLength={200}
                      onChange={(e) => patch({ name: e.target.value })}
                    />
                  </Field>
                  <div className="property-grid">
                    <Field label="通訊協定">
                      <select
                        aria-label="通訊協定"
                        value={device.transport}
                        onChange={(e) => {
                          const d: CommunicationDevice =
                            e.target.value === "tcp"
                              ? {
                                  id: device.id,
                                  name: device.name,
                                  enabled: device.enabled,
                                  unitId: device.unitId,
                                  pollIntervalMs: device.pollIntervalMs,
                                  timeoutMs: device.timeoutMs,
                                  transport: "tcp",
                                  host: "127.0.0.1",
                                  port: 502,
                                }
                              : {
                                  id: device.id,
                                  name: device.name,
                                  enabled: device.enabled,
                                  pollIntervalMs: device.pollIntervalMs,
                                  timeoutMs: device.timeoutMs,
                                  transport: "rtu",
                                  unitId: Math.max(
                                    1,
                                    Math.min(247, device.unitId),
                                  ),
                                  serialPort: "COM1",
                                  baudRate: 9600,
                                  parity: "even",
                                  dataBits: 8,
                                  stopBits: 1,
                                };
                          change((p) => {
                            p.devices = p.devices?.map((x) =>
                              x.id === device.id ? d : x,
                            );
                          });
                        }}
                      >
                        <option value="tcp">Modbus TCP</option>
                        <option value="rtu">COM／Modbus RTU</option>
                      </select>
                    </Field>
                    <Field label="站號（Unit ID）">
                      <NumberField
                        value={device.unitId}
                        min={device.transport === "tcp" ? 0 : 1}
                        max={device.transport === "tcp" ? 255 : 247}
                        onChange={(unitId) => patch({ unitId })}
                      />
                    </Field>
                  </div>
                  {device.transport === "tcp" ? (
                    <div className="property-grid">
                      <Field label="IP／主機名稱">
                        <input
                          aria-label="設備主機"
                          value={device.host}
                          onChange={(e) => patch({ host: e.target.value })}
                        />
                      </Field>
                      <Field label="TCP Port">
                        <NumberField
                          value={device.port}
                          min={1}
                          max={65535}
                          onChange={(port) => patch({ port })}
                        />
                      </Field>
                    </div>
                  ) : (
                    <>
                      <Field label="後端串列埠">
                        <input
                          aria-label="串列埠"
                          list="serial-ports"
                          value={device.serialPort}
                          onChange={(e) =>
                            patch({ serialPort: e.target.value })
                          }
                        />
                        <datalist id="serial-ports">
                          {ports.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </datalist>
                      </Field>
                      <button
                        className="secondary-btn"
                        onClick={() =>
                          void communicationRequest<string[]>("serial-ports")
                            .then((p) => {
                              setPorts(p);
                              notify(
                                p.length
                                  ? "找到 " + p.length + " 個後端串列埠"
                                  : "後端未偵測到串列埠，可手動輸入",
                              );
                            })
                            .catch((e) => notify(e.message, true))
                        }
                      >
                        重新掃描後端串列埠
                      </button>
                      <div className="property-grid">
                        <Field label="鮑率">
                          <select
                            aria-label="鮑率"
                            value={device.baudRate}
                            onChange={(e) =>
                              patch({ baudRate: Number(e.target.value) })
                            }
                          >
                            {[
                              1200, 2400, 4800, 9600, 19200, 38400, 57600,
                              115200,
                            ].map((n) => (
                              <option key={n}>{n}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="同位元檢查">
                          <select
                            aria-label="同位元檢查"
                            value={device.parity}
                            onChange={(e) =>
                              patch({
                                parity: e.target.value as
                                  "none" | "even" | "odd",
                              })
                            }
                          >
                            <option value="none">None</option>
                            <option value="even">Even</option>
                            <option value="odd">Odd</option>
                          </select>
                        </Field>
                        <Field label="資料位元">
                          <input value="8" readOnly />
                        </Field>
                        <Field label="停止位元">
                          <select
                            value={device.stopBits}
                            onChange={(e) =>
                              patch({
                                stopBits: Number(e.target.value) as 1 | 2,
                              })
                            }
                          >
                            <option>1</option>
                            <option>2</option>
                          </select>
                        </Field>
                      </div>
                    </>
                  )}
                  <div className="property-grid">
                    <Field label="輪詢間隔（ms）">
                      <NumberField
                        value={device.pollIntervalMs}
                        min={100}
                        max={60000}
                        onChange={(pollIntervalMs) => patch({ pollIntervalMs })}
                      />
                    </Field>
                    <Field label="逾時（ms）">
                      <NumberField
                        value={device.timeoutMs}
                        min={100}
                        max={10000}
                        onChange={(timeoutMs) => patch({ timeoutMs })}
                      />
                    </Field>
                  </div>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={device.enabled}
                      onChange={(e) => patch({ enabled: e.target.checked })}
                    />
                    啟用設備
                  </label>
                  {!validDevice(device) && (
                    <p role="alert" className="communication-error">
                      設備設定無效，請檢查名稱、主機／串列埠及數值。
                    </p>
                  )}
                  <button
                    className="secondary-btn"
                    onClick={() => {
                      if (
                        project.variables.some(
                          (v) => v.modbus?.deviceId === device.id,
                        )
                      ) {
                        notify("設備仍被標籤引用，請先解除映射", true);
                        return;
                      }
                      change((p) => {
                        p.devices = p.devices?.filter(
                          (d) => d.id !== device.id,
                        );
                      });
                      setSelectedId("");
                    }}
                  >
                    <Trash2 size={15} />
                    刪除設備
                  </button>
                </fieldset>
              )}
            </>
          )}
          {tab === "tags" && (
            <>
              <input
                aria-label="搜尋通訊標籤"
                placeholder="搜尋標籤…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {project.variables
                .filter((v) => v.name.includes(search))
                .map((v) => (
                  <section className="communication-tag" key={v.id}>
                    <h3>
                      {v.name} <small>{v.type}</small>
                    </h3>
                    <ModbusMappingFields
                      variable={v}
                      devices={devices}
                      disabled={running}
                      onChange={(modbus) =>
                        change((p) => {
                          const target = p.variables.find(
                            (x) => x.id === v.id,
                          )!;
                          if (modbus) target.modbus = modbus;
                          else delete target.modbus;
                        })
                      }
                    />
                  </section>
                ))}
            </>
          )}
          {tab === "status" && (
            <>
              <p>
                {running && communicationMode === "online"
                  ? "設備通訊執行中"
                  : "目前未啟動設備通訊"}
              </p>
              {communicationError && (
                <p role="alert" className="communication-error">
                  {communicationError}
                </p>
              )}
              {devices.map((d) => {
                const state = communicationSnapshot?.devices.find(
                  (s) => s.id === d.id,
                );
                return (
                  <div className="communication-device-status" key={d.id}>
                    <b>{d.name}</b>
                    <span>
                      {state
                        ? ({
                            connected: "已連線",
                            connecting: "連線中",
                            unmapped: "未綁定標籤",
                            error: "通訊異常",
                            disabled: "未啟用",
                          }[state.state] ?? state.state)
                        : "未連線"}
                    </span>
                    {state?.error && <small>{state.error}</small>}
                    {state?.lastSuccessAt && (
                      <small>
                        最後成功：
                        {new Date(state.lastSuccessAt).toLocaleString("zh-TW")}
                      </small>
                    )}
                  </div>
                );
              })}
              <p className="muted">
                讀取失敗會自動重連；寫入失敗不自動重送。通訊資料失效時，暫停相關警報判斷並保留既有警報。
              </p>
            </>
          )}
          {problems.map((p, i) => (
            <p className="communication-error" key={i}>
              {p}
            </p>
          ))}
        </div>
        <div className="modal-footer">
          <button className="primary-btn" onClick={() => setDialog(null)}>
            完成
          </button>
        </div>
      </section>
    </div>
  );
}
