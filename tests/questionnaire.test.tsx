import { test } from 'node:test';
import assert from 'node:assert/strict';
import { questionnaireProducts as products, emptyAnswers, productStatus, complete, updateAnswers, inquirySummary, withinBudget, applicableVariants, type Answers } from '../src/data/questionnaire';
const funeral: Answers = {...emptyAnswers, category:'殡仪服务',religion:'基督教',situation:'提前规划',budget:'0'};
const freedom = products.find(p=>p.id==='funeral-基督教-0')!;
const yunnan = products.find(p=>p.id==='yunnan')!;
test('funeral budget uses selected timing and provider prices',()=>{
 assert.equal(productStatus(freedom,funeral),'match');
 assert.equal(productStatus(freedom,{...funeral,situation:'目前需要安排'}),'exclude');
 assert.equal(productStatus(yunnan,{...funeral,situation:'目前需要安排'}),'match');
 assert.equal(productStatus(products.find(p=>p.id==='funeral-佛教-0')!,{...funeral,religion:'佛教'}),'exclude');
 const unknown = {...funeral,situation:'先了解，尚未确定'};
 assert.equal(applicableVariants(freedom,unknown).length,2);
 assert.equal(productStatus(freedom,unknown),'match');
});
test('budget bounds include lower bound and exclude upper',()=>{
 assert.equal(withinBudget(10000,funeral),false);
 assert.equal(withinBudget(10000,{...funeral,budget:'1'}),true);
 assert.equal(withinBudget(20000,{...funeral,budget:'1'}),false);
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
 assert.equal(productStatus(products.find(p=>p.id==='kindness')!,a),'confirm');
 assert.equal(productStatus(products.find(p=>p.id==='yage-佛教-single')!,a),'confirm');
 assert.equal(productStatus(yunnan,{...funeral,religion:'其他'}),'confirm');
 assert.match(inquirySummary({...funeral,religion:'其他'},[],false),/宗教及仪式适用情况需咨询确认/);
});
test('unanswered fields stay empty and excluded services never enter questionnaire data',()=>{
 assert.equal(complete(emptyAnswers),false);
 assert.match(inquirySummary(emptyAnswers,[],false),/尚未填写/);
 assert.ok(products.every(p=>!['生基园','单独火化服务','神主灵位'].includes(p.category)));
 assert.ok(products.every(p=>p.variants.every(v=>v.price>0)));
});
