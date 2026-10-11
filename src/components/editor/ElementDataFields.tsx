import { Plus } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import type { Element } from "../../model";
import {
  actionPatch,
  bindingPatch,
  bindingProblems,
  bindingTypes,
} from "../../services/dataRules";
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
              <option value="toggle">切換開關</option>
              <option value="set">設定值</option>
              <option value="increment">加減數值</option>
              <option value="reset">重設為初始值</option>
              <option value="screen">切換畫面</option>
            </select>
          </Field>
          {e.kind === "button" && e.action === "screen" && (
            <Field label="目標畫面">
              <select
                value={e.targetScreenId ?? ""}
                onChange={(event) =>
                  patch({ targetScreenId: event.target.value || undefined })
                }
              >
                <option value="">請選擇</option>
                {project.screens.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
                {e.targetScreenId &&
                  !project.screens.some((s) => s.id === e.targetScreenId) && (
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
              {project.variables
                .filter((v) => types.includes(v.type))
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.type})
                  </option>
                ))}
              {e.variableId &&
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
      {["number", "gauge", "bar", "trend"].includes(e.kind) && (
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
      {e.kind === "input" && (
        <PropertySection title="輸入範圍">
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
