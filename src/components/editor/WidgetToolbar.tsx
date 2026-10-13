import { useState } from "react";
import { MousePointer2, HandMetal } from "lucide-react";
import { useEditorContext } from "../../context/EditorContext";
import { labels } from "../../model";
import {
  widgetCategories,
  widgetRegistry,
  type WidgetCategory,
} from "../../registry/widgetRegistry";
export function WidgetToolbar() {
  const [category, setCategory] = useState<WidgetCategory>("static");
  const { addElement, running } = useEditorContext();
  return (
    <section className="widget-toolbar" aria-label="分類元件工具列">
      <div className="palette-tabs" role="tablist" aria-label="元件分類">
        {widgetCategories.map((c, index) => (
          <button
            key={c.id}
            role="tab"
            tabIndex={category === c.id ? 0 : -1}
            aria-selected={category === c.id}
            aria-controls={"palette-" + c.id}
            id={"palette-tab-" + c.id}
            onClick={() => setCategory(c.id)}
            onKeyDown={(e) => {
              const next =
                e.key === "ArrowRight"
                  ? (index + 1) % widgetCategories.length
                  : e.key === "ArrowLeft"
                    ? (index + widgetCategories.length - 1) %
                      widgetCategories.length
                    : e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? widgetCategories.length - 1
                        : undefined;
              if (next !== undefined) {
                e.preventDefault();
                setCategory(widgetCategories[next].id);
                e.currentTarget.parentElement
                  ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                  [next]?.focus();
              }
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      {widgetCategories.map((c) => (
        <div
          key={c.id}
          className="palette-tools"
          data-category={c.id}
          role="tabpanel"
          hidden={category !== c.id}
          id={"palette-" + c.id}
          aria-labelledby={"palette-tab-" + c.id}
        >
          <span className="palette-pointer" title="從工具列或元件庫插入物件">
            <MousePointer2 size={17} />
          </span>
          {Object.entries(widgetRegistry)
            .filter(([, w]) => w.category === c.id)
            .flatMap(([kind, w]) => {
              const k = kind as keyof typeof labels,
                Icon = w.icon;
              const tools = [
                <button
                  key={kind}
                  className="palette-tool"
                  aria-label={"插入" + labels[k]}
                  title={labels[k]}
                  disabled={running}
                  draggable={!running}
                  onDragStart={(e) =>
                    e.dataTransfer.setData("viewx-kind", kind)
                  }
                  onClick={() => addElement(k)}
                >
                  <Icon size={16} />
                  <span>{labels[k]}</span>
                </button>,
              ];
              if (kind === "button") {
                tools.push(
                  <button
                    key="jog-button"
                    className="palette-tool"
                    aria-label="插入點動按鈕"
                    title="點動按鈕 (JOG - 按住 ON／放開 OFF)"
                    disabled={running}
                    onClick={() =>
                      addElement("button", undefined, undefined, {
                        name: "點動按鈕",
                        text: "JOG 點動",
                        action: "momentary",
                        actionValue: "true",
                        background: "#0284c7",
                      })
                    }
                  >
                    <HandMetal size={16} />
                    <span>點動按鈕</span>
                  </button>,
                );
              }
              return tools;
            })}
          <span className="palette-hint">
            {running ? "執行中 · 元件編輯已鎖定" : "點選插入 · 拖曳至畫布"}
          </span>
        </div>
      ))}
    </section>
  );
}
