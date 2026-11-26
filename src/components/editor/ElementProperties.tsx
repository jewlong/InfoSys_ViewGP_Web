import { ElementAdvancedFields } from "./ElementAdvancedFields";
import { ElementDataFields } from "./ElementDataFields";
import { ElementAppearanceFields } from "./ElementAppearanceFields";
import { Image as ImageIcon, Trash2 } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { labels, type Element, type Project } from "../../model";
import { widgetRegistry } from "../../registry/widgetRegistry";
import {
  ColorField,
  Field,
  NumberField,
  PropertySection,
} from "../ui/Controls";

export type ElementPropertiesProps = {
  /** 編輯對象；省略時使用編輯器目前選取元件（即時套用模式） */
  element?: Element;
  project?: Project;
  /** 屬性變更回饋；省略時直接寫入編輯器專案（即時套用模式） */
  onPatch?: (props: Partial<Element>) => void;
  /** 刪除回饋；省略時使用編輯器 remove（即時套用模式） */
  onRemove?: () => void;
  imageRef?: React.RefObject<HTMLInputElement | null>;
  selectedCount?: number;
};

export function ElementProperties({
  element: elementProp,
  project: projectProp,
  onPatch: onPatchProp,
  onRemove: onRemoveProp,
  imageRef: imageRefProp,
  selectedCount: selectedCountProp,
}: ElementPropertiesProps) {
  const {
    project: ctxProject,
    selected: ctxSelected,
    current: ctxCurrent,
    imageRef: ctxImageRef,
    patch: ctxPatch,
    remove: ctxRemove,
    setDialog: ctxSetDialog,
  } = useEditorContext();
  const el = elementProp ?? ctxCurrent;
  const project = projectProp ?? ctxProject;
  const onPatch = onPatchProp ?? ctxPatch;
  const onRemove = onRemoveProp ?? ctxRemove;
  const imageRef = imageRefProp ?? ctxImageRef;
  const selectedCount = selectedCountProp ?? ctxSelected.length;
  const setDialog = ctxSetDialog;
  if (!el) return null;
  return (
    <div className="properties">
      <div className="selected-object">
        <div>
          {(() => {
            const Icon = widgetRegistry[el.kind].icon;
            return <Icon size={18} />;
          })()}
        </div>
        <span>
          {el.name}
          <small>
            {selectedCount > 1
              ? `已選取 ${selectedCount} 個元件`
              : `${labels[el.kind]}元件`}
          </small>
        </span>
        <button aria-label="刪除選取元件" onClick={onRemove}>
          <Trash2 size={15} />
        </button>
      </div>
      <div data-inspector-group="general">
        <PropertySection title="基本設定">
          <Field label="名稱">
            <input
              value={el.name}
              onChange={(e) => onPatch({ name: e.target.value })}
            />
          </Field>
          <div className="property-grid">
            {(["x", "y", "width", "height"] as const).map((key, i) => (
              <Field label={["X 座標", "Y 座標", "寬度", "高度"][i]} key={key}>
                <NumberField
                  value={el[key]}
                  min={key === "width" || key === "height" ? 1 : 0}
                  onChange={(v) => onPatch({ [key]: v })}
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
            {el.kind === "text" ? (
              <textarea
                rows={3}
                value={el.text}
                onChange={(e) => onPatch({ text: e.target.value })}
              />
            ) : (
              <input
                value={el.text}
                onChange={(e) => onPatch({ text: e.target.value })}
              />
            )}
          </Field>
          <div className="property-grid">
            <Field label="文字顏色">
              <ColorField
                value={el.color}
                onChange={(v) => onPatch({ color: v })}
              />
            </Field>
            <Field label="背景顏色">
              <ColorField
                value={el.background}
                onChange={(v) => onPatch({ background: v })}
              />
            </Field>
          </div>
          <Field label="字型大小">
            <NumberField
              value={el.fontSize}
              min={8}
              onChange={(v) => onPatch({ fontSize: v })}
              suffix="px"
            />
          </Field>
          {el.kind === "image" && (
            <button
              className="secondary-btn full"
              onClick={() => setDialog("assets")}
            >
              從圖片資源庫選取
            </button>
          )}
          {el.kind === "image" && (
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
              value={el.conditionId ?? ""}
              onChange={(e) =>
                onPatch({ conditionId: e.target.value || undefined })
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
              value={el.enabledId ?? ""}
              onChange={(e) =>
                onPatch({ enabledId: e.target.value || undefined })
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
              checked={el.locked}
              onChange={(e) => onPatch({ locked: e.target.checked })}
            />
            鎖定元件
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={el.visible}
              onChange={(e) => onPatch({ visible: e.target.checked })}
            />
            顯示元件
          </label>
        </PropertySection>
      </div>
    </div>
  );
}
