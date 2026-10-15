// Reference data transcribed from the user-supplied product notes; never live availability.
export const categories = ['骨灰位', '火化土葬', '传统土葬', '殡仪服务', '宠物纪念'] as const;
export type ServiceCategory = typeof categories[number];
export type Answers = { category: ServiceCategory | ''; religion: string; capacity: string; situation: string; method: string; size: string; budget: string };
export const emptyAnswers: Answers = { category: '', religion: '', capacity: '', situation: '', method: '', size: '', budget: '' };
export const budgetBounds: Record<ServiceCategory, number[]> = {
  骨灰位: [0, 10000, 20000, 50000, 100000], 火化土葬: [0, 20000, 50000],
  传统土葬: [0, 30000, 60000, 100000, 200000], 殡仪服务: [0, 10000, 20000, 30000, 40000], 宠物纪念: [0, 5000, 9000],
};
export const referencePrices: Record<ServiceCategory, string> = {
  骨灰位: '骨灰位及相关配套：RM6,888–108,800', 火化土葬: '火化土葬配套：RM21,888–63,888',
  传统土葬: '传统土葬地段及配套：RM27,888–308,888', 殡仪服务: '殡仪配套：RM8,800–47,888', 宠物纪念: '宠物纪念：RM3,888–9,800',
};
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
export type Variant = { label: string; price: number; timing?: 'pre' | 'now' };
export type ServiceProduct = {
  id: string; name: string; category: ServiceCategory; provider: '富贵山庄' | '云南善堂';
  religions?: string[]; capacity?: string; method?: string; description: string;
  variants: Variant[]; includes: string; restriction: string; source: string;
};
const products: ServiceProduct[] = [];
function add(id: string, name: string, category: ServiceCategory, capacity: string | undefined, variants: Variant[], includes: string, restriction: string, extra: Partial<ServiceProduct> = {}) {
  products.push({ id, name, category, capacity, variants, includes, restriction, provider: '富贵山庄', description: name, source: '用户提供的富贵产品信息', ...extra });
}
const v = (label: string, price: number): Variant => ({ label, price });
const both = ['佛教', '基督教'];
const burialNote = '具体地段、宗教款式、施工及后续费用需确认。';
add('w-cremation', 'Zone W 双人火化土葬配套', '火化土葬', '双人', [v('双人配套',21888)], '双人福地、两次火化、两个骨灰瓮、两张瓷相；宗教用品按信仰配置。', burialNote, {religions:both, source:'Zone W 产品资料'});
add('aa', 'Zone AA 双人福地', '火化土葬', '双人', [v('双人配套',63888)], '双人福地、墓碑、两人火化、骨灰容器、墓穴、管理及第二次下葬相关费用。', '传统棺木土葬适用性未说明；墓碑款式与具体费用范围需确认。', {religions:both, source:'Zone AA 产品资料'});
add('w-single-lot', 'Zone W 单人福地地段', '传统土葬', '单人', [v('普通地段',27888),v('角头地段',30888)], '土地、维护、围墙与步道、挖墓。', '这是地段价，不是完整配套费用；墓碑及其他服务是否包含需确认。', {source:'Zone W 产品资料'});
add('w-single-package', 'Zone W 单人福地配套', '传统土葬', '单人', [v('普通地段',33888),v('角头地段',35888)], '土地、墓碑；设施、管理、墓穴及第二次安葬相关合并费用。', burialNote, {religions:both, source:'Zone W 产品资料'});
add('w-double-lot', 'Zone W 双人福地地段', '传统土葬', '双人', [v('普通地段',60888),v('角头地段',68888)], '土地、服务与维护、围墙与步道。', '这是地段价，不是完整配套费用；墓碑、挖墓等是否包含需确认。', {source:'Zone W 产品资料'});
add('w-double-package', 'Zone W 双人福地配套', '传统土葬', '双人', [v('普通地段',86888),v('角头地段',93888)], '土地、墓碑及设施、管理、墓穴、第二次安葬相关费用。', burialNote, {religions:both, source:'Zone W 产品资料'});
add('w-premium', 'Zone W 尊贵双人福地配套', '传统土葬', '双人', [v('216 sqft 普通',113888),v('216 sqft 角头',123888),v('252 sqft 普通',120888)], '土地、墓碑及设施、管理、墓穴、第二次安葬相关费用。', burialNote, {religions:both, source:'Zone W 产品资料'});
add('w-family', 'Zone W 家庭福地', '传统土葬', '或以上', [v('864 sqft 普通',238888),v('864 sqft 角头',258888),v('1,080 sqft',308888)], '土地、管理与设施费用。', '这是家庭地段价，不是完整配套费用；不代表含家庭全部安葬费用。', {source:'Zone W 产品资料'});
add('kindness', '仁爱园 2.0 单人骨灰位', '骨灰位', '单人', [v('10–12 排完整配套',6888),v('07–09 排完整配套',8888),v('G–06 排完整配套',10888)], '单人骨灰位、骨灰瓮、火化及管理费用。', '宗教适用情况需确认；管理范围及其他项目以合同为准。', {source:'仁爱园2.0 产品资料'});
for (const religion of both) {
  add(`yage-${religion}-triple`, `聚雅阁${religion}三人位`, '骨灰位', '或以上', [v('三人位配套',16888)], '骨灰位、管理、火化及骨灰瓮、第二次安放相关费用。', '三人容量不代表总价包含三位先人的全部服务；火化与骨灰瓮数量、第三次安放费用需确认。', {religions:[religion], source:'聚雅阁产品资料'});
  add(`yage-${religion}-single`, `聚雅阁${religion}单人位`, '骨灰位', '单人', [], '现有资料未提供完整费用清单。', '历史资料标示售罄；最新价格与供应需确认。', {religions:[religion], source:'聚雅阁产品资料'});
}
add('yage-christian-double','聚雅阁基督教双人位','骨灰位','双人',[v('双人位配套',11888)],'骨灰位、管理、火化及骨灰瓮、第二次安放相关费用。','火化次数与骨灰瓮数量、管理期限需确认。',{religions:['基督教'], source:'聚雅阁产品资料'});
add('yage-buddhist-double','聚雅阁佛教双人位','骨灰位','双人',[],'现有资料未提供完整费用清单。','历史资料标示售罄；最新价格与供应需确认。',{religions:['佛教'], source:'聚雅阁产品资料'});
add('teng-double','腾黄阁基督教双人位','骨灰位','双人',[v('DM 01及12',12888),v('DM 02及09–11',15888),v('DM 03–08',17888)],'双人骨灰位、管理、两次火化、两个骨灰瓮及相关安装费用。','管理期限、可选格位及安装费用范围需确认。',{religions:['基督教'], source:'腾黄阁产品资料'});
for (const religion of both) for (const capacity of ['单人','双人']) {
 if (religion==='基督教' && capacity==='双人') continue;
 add(`teng-${religion}-${capacity}`,`腾黄阁${religion}${capacity}位`,'骨灰位',capacity,[],'现有资料未提供对应售价及完整服务清单。','部分历史单人位置标示售罄；最新价格及供应需确认。',{religions:[religion],source:'腾黄阁产品资料'});
}
// Detailed table rows retain their own price labels, rather than treating a range as continuous stock.
add("7a-single","聚仙楼2 单人位","骨灰位","单人",[{"label": "SA-G、01｜1–3", "price": 19800}, {"label": "SA-07 至 11｜3A–10", "price": 19800}, {"label": "SA-G、01｜3A–10", "price": 22800}, {"label": "SA-02 至 06｜3A–10", "price": 27800}],"骨灰位及管理费；指定表格列有相应火化与骨灰瓮，具体数量依款式确认。","宗教适用、安装费用、半四人位包含项目需确认；不同位置价格不同。",{"source": "聚仙楼产品资料"});
add("7a-double","聚仙楼2 双人位","骨灰位","双人",[{"label": "DA-08 至 11｜1–6", "price": 31800}, {"label": "DA-G 至 02｜1–9", "price": 33800}, {"label": "DA-03 至 07｜1–6", "price": 42800}, {"label": "DA-G、01、02、08 至 11｜10–13A", "price": 33800}, {"label": "DA-03 至 07｜10–13A", "price": 45800}],"骨灰位及管理费；指定表格列有相应火化与骨灰瓮，具体数量依款式确认。","宗教适用、安装费用、半四人位包含项目需确认；不同位置价格不同。",{"source": "聚仙楼产品资料"});
add("7a-deluxe","聚仙楼2 加宽双人位","骨灰位","双人",[{"label": "DD-07 至 11｜1–2", "price": 35800}, {"label": "DD-G 至 01｜1–2", "price": 38800}, {"label": "DD-02 至 06｜1–2", "price": 47800}],"骨灰位及管理费；指定表格列有相应火化与骨灰瓮，具体数量依款式确认。","宗教适用、安装费用、半四人位包含项目需确认；不同位置价格不同。",{"source": "聚仙楼产品资料"});
add("7b-double","聚仙楼3 双人位","骨灰位","双人",[{"label": "DA-08 至 11｜31–33", "price": 53800}, {"label": "DA-G 至 02｜31–33", "price": 55800}, {"label": "DA-08 至 11｜33A–37、39A、39B", "price": 51800}, {"label": "DA-G 至 02｜33A–37、39A、39B", "price": 53800}, {"label": "DA-05 至 07｜33A–37、39A、39B", "price": 62800}, {"label": "DA-07 至 11｜39C–39J", "price": 58800}, {"label": "DA-G 至 01｜39C–39J", "price": 60800}, {"label": "DA-02 至 06｜39C–39J", "price": 71800}, {"label": "DA-07 至 11｜39K–55", "price": 47800}, {"label": "DA-G 至 01｜39K–55", "price": 49800}, {"label": "DA-02 至 06｜39K–55", "price": 58800}, {"label": "DA-G 至 01｜56–67", "price": 49800}, {"label": "DA-02｜56–67", "price": 58800}],"骨灰位及管理费；指定表格列有相应火化与骨灰瓮，具体数量依款式确认。","宗教适用、安装费用、半四人位包含项目需确认；不同位置价格不同。",{"source": "聚仙楼产品资料"});
add("7b-semi","聚仙楼3 半双人位","骨灰位","双人",[{"label": "DA-08 至 11｜38、39", "price": 40800}, {"label": "DA-G 至 02｜38、39", "price": 43800}, {"label": "DA-05 至 07｜38、39", "price": 51800}],"骨灰位及管理费；指定表格列有相应火化与骨灰瓮，具体数量依款式确认。","宗教适用、安装费用、半四人位包含项目需确认；不同位置价格不同。",{"source": "聚仙楼产品资料"});
add("7b-deluxe","聚仙楼3 加宽双人位","骨灰位","双人",[{"label": "DD-08 至 11｜5", "price": 55800}, {"label": "DD-G 至 02｜5", "price": 57800}, {"label": "DD-05 至 07｜5", "price": 66800}, {"label": "DD-07 至 11｜6", "price": 63800}, {"label": "DD-G 至 01｜6", "price": 65800}, {"label": "DD-07 至 11｜7", "price": 49800}, {"label": "DD-G 至 01｜7", "price": 51800}, {"label": "DD-02 至 06｜7", "price": 60800}, {"label": "DD-G 至 01｜8", "price": 51800}, {"label": "DD-02｜8", "price": 60800}],"骨灰位及管理费；指定表格列有相应火化与骨灰瓮，具体数量依款式确认。","宗教适用、安装费用、半四人位包含项目需确认；不同位置价格不同。",{"source": "聚仙楼产品资料"});
add("7b-quad","聚仙楼3 四人位","骨灰位","或以上",[{"label": "QA-08 至 11｜1–3A", "price": 70800}, {"label": "QA-G 至 02｜1–3A", "price": 80800}, {"label": "QA-05 至 07｜1–3A", "price": 102800}],"骨灰位及管理费；指定表格列有相应火化与骨灰瓮，具体数量依款式确认。","宗教适用、安装费用、半四人位包含项目需确认；不同位置价格不同。",{"source": "聚仙楼产品资料"});
add("7b-h50","聚仙楼3 H50多人位","骨灰位","或以上",[{"label": "Quadruple｜QA-3｜33A–37、39A、39B", "price": 83800}, {"label": "Semi Quadruple｜QA-3｜38、39", "price": 68800}, {"label": "Quadruple Deluxe｜QD-3｜5", "price": 108800}],"骨灰位及管理费；指定表格列有相应火化与骨灰瓮，具体数量依款式确认。","宗教适用、安装费用、半四人位包含项目需确认；不同位置价格不同。",{"source": "聚仙楼产品资料"});
add("7-double","聚仙楼 双人位","骨灰位","双人",[{"label": "DA-G 至 02｜03–13A", "price": 33800}, {"label": "DA-G、10 至 11", "price": 33800}, {"label": "DA-01、02、08 至 09", "price": 36800}, {"label": "DA-03 至 07", "price": 39800}],"骨灰位及管理费；指定表格列有相应火化与骨灰瓮，具体数量依款式确认。","宗教适用、安装费用、半四人位包含项目需确认；不同位置价格不同。",{"source": "聚仙楼产品资料"});
add("7-semi","聚仙楼 半双人位","骨灰位","双人",[{"label": "DA-G、10 至 11", "price": 25800}, {"label": "DA-01、02、08 至 09", "price": 27800}],"骨灰位及管理费；指定表格列有相应火化与骨灰瓮，具体数量依款式确认。","宗教适用、安装费用、半四人位包含项目需确认；不同位置价格不同。",{"source": "聚仙楼产品资料"});
for (const [id,name,capacity] of [['7-single','聚仙楼指定单人位','单人'],['7-deluxe','聚仙楼指定加宽双人位','双人']]) {
 add(id,name,'骨灰位',capacity,[],'对应历史价表无可用价格。','历史位置标示售罄；宗教、当前售价及供应需确认。',{source:'聚仙楼产品资料'});
}
for (const religion of both) {
  const pre = religion === '佛教' ? [10888,23888,35888,42888] : [9888,21888,33888,40888];
  const now = religion === '佛教' ? [12888,26888,40888,47888] : [11888,24888,38888,45888];
  ['富贵自由','富贵圆满','富贵尊荣','富贵辉煌'].forEach((name,i) => {
    add(`funeral-${religion}-${i}`,`${name}（${religion}）`,'殡仪服务',undefined,[{label:'预购参考价',price:pre[i],timing:'pre'},{label:'即时参考价',price:now[i],timing:'now'}],
      '3天2夜殡仪服务；临终咨询、遗体护理、灵堂与仪式筹备、治丧协调、入殓举殡及后续关怀，细项依配套。',
      `${i===0?'仅限火化。':''}不包含火化费用、墓地、骨灰位等安葬项目。预购适用条件、场地与供应需由顾问确认。`,{religions:[religion],source:`${religion}殡仪产品资料`});
  });
}
add('yunnan','云南善堂殡仪配套','殡仪服务',undefined,[v('单一配套参考价',8800)],'具体服务清单请咨询顾问，现有资料未提供逐项内容。','佛教、基督教均适用，仪式按需求调整；不受火化或土葬方式限制，不据此推定含火化、墓地、骨灰位等安葬费用。',{provider:'云南善堂',religions:both,source:'用户确认的云南善堂单一配套资料'});
add('pet-large','大型宠物墓地','宠物纪念',undefined,[v('6 ft × 10 ft／60 sqft',9800)],'土地、管理、设施、墓穴及宠物棺木。','是否包含墓碑需确认；宠物适用情况由顾问确认，不按体型自动匹配。',{method:'宠物土葬',source:'宠物墓园 Zone BB 产品资料'});
add('pet-small','小型宠物墓地','宠物纪念',undefined,[v('3 ft × 5 ft／15 sqft',8888)],'土地、墓碑、管理、设施、墓穴及宠物棺木。','宠物适用情况由顾问确认，不按体型自动匹配。',{method:'宠物土葬',source:'宠物墓园 Zone BB 产品资料'});
add('pet-urn','宠物骨灰墓地','宠物纪念',undefined,[v('2 ft × 3 ft／6 sqft',3888)],'土地、墓碑、管理、设施、骨灰安葬设施、骨灰瓮及火化费用。','具体使用条件、火化安排及供应需确认。',{method:'火化后骨灰安葬',source:'宠物墓园 Zone BB 产品资料'});
export const questionnaireProducts = products;
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
  if (!p.variants.length || (a.category !== '宠物纪念' && (a.religion === '其他' || !p.religions)) || (a.capacity && !p.capacity && a.category !== '殡仪服务' && a.category !== '宠物纪念')) return 'confirm';
  return 'match';
}
export function applicableVariants(p: ServiceProduct, a: Answers) {
  return p.variants.filter(v => !v.timing || a.situation !== '提前规划' && a.situation !== '目前需要安排' || v.timing === (a.situation === '提前规划' ? 'pre' : 'now'));
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
export function inquirySummary(a: Answers, selected: string[], browsing: boolean) {
  return ['您好，我想了解以下服务。', ...answerLines(a), ...(browsing?['正在查看当前类别的其他选择，所选产品可能不符合当前条件。']:[]),
    '感兴趣的产品：', ...(selected.length ? questionnaireProducts.filter(p=>selected.includes(p.id)).map(p=>`${p.provider} · ${p.name}\n${applicableVariants(p,a).map(v=>`${v.label} ${money(v.price)}${withinBudget(v.price,a)?'（符合所选预算）':'（不符合所选预算）'}`).join('；') || '价格需确认'}\n需确认：${p.restriction}${productStatus(p,a)==='confirm'?' 宗教、容量或价格等资料需进一步确认。':''}`) : ['尚未选择产品，可以先与顾问沟通。']),
    ...(a.religion==='其他'?['宗教及仪式适用情况需咨询确认。']:[]),supplyNotice].join('\n');
}
export function updateAnswers(a: Answers, key: keyof Answers, value: string): Answers {
  if(key==='category') return {...emptyAnswers, category:value as Answers['category'], religion:a.category && a.category!=='宠物纪念' && value!=='宠物纪念' ? a.religion : ''};
  if(key==='method') return {...a,method:value,size:value==='宠物土葬'?a.size:''};
  return {...a,[key]:value};
}
