import type { PlacementType } from "../types";

export function placementLabel(value: PlacementType | null | undefined) {
  return value === "indoor" ? "室内" : value === "outdoor" ? "室外" : null;
}

// Read the public list projection, or the detail RPC's attributes. Category 3
// is the database's existing niche category, not a new website filter.
export function readNichePlacement(row: {
  category_id: number;
  placement_type?: unknown;
  attributes?: { placement_type?: unknown } | null;
}) {
  if (row.category_id !== 3) return undefined;
  const value = row.placement_type ?? row.attributes?.placement_type;
  return {
    placementType: value === "indoor" || value === "outdoor" ? value : null,
  } as { placementType: PlacementType | null };
}

// Pass this p_changes payload through the existing authenticated save_product
// RPC, together with p_id and p_expected_updated_at. Empty drafts use SQL NULL.
export function nichePlacementChanges(categoryId: number, value: PlacementType | null) {
  if (categoryId !== 3) throw new Error("仅骨灰位可填写安放环境。");
  if (value !== null && value !== "indoor" && value !== "outdoor")
    throw new Error("请选择室内或室外。");
  return { niche_details: { upsert: [{ placement_type: value }] } };
}
