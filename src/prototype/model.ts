export type Capacity = "single" | "double" | "triple" | "four_plus" | "family";
export type InclusionGroup = { title: string; items: string[] };
export interface ReligionContent {
  id: string; name: string; isPublished: boolean; inclusions: string[]; inclusionGroups?: InclusionGroup[]; configurationName?: string; configurationNotes?: string; designs: string[];
}
export interface PrototypeProduct {
  databaseId?: string; primaryImage?: import("../catalog/publicRepository").PublicImage; images?: import("../catalog/publicRepository").PublicImage[]; publicPrices?: import("../catalog/publicRepository").PublicPrice[]; description?: string; subtitle?: string; petMethod?: string;
  id: string; name: string; category: number; visible: boolean;
  saleStatus?: import('../../shared/saleStatus').SaleStatus;
  durationDays?: number; durationNights?: number;
  serviceVenue?: string;
  funeralMethod?: "cremation" | "burial" | "both";
  capacity?: Capacity; capacityCount?: number; placement?: "indoor" | "outdoor";
  religions: ReligionContent[]; inclusions: string[]; inclusionGroups?: InclusionGroup[];
  offers: { name: string; amount: number; saleStatus?: import('../../shared/saleStatus').SaleStatus; area?: number; facing?: string; positionType?: string; religionId?: string }[];
  specifications?: {label: string; value: string}[]; attributeNotes?: {label: string; text: string}[];
  facing?: string; area?: number; preNeed?: number; atNeed?: number;
  referencePrice?: boolean; priceNote?: string; productPriceNote?: string; terms?: string;
}
export const categories = [
  { id: 1, slug: "cremation-burial", name: "火化土葬", description: "火化后的土葬安排，按人数与宗教了解适用配套。" },
  { id: 2, slug: "traditional-burial", name: "传统土葬", description: "了解独立福地与安葬配套，以及各方案包含的内容。" },
  { id: 3, slug: "niches", name: "骨灰位", description: "按安放人数与宗教，了解室内及室外骨灰位。" },
  { id: 4, slug: "funeral-services", name: "殡仪服务", description: "了解不同宗教的殡仪安排，分别查看预购与即用价格。" },
  { id: 5, slug: "ancestral-tablets", name: "祖先牌位", description: "了解祖先牌位与实际包含的纪念安排。" },
  { id: 6, slug: "feng-shui", name: "生基风水", description: "了解生基风水产品的规格、包含项目与售价。" },
  { id: 7, slug: "pet-memorial", name: "宠物安葬", description: "为家中的另一位成员，了解合适的安葬安排。" },
] as const;
export function funeralDurationLabel(product: PrototypeProduct) {
  return product.category === 4 && Number.isInteger(product.durationDays) && Number(product.durationDays) > 0 && Number.isInteger(product.durationNights) && Number(product.durationNights) >= 0
    ? `${product.durationDays}天${product.durationNights}夜殡仪服务配套` : undefined;
}
export const funeralMethodLabels = { cremation: "适用火化", burial: "适用土葬", both: "火化 / 土葬皆适用" } as const;
export const capacityLabels: Record<Capacity, string> = {
  single: "单人", double: "双人", triple: "三人", four_plus: "四人及以上", family: "家庭",
};
export const hasCapacity = (category: number) => [1, 2, 3].includes(category);
export const hasReligion = (category: number) => [1, 2, 3, 4].includes(category);
export const publishedReligions = (p: PrototypeProduct) => p.religions.filter(r => r.isPublished);
export function visibleProducts(products: readonly PrototypeProduct[]) {
  return products.filter(p => p.visible && (!hasReligion(p.category) || publishedReligions(p).length > 0))
    .map(p => ({ ...p, religions: publishedReligions(p) }));
}
export function capacitiesFor(products: readonly PrototypeProduct[], category: number) {
  if (!hasCapacity(category)) return [];
  const existing = new Set(visibleProducts(products).filter(p => p.category === category).map(p => p.capacity));
  return (Object.keys(capacityLabels) as Capacity[]).filter(c => existing.has(c));
}
export function religionsFor(products: readonly PrototypeProduct[], category: number) {
  if (!hasReligion(category)) return [];
  return [...new Map(visibleProducts(products).filter(p => p.category === category)
    .flatMap(p => p.religions).map(r => [r.id, { id: r.id, name: r.name }])).values()];
}
export function filterProducts(products: readonly PrototypeProduct[], category: number, capacity = "", religion = "") {
  return visibleProducts(products).filter(p => p.category === category
    && (!hasCapacity(category) || !capacity || p.capacity === capacity)
    && (!hasReligion(category) || !religion || p.religions.some(r => r.id === religion)));
}
export const formatMoney = (value: number) => `RM ${value.toLocaleString("en-MY")}`;
export function lowestPrice(product: PrototypeProduct): number | undefined {
  if (product.saleStatus === 'sold_out') return undefined;
  const prices = product.category === 4
    ? product.publicPrices
      ? product.publicPrices.filter(price => price.sale_status !== 'sold_out').map(price => Number(price.amount))
      : [product.preNeed, product.atNeed].filter((price): price is number => price !== undefined)
    : product.offers.filter(offer => offer.saleStatus !== 'sold_out').map(offer => offer.amount);
  return prices.length ? Math.min(...prices) : undefined;
}
export function sortProducts(products: PrototypeProduct[], sort: string) {
  return [...products].sort((a, b) => {
    const saleOrder = Number(a.saleStatus === 'sold_out') - Number(b.saleStatus === 'sold_out');
    if (saleOrder) return saleOrder;
    if (sort !== 'price-asc' && sort !== 'price-desc') return 0;
    const left = lowestPrice(a), right = lowestPrice(b);
    if (left === undefined) return right === undefined ? 0 : 1;
    if (right === undefined) return -1;
    return sort === 'price-asc' ? left - right : right - left;
  });
}
export const listPath = (id: number) => `/prototype/list/${categories.find(c => c.id === id)?.slug || categories[0].slug}`;
export const detailPath = (id: string) => `/prototype/product/${id}`;
