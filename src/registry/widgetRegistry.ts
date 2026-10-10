import {
  Activity,
  Circle,
  Hash,
  Image,
  Minus,
  MousePointer2,
  Square,
  TextCursorInput,
  ToggleLeft,
  Type,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { ButtonWidget } from "../components/widgets/ButtonWidget";
import { CircleWidget } from "../components/widgets/CircleWidget";
import { ImageWidget } from "../components/widgets/ImageWidget";
import { IndicatorWidget } from "../components/widgets/IndicatorWidget";
import { LineWidget } from "../components/widgets/LineWidget";
import { NumberInputWidget } from "../components/widgets/NumberInputWidget";
import { NumberWidget } from "../components/widgets/NumberWidget";
import { RectangleWidget } from "../components/widgets/RectangleWidget";
import { SwitchWidget } from "../components/widgets/SwitchWidget";
import { TextWidget } from "../components/widgets/TextWidget";
import type { WidgetProps } from "../components/widgets/types";
import { labels, makeElement, type Element, type Kind } from "../model";
export type WidgetDefinition = {
  label: string;
  icon: LucideIcon;
  component: ComponentType<WidgetProps>;
  create: (x?: number, y?: number) => Element;
};
function define(
  kind: Kind,
  icon: LucideIcon,
  component: ComponentType<WidgetProps>,
): WidgetDefinition {
  return {
    label: labels[kind],
    icon,
    component,
    create: (x, y) => makeElement(kind, x, y),
  };
}
export const widgetRegistry: Record<Kind, WidgetDefinition> = {
  text: define("text", Type, TextWidget),
  rectangle: define("rectangle", Square, RectangleWidget),
  circle: define("circle", Circle, CircleWidget),
  line: define("line", Minus, LineWidget),
  image: define("image", Image, ImageWidget),
  button: define("button", MousePointer2, ButtonWidget),
  indicator: define("indicator", Activity, IndicatorWidget),
  number: define("number", Hash, NumberWidget),
  input: define("input", TextCursorInput, NumberInputWidget),
  switch: define("switch", ToggleLeft, SwitchWidget),
};
