import { LvglCanvas, drawLvglRoundedPart } from "./LvglCanvas";
import { widgetStyle, type WidgetProps } from "./types";

const defaultDropdownItems = [
  { value: 0, label: "自動模式", color: "#38bdf8", textColor: "#ffffff" },
  { value: 1, label: "手動模式", color: "#22c55e", textColor: "#ffffff" },
  { value: 2, label: "維護模式", color: "#f59e0b", textColor: "#ffffff" },
];

export function DropdownWidget({
  element: e,
  values,
  running,
  disabled,
  onInput,
}: WidgetProps) {
  const rawValue = values[e.variableId ?? ""];
  const items =
    e.multistateItems && e.multistateItems.length > 0
      ? e.multistateItems
      : defaultDropdownItems;
  const numValue =
    typeof rawValue === "number" && Number.isFinite(rawValue)
      ? rawValue
      : items[0].value;
  const selectedItem =
    items.find((item) => item.value === numValue) ?? items[0];

  return (
    <LvglCanvas
      element={e}
      lvglClass="lv_dropdown"
      bgColor={e.background}
      deps={[numValue, selectedItem?.label, selectedItem?.color, disabled]}
      className="dropdown-widget"
      style={widgetStyle(e)}
      draw={(ctx, w, h) => {
        drawLvglRoundedPart(
          ctx,
          0,
          0,
          w,
          h,
          e.borderRadius ?? 6,
          e.background || "#18263b",
          e.borderColor ?? "#475569",
          e.borderWidth ?? 1,
          e.borderStyle ?? "solid",
        );

        // Status indicator dot on the left (LVGL style indicator)
        const dotR = Math.max(4, Math.min(7, h * 0.14));
        ctx.beginPath();
        ctx.arc(14, h / 2, dotR, 0, Math.PI * 2);
        ctx.fillStyle = selectedItem?.color || "#38bdf8";
        ctx.fill();

        // LVGL Dropdown chevron arrow on the right
        const ax = w - 16;
        const ay = h / 2 - 2;
        ctx.beginPath();
        ctx.moveTo(ax - 5, ay);
        ctx.lineTo(ax, ay + 5);
        ctx.lineTo(ax + 5, ay);
        ctx.strokeStyle = e.color || "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
      }}
    >
      <select
        aria-label={e.name}
        value={String(selectedItem?.value ?? 0)}
        disabled={!running || disabled}
        onChange={(ev) => {
          if (!running || disabled) return;
          onInput(ev.target.value);
        }}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          padding: "0 28px 0 28px",
          background: "transparent",
          color: e.color,
          fontSize: e.fontSize,
          fontFamily: e.fontFamily || "inherit",
          fontWeight: e.fontWeight ?? "normal",
          border: "none",
          appearance: "none",
          WebkitAppearance: "none",
          cursor: !running || disabled ? "default" : "pointer",
          outline: "none",
        }}
      >
        {items.map((item, idx) => (
          <option
            key={`${item.value}-${idx}`}
            value={String(item.value)}
            style={{ background: "#1e293b", color: "#e2e8f0" }}
          >
            {item.label}
          </option>
        ))}
      </select>
    </LvglCanvas>
  );
}
