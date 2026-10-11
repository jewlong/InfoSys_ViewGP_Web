import type { AlarmEvent, TrendPoint } from "../../types/runtime";
import type { CSSProperties } from "react";
import type { Element } from "../../model";
export type WidgetProps = {
  element: Element;
  values: Record<string, unknown>;
  running: boolean;
  disabled?: boolean;
  samples?: TrendPoint[];
  alarmEvents?: AlarmEvent[];
  onAcknowledge?: (id: string) => void;
  onAction: () => void;
  onInput: (value: string) => string | undefined;
};
export const widgetStyle = (element: Element): CSSProperties => ({
  width: "100%",
  height: "100%",
  fontSize: element.fontSize,
  color: element.color,
});

export const borderStyle = (
  element: Element,
  width = 0,
  radius: number | string = 0,
): CSSProperties => ({
  borderWidth: element.borderWidth ?? width,
  borderStyle: element.borderStyle ?? "solid",
  borderColor: element.borderColor ?? "#ffffff09",
  borderRadius:
    element.kind === "circle" ? "50%" : (element.borderRadius ?? radius),
  boxSizing: "border-box",
});
