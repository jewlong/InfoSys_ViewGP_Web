import { ElementAppearanceFields } from "./ElementAppearanceFields";
import { Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { labels, type Element } from "../../model";
import { widgetRegistry } from "../../registry/widgetRegistry";
import {
  ColorField,
  Field,
  NumberField,
  PropertySection,
} from "../ui/Controls";
export function ElementProperties() {
  const { project, selected, current, imageRef, patch, remove, addVariable } =
    useEditorContext();
  if (!current) return null;
  return (
    <div className="properties">
      <div className="selected-object">
        <div>
          {(() => {
            const Icon = widgetRegistry[current.kind].icon;
            return <Icon size={18} />;
          })()}
        </div>
        <span>
          {current.name}
          <small>
            {selected.length > 1
              ? `已選取 ${selected.length} 個元件`
              : `${labels[current.kind]}元件`}
          </small>
        </span>
        <button aria-label="刪除選取元件" onClick={remove}>
          <Trash2 size={15} />
        </button>
      </div>
      <PropertySection title="基本設定">
        <Field label="名稱">
          <input
            value={current.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
        </Field>
        <div className="property-grid">
          {(["x", "y", "width", "height"] as const).map((key, i) => (
            <Field label={["X 座標", "Y 座標", "寬度", "高度"][i]} key={key}>
              <NumberField
                value={current[key]}
                min={key === "width" || key === "height" ? 1 : 0}
                onChange={(v) => patch({ [key]: v })}
                suffix="px"
              />
            </Field>
          ))}
        </div>
      </PropertySection>
      <PropertySection title="外觀">
        <Field label="文字 / 標籤">
          {current.kind === "text" ? (
            <textarea
              rows={3}
              value={current.text}
              onChange={(e) => patch({ text: e.target.value })}
            />
          ) : (
            <input
              value={current.text}
              onChange={(e) => patch({ text: e.target.value })}
            />
          )}
        </Field>
        <div className="property-grid">
          <Field label="文字顏色">
            <ColorField
              value={current.color}
              onChange={(v) => patch({ color: v })}
            />
          </Field>
          <Field label="背景顏色">
            <ColorField
              value={current.background}
              onChange={(v) => patch({ background: v })}
            />
          </Field>
        </div>
        <Field label="字型大小">
          <NumberField
            value={current.fontSize}
            min={8}
            onChange={(v) => patch({ fontSize: v })}
            suffix="px"
          />
        </Field>
        {current.kind === "image" && (
          <button
            className="secondary-btn full"
            onClick={() => imageRef.current?.click()}
          >
            <ImageIcon size={14} />
            選擇圖片
          </button>
        )}
      </PropertySection>
      <ElementAppearanceFields />
      <PropertySection title="資料綁定">
        <Field label="綁定變數">
          <select
            value={current.variableId ?? ""}
            onChange={(e) => patch({ variableId: e.target.value || undefined })}
          >
            <option value="">未綁定</option>
            {project.variables.map((v) => (
              <option value={v.id} key={v.id}>
                {v.name} ({v.type})
              </option>
            ))}
          </select>
        </Field>
        {current.kind === "number" && (
          <div className="property-grid">
            <Field label="小數位數">
              <NumberField
                value={current.decimals ?? 0}
                min={0}
                max={6}
                onChange={(v) => patch({ decimals: Math.round(v) })}
              />
            </Field>
            <Field label="單位">
              <input
                value={current.unit ?? ""}
                onChange={(e) => patch({ unit: e.target.value })}
              />
            </Field>
          </div>
        )}
        <button className="text-link" onClick={addVariable}>
          <Plus size={13} />
          新增專案變數
        </button>
      </PropertySection>
      {(current.kind === "button" || current.kind === "switch") && (
        <PropertySection title="互動動作">
          <Field label="動作">
            <select
              value={current.kind === "switch" ? "toggle" : current.action}
              disabled={current.kind === "switch"}
              onChange={(e) =>
                patch({ action: e.target.value as Element["action"] })
              }
            >
              <option value="toggle">切換開關</option>
              <option value="set">設定值</option>
              <option value="increment">加減數值</option>
              <option value="screen">切換畫面</option>
            </select>
          </Field>
          {current.action === "screen" && current.kind === "button" ? (
            <Field label="目標畫面">
              <select
                value={current.targetScreenId ?? ""}
                onChange={(e) => patch({ targetScreenId: e.target.value })}
              >
                <option value="">請選擇</option>
                {project.screens.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            current.action !== "toggle" && (
              <Field
                label={current.action === "increment" ? "增減量" : "設定值"}
              >
                <input
                  value={current.actionValue}
                  onChange={(e) => patch({ actionValue: e.target.value })}
                />
              </Field>
            )
          )}
        </PropertySection>
      )}
      <PropertySection title="狀態與條件">
        <Field label="顯示條件（布林）">
          <select
            value={current.conditionId ?? ""}
            onChange={(e) =>
              patch({ conditionId: e.target.value || undefined })
            }
          >
            <option value="">永遠顯示</option>
            {project.variables
              .filter((v) => v.type === "boolean")
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="啟用條件（布林）">
          <select
            value={current.enabledId ?? ""}
            onChange={(e) => patch({ enabledId: e.target.value || undefined })}
          >
            <option value="">永遠啟用</option>
            {project.variables
              .filter((v) => v.type === "boolean")
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
          </select>
        </Field>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={current.locked}
            onChange={(e) => patch({ locked: e.target.checked })}
          />
          鎖定元件
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={current.visible}
            onChange={(e) => patch({ visible: e.target.checked })}
          />
          顯示元件
        </label>
      </PropertySection>
    </div>
  );
}
