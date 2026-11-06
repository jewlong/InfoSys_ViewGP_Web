import { formatNumber } from "../../services/numberFormat";
import { LvglSurface } from "./LvglCanvas";
import { widgetStyle, type WidgetProps } from "./types";

export function NumberWidget({ element, values }: WidgetProps) {
  const formatted = formatNumber(values[element.variableId ?? ""], element);
  return (
    <div
      className="visual-text"
      data-lvgl-class="lv_label"
      style={{ ...widgetStyle(element), position: "relative" }}
    >
      <LvglSurface
        element={element}
        lvglClass="lv_label"
        deps={[formatted]}
        draw={() => {}}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{formatted}</span>
    </div>
  );
}
