export type Capacity = "single" | "double" | "triple" | "four_plus" | "family";
export interface ReligionContent {
  id: string; name: string; isPublished: boolean; inclusions: string[]; designs: string[];
}
export interface PrototypeProduct {
  id: string; name: string; category: number; visible: boolean;
  capacity?: Capacity; capacityCount?: number; placement?: "indoor" | "outdoor";
  religions: ReligionContent[]; inclusions: string[];
  offers: { name: string; amount: number; area?: number }[];
  facing?: string; area?: number; preNeed?: number; atNeed?: number;
  referencePrice?: boolean; priceNote?: string; terms?: string;
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
export const listPath = (id: number) => `/prototype/list/${categories.find(c => c.id === id)?.slug || categories[0].slug}`;
export const detailPath = (id: string) => `/prototype/product/${id}`;
