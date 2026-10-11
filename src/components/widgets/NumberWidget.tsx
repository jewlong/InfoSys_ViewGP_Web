import { formatNumber } from "../../services/numberFormat";
import { widgetStyle, type WidgetProps } from "./types";
export function NumberWidget({ element, values }: WidgetProps) {
  return (
    <div className="visual-text" style={widgetStyle(element)}>
      {formatNumber(values[element.variableId ?? ""], element)}
    </div>
  );
}
