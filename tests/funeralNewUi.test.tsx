import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductDetailContent } from '../src/prototype/ProductPresentation';
import { ProductNavigationContext } from '../src/prototype/navigation';
import { mapPublicProduct, type PublicRecord } from '../src/catalog/publicRepository';
const raw: PublicRecord = {
  id:'sample',slug:'sample',name:'后台原产品名称',category_id:4,
  religions:[{id:1,name:'佛教'}],attributes:{duration_days:3,duration_nights:2,service_venue:'后台确认地点'},
  prices:[{offer_id:'o',offer_name:'',price_type:'pre_need',amount:23888,price_note:'仅预购条件'},{offer_id:'o',offer_name:'',price_type:'at_need',amount:26888,price_note:'仅即用条件'}],
  inclusions:[{name:'原项目甲',quantity:40,unit:'份',group_title:'后台分组甲'},{name:'原项目乙',group_title:'后台分组甲'},{name:'未分组项目'}],
};
const render = (record: PublicRecord) => renderToStaticMarkup(<ProductNavigationContext.Provider value={{website:true,homePath:'/nirvana',listPath:()=>'/nirvana',detailPath:()=>''}}><ProductDetailContent product={mapPublicProduct(record)}/></ProductNavigationContext.Provider>);
test('funeral group counts reflect source rows, not quantities or prototype grouping', () => {
  const html=render(raw);
  assert.match(html, /后台分组甲/);assert.match(html,/原项目甲 × 40份/);assert.match(html,/原项目乙/);assert.match(html,/未分组项目/);
  assert.match(html,/fgp-inclusion-count">2 项/);assert.match(html,/fgp-inclusion-count">1 项/);
  assert.doesNotMatch(html,/8 项核心服务|五大维度|正规法律契约|灵堂布置与治丧用品/);
  assert.equal((html.match(/fgp-inclusion-number/g)||[]).length,2);
});
test('funeral presentation keeps identity and independent notes without default tax text', () => {
  const html=render(raw);assert.match(html,/<h1>后台原产品名称<\/h1>/);assert.match(html,/殡仪服务价格/);
  assert.match(html,/RM 23,888<\/strong><p class="fgp-price-note">仅预购条件/);assert.match(html,/RM 26,888<\/strong><p class="fgp-price-note">仅即用条件/);
  assert.doesNotMatch(html,/印花税|总价格|服务天数/);
  const empty=render({...raw,inclusions:[],price_note_override:null,prices:raw.prices?.map(p=>({...p,price_note:null}))});
  assert.doesNotMatch(empty,/fgp-inclusion-number|fgp-inclusion-count|class="fgp-price-note"/);
});
