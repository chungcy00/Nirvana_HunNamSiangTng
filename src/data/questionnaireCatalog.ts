import type { ServiceProduct } from './questionnaire';
// Link questionnaire variants to their existing catalogue products by stable ID.
export function questionnaireCatalogProductId(p: ServiceProduct): string | undefined {
  const ids: Record<string,string> = {
    'aa':'product-001','w-cremation':'product-002','w-single-package':'product-003',
    'w-double-package':'product-004','w-premium':'product-005','w-single-lot':'product-006',
    'w-double-lot':'product-007','w-family':'product-008','kindness':'product-014',
    'pet-large':'product-027','pet-small':'product-027',
  };
  if (ids[p.id]) return ids[p.id];
  if (p.id.startsWith('yage-')) return 'product-015';
  if (p.id.startsWith('teng-')) return 'product-016';
  if (p.id.startsWith('7a-')) return 'product-011';
  if (p.id.startsWith('7b-')) return 'product-013';
  if (p.id.startsWith('7-')) return 'product-010';
  if (p.id.startsWith('funeral-')) {
    const index=Number(p.id.split('-').at(-1));
    return `product-${String((p.religions?.[0]==='佛教'?19:23)+index).padStart(3,'0')}`;
  }
  return undefined;
}
