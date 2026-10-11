import type { Element } from "../model";
export function formatNumber(value: unknown, e: Element): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const format = e.numberFormat ?? "decimal";
  const decimals = format === "integer" ? 0 : e.decimals;
  const options: Intl.NumberFormatOptions = {
    useGrouping: e.useGrouping ?? true,
    ...(decimals !== undefined
      ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
      : { maximumFractionDigits: 3 }),
    ...(format === "percent" ? { style: "percent" } : {}),
    ...(format === "scientific" ? { notation: "scientific" } : {}),
  };
  return (
    (e.numberPrefix ?? "") +
    new Intl.NumberFormat(e.numberLocale ?? "en-US", options).format(value) +
    (e.unit ? " " + e.unit : "")
  );
}
