import type { PrototypeProduct, Capacity } from "../prototype/model";

export type PublicImage = {
  id: string;
  bucket: string;
  path: string;
  alt?: string;
  religion_id?: number;
  image_type?: string;
  design_name?: string;
};
export type PublicPrice = {
  offer_id: string;
  offer_name: string;
  religion_id?: number;
  price_type: string;
  amount: number;
  price_note?: string;
};
export type PublicRecord = {
  id: string;
  slug: string;
  name: string;
  category_id: number;
  capacity_group?: Capacity;
  capacity_count?: number;
  placement_type?: "indoor" | "outdoor" | null;
  religions: { id: number; name: string }[];
  prices: PublicPrice[];
  primary_image?: PublicImage;
  attributes?: Record<string, unknown>;
  subtitle?: string;
  description?: string;
  images?: PublicImage[];
  inclusions?: {
    name: string;
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
  name: "catalog_product_list" | "catalog_product_detail",
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
    const rows = prices.filter((p) => p.price_type === type);
    return rows.length
      ? Math.min(...rows.map((p) => Number(p.amount)))
      : undefined;
  };
  const a = raw.attributes || {};
  return {
    id: raw.slug,
    databaseId: raw.id,
    name: raw.name,
    category: raw.category_id,
    visible: true,
    capacity: raw.capacity_group,
    capacityCount: raw.capacity_count,
    religions: raw.religions.map((r) => ({
      id: String(r.id),
      name: r.name,
      isPublished: true,
      inclusions: inclusions.filter((i) => i.religion_id === r.id).map(text),
      designs: images
        .filter((i) => i.religion_id === r.id && i.design_name)
        .map((i) => i.design_name!),
    })),
    inclusions: inclusions.filter((i) => i.religion_id == null).map(text),
    offers: prices
      .filter((p) => !["pre_need", "at_need"].includes(p.price_type))
      .map((p) => ({
        name: p.offer_name || "产品售价",
        amount: Number(p.amount),
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
    petMethod:
      typeof a.pet_burial_method === "string" ? a.pet_burial_method : undefined,
    description: raw.description,
    subtitle: raw.subtitle,
    priceNote: [
      ...new Set(prices.map((p) => p.price_note).filter(Boolean)),
    ].join("\n"),
    terms: typeof a.terms_summary === "string" ? a.terms_summary : undefined,
  };
}
export async function loadPublicProducts(
  config: PublicConfig,
  signal?: AbortSignal,
): Promise<PrototypeProduct[]> {
  const list: PublicRecord[] = await publicRpc(
    config,
    "catalog_product_list",
    {},
    signal,
  );
  if (!Array.isArray(list))
    throw new Error("产品资料暂时无法载入，请稍后重试。");
  const products: (PrototypeProduct | undefined)[] = new Array(list.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, list.length) }, async () => {
      while (next < list.length) {
        const index = next++,
          item = list[index];
        // Details re-check publication after the list request; never fill a missing
        // or hidden result with an earlier snapshot or static prototype record.
        const detail: PublicRecord | null = await publicRpc(
          config,
          "catalog_product_detail",
          { p_slug: item.slug },
          signal,
        );
        if (detail && detail.id === item.id)
          products[index] = mapPublicProduct(detail);
      }
    }),
  );
  return products.filter((p): p is PrototypeProduct => !!p);
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
