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
// Price row labels come directly from the offer name, independently of area or position metadata.
export function pricePlanLabel(name: string) {
  return name?.trim() || "产品售价";
}
