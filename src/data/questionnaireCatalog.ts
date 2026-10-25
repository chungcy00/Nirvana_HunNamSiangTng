import { cleanPriceNote } from '../../shared/priceNotes';
import type { Answers, ServiceCategory, ServiceProduct, Variant } from './questionnaire';
import type { PrototypeProduct } from '../prototype/model';
import { visibleProducts } from '../prototype/model';

// Project the same public records used by the Nirvana page; do not maintain
// a second price table or position-level niche catalogue in the questionnaire.
const categoryNames: Partial<Record<number, ServiceCategory>> = {
  1: '火化土葬', 2: '传统土葬', 3: '骨灰位', 4: '殡仪服务', 7: '宠物纪念',
};
export function nirvanaQuestionnaireProducts(prototypeProducts: readonly PrototypeProduct[]): ServiceProduct[] {
  return visibleProducts(prototypeProducts).flatMap(p => {
    const category = categoryNames[p.category];
    if (!category) return [];
    const variants: Variant[] = p.publicPrices
      ? p.publicPrices.map(price=>({ label: price.price_type==='pre_need' ? '预购价格' : price.price_type==='at_need' ? '即用价格' : price.offer_name, price:Number(price.amount), timing:price.price_type==='pre_need' ? 'pre' as const : price.price_type==='at_need' ? 'now' as const : undefined, religion:price.religion_id == null ? undefined:p.religions.find(r=>r.id===String(price.religion_id))?.name }))
      : p.category === 4 ? [
        ...(p.preNeed === undefined ? [] : [{ label: '预购价格', price: p.preNeed, timing: 'pre' as const }]),
        ...(p.atNeed === undefined ? [] : [{ label: '即用价格', price: p.atNeed, timing: 'now' as const }]),
      ] : p.category === 3 ? p.offers.length ? [{ label: '最低起价', price: Math.min(...p.offers.map(o => o.amount)) }] : []
        : p.offers.map(o => ({ label: p.offers.length > 1 ? o.name : '产品售价', price: o.amount }));
    return [{
      id: p.id, name: p.name, category, provider: '富贵山庄' as const,
      religions: p.religions.length ? p.religions.map(r => r.name) : undefined,
      capacity: p.capacity ? ({ single: '单人', double: '双人', triple: '或以上', four_plus: '或以上', family: '或以上' }[p.capacity]) : undefined,
      capacityLabel: p.capacity ? ({ single: '单人', double: '双人', triple: '三人', four_plus: p.capacityCount ? `${p.capacityCount}人` : '四人及以上', family: '家庭' }[p.capacity]) : undefined,
      placement: p.placement,
      method: p.category === 7 ? p.petMethod==='ash_burial' ? '火化后骨灰安葬' : p.petMethod==='body_burial' ? '宠物土葬' : undefined : undefined,
      description: p.name, variants,
      includes: p.inclusions.join('；') || '包含项目尚待核实。',
      religiousInclusions: Object.fromEntries(p.religions.map(r => [r.name, r.inclusions])),
      restriction: [p.referencePrice ? '具体售价及服务内容请与顾问确认。' : p.terms, p.publicPrices ? p.productPriceNote : p.priceNote, ...(p.publicPrices || []).filter(price=>cleanPriceNote(price.price_note)).map(price=>`${price.price_type==='pre_need'?'预购价格':price.price_type==='at_need'?'即用价格':price.offer_name}：${cleanPriceNote(price.price_note)}`)].filter(Boolean).join(' '),
      referencePrice: p.referencePrice, startingPrice: p.category === 3,
      source: '富贵山庄产品目录',
    }];
  });
}
export function questionnaireProductPath(p: ServiceProduct) {
  return p.provider === '云南善堂' ? '/yunnan-siantang' : `/nirvana/products/item/${encodeURIComponent(p.id)}`;
}
export function questionnaireIncludes(p: ServiceProduct, answers: Answers) {
  const religious = Object.entries(p.religiousInclusions || {})
    .filter(([name]) => !answers.religion || answers.religion === '其他' || name === answers.religion)
    .filter(([, items]) => items.length)
    .map(([name, items]) => `${name}：${items.join('、')}`);
  return [p.includes, ...religious].filter(Boolean).join('；');
}
