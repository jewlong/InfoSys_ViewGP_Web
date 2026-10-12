import type { WidgetProps } from "./types";
import { borderStyle } from "./types";

export function MultistateWidget({ element, values }: WidgetProps) {
  const raw = element.variableId ? values[element.variableId] : undefined;
  const numericVal =
    typeof raw === "number"
      ? Math.round(raw)
      : typeof raw === "boolean"
        ? (raw ? 1 : 0)
        : 0;

  const items = element.multistateItems ?? [
    { value: 0, label: "停止", color: "#64748b", textColor: "#ffffff" },
    { value: 1, label: "運轉", color: "#22c55e", textColor: "#ffffff" },
    { value: 2, label: "異常", color: "#ef4444", textColor: "#ffffff" },
  ];

  const matched =
    items.find((item) => item.value === numericVal) ??
    items[0] ?? { value: 0, label: element.text || "狀態", color: element.background, textColor: element.color };

  const bg = matched.color || element.background;
  const textColor = matched.textColor || element.color || "#ffffff";
  const label = matched.label || element.text;

  const radius = element.borderRadius ?? 22;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        backgroundColor: bg,
        color: textColor,
        fontSize: element.fontSize,
        fontWeight: element.fontWeight || "bold",
        fontFamily: element.fontFamily || "inherit",
        boxShadow: `inset 0 2px 4px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.35), 0 2px 5px rgba(0,0,0,0.4)`,
        transition: "background-color 0.2s ease, transform 0.1s ease",
        padding: "4px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        ...borderStyle(element, 2, radius),
      }}
    >
      <span style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{label}</span>
    </div>
  );
}
