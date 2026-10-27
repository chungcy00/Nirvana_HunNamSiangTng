export type SaleStatus = 'available' | 'sold_out';
export const saleStatuses: Record<SaleStatus, string> = { available: '在售', sold_out: '已售罄' };
export const saleStatusOptions: [string, string][] = Object.entries(saleStatuses);
export function sameDesign(a: {id: string; image_type?: string; design_name?: string | null; religion_id?: number | null}, b: {id: string; image_type?: string; design_name?: string | null; religion_id?: number | null}) {
  return a.id === b.id || (a.image_type === 'design' && b.image_type === 'design' && !!a.design_name?.trim() && a.design_name.trim() === b.design_name?.trim() && (a.religion_id ?? null) === (b.religion_id ?? null));
}
