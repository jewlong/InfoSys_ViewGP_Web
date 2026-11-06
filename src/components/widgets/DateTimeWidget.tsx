import { useEffect, useState } from "react";
import { LvglSurface, drawLvglRoundedPart } from "./LvglCanvas";
import type { WidgetProps } from "./types";
import { borderStyle } from "./types";

function formatDateTime(date: Date, pattern?: string): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  const MM = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  const fmt = pattern || "YYYY/MM/DD HH:mm:ss";

  if (fmt.includes("年") || fmt.includes("月") || fmt.includes("日")) {
    return `${yyyy}年${MM}月${dd}日 ${HH}時${mm}分${ss}秒`;
  }
  if (fmt === "HH:mm:ss") return `${HH}:${mm}:${ss}`;
  if (fmt === "YYYY-MM-DD") return `${yyyy}-${MM}-${dd}`;
  if (fmt === "YYYY/MM/DD") return `${yyyy}/${MM}/${dd}`;
  if (fmt === "YYYY-MM-DD HH:mm:ss")
    return `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;
  return `${yyyy}/${MM}/${dd} ${HH}:${mm}:${ss}`;
}

export function DateTimeWidget({ element, values, running }: WidgetProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setCurrentDate(new Date());
    }, 500);
    return () => window.clearInterval(timer);
  }, [running]);

  let textToDisplay: string;
  if (element.variableId && values[element.variableId] !== undefined) {
    const rawVal = values[element.variableId];
    if (typeof rawVal === "string") {
      textToDisplay = rawVal;
    } else if (typeof rawVal === "number") {
      textToDisplay = formatDateTime(
        new Date(rawVal),
        element.dateTimeFormat,
      );
    } else {
      textToDisplay = String(rawVal);
    }
  } else {
    textToDisplay = formatDateTime(currentDate, element.dateTimeFormat);
  }

  const align = element.textAlign ?? "center";
  const vertical = element.verticalAlign ?? "middle";

  return (
    <div
      data-lvgl-class="lv_label"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        alignItems:
          vertical === "top"
            ? "flex-start"
            : vertical === "bottom"
              ? "flex-end"
              : "center",
        justifyContent:
          align === "left"
            ? "flex-start"
            : align === "right"
              ? "flex-end"
              : "center",
        padding: "4px 8px",
        boxSizing: "border-box",
        backgroundColor: element.background,
        color: element.color,
        fontSize: element.fontSize,
        fontFamily: element.fontFamily || "monospace",
        fontWeight: element.fontWeight || "bold",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        ...borderStyle(element, 1, element.borderRadius ?? 4),
      }}
    >
      <LvglSurface
        element={element}
        lvglClass="lv_label"
        deps={[textToDisplay]}
        draw={(ctx, w, h) => {
          drawLvglRoundedPart(
            ctx,
            0,
            0,
            w,
            h,
            element.borderRadius ?? 4,
            element.background,
          );
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{textToDisplay}</span>
    </div>
  );
}
