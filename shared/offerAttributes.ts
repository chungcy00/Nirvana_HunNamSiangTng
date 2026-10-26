// A missing override inherits the product value; repeating it adds no information.
export function differentText(value: unknown, common: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text && text !== (typeof common === "string" ? common.trim() : "")
    ? text
    : undefined;
}
export function differentArea(value: unknown, common: unknown) {
  const area = Number(value);
  return value != null &&
    Number.isFinite(area) &&
    area > 0 &&
    area !== Number(common)
    ? area
    : undefined;
}
export function hasOfferDifferences(
  offer: Record<string, any>,
  common: Record<string, any>,
) {
  return !!(
    differentText(offer.facing_override, common.facing) ||
    differentArea(offer.area_sqft_override, common.area_sqft) ||
    offer.position_type?.trim()
  );
}
