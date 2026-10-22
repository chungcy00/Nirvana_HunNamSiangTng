import { PublicFixture, fixtureQuestionnaireProducts } from "./publicFixtures";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PrototypeCatalog, PrototypeDetail, PrototypeLayout } from "../src/prototype/Prototype";
import { prototypeProducts } from "../src/prototype/products";
import { categories, capacitiesFor, filterProducts, hasCapacity, hasReligion, listPath, religionsFor, visibleProducts } from "../src/prototype/model";

function render(path: string) {
  return renderToStaticMarkup(<PublicFixture><MemoryRouter initialEntries={[path]}><Routes><Route path="/prototype" element={<PrototypeLayout/>}>
    <Route index element={<PrototypeCatalog home/>}/><Route path="list/:categorySlug" element={<PrototypeCatalog/>}/><Route path="product/:productId" element={<PrototypeDetail/>}/>
  </Route></Routes></MemoryRouter></PublicFixture>);
}
test("七大类别固定，三类人数与四类宗教规则准确",()=>{
  assert.equal(categories.length,7);
  assert.deepEqual(categories.map(c=>c.name),["火化土葬","传统土葬","骨灰位","殡仪服务","祖先牌位","生基风水","宠物安葬"]);
  assert.deepEqual(categories.filter(c=>hasCapacity(c.id)).map(c=>c.id),[1,2,3]);
  assert.deepEqual(categories.filter(c=>hasReligion(c.id)).map(c=>c.id),[1,2,3,4]);
});
test("人数导航来自实际资料，家庭不转为固定人数",()=>{
  assert.deepEqual(capacitiesFor(prototypeProducts,1),['double']);
  assert.deepEqual(capacitiesFor(prototypeProducts,2),['single','double','family']);
  assert.deepEqual(capacitiesFor(prototypeProducts,3),['single','double','triple','four_plus']);
  assert.equal(prototypeProducts.find(p=>p.id==='w-family-lot')?.capacityCount,undefined);
});
test("W区宗教按用户确认，地段和配套保持独立",()=>{
  const w=prototypeProducts.filter(p=>p.id.startsWith('w-'));
  assert.equal(w.length,7);
  for(const p of w)assert.deepEqual(p.religions.map(r=>r.name),['佛教','基督教']);
  assert.notEqual(w.find(p=>p.id==='w-double-lot')?.id,w.find(p=>p.id==='w-double-package')?.id);
});
test("人数与宗教组合、单独宗教筛选及无结果行为",()=>{
  const combined=filterProducts(prototypeProducts,3,'double','2');
  assert(combined.length>0);assert(combined.every(p=>p.capacity==='double'&&p.religions.some(r=>r.id==='2')));
  assert.equal(filterProducts(prototypeProducts,3,'single','2').length,0);
  assert.equal(filterProducts(prototypeProducts,4,'','2').length,4);
});
test("未公开宗教配置不进入选项、标签或专属内容",()=>{
  const aa=structuredClone(prototypeProducts.find(p=>p.id==='aa-double-package')!);
  aa.religions[1].isPublished=false;
  const projected=visibleProducts([aa]);
  assert.equal(projected[0].religions.length,1);
  assert.equal(filterProducts([aa],1,'','2').length,0);
  assert.deepEqual(religionsFor([aa],1),[{id:'1',name:'佛教'}]);
  aa.religions[0].isPublished=false;
  assert.equal(visibleProducts([aa]).length,0);
  aa.visible=false;assert.equal(filterProducts([aa],1).length,0);
});
test("聚仙楼七项独立产品均室内，其他骨灰位室外",()=>{
  const j=prototypeProducts.filter(p=>p.id.startsWith('juxian-'));
  assert.equal(j.length,7);assert(j.every(p=>p.category===3&&p.placement==='indoor'&&p.referencePrice));
  assert(prototypeProducts.filter(p=>p.category===3&&!p.id.startsWith('juxian-')).every(p=>p.placement==='outdoor'));
});
for(const c of categories)test(`${c.name}列表显示适用筛选，隐藏禁用字段`,()=>{
  const html=render(listPath(c.id));
  assert.equal(html.includes('aria-label="使用人数筛选"'),hasCapacity(c.id));
  assert.equal(html.includes('aria-labelledby="fgp-religion-label"'),hasReligion(c.id));
  assert.doesNotMatch(html,/售罄|库存|所属区域|楼层|层位|内部代码|地段编号/);
  assert.match(html,/查看详情/);
});
test("全部33项产品使用同一详情框架，详情无专属咨询按钮",()=>{
  assert.equal(prototypeProducts.length,33);
  for(const p of prototypeProducts){
    const html=render('/prototype/product/'+p.id);
    assert(html.includes(p.name));assert.match(html,/包含项目/);
    assert.doesNotMatch(html,/咨询此|WhatsApp|wa\.me|库存|售罄|所属区域|楼层|层位/);
    if(p.category===3){assert.match(html,/安放环境/);assert.match(html,/起<\/em>/);assert.doesNotMatch(html,/朝向|面积/);}
    if(p.category===4){assert.match(html,/预购价格/);assert.match(html,/即用价格/);assert.doesNotMatch(html,/总价格|使用人数|朝向|面积/);}
  }
});
test("AA不同宗教设计共用产品与价格，无额外设计产品",()=>{
  assert.equal(prototypeProducts.filter(p=>p.id.startsWith('aa-')).length,1);
  const html=render('/prototype/product/aa-double-package');
  for(const name of ['甲款','乙款','丙款','丁款'])assert(html.includes(name));
  assert.match(html,/RM 63,888/);
});
test("骨灰位最低起价与殡仪双价格准确，价格备注不计入金额",()=>{
  const j=render('/prototype/product/juxian-1');assert.match(j,/RM 19,800/);assert.match(j,/待核实/);
  const f=render('/prototype/product/funeral-1-1');assert.match(f,/RM 10,888/);assert.match(f,/RM 12,888/);assert.match(f,/以上价格未包含印花税。/);
});
test("未知分类与未知产品有返回入口，不意外显示其他产品",()=>{
  assert.match(render('/prototype/list/unknown'),/没有找到这个产品页面/);
  assert.match(render('/prototype/product/unknown'),/返回产品首页/);
});
test("空结果提供清除筛选，原型首页可进入独立列表页",()=>{
  assert.match(render('/prototype/list/niches?capacity=single&religion=2'),/暂时没有符合条件的产品/);
  const html=render('/prototype');assert.match(html,/查看完整列表/);assert.match(html,/list\/cremation-burial/);
});
