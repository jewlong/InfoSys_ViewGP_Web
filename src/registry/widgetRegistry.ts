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
  keywords?: readonly string[];
};
function define(
  kind: Kind,
  icon: LucideIcon,
  component: ComponentType<WidgetProps>,
  category: WidgetCategory,
  keywords?: readonly string[],
): WidgetDefinition {
  return {
    category,
    label: labels[kind],
    icon,
    component,
    create: (x, y) => makeElement(kind, x, y),
    keywords,
  };
}
export const widgetRegistry: Record<Kind, WidgetDefinition> = {
  text: define("text", Type, TextWidget, "static", ["標籤", "文字", "label", "text"]),
  rectangle: define("rectangle", Square, RectangleWidget, "drawing", ["矩形", "方塊", "rectangle", "drawing"]),
  circle: define("circle", Circle, CircleWidget, "drawing", ["圓形", "圓", "circle", "drawing"]),
  line: define("line", Minus, LineWidget, "drawing", ["線條", "直線", "line", "drawing"]),
  image: define("image", Image, ImageWidget, "static", ["圖片", "影像", "image", "static"]),
  button: define("button", MousePointer2, ButtonWidget, "buttons", ["按鈕", "button", "buttons", "jog", "點動"]),
  indicator: define("indicator", Activity, IndicatorWidget, "display", ["指示燈", "燈號", "indicator", "led", "lamp", "display"]),
  number: define("number", Hash, NumberWidget, "display", ["數值", "數字", "number", "顯示", "display"]),
  input: define("input", TextCursorInput, NumberInputWidget, "editing", ["輸入框", "輸入", "input", "數值輸入", "editing"]),
  switch: define("switch", ToggleLeft, SwitchWidget, "buttons", ["開關", "切換", "switch", "buttons"]),
  gauge: define("gauge", Gauge, GaugeWidget, "display", ["錶頭", "壓力錶", "轉速錶", "儀表", "gauge", "dial", "meter", "display"]),
  bar: define("bar", BarChart3, BarWidget, "display", ["長條圖", "bar", "bar chart", "顯示", "display"]),
  trend: define("trend", ChartLine, TrendWidget, "display", ["趨勢圖", "趨勢", "trend", "chart", "line", "display"]),
  alarm: define("alarm", Bell, AlarmWidget, "display", ["警報", "警報清單", "alarm", "bell", "display"]),
  datetime: define("datetime", Clock, DateTimeWidget, "display", ["日期時間", "時鐘", "datetime", "clock", "display"]),
  multistate: define("multistate", Layers, MultistateWidget, "display", ["多狀態", "multistate", "layers", "display"]),
  scale: define("scale", Ruler, ScaleWidget, "static", ["刻度尺", "尺", "scale", "ruler", "static"]),
  table: define("table", TableIcon, TableWidget, "static", ["表格", "table", "static"]),
  slider: define("slider", SlidersHorizontal, SliderWidget, "editing", ["滑塊", "slider", "微調", "editing"]),
  arc: define("arc", CircleDot, ArcWidget, "editing", ["弧形", "arc", "圓弧", "editing"]),
  spinbox: define("spinbox", Plus, SpinboxWidget, "editing", ["步進", "微調", "spinbox", "數位加減", "editing"]),
  dropdown: define("dropdown", ChevronDown, DropdownWidget, "editing", ["下拉選單", "dropdown", "選單", "editing"]),
};

export function groupedWidgets(search = "") {
  const query = search.trim().toLocaleLowerCase();
  return widgetCategories
    .map((category) => ({
      ...category,
      kinds: (Object.keys(widgetRegistry) as Kind[]).filter(
        (kind) => {
          const def = widgetRegistry[kind];
          const keywordsText = (def.keywords ?? []).join(" ");
          return (
            `${category.label} ${def.label} ${kind} ${keywordsText}`
              .toLocaleLowerCase()
              .includes(query) ||
            (kind === "button" &&
              ("jog 點動".includes(query) ||
                query.includes("jog") ||
                query.includes("點動")))
          );
        },
      ),
    }))
    .filter((group) => group.kinds.length > 0);
}
