import { questionnaireIncludes } from './questionnaireCatalog';
// Question flow is local; Nirvana products and prices are supplied by the public catalogue.
export const categories = ['骨灰位', '火化土葬', '传统土葬', '殡仪服务', '宠物纪念'] as const;
export type ServiceCategory = typeof categories[number];
export type Answers = { category: ServiceCategory | ''; religion: string; capacity: string; situation: string; method: string; size: string; budget: string };
export const emptyAnswers: Answers = { category: '', religion: '', capacity: '', situation: '', method: '', size: '', budget: '' };
export function questionKeys(a: Answers): (keyof Answers)[] {
  if (!a.category) return ['category'];
  if (a.category === '宠物纪念') return a.method === '宠物土葬' ? ['category','method','size','budget'] : ['category','method','budget'];
  return a.category === '殡仪服务' ? ['category','religion','situation','budget'] : ['category','religion','capacity','budget'];
}
export const budgetBounds: Record<ServiceCategory, number[]> = {
  骨灰位: [0, 10000, 20000, 50000, 100000], 火化土葬: [0, 20000, 50000],
  传统土葬: [0, 30000, 60000, 100000, 200000], 殡仪服务: [0, 10000, 20000, 30000, 40000], 宠物纪念: [0, 5000, 9000],
};
export function referencePriceRange(category: ServiceCategory, products: readonly ServiceProduct[]) {
  const prices=products.filter(p=>p.category===category).flatMap(p=>p.variants.map(v=>v.price));
  return prices.length ? `当前公开参考价格：${money(Math.min(...prices))}–${money(Math.max(...prices))}` : '当前暂无公开产品价格，欢迎咨询顾问。';
}
export const money = (n: number) => `RM${n.toLocaleString('en-US')}`;
export function budgetOptions(category: ServiceCategory) {
  const b = budgetBounds[category];
  return b.map((min, i) => ({ value: String(i), label: i === 0 ? `${money(b[1])}以下` : i === b.length - 1 ? `${money(min)}及以上` : `${money(min)}–不足${money(b[i + 1])}` })).concat({ value: 'any', label: '预算未定，先了解' });
}
export function withinBudget(price: number, a: Answers) {
  if (!a.category || !a.budget || a.budget === 'any') return true;
  const b = budgetBounds[a.category], index = Number(a.budget);
  return price >= b[index] && price < (b[index + 1] ?? Infinity);
}
export type Variant = { label: string; price: number; timing?: 'pre' | 'now'; religion?: string };
export type ServiceProduct = {
  id: string; name: string; category: ServiceCategory; provider: '富贵山庄' | '云南善堂';
  religions?: string[]; capacity?: string; method?: string; description: string;
  variants: Variant[]; includes: string; restriction: string; source: string;
  capacityLabel?: string; placement?: 'indoor' | 'outdoor'; startingPrice?: boolean; referencePrice?: boolean;
  religiousInclusions?: Record<string, string[]>;
};
export const questionnaireProducts: ServiceProduct[] = [
  {
    id: 'yunnan', name: '云南善堂殡仪配套', category: '殡仪服务', provider: '云南善堂',
    religions: ['佛教', '基督教'], description: '云南善堂殡仪配套',
    variants: [{ label: '单一配套参考价', price: 8800 }],
    includes: '具体服务清单请咨询顾问，现有资料未提供逐项内容。',
    restriction: '佛教、基督教均适用，仪式按需求调整；不受火化或土葬方式限制，不据此推定含火化、墓地、骨灰位等安葬费用。',
    source: '用户确认的云南善堂单一配套资料',
  },
];
export const supplyNotice = '以上为资料参考价，不代表当前可售或正式报价；实际售价、位置供应、服务细项及适用条件需进一步确认。';
export function complete(a: Answers) {
  return !!(a.category && a.budget && (a.category === '宠物纪念' ? a.method && (a.method !== '宠物土葬' || a.size) : a.religion && (a.category === '殡仪服务' ? a.situation : a.capacity)));
}
export function productStatus(p: ServiceProduct, a: Answers): 'match' | 'confirm' | 'exclude' {
  if (p.category !== a.category) return 'exclude';
  if (p.capacity && a.capacity && p.capacity !== a.capacity) return 'exclude';
  if (p.method && a.method && a.method !== '尚未确定，先比较' && p.method !== a.method) return 'exclude';
  if (a.religion && a.religion !== '其他' && p.religions && !p.religions.includes(a.religion)) return 'exclude';
  const variants = applicableVariants(p,a);
  if (p.variants.length && !variants.some(x => withinBudget(x.price,a))) return 'exclude';
  if (p.referencePrice || !p.variants.length || (a.category !== '宠物纪念' && (a.religion === '其他' || !p.religions)) || (a.capacity && !p.capacity && a.category !== '殡仪服务' && a.category !== '宠物纪念')) return 'confirm';
  return 'match';
}
export function applicableVariants(p: ServiceProduct, a: Answers) {
  return p.variants.filter(v => (!v.religion || !a.religion || a.religion==='其他' || v.religion===a.religion) && (!v.timing || a.situation !== '提前规划' && a.situation !== '目前需要安排' || v.timing === (a.situation === '提前规划' ? 'pre' : 'now')));
}
export function answerLines(a: Answers) {
  const lines = [`服务类别：${a.category || '尚未填写'}`];
  const line = (name: string,value: string) => lines.push(`${name}：${value || '尚未填写'}`);
  if(a.category && a.category !== '宠物纪念') {
    line('宗教',a.religion);
    if(a.category === '殡仪服务') line('使用情况',a.situation); else line('使用人数',a.capacity);
  }
  if(a.category === '宠物纪念') { line('纪念方式',a.method); if(a.method==='宠物土葬') line('宠物体型',a.size); }
  line('预算',a.category ? budgetOptions(a.category).find(x=>x.value===a.budget)?.label || '' : '');
  return lines;
}
export function inquirySummary(a: Answers, selected: string[], browsing: boolean, products: readonly ServiceProduct[] = questionnaireProducts) {
  const chosen = [...new Set(selected)].map(id=>products.find(p=>p.id===id)).filter((p): p is ServiceProduct=>!!p);
  const sections = ['您好，我想了解以下服务。'];
  const needs = answerLines(a).filter(line=>!line.endsWith('：尚未填写'));
  if (needs.length) sections.push(['【咨询需求】', ...needs.map(line=>`• ${line}`)].join('\n'));
  if (browsing) sections.push('【浏览说明】\n• 正在查看当前类别的其他选择，所选产品可能不符合当前条件。');
  const productBlocks = chosen.map((p,index)=>{
    const prices = applicableVariants(p,a).map(v=>{
      const budgetNote = p.referencePrice || !a.budget || a.budget==='any' ? '' : withinBudget(v.price,a) ? '（符合所选预算）' : '（不符合所选预算）';
      return `    - ${v.label ? v.label+'：' : ''}${money(v.price)}${p.startingPrice?' 起':''}${budgetNote}`;
    });
    const items = (value: string) => value.split(/[；。\r\n]+/).map(line=>line.trim()).filter(Boolean);
    const confirmations = items(p.restriction);
    if (!prices.length) confirmations.push('参考价格需咨询确认');
    if (productStatus(p,a)==='confirm') confirmations.push(p.referencePrice ? '具体售价及服务内容请与顾问确认' : '宗教、容量或价格等资料需进一步确认');
    const basic = [`${index+1}. ${p.name}`, ...(p.provider?[`  所属机构：${p.provider}`]:[])].join('\n');
    const parts: string[] = [];
    if (prices.length) parts.push(['  参考价格：', ...prices].join('\n'));
    const included = items(questionnaireIncludes(p,a));
    if (included.length) parts.push(['  包含内容：', ...included.map(line=>`    - ${line}`)].join('\n'));
    if (confirmations.length) parts.push(['  需确认事项：', ...confirmations.map(line=>`    - ${line}`)].join('\n'));
    return [basic, parts.join('\n')].filter(Boolean).join('\n\n');
  });
  if (productBlocks.length) sections.push(['【感兴趣的产品】', ...productBlocks].join('\n\n'));
  if (a.religion==='其他') sections.push('【宗教与仪式】\n• 宗教及仪式适用情况需咨询确认。');
  sections.push(`【价格及供应说明】\n• ${supplyNotice}`, '麻烦按以上需求提供进一步资料，谢谢。');
  // Real line feeds are encoded once by whatsappUrl, identically on every device.
  return sections.join('\n\n');
}
export function updateAnswers(a: Answers, key: keyof Answers, value: string): Answers {
  if(key==='category') return {...emptyAnswers, category:value as Answers['category'], religion:a.category && a.category!=='宠物纪念' && value!=='宠物纪念' ? a.religion : ''};
  if(key==='method') return {...a,method:value,size:value==='宠物土葬'?a.size:''};
  return {...a,[key]:value};
}
