import type { PrototypeProduct } from "../prototype/model";
import type { PublicConfig } from "./publicRepository";

// Public projections only, scoped to this tab and backend. Never cache failures,
// credentials, admin data or a response beyond this short publication window.
export const PUBLIC_SNAPSHOT_MAX_AGE = 30000;
const cacheKey = "public-catalog-snapshot-v1";
export function readPublicSnapshot(config: PublicConfig): readonly PrototypeProduct[] | undefined {
  try {
    const saved = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
    const age = Date.now() - saved?.at;
    if (saved?.backend !== config.url || saved?.key !== config.key || !Number.isFinite(age) || age < 0 || age >= PUBLIC_SNAPSHOT_MAX_AGE || !Array.isArray(saved.products)) return undefined;
    if (!saved.products.every((p: PrototypeProduct) => p && typeof p.id === "string" && typeof p.name === "string" && p.visible === true && Number.isInteger(p.category) && Array.isArray(p.religions))) return undefined;
    return saved.products;
  } catch { return undefined; }
}
export function writePublicSnapshot(config: PublicConfig, products: readonly PrototypeProduct[]) {
  try { sessionStorage.setItem(cacheKey, JSON.stringify({backend: config.url, key: config.key, at: Date.now(), products})); } catch { /* Storage is optional. */ }
}
export function clearPublicSnapshot() {
  try { sessionStorage.removeItem(cacheKey); } catch { /* Storage is optional. */ }
}
