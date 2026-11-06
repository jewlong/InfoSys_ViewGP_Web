import { GaugeWidget } from "../components/widgets/GaugeWidget";
import { BarWidget } from "../components/widgets/BarWidget";
import { TrendWidget } from "../components/widgets/TrendWidget";
import { AlarmWidget } from "../components/widgets/AlarmWidget";
import { DateTimeWidget } from "../components/widgets/DateTimeWidget";
import { MultistateWidget } from "../components/widgets/MultistateWidget";
import { ScaleWidget } from "../components/widgets/ScaleWidget";
import { TableWidget } from "../components/widgets/TableWidget";
import { SliderWidget } from "../components/widgets/SliderWidget";
import { ArcWidget } from "../components/widgets/ArcWidget";
import { SpinboxWidget } from "../components/widgets/SpinboxWidget";
import { DropdownWidget } from "../components/widgets/DropdownWidget";
import {
  Activity,
  Gauge,
  BarChart3,
  ChartLine,
  Bell,
  Circle,
  CircleDot,
  Clock,
  ChevronDown,
  Hash,
  Image,
  Layers,
  Minus,
  MousePointer2,
  Plus,
  Ruler,
  SlidersHorizontal,
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
export const widgetCategories = [
  { id: "drawing", label: "繪圖元件" },
  { id: "static", label: "靜態元件" },
  { id: "buttons", label: "按鈕元件" },
  { id: "display", label: "顯示元件" },
  { id: "editing", label: "編輯元件" },
] as const;
export type WidgetCategory = (typeof widgetCategories)[number]["id"];
export type WidgetDefinition = {
  category: WidgetCategory;
  label: string;
  icon: LucideIcon;
  component: ComponentType<WidgetProps>;
  create: (x?: number, y?: number) => Element;
};
function define(
  kind: Kind,
  icon: LucideIcon,
  component: ComponentType<WidgetProps>,
  category: WidgetCategory,
): WidgetDefinition {
  return {
    category,
    label: labels[kind],
    icon,
    component,
    create: (x, y) => makeElement(kind, x, y),
  };
}
export const widgetRegistry: Record<Kind, WidgetDefinition> = {
  text: define("text", Type, TextWidget, "static"),
  rectangle: define("rectangle", Square, RectangleWidget, "drawing"),
  circle: define("circle", Circle, CircleWidget, "drawing"),
  line: define("line", Minus, LineWidget, "drawing"),
  image: define("image", Image, ImageWidget, "static"),
  button: define("button", MousePointer2, ButtonWidget, "buttons"),
  indicator: define("indicator", Activity, IndicatorWidget, "display"),
  number: define("number", Hash, NumberWidget, "display"),
  input: define("input", TextCursorInput, NumberInputWidget, "editing"),
  switch: define("switch", ToggleLeft, SwitchWidget, "buttons"),
  gauge: define("gauge", Gauge, GaugeWidget, "display"),
  bar: define("bar", BarChart3, BarWidget, "display"),
  trend: define("trend", ChartLine, TrendWidget, "display"),
  alarm: define("alarm", Bell, AlarmWidget, "display"),
  datetime: define("datetime", Clock, DateTimeWidget, "display"),
  multistate: define("multistate", Layers, MultistateWidget, "display"),
  scale: define("scale", Ruler, ScaleWidget, "static"),
  table: define("table", TableIcon, TableWidget, "static"),
  slider: define("slider", SlidersHorizontal, SliderWidget, "editing"),
  arc: define("arc", CircleDot, ArcWidget, "editing"),
  spinbox: define("spinbox", Plus, SpinboxWidget, "editing"),
  dropdown: define("dropdown", ChevronDown, DropdownWidget, "editing"),
};

export function groupedWidgets(search = "") {
  const query = search.trim().toLocaleLowerCase();
  return widgetCategories
    .map((category) => ({
      ...category,
      kinds: (Object.keys(widgetRegistry) as Kind[]).filter(
        (kind) =>
          widgetRegistry[kind].category === category.id &&
          (`${category.label} ${widgetRegistry[kind].label} ${kind}`
            .toLocaleLowerCase()
            .includes(query) ||
            (kind === "button" &&
              ("jog 點動".includes(query) || query.includes("jog") || query.includes("點動")))),
      ),
    }))
    .filter((group) => group.kinds.length > 0);
}
