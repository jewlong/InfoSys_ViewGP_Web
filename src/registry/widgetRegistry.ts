import { GaugeWidget } from "../components/widgets/GaugeWidget";
import { BarWidget } from "../components/widgets/BarWidget";
import { TrendWidget } from "../components/widgets/TrendWidget";
import { AlarmWidget } from "../components/widgets/AlarmWidget";
import { DateTimeWidget } from "../components/widgets/DateTimeWidget";
import { MultistateWidget } from "../components/widgets/MultistateWidget";
import { ScaleWidget } from "../components/widgets/ScaleWidget";
import { TableWidget } from "../components/widgets/TableWidget";
import {
  Activity,
  Gauge,
  BarChart3,
  ChartLine,
  Bell,
  Circle,
  Clock,
  Hash,
  Image,
  Layers,
  Minus,
  MousePointer2,
  Ruler,
  Square,
  Table as TableIcon,
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
  gauge: define("gauge", Gauge, GaugeWidget),
  bar: define("bar", BarChart3, BarWidget),
  trend: define("trend", ChartLine, TrendWidget),
  alarm: define("alarm", Bell, AlarmWidget),
  datetime: define("datetime", Clock, DateTimeWidget),
  multistate: define("multistate", Layers, MultistateWidget),
  scale: define("scale", Ruler, ScaleWidget),
  table: define("table", TableIcon, TableWidget),
};

