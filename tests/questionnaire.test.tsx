import { whatsappUrl } from '../src/data/site';
import { prototypeProducts } from '../src/prototype/products';
import { questionnaireIncludes } from '../src/data/questionnaireCatalog';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { questionnaireProducts as products, emptyAnswers, productStatus, complete, updateAnswers, inquirySummary, withinBudget, applicableVariants, type Answers } from '../src/data/questionnaire';
const funeral: Answers = {...emptyAnswers, category:'殡仪服务',religion:'基督教',situation:'提前规划',budget:'0'};
const freedom = products.find(p=>p.id==='funeral-2-1')!;
const yunnan = products.find(p=>p.id==='yunnan')!;
test('funeral budget uses selected timing and provider prices',()=>{
 assert.equal(productStatus(freedom,funeral),'match');
 assert.equal(productStatus(freedom,{...funeral,situation:'目前需要安排'}),'exclude');
 assert.equal(productStatus(yunnan,{...funeral,situation:'目前需要安排'}),'match');
 assert.equal(productStatus(products.find(p=>p.id==='funeral-1-1')!,{...funeral,religion:'佛教'}),'exclude');
 const unknown = {...funeral,situation:'先了解，尚未确定'};
 assert.equal(applicableVariants(freedom,unknown).length,2);
 assert.equal(productStatus(freedom,unknown),'match');
});
test('budget bounds include lower bound and exclude upper',()=>{
 assert.equal(withinBudget(10000,funeral),false);
 assert.equal(withinBudget(10000,{...funeral,budget:'1'}),true);
 assert.equal(withinBudget(20000,{...funeral,budget:'1'}),false);
});

test('questionnaire projects current Nirvana products and no longer exposes niche position prices',()=>{
 const expected = prototypeProducts.filter(p=>[1,2,3,4,7].includes(p.category));
 assert.equal(products.filter(p=>p.provider==='富贵山庄').length,expected.length);
 for (const source of expected) {
   const result = products.find(p=>p.id===source.id)!;
   assert.equal(result.name, source.name);
   assert.deepEqual(result.religions, source.religions.length ? source.religions.map(r=>r.name) : undefined);
   if(source.category===3) {
     assert.equal(result.variants.length,1);
     assert.equal(result.variants[0].price,Math.min(...source.offers.map(o=>o.amount)));
     assert.equal(result.placement,source.placement);
     assert.doesNotMatch(result.variants[0].label,/排|层|DA-|SA-/);
   }
 }
 const w = products.find(p=>p.id==='w-double-package')!;
 const christian = questionnaireIncludes(w,{...emptyAnswers,religion:'基督教'});
 assert.match(christian,/一对天使/);
 assert.doesNotMatch(christian,/香炉|后土/);
 assert.match(questionnaireIncludes(w,{...emptyAnswers,religion:'佛教'}),/香炉/);
});
test('branch transition clears answers and only retains applicable religion',()=>{
 let a = updateAnswers(funeral,'category','骨灰位');
 assert.equal(a.religion,'基督教'); assert.equal(a.situation,''); assert.equal(a.budget,'');
 a = updateAnswers(a,'category','宠物纪念'); assert.equal(a.religion,'');
 a = {...a,method:'宠物土葬',size:'大型',budget:'any'}; assert.equal(complete(a),true);
 a = updateAnswers(a,'method','火化后骨灰安葬'); assert.equal(a.size,''); assert.equal(complete(a),true);
 assert.equal(updateAnswers(a,'category','骨灰位').religion,'');
});
test('pet size never filters plots and summary contains only applicable fields',()=>{
 const a: Answers={...emptyAnswers,category:'宠物纪念',method:'宠物土葬',size:'小型',budget:'any'};
 for(const p of products.filter(p=>p.category==='宠物纪念')) assert.equal(productStatus(p,a),productStatus(p,{...a,size:'大型'}));
 const summary=inquirySummary(a,['pet-large'],false);
 assert.match(summary,/宠物体型：小型/); assert.doesNotMatch(summary,/使用情况：|宗教：|使用人数：/);
 assert.doesNotMatch(inquirySummary(updateAnswers(a,'method','火化后骨灰安葬'),[],false),/宠物体型/);
});
test('unknown religious and price data is not represented as a match',()=>{
 const a: Answers={...emptyAnswers,category:'骨灰位',religion:'佛教',capacity:'单人',budget:'any'};
 assert.equal(productStatus(products.find(p=>p.id==='loving-kindness-2-single')!,a),'match');
 assert.equal(productStatus({...products.find(p=>p.id==='loving-kindness-2-single')!,religions:undefined,variants:[]},a),'confirm');
 assert.equal(productStatus(products.find(p=>p.id==='juxian-1')!,a),'confirm');
 assert.equal(productStatus(yunnan,{...funeral,religion:'其他'}),'confirm');
 assert.match(inquirySummary({...funeral,religion:'其他'},[],false),/宗教及仪式适用情况需咨询确认/);
});
test('unanswered fields stay empty and excluded services never enter questionnaire data',()=>{
 assert.equal(complete(emptyAnswers),false);
 assert.doesNotMatch(inquirySummary(emptyAnswers,[],false),/尚未填写|【咨询需求】|【感兴趣的产品】/);
 assert.ok(products.every(p=>!['生基园','单独火化服务','神主灵位'].includes(p.category)));
 assert.ok(products.every(p=>p.variants.every(v=>v.price>0)));
});

test('WhatsApp summary separates requirements, numbered products, prices and confirmation bullets',()=>{
 const a: Answers={...emptyAnswers,category:'骨灰位',religion:'佛教',capacity:'或以上',budget:'any'};
 const text=inquirySummary(a,['juya-1','juxian-7'],false);
 assert.match(text,/【咨询需求】\n• 服务类别：骨灰位\n• 宗教：佛教/);
 assert.match(text,/【感兴趣的产品】\n\n1\. 聚雅阁 · 佛教三人骨灰位/);
 assert.match(text,/\n\n2\. 聚仙楼 · 水月观音四人骨灰位/);
 assert.match(text,/1\. 聚雅阁 · 佛教三人骨灰位\n  所属机构：富贵山庄\n\n  参考价格：\n    - 最低起价：RM16,888 起/);
 assert.match(text,/  需确认事项：\n    - 以上价格未包含印花税/);
 assert.ok(text.split('\n').every(line=>!line.trim() || /^(?:【|您好|麻烦|\d+\. |• |  \S|    - )/.test(line)));
 assert.doesNotMatch(text,/\t|\n{3,}/);
 assert.equal(text.split('【价格及供应说明】').length-1,1);
 assert.doesNotMatch(text,/符合所选预算/);
 const url=whatsappUrl(text)!;
 assert.ok(url.includes('%0A%0A'));
 assert.equal(new URL(url).searchParams.get('text'),text);
});

test('partial answers and absent price data hide empty fields without losing notes',()=>{
 const a: Answers={...emptyAnswers,category:'骨灰位',religion:'佛教',capacity:'单人'};
 const text=inquirySummary(a,['juxian-1'],false);
 assert.match(text,/服务类别：骨灰位/);
 assert.doesNotMatch(text,/尚未填写|• 预算：|undefined|null/);
 assert.match(text,/最低起价：RM19,800 起/);
 assert.match(text,/具体售价及服务内容请与顾问确认/);
 assert.ok(text.split('\n').every(line=>!/^\s*•\s*$/.test(line)));
});
test('real paragraphs survive WhatsApp redirect parameter encoding on desktop and mobile',()=>{
 const text=inquirySummary({...funeral,situation:'先了解，尚未确定',budget:'any'},[freedom.id,yunnan.id],false);
 assert.ok(text.includes('\n\n  参考价格：\n    - '));
 assert.ok(text.includes('\n  包含内容：\n    - '));
 assert.ok(text.includes('\n  需确认事项：\n    - '));
 assert.doesNotMatch(text,/\\n/);
 const firstHop=new URL(whatsappUrl(text)!);
 const decoded=firstHop.searchParams.get('text')!;
 const redirect=new URL('https://api.whatsapp.com/send/');
 redirect.searchParams.set('phone','60198186134'); redirect.searchParams.set('text',decoded);
 assert.equal(redirect.searchParams.get('text'),text);
 assert.ok(redirect.toString().includes('%0A%0A'));
 assert.equal(new URL(redirect.toString()).searchParams.get('text')!.split('\n').length,text.split('\n').length);
 assert.match(text,/2\. 云南善堂殡仪配套/);
});
