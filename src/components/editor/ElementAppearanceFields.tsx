import { useEditorContext } from "../../context/EditorContext";
import type { Element } from "../../model";
import {
  ColorField,
  Field,
  NumberField,
  PropertySection,
} from "../ui/Controls";

export function ElementAppearanceFields() {
  const { current: e, patch } = useEditorContext();
  if (!e) return null;
  return (
    <>
      {e.kind === "text" && (
        <PropertySection title="文字格式">
          <Field label="字型">
            <select
              value={e.fontFamily ?? "inherit"}
              onChange={(event) => patch({ fontFamily: event.target.value })}
            >
              <option value="inherit">系統預設</option>
              <option value='"Microsoft JhengHei", sans-serif'>
                微軟正黑體
              </option>
              <option value='"Noto Sans TC", sans-serif'>Noto Sans TC</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="serif">襯線字型</option>
              <option value="monospace">等寬字型</option>
              {e.fontFamily &&
                ![
                  "inherit",
                  '"Microsoft JhengHei", sans-serif',
                  '"Noto Sans TC", sans-serif',
                  "Arial, sans-serif",
                  "serif",
                  "monospace",
                ].includes(e.fontFamily) && (
                  <option value={e.fontFamily}>{e.fontFamily}</option>
                )}
            </select>
          </Field>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={e.fontWeight === "bold"}
              onChange={(event) =>
                patch({ fontWeight: event.target.checked ? "bold" : "normal" })
              }
            />
            粗體
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={e.italic ?? false}
              onChange={(event) => patch({ italic: event.target.checked })}
            />
            斜體
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={e.underline ?? false}
              onChange={(event) => patch({ underline: event.target.checked })}
            />
            底線
          </label>
          <div className="property-grid">
            <Field label="水平對齊">
              <select
                value={e.textAlign ?? "left"}
                onChange={(event) =>
                  patch({
                    textAlign: event.target.value as Element["textAlign"],
                  })
                }
              >
                <option value="left">靠左</option>
                <option value="center">置中</option>
                <option value="right">靠右</option>
              </select>
            </Field>
            <Field label="垂直對齊">
              <select
                value={e.verticalAlign ?? "middle"}
                onChange={(event) =>
                  patch({
                    verticalAlign: event.target
                      .value as Element["verticalAlign"],
                  })
                }
              >
                <option value="top">靠上</option>
                <option value="middle">置中</option>
                <option value="bottom">靠下</option>
              </select>
            </Field>
          </div>
          <Field label="行距倍數">
            <NumberField
              value={e.lineHeight ?? 1.25}
              min={1}
              max={3}
              onChange={(value) => patch({ lineHeight: value })}
            />
          </Field>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={e.wordWrap ?? true}
              onChange={(event) => patch({ wordWrap: event.target.checked })}
            />
            自動換行
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={e.textBackground ?? false}
              onChange={(event) =>
                patch({ textBackground: event.target.checked })
              }
            />
            顯示背景色
          </label>
          <p className="appearance-hint">
            字型須由使用裝置提供；未安裝時使用替代字型。超出元件尺寸的文字會裁切。
          </p>
        </PropertySection>
      )}
      {["rectangle", "circle", "line", "button"].includes(e.kind) && (
        <PropertySection title={e.kind === "line" ? "線條設定" : "邊框設定"}>
          <div className="property-grid">
            <Field label="線寬">
              <NumberField
                value={
                  e.borderWidth ??
                  (e.kind === "rectangle"
                    ? 1
                    : e.kind === "line"
                      ? e.height
                      : 0)
                }
                min={0}
                max={20}
                suffix="px"
                onChange={(value) => patch({ borderWidth: value })}
              />
            </Field>
            <Field label="線型">
              <select
                value={e.borderStyle ?? "solid"}
                onChange={(event) =>
                  patch({
                    borderStyle: event.target.value as Element["borderStyle"],
                  })
                }
              >
                <option value="solid">實線</option>
                <option value="dashed">虛線</option>
                <option value="dotted">點線</option>
                <option value="none">無邊框</option>
              </select>
            </Field>
          </div>
          <Field label="邊框顏色">
            <ColorField
              value={
                e.borderColor ?? (e.kind === "line" ? e.background : "#94a3b8")
              }
              onChange={(value) => patch({ borderColor: value })}
            />
          </Field>
          {["rectangle", "button"].includes(e.kind) && (
            <Field label="圓角半徑">
              <NumberField
                value={e.borderRadius ?? (e.kind === "rectangle" ? 12 : 8)}
                min={0}
                max={1000}
                suffix="px"
                onChange={(value) => patch({ borderRadius: value })}
              />
            </Field>
          )}
          {["rectangle", "circle"].includes(e.kind) && (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={e.shapeFilled ?? true}
                onChange={(event) =>
                  patch({ shapeFilled: event.target.checked })
                }
              />
              填滿背景色
            </label>
          )}
        </PropertySection>
      )}
      {e.kind === "image" && (
        <PropertySection title="圖片顯示">
          <Field label="縮放模式">
            <select
              value={e.imageFit ?? "contain"}
              onChange={(event) =>
                patch({ imageFit: event.target.value as Element["imageFit"] })
              }
            >
              <option value="contain">等比例完整顯示</option>
              <option value="cover">等比例填滿（裁切）</option>
              <option value="fill">拉伸填滿</option>
              <option value="none">原始尺寸（裁切）</option>
            </select>
          </Field>
          <Field label="圖片位置">
            <select
              value={e.imagePosition ?? "center"}
              onChange={(event) =>
                patch({
                  imagePosition: event.target.value as Element["imagePosition"],
                })
              }
            >
              <option value="center">置中</option>
              <option value="top">靠上</option>
              <option value="bottom">靠下</option>
              <option value="left">靠左</option>
              <option value="right">靠右</option>
            </select>
          </Field>
          {e.image && (
            <button
              className="secondary-btn full"
              onClick={() => patch({ image: undefined })}
            >
              移除圖片
            </button>
          )}
        </PropertySection>
      )}
      {e.kind === "button" && (
        <PropertySection title="按鈕狀態外觀">
          <p className="appearance-hint">
            一般狀態使用上方文字／背景顏色；在預覽中測試滑鼠移入與按下。停用狀態由啟用條件決定。
          </p>
          {(
            [
              ["滑鼠移入", "buttonHoverBackground", "buttonHoverColor"],
              ["按下", "buttonPressedBackground", "buttonPressedColor"],
              ["停用", "buttonDisabledBackground", "buttonDisabledColor"],
            ] as const
          ).map(([label, bg, color]) => (
            <div key={bg}>
              <h4>{label}</h4>
              <div className="property-grid">
                <Field label={`${label}背景色`}>
                  <ColorField
                    value={
                      e[bg] ??
                      (bg === "buttonDisabledBackground"
                        ? "#475569"
                        : e.background)
                    }
                    onChange={(value) => patch({ [bg]: value })}
                  />
                </Field>
                <Field label={`${label}文字色`}>
                  <ColorField
                    value={
                      e[color] ??
                      (color === "buttonDisabledColor" ? "#94a3b8" : e.color)
                    }
                    onChange={(value) => patch({ [color]: value })}
                  />
                </Field>
              </div>
            </div>
          ))}
          <button
            className="text-link"
            onClick={() =>
              patch({
                buttonHoverBackground: undefined,
                buttonHoverColor: undefined,
                buttonPressedBackground: undefined,
                buttonPressedColor: undefined,
                buttonDisabledBackground: undefined,
                buttonDisabledColor: undefined,
              })
            }
          >
            重設狀態顏色
          </button>
        </PropertySection>
      )}
    </>
  );
}
