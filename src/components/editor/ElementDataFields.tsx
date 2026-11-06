import { Plus, Trash2 } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import type { Element } from "../../model";
import { isPopup } from "../../services/screenRules";
import {
  actionPatch,
  bindingPatch,
  bindingProblems,
  bindingTypes,
} from "../../services/dataRules";
import { SYSTEM_VARIABLES } from "../../services/systemVariables";
import { Field, PropertySection } from "../ui/Controls";

export function ElementDataFields() {
  const { project, current: e, patch, addVariable } = useEditorContext();
  if (!e) return null;
  const types = bindingTypes(e);
  const variable = project.variables.find((v) => v.id === e.variableId);
  const errors = bindingProblems(e, project);

  function optionalNumber(
    key: "inputMin" | "inputMax" | "inputStep",
    raw: string,
  ) {
    if (raw === "") patch({ [key]: undefined });
    else if (Number.isFinite(Number(raw))) patch({ [key]: Number(raw) });
  }

  const applicableSysVars = SYSTEM_VARIABLES.filter((s) =>
    types.includes(s.type),
  );

  return (
    <>
      {(e.kind === "button" || e.kind === "switch") && (
        <PropertySection title="互動動作">
          <Field label="動作">
            <select
              value={e.kind === "switch" ? "toggle" : e.action}
              disabled={e.kind === "switch"}
              onChange={(event) =>
                patch(
                  actionPatch(
                    e,
                    event.target.value as Element["action"],
                    project.variables,
                  ),
                )
              }
            >
              <option value="toggle">切換開關 (Toggle)</option>
              <option value="momentary">點動 (按住 ON／放開 OFF)</option>
              <option value="set">設定值 (Set)</option>
              <option value="increment">加減數值 (Step)</option>
              <option value="reset">重設為初始值 (Reset)</option>
              <option value="screen">切換畫面 (Jump)</option>
              <option value="previousScreen">回上一畫面 (Return)</option>
              <option value="popup">開啟對話盒</option>
              <option value="closePopup">關閉對話盒</option>
              {e.action === "openDialog" && (
                <option value="openDialog">開啟對話盒</option>
              )}
              {e.action === "closeDialog" && (
                <option value="closeDialog">關閉對話盒</option>
              )}
            </select>
          </Field>
          {e.kind === "button" &&
            ["screen", "popup", "openDialog"].includes(e.action) && (
              <Field label="目標畫面">
                <select
                  value={e.targetScreenId ?? ""}
                  onChange={(event) =>
                    patch({ targetScreenId: event.target.value || undefined })
                  }
                >
                  <option value="">請選擇</option>
                  {project.screens
                    .filter(
                      (s) =>
                        isPopup(s) ===
                        ["popup", "openDialog"].includes(e.action),
                    )
                    .map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  {e.targetScreenId &&
                    !project.screens.some(
                      (s) =>
                        s.id === e.targetScreenId &&
                        isPopup(s) ===
                          ["popup", "openDialog"].includes(e.action),
                    ) && (
                      <option value={e.targetScreenId}>失效的目標畫面</option>
                    )}
                </select>
              </Field>
            )}
          {e.kind === "button" && ["set", "increment"].includes(e.action) && (
            <Field label={e.action === "increment" ? "增減量" : "設定值"}>
              {variable?.type === "boolean" && e.action === "set" ? (
                <select
                  value={e.actionValue}
                  onChange={(event) =>
                    patch({ actionValue: event.target.value })
                  }
                >
                  <option value="true">TRUE</option>
                  <option value="false">FALSE</option>
                  {!["true", "false"].includes(e.actionValue) && (
                    <option value={e.actionValue}>請選擇有效布林值</option>
                  )}
                </select>
              ) : (
                <input
                  type={
                    variable?.type === "number" || e.action === "increment"
                      ? "number"
                      : "text"
                  }
                  step="any"
                  value={e.actionValue}
                  onChange={(event) =>
                    patch({ actionValue: event.target.value })
                  }
                />
              )}
            </Field>
          )}
          {e.kind === "button" && e.action === "increment" && (
            <p className="appearance-hint">正數增加，負數減少。</p>
          )}
          {e.kind === "button" && e.action === "momentary" && (
            <>
              <Field label="動作模式">
                <select
                  value={e.actionValue === "false" ? "false" : "true"}
                  onChange={(event) =>
                    patch({ actionValue: event.target.value })
                  }
                >
                  <option value="true">正邏輯 (按下 ON／放開 OFF)</option>
                  <option value="false">負邏輯 (按下 OFF／放開 ON)</option>
                </select>
              </Field>
              <p className="appearance-hint">
                點動 (JOG)：按住時輸出指定狀態，放開時自動復歸；支援長按指標擷取防滑與失焦安全保護。
              </p>
            </>
          )}
          {e.kind === "button" && e.action === "previousScreen" && (
            <p className="appearance-hint">
              點擊時返回模擬運行中前一個瀏覽的畫面。
            </p>
          )}
        </PropertySection>
      )}

      {types.length > 0 && (
        <PropertySection title="資料綁定">
          <Field label="綁定變數">
            <select
              value={e.variableId ?? ""}
              onChange={(event) =>
                patch(
                  bindingPatch(
                    e,
                    event.target.value || undefined,
                    project.variables,
                  ),
                )
              }
            >
              <option value="">未綁定</option>
              {project.variables.filter((v) => types.includes(v.type)).length >
                0 && (
                <optgroup label="專案變數">
                  {project.variables
                    .filter((v) => types.includes(v.type))
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.type})
                      </option>
                    ))}
                </optgroup>
              )}
              {applicableSysVars.length > 0 && (
                <optgroup label="系統變數 ($SYS)">
                  {applicableSysVars.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} - {s.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {e.variableId &&
                !e.variableId.startsWith("$SYS.") &&
                (!variable || !types.includes(variable.type)) && (
                  <option value={e.variableId}>
                    失效／類型不符：{variable?.name ?? e.variableId}
                  </option>
                )}
            </select>
          </Field>
          <button className="text-link" onClick={addVariable}>
            <Plus size={13} />
            新增專案變數
          </button>
        </PropertySection>
      )}

      {e.kind === "datetime" && (
        <PropertySection title="時間/日期顯示格式">
          <Field label="顯示格式">
            <select
              value={e.dateTimeFormat ?? "YYYY/MM/DD HH:mm:ss"}
              onChange={(event) =>
                patch({ dateTimeFormat: event.target.value })
              }
            >
              <option value="YYYY/MM/DD HH:mm:ss">
                YYYY/MM/DD HH:mm:ss (2026/10/12 13:30:00)
              </option>
              <option value="YYYY-MM-DD HH:mm:ss">
                YYYY-MM-DD HH:mm:ss (2026-10-12 13:30:00)
              </option>
              <option value="YYYY年MM月dd日 HH時mm分ss秒">
                YYYY年MM月dd日 HH時mm分ss秒
              </option>
              <option value="HH:mm:ss">HH:mm:ss (僅時間)</option>
              <option value="YYYY/MM/DD">YYYY/MM/DD (僅日期)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 日期)</option>
            </select>
          </Field>
          <p className="appearance-hint">
            未綁定變數時自動顯示本機系統 RTC 時間；亦可綁定變數以自訂時間來源。
          </p>
        </PropertySection>
      )}

      {(e.kind === "multistate" || e.kind === "dropdown") && (
        <PropertySection
          title={e.kind === "dropdown" ? "下拉選項設定" : "多狀態設定"}
        >
          <div className="multistate-list">
            {(e.multistateItems ?? []).map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "50px 1fr 60px 24px",
                  gap: "6px",
                  alignItems: "center",
                  marginBottom: "6px",
                }}
              >
                <input
                  type="number"
                  title="比對數值"
                  value={item.value}
                  onChange={(ev) => {
                    const val = Number(ev.target.value) || 0;
                    const next = [...(e.multistateItems ?? [])];
                    next[idx] = { ...next[idx], value: val };
                    patch({ multistateItems: next });
                  }}
                />
                <input
                  type="text"
                  title="顯示標籤"
                  placeholder="標籤"
                  value={item.label}
                  onChange={(ev) => {
                    const next = [...(e.multistateItems ?? [])];
                    next[idx] = { ...next[idx], label: ev.target.value };
                    patch({ multistateItems: next });
                  }}
                />
                <input
                  type="color"
                  title="燈號顏色"
                  value={item.color}
                  onChange={(ev) => {
                    const next = [...(e.multistateItems ?? [])];
                    next[idx] = { ...next[idx], color: ev.target.value };
                    patch({ multistateItems: next });
                  }}
                />
                <button
                  type="button"
                  title="刪除狀態"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#f87171",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  onClick={() => {
                    const next = (e.multistateItems ?? []).filter(
                      (_, i) => i !== idx,
                    );
                    patch({ multistateItems: next });
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            className="text-link"
            style={{ marginTop: "6px" }}
            onClick={() => {
              const currentItems = e.multistateItems ?? [];
              const nextVal = currentItems.length;
              patch({
                multistateItems: [
                  ...currentItems,
                  {
                    value: nextVal,
                    label: `狀態 ${nextVal}`,
                    color: "#38bdf8",
                    textColor: "#ffffff",
                  },
                ],
              });
            }}
          >
            <Plus size={13} />
            新增狀態項目
          </button>
        </PropertySection>
      )}

      {e.kind === "scale" && (
        <PropertySection title="刻度設定">
          <Field label="刻度方向">
            <select
              value={e.scaleOrientation ?? "horizontal"}
              onChange={(event) =>
                patch({
                  scaleOrientation: event.target.value as
                    "horizontal" | "vertical",
                })
              }
            >
              <option value="horizontal">水平方向 (Horizontal)</option>
              <option value="vertical">垂直方向 (Vertical)</option>
            </select>
          </Field>
          <div className="property-grid">
            <Field label="主要刻度數">
              <input
                type="number"
                min={2}
                max={20}
                value={e.scaleMajorTicks ?? 5}
                onChange={(event) =>
                  patch({
                    scaleMajorTicks: Math.max(
                      2,
                      Math.min(20, Number(event.target.value) || 5),
                    ),
                  })
                }
              />
            </Field>
            <Field label="次要刻度數">
              <input
                type="number"
                min={0}
                max={10}
                value={e.scaleMinorTicks ?? 4}
                onChange={(event) =>
                  patch({
                    scaleMinorTicks: Math.max(
                      0,
                      Math.min(10, Number(event.target.value) || 0),
                    ),
                  })
                }
              />
            </Field>
          </div>
          <div className="property-grid">
            <Field label="最小值">
              <input
                type="number"
                value={e.scaleMin ?? 0}
                onChange={(event) =>
                  patch({ scaleMin: Number(event.target.value) || 0 })
                }
              />
            </Field>
            <Field label="最大值">
              <input
                type="number"
                value={e.scaleMax ?? 100}
                onChange={(event) =>
                  patch({ scaleMax: Number(event.target.value) || 100 })
                }
              />
            </Field>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={e.scaleShowAxis ?? true}
              onChange={(event) =>
                patch({ scaleShowAxis: event.target.checked })
              }
            />
            顯示主基準線
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={e.scaleShowLabels ?? true}
              onChange={(event) =>
                patch({ scaleShowLabels: event.target.checked })
              }
            />
            顯示刻度數值文字
          </label>
        </PropertySection>
      )}

      {e.kind === "table" && (
        <PropertySection title="表格框架設定">
          <div className="property-grid">
            <Field label="欄數 (Columns)">
              <input
                type="number"
                min={1}
                max={20}
                value={e.tableCols ?? 3}
                onChange={(event) =>
                  patch({
                    tableCols: Math.max(
                      1,
                      Math.min(20, Number(event.target.value) || 1),
                    ),
                  })
                }
              />
            </Field>
            <Field label="列數 (Rows)">
              <input
                type="number"
                min={1}
                max={20}
                value={e.tableRows ?? 4}
                onChange={(event) =>
                  patch({
                    tableRows: Math.max(
                      1,
                      Math.min(20, Number(event.target.value) || 1),
                    ),
                  })
                }
              />
            </Field>
          </div>
          <Field label="內部格線顏色">
            <input
              type="color"
              value={e.gridColor ?? "#334155"}
              onChange={(event) => patch({ gridColor: event.target.value })}
            />
          </Field>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={e.tableDiagonal ?? false}
              onChange={(event) =>
                patch({ tableDiagonal: event.target.checked })
              }
            />
            左上首格顯示對角分隔斜線
          </label>
        </PropertySection>
      )}

      {[
        "number",
        "gauge",
        "bar",
        "trend",
        "slider",
        "arc",
        "spinbox",
      ].includes(e.kind) && (
        <PropertySection title="數值格式">
          <Field label="顯示格式">
            <select
              value={e.numberFormat ?? "decimal"}
              onChange={(event) =>
                patch({
                  numberFormat: event.target.value as Element["numberFormat"],
                })
              }
            >
              <option value="decimal">小數</option>
              <option value="integer">整數（四捨五入）</option>
              <option value="percent">百分比（乘以 100）</option>
              <option value="scientific">科學記號</option>
            </select>
          </Field>
          <div className="property-grid">
            <Field label="小數位數">
              <input
                type="number"
                min={0}
                max={6}
                step={1}
                placeholder="自動（最多 3 位）"
                disabled={e.numberFormat === "integer"}
                value={e.decimals ?? ""}
                onChange={(event) => {
                  const raw = event.target.value;
                  if (raw === "") patch({ decimals: undefined });
                  else if (Number.isFinite(Number(raw)))
                    patch({
                      decimals: Math.max(
                        0,
                        Math.min(6, Math.round(Number(raw))),
                      ),
                    });
                }}
              />
            </Field>
            <Field label="單位">
              <input
                value={e.unit ?? ""}
                onChange={(event) =>
                  patch({ unit: event.target.value || undefined })
                }
              />
            </Field>
          </div>
          <Field label="數值前綴">
            <input
              value={e.numberPrefix ?? ""}
              onChange={(event) =>
                patch({ numberPrefix: event.target.value || undefined })
              }
            />
          </Field>
          <Field label="數字地區格式">
            <select
              value={e.numberLocale ?? "en-US"}
              onChange={(event) =>
                patch({
                  numberLocale: event.target.value as Element["numberLocale"],
                })
              }
            >
              <option value="en-US">英文（1,234.56）</option>
              <option value="zh-TW">臺灣（1,234.56）</option>
              <option value="de-DE">德文（1.234,56）</option>
            </select>
          </Field>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={e.useGrouping ?? true}
              onChange={(event) => patch({ useGrouping: event.target.checked })}
            />
            千分位分隔
          </label>
        </PropertySection>
      )}

      {["input", "spinbox", "slider", "arc"].includes(e.kind) && (
        <PropertySection title="輸入範圍">
          {["input", "spinbox"].includes(e.kind) && (
            <div className="property-grid">
              <Field label="最小值">
                <input
                  type="number"
                  step="any"
                  placeholder="不限制"
                  value={e.inputMin ?? ""}
                  onChange={(event) =>
                    optionalNumber("inputMin", event.target.value)
                  }
                />
              </Field>
              <Field label="最大值">
                <input
                  type="number"
                  step="any"
                  placeholder="不限制"
                  value={e.inputMax ?? ""}
                  onChange={(event) =>
                    optionalNumber("inputMax", event.target.value)
                  }
                />
              </Field>
            </div>
          )}
          <Field label="輸入步距">
            <input
              type="number"
              step="any"
              min={Number.MIN_VALUE}
              placeholder="任意小數"
              value={e.inputStep ?? ""}
              onChange={(event) =>
                optionalNumber("inputStep", event.target.value)
              }
            />
          </Field>
          <p className="appearance-hint">
            留白表示不限制。步距起點為最小值，未設定最小值則為 0。預覽中按 Enter
            或離開欄位確認，Esc 取消輸入。
          </p>
        </PropertySection>
      )}

      {errors.length > 0 && (
        <div className="binding-errors" role="status">
          {errors.map((message) => (
            <div key={message}>{message}</div>
          ))}
        </div>
      )}
    </>
  );
}
