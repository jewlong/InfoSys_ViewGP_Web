import type { CSSProperties } from "react";
import type { Element } from "../../model";
export type WidgetProps = {
  element: Element;
  values: Record<string, unknown>;
  running: boolean;
  onAction: () => void;
  onInput: (value: string) => void;
};
export const widgetStyle = (element: Element): CSSProperties => ({
  width: "100%",
  height: "100%",
  fontSize: element.fontSize,
  color: element.color,
});
