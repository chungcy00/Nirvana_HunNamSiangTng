export function formatSqft(value: unknown) {
  const area = Number(value);
  return value != null && Number.isFinite(area) && area > 0
    ? `${area.toLocaleString("en-US", { maximumFractionDigits: 2 })} sqft`
    : undefined;
}
export function groupPricesByArea<T extends { area?: number | null }>(
  rows: T[],
) {
  const groups = new Map<number | null, T[]>();
  for (const row of rows) {
    const area =
      row.area != null &&
      Number.isFinite(Number(row.area)) &&
      Number(row.area) > 0
        ? Number(row.area)
        : null;
    groups.set(area, [...(groups.get(area) || []), row]);
  }
  return [...groups]
    .sort(([a], [b]) => (a === b ? 0 : a == null ? 1 : b == null ? -1 : a - b))
    .map(([area, items]) => ({ area, items }));
}
// Only remove a legacy name suffix if it agrees with structured area metadata.
// Never infer an area or a price from the plan name.
export function pricePlanLabel(name: string, position: unknown, area: unknown) {
  if (typeof position === "string" && position.trim()) return position.trim();
  const label = name?.trim() || "产品售价";
  const suffix = label.match(/^(.*?)\s*([\d,]+(?:\.\d+)?)\s*sqft\s*$/i);
  if (suffix && Number(suffix[2].replaceAll(",", "")) === Number(area))
    return suffix[1].replace(/[\s·|–-]+$/, "") || "产品售价";
  return label === "默认方案" ? "产品售价" : label;
}
