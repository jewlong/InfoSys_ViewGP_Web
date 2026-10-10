import { ChevronDown, Square } from "lucide-react";
import { cloneElement, isValidElement } from "react";
export function Tool({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  active = false,
}: {
  icon: typeof Square;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      className={"tool-button " + (active ? "active" : "")}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon size={17} strokeWidth={1.7} />
    </button>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {isValidElement(children) && typeof children.type === "string"
        ? cloneElement(
            children as React.ReactElement<{ "aria-label"?: string }>,
            { "aria-label": label },
          )
        : children}
    </label>
  );
}
export function PropertySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="property-section">
      <h4>
        {title}
        <ChevronDown size={12} />
      </h4>
      {children}
    </section>
  );
}
export function NumberField({
  value,
  onChange,
  suffix,
  min = 0,
  max = 10000,
}: {
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="number-field">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
      />
      {suffix && <span>{suffix}</span>}
    </div>
  );
}
export function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="color-field">
      <input
        aria-label="選擇顏色"
        type="color"
        value={/^#[\da-f]{6}$/i.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        aria-label="色碼"
        value={value}
        maxLength={7}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
