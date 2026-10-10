import { widgetRegistry } from "../../registry/widgetRegistry";
import type { WidgetProps } from "./types";
export function WidgetRenderer(props: WidgetProps) {
  const Component = widgetRegistry[props.element.kind].component;
  return <Component {...props} />;
}
