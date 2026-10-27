import { cleanPriceNote } from "../../shared/priceNotes";
import type { SaleStatus } from "../../shared/saleStatus";
import { groupInclusions } from "../../shared/inclusionGroups";
import type { PrototypeProduct, Capacity } from "../prototype/model";

export type PublicImage = {
  sale_status?: SaleStatus;
  id: string;
  bucket: string;
  path: string;
  alt?: string;
  religion_id?: number;
  image_type?: string;
  design_name?: string | null;
  preview_placeholder?: string | null;
};
export type PublicPrice = {
  sale_status?: SaleStatus;
  offer_id: string;
  offer_name: string;
  religion_id?: number;
  price_type: string;
  amount: number;
  price_note?: string | null;
  facing_override?: string | null;
  area_sqft_override?: number | null;
  position_type?: string | null;
};
export type PublicRecord = {
  sale_status?: SaleStatus;
  id: string;
  slug: string;
  name: string;
  category_id: number;
  capacity_group?: Capacity;
  capacity_count?: number;
  placement_type?: "indoor" | "outdoor" | null;
  religions: { id: number; name: string; configuration_name?: string | null; configuration_notes?: string | null }[];
  prices: PublicPrice[];
  primary_image?: PublicImage;
  attributes?: Record<string, unknown>;
  subtitle?: string;
  description?: string;
  price_note_override?: string | null;
  images?: PublicImage[];
  inclusions?: {
    name: string;
    group_title?: string | null;
    quantity?: number;
    unit?: string;
    description?: string;
    religion_id?: number;
    offer_id?: string;
  }[];
};
export type PublicConfig = { url: string; key: string };
export function publicHeaders(config: PublicConfig) {
  return {
    apikey: config.key,
    ...(config.key.startsWith("eyJ")
      ? { Authorization: `Bearer ${config.key}` }
      : {}),
  };
}
export function publicConfig(
  url?: string,
  key?: string,
  allowLocal = false,
): PublicConfig {
  if (
    !url ||
    !key ||
    (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) &&
      !(allowLocal && /^http:\/\/127\.0\.0\.1:\d+$/.test(url)))
  )
    throw new Error("产品服务暂未配置，请稍后再试。");
  if (key.startsWith("sb_secret_")) throw new Error("产品服务配置无效。");
  if (key.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (payload.role !== "anon") throw new Error();
    } catch {
      throw new Error("产品服务配置无效。");
    }
  } else if (!key.startsWith("sb_publishable_"))
    throw new Error("产品服务配置无效。");
  return { url, key };
}
export async function publicRpc(
  config: PublicConfig,
  name: "catalog_product_list" | "catalog_product_detail" | "catalog_product_snapshot",
  args: object,
  signal?: AbortSignal,
) {
  const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method: "POST",
    cache: "no-store",
    signal,
    headers: {
      ...publicHeaders(config),
      "Content-Type": "application/json",
      "Content-Profile": "api",
      "Accept-Profile": "api",
    },
    body: JSON.stringify(args),
  });
  if (!response.ok) throw new Error("产品资料暂时无法载入，请稍后重试。");
  return response.json();
}
export function mapPublicProduct(raw: PublicRecord): PrototypeProduct {
  if (
    !raw.id ||
    !raw.slug ||
    !raw.name ||
    !Number.isInteger(raw.category_id) ||
    raw.category_id < 1 ||
    raw.category_id > 7 ||
    !Array.isArray(raw.religions) ||
    !Array.isArray(raw.prices)
  )
    throw new Error("产品资料格式有误，请稍后重试。");
  const religious = [1, 2, 3, 4].includes(raw.category_id);
  if (religious && !raw.religions.length)
    throw new Error("产品公开资料不完整。");
  return projectProductRecord(raw);
}
// Pure projection shared by public reads and unsaved admin preview.
// Public callers must go through mapPublicProduct for publication completeness.
export function projectProductRecord(raw: PublicRecord): PrototypeProduct {
  const allowed = new Set(raw.religions.map((r) => r.id));
  const prices = raw.prices.filter(
    (p) =>
      (p.religion_id == null || allowed.has(p.religion_id)) &&
      Number.isFinite(Number(p.amount)) &&
      Number(p.amount) > 0,
  );
  const images = (raw.images || []).filter(
    (i) => i.religion_id == null || allowed.has(i.religion_id),
  );
  const inclusions = (raw.inclusions || []).filter(
    (i) => i.religion_id == null || allowed.has(i.religion_id),
  );
  const text = (i: NonNullable<PublicRecord["inclusions"]>[number]) => {
    const offer = prices.find((p) => p.offer_id === i.offer_id)?.offer_name;
    return `${offer ? offer + "：" : ""}${i.name}${i.quantity != null ? ` × ${i.quantity}${i.unit || ""}` : ""}${i.description ? `（${i.description}）` : ""}`;
  };
  const min = (type: string) => {
    const rows = prices.filter((p) => p.price_type === type && p.sale_status !== 'sold_out');
    return rows.length
      ? Math.min(...rows.map((p) => Number(p.amount)))
      : undefined;
  };
  const a = raw.attributes || {};
  const commonNotes = prices.map(p => cleanPriceNote(p.price_note));
  const commonNote = commonNotes.length && commonNotes.every(n => n === commonNotes[0]) ? commonNotes[0] : '';
  const days = a.duration_days, nights = a.duration_nights;

  return {
    id: raw.slug,
    databaseId: raw.id,
    name: raw.name,
    category: raw.category_id,
    visible: raw.category_id !== 4 || raw.sale_status !== 'sold_out',
    saleStatus: raw.sale_status || 'available',
    capacity: raw.capacity_group,
    capacityCount: raw.capacity_count,
    religions: raw.religions.map((r) => ({
      id: String(r.id),
      name: r.name,
      isPublished: true,
      configurationName: raw.category_id !== 4 ? r.configuration_name?.trim() || undefined : undefined,
      configurationNotes: raw.category_id !== 4 ? r.configuration_notes?.trim() || undefined : undefined,
      inclusions: inclusions.filter((i) => i.religion_id === r.id).map(text),
      inclusionGroups: groupInclusions(inclusions.filter(i => i.religion_id === r.id), i => i.group_title).map(g => ({title:g.title, items:g.items.map(text)})),
      designs: images
        .filter((i) => i.religion_id === r.id && i.design_name)
        .map((i) => i.design_name!),
    })),
    inclusions: inclusions.filter((i) => i.religion_id == null).map(text),
    inclusionGroups: groupInclusions(inclusions.filter(i => i.religion_id == null), i => i.group_title).map(g => ({title:g.title, items:g.items.map(text)})),
    offers: prices
      .filter((p) => !["pre_need", "at_need"].includes(p.price_type))
      .map((p) => ({
        name: p.offer_name || "产品售价",
        saleStatus: p.sale_status,
        amount: Number(p.amount),
        area: p.area_sqft_override == null ? undefined : Number(p.area_sqft_override),
        facing: p.facing_override?.trim() || undefined,
        positionType: p.position_type?.trim() || undefined,
        religionId: p.religion_id == null ? undefined : String(p.religion_id),
      })),
    preNeed: min("pre_need"),
    atNeed: min("at_need"),
    publicPrices: prices,
    images: raw.category_id === 4 ? [] : images,
    primaryImage:
      raw.category_id !== 4 && raw.primary_image &&
      (raw.primary_image.religion_id == null ||
        allowed.has(raw.primary_image.religion_id))
        ? raw.primary_image
        : undefined,
    specifications: attributeSpecifications(raw.category_id, a, raw.name),
    attributeNotes: attributeNotes(raw.category_id, a),
    facing: typeof a.facing === "string" ? a.facing : undefined,
    area: a.area_sqft == null ? undefined : Number(a.area_sqft),
    placement:
      raw.category_id === 3
        ? ["indoor", "outdoor"].includes(
            String(raw.placement_type ?? a.placement_type),
          )
          ? ((raw.placement_type ?? a.placement_type) as "indoor" | "outdoor")
          : undefined
        : undefined,
    durationDays: raw.category_id === 4 && Number.isInteger(days) && Number(days) > 0 ? Number(days) : undefined,
    durationNights: raw.category_id === 4 && Number.isInteger(nights) && Number(nights) >= 0 ? Number(nights) : undefined,
    serviceVenue: raw.category_id === 4 && typeof a.service_venue === 'string' && a.service_venue.trim() ? a.service_venue : undefined,
    funeralMethod:
      raw.category_id === 4 && ["cremation", "burial", "both"].includes(String(a.funeral_method))
        ? a.funeral_method as PrototypeProduct["funeralMethod"]
        : undefined,
    petMethod:
      typeof a.pet_burial_method === "string" ? a.pet_burial_method : undefined,
    description: raw.description,
    subtitle: raw.subtitle,
    priceNote: cleanPriceNote(raw.price_note_override) || commonNote || undefined,
    // Preserve the source separately: resolved per-price/global notes are not
    // evidence that a product-specific note was entered in the backend.
    productPriceNote: cleanPriceNote(raw.price_note_override) || undefined,
    terms: raw.category_id !== 4 && typeof a.terms_summary === "string" ? a.terms_summary : undefined,

  };
}
export async function loadPublicProducts(
  config: PublicConfig,
  signal?: AbortSignal,
): Promise<PrototypeProduct[]> {
  // One RLS-filtered snapshot replaces the list + one detail request per product.
  const records: PublicRecord[] = await publicRpc(config,"catalog_product_snapshot",{},signal);
  if (!Array.isArray(records)) throw new Error("产品资料暂时无法载入，请稍后重试。");
  return records.filter(record => record.category_id !== 4 || record.sale_status !== 'sold_out').map(mapPublicProduct);
}

export function imageEndpoint(config: PublicConfig, image: PublicImage) {
  if (
    !["catalog-media-private", "catalog-media-restricted"].includes(
      image.bucket,
    ) ||
    !image.path ||
    image.path.split("/").some((p) => p === ".." || p === "." || !p)
  )
    throw new Error("图片暂不可用。");
  return `${config.url}/storage/v1/object/authenticated/${image.bucket}/${image.path.split("/").map(encodeURIComponent).join("/")}`;
}

// Explicit public allowlists prevent internal/source/admin-only fields leaking into UI.
function attributeSpecifications(category: number, attrs: Record<string, unknown>, name: string) {
  const fields: [string,string,string?][] = category <= 2
    ? []
    : category === 3 ? [['theme_name','产品主题']]
    : category === 5 ? [['tablet_type','牌位类型'],['tablet_capacity','牌位容量','位']]
    : category === 6 ? [['fengshui_type','生基类型']]
    : category === 7 ? [['pet_size_class','宠物规格']] : [];
  const result = fields.flatMap(([key,label,unit]) => {
    const raw = attrs[key];
    if (raw == null || raw === '' || (typeof raw === 'number' && (!Number.isFinite(raw) || raw <= 0))) return [];
    const value = String(raw).trim();
    return !value || value === name ? [] : [{label,value:unit ? `${value} ${unit}` : value}];
  });
  if (category === 7) {
    const method = {body_burial:'遗体土葬',ash_burial:'骨灰安葬'}[String(attrs.pet_burial_method)];
    if (method) result.unshift({label:'安葬类型',value:method});
  }
  return result;
}
function attributeNotes(category: number, attrs: Record<string, unknown>) {
  const fields: [string,string][] = category <= 2 ? [['burial_notes','安葬说明']]
    : category === 3 ? [['niche_style','设计款式说明'],['niche_notes','补充说明']]
    : category === 5 ? [['tablet_notes','补充说明']]
    : category === 6 ? [['configuration_notes','配置说明']]
    : category === 7 ? [['pet_notes','补充说明']] : [];
  return fields.flatMap(([key,label]) => typeof attrs[key] === 'string' && attrs[key].trim() ? [{label,text:attrs[key].trim()}] : []);
}
