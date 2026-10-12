import { Plus, Trash2 } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { uid, type AlarmRule, type Element } from "../../model";
import { advancedProblems } from "../../services/advancedRules";
import {
  ColorField,
  Field,
  NumberField,
  PropertySection,
} from "../ui/Controls";
export function ElementAdvancedFields() {
  const { current: e, project, patch } = useEditorContext();
  if (!e || !["gauge", "bar", "trend", "alarm"].includes(e.kind)) return null;
  const problems = advancedProblems(e, project);
  function numeric(
    key: "scaleMin" | "scaleMax" | "warningThreshold" | "criticalThreshold",
    raw: string,
  ) {
    if (!raw) patch({ [key]: undefined });
    else if (Number.isFinite(Number(raw))) patch({ [key]: Number(raw) });
  }
  function updateRule(id: string, props: Partial<AlarmRule>) {
    patch({
      alarmRules: (e!.alarmRules ?? []).map((rule) =>
        rule.id === id ? { ...rule, ...props } : rule,
      ),
    });
  }
  function addRule() {
    const variable =
      project.variables.find((v) => v.type === "boolean") ??
      project.variables.find((v) => v.type === "number");
    const rule: AlarmRule = {
      id: uid(),
      message: `警報 ${(e!.alarmRules?.length ?? 0) + 1}`,
      variableId: variable?.id ?? "",
      operator: variable?.type === "boolean" ? "true" : "gte",
      ...(variable?.type === "boolean" ? {} : { threshold: 100 }),
      severity: "warning",
      enabled: true,
    };
    patch({ alarmRules: [...(e!.alarmRules ?? []), rule] });
  }
  return (
    <>
      {e.kind !== "alarm" && (
        <PropertySection title="量程與顯示">
          <div className="property-grid">
            <Field label="量程最小值">
              <input
                type="number"
                step="any"
                value={e.scaleMin ?? 0}
                onChange={(event) => numeric("scaleMin", event.target.value)}
              />
            </Field>
            <Field label="量程最大值">
              <input
                type="number"
                step="any"
                value={e.scaleMax ?? 100}
                onChange={(event) => numeric("scaleMax", event.target.value)}
              />
            </Field>
            <Field label="資料顏色">
              <ColorField
                value={e.fillColor ?? "#38bdf8"}
                onChange={(value) => patch({ fillColor: value })}
              />
            </Field>
            <Field label="軌道／格線色">
              <ColorField
                value={e.trackColor ?? "#334155"}
                onChange={(value) => patch({ trackColor: value })}
              />
            </Field>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={e.showValue ?? true}
              onChange={(event) => patch({ showValue: event.target.checked })}
            />
            顯示數值
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={e.showScale ?? true}
              onChange={(event) => patch({ showScale: event.target.checked })}
            />
            顯示量程
          </label>
          {e.kind !== "trend" && (
            <>
              <div className="property-grid">
                <Field label="警戒門檻">
                  <input
                    type="number"
                    step="any"
                    placeholder="不設定"
                    value={e.warningThreshold ?? ""}
                    onChange={(event) =>
                      numeric("warningThreshold", event.target.value)
                    }
                  />
                </Field>
                <Field label="危險門檻">
                  <input
                    type="number"
                    step="any"
                    placeholder="不設定"
                    value={e.criticalThreshold ?? ""}
                    onChange={(event) =>
                      numeric("criticalThreshold", event.target.value)
                    }
                  />
                </Field>
              </div>
              <p className="appearance-hint">
                達警戒門檻顯示橙色，達危險門檻顯示紅色。超出量程時指針／長條停在端點，數值仍顯示原值。
              </p>
            </>
          )}
          {e.kind === "bar" && (
            <Field label="長條方向">
              <select
                value={e.orientation ?? "horizontal"}
                onChange={(event) =>
                  patch({
                    orientation: event.target.value as Element["orientation"],
                  })
                }
              >
                <option value="horizontal">水平</option>
                <option value="vertical">垂直（由下往上）</option>
              </select>
            </Field>
          )}
        </PropertySection>
      )}
      {e.kind === "trend" && (
        <PropertySection title="趨勢取樣">
          <Field label="取樣間隔">
            <NumberField
              value={e.sampleInterval ?? 1000}
              min={100}
              max={60000}
              suffix="ms"
              onChange={(value) => patch({ sampleInterval: Math.round(value) })}
            />
          </Field>
          <Field label="保留點數">
            <NumberField
              value={e.historyPoints ?? 120}
              min={10}
              max={600}
              onChange={(value) => patch({ historyPoints: Math.round(value) })}
            />
          </Field>
          <p className="appearance-hint">
            預覽／執行時記錄綁定的模擬數值，切換畫面仍持續取樣。重新開始或重設模擬會清除紀錄。
          </p>
        </PropertySection>
      )}
      {e.kind === "alarm" && (
        <PropertySection title="警報規則">
          <Field label="警報資料來源">
            <select
              value={e.alarmSource ?? "local"}
              onChange={(event) =>
                patch({
                  alarmSource: event.target.value as "local" | "global" | "all",
                })
              }
            >
              <option value="local">此元件規則</option>
              <option value="global">全域警報</option>
              <option value="all">全部警報</option>
            </select>
          </Field>
          <Field label="警報群組篩選">
            <input
              maxLength={200}
              value={e.alarmGroup ?? ""}
              placeholder="留白顯示所有群組"
              onChange={(event) =>
                patch({ alarmGroup: event.target.value || undefined })
              }
            />
          </Field>
          <Field label="顯示筆數">
            <NumberField
              value={e.alarmMaxRows ?? 20}
              min={1}
              max={100}
              onChange={(value) => patch({ alarmMaxRows: Math.round(value) })}
            />
          </Field>
          {(e.alarmRules ?? []).map((rule, index) => {
            const variable = project.variables.find(
              (v) => v.id === rule.variableId,
            );
            const operators =
              variable?.type === "boolean"
                ? [
                    ["true", "TRUE"],
                    ["false", "FALSE"],
                  ]
                : [
                    ["gte", "≥ 大於或等於"],
                    ["gt", "> 大於"],
                    ["lte", "≤ 小於或等於"],
                    ["lt", "< 小於"],
                    ["eq", "= 等於"],
                    ["ne", "≠ 不等於"],
                  ];
            return (
              <fieldset className="alarm-rule-fields" key={rule.id}>
                <legend>規則 {index + 1}</legend>
                <Field label="警報訊息">
                  <input
                    value={rule.message}
                    onChange={(event) =>
                      updateRule(rule.id, { message: event.target.value })
                    }
                  />
                </Field>
                <Field label="警報變數">
                  <select
                    value={rule.variableId}
                    onChange={(event) => {
                      const v = project.variables.find(
                        (item) => item.id === event.target.value,
                      );
                      updateRule(rule.id, {
                        variableId: event.target.value,
                        operator: v?.type === "boolean" ? "true" : "gte",
                        threshold:
                          v?.type === "boolean"
                            ? undefined
                            : (rule.threshold ?? 100),
                      });
                    }}
                  >
                    <option value="">未綁定</option>
                    {project.variables
                      .filter((v) => v.type !== "string")
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.type})
                        </option>
                      ))}
                    {rule.variableId &&
                      (!variable || variable.type === "string") && (
                        <option value={rule.variableId}>
                          失效／類型不符的綁定
                        </option>
                      )}
                  </select>
                </Field>
                <Field label="觸發條件">
                  <select
                    value={rule.operator}
                    onChange={(event) =>
                      updateRule(rule.id, {
                        operator: event.target.value as AlarmRule["operator"],
                      })
                    }
                  >
                    {operators.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                    {!operators.some(([value]) => value === rule.operator) && (
                      <option value={rule.operator}>條件類型不符</option>
                    )}
                  </select>
                </Field>
                {!["true", "false"].includes(rule.operator) && (
                  <Field label="警報門檻">
                    <input
                      type="number"
                      step="any"
                      value={rule.threshold ?? ""}
                      onChange={(event) =>
                        updateRule(rule.id, {
                          threshold:
                            event.target.value === ""
                              ? undefined
                              : Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                )}
                <Field label="警報等級">
                  <select
                    value={rule.severity}
                    onChange={(event) =>
                      updateRule(rule.id, {
                        severity: event.target.value as AlarmRule["severity"],
                      })
                    }
                  >
                    <option value="info">資訊</option>
                    <option value="warning">警告</option>
                    <option value="critical">嚴重</option>
                  </select>
                </Field>
                <div className="alarm-rule-actions">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={rule.enabled ?? true}
                      onChange={(event) =>
                        updateRule(rule.id, { enabled: event.target.checked })
                      }
                    />
                    啟用規則
                  </label>
                  <button
                    aria-label={`刪除警報規則 ${index + 1}`}
                    onClick={() =>
                      patch({
                        alarmRules: e.alarmRules!.filter(
                          (item) => item.id !== rule.id,
                        ),
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </fieldset>
            );
          })}
          <button
            className="secondary-btn full"
            disabled={(e.alarmRules?.length ?? 0) >= 20}
            onClick={addRule}
          >
            <Plus size={14} />
            新增警報規則
          </button>
          <p className="appearance-hint">
            最多 20
            項元件規則。確認不會解除警報；條件恢復時自動解除。已儲存專案的警報會寫入歷史。
          </p>
        </PropertySection>
      )}
      {problems.length > 0 && (
        <div className="binding-errors" role="status">
          {problems.map((problem) => (
            <div key={problem}>{problem}</div>
          ))}
        </div>
      )}
    </>
  );
}
