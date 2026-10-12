import { ElementAdvancedFields } from "./ElementAdvancedFields";
import { ElementDataFields } from "./ElementDataFields";
import { ElementAppearanceFields } from "./ElementAppearanceFields";
import { Image as ImageIcon, Trash2 } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { labels } from "../../model";
import { widgetRegistry } from "../../registry/widgetRegistry";
import {
  ColorField,
  Field,
  NumberField,
  PropertySection,
} from "../ui/Controls";
export function ElementProperties() {
  const { project, selected, current, imageRef, patch, remove, setDialog } =
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
      <div data-inspector-group="general">
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
      </div>
      <div data-inspector-group="appearance">
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
              onClick={() => setDialog("assets")}
            >
              從圖片資源庫選取
            </button>
          )}
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
      </div>
      <div data-inspector-group="data">
        <ElementDataFields />
      </div>
      <div data-inspector-group="advanced">
        <ElementAdvancedFields />
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
              onChange={(e) =>
                patch({ enabledId: e.target.value || undefined })
              }
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
    </div>
  );
}
