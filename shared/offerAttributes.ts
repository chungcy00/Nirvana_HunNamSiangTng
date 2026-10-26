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

export function resolvedOfferAttributes(
  offer: Record<string, any>,
  common: Record<string, any>,
) {
  return {
    facing:
      typeof offer.facing_override === "string" && offer.facing_override.trim()
        ? offer.facing_override
        : (common.facing ?? ""),
    area: offer.area_sqft_override ?? common.area_sqft ?? null,
  };
}
export function offerOverrideValue(
  field: "facing_override" | "area_sqft_override",
  value: unknown,
  common: Record<string, any>,
) {
  if (value == null || value === "") return null;
  if (field === "area_sqft_override")
    return common.area_sqft != null && common.area_sqft !== '' && Number(value) === Number(common.area_sqft) ? null : value;
  const text = String(value).trim();
  return text === String(common.facing ?? "").trim() || !text ? null : text;
}
