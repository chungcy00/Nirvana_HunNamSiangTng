import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {mapPublicProduct, type PublicRecord} from '../src/catalog/publicRepository';
import {mapAdminPreviewProduct} from '../apps/admin/src/previewModel';
import {ProductDetailContent} from '../src/prototype/ProductPresentation';
import {ProductNavigationContext} from '../src/prototype/navigation';
import {hasOfferDifferences} from '../shared/offerAttributes';
const refs:any={religions:[{id:1,name:'佛教',is_active:true}],series:[],notices:[],categories:[]};
const raw:PublicRecord={id:'test',slug:'test',name:'双人配套',category_id:1,capacity_group:'double',religions:[{id:1,name:'佛教',configuration_name:'莲花设计配置',configuration_notes:'按宗教安排仪式'}],attributes:{facing:'朝南',area_sqft:56,urn_capacity:2,cremation_count:2,burial_notes:'已填写安葬说明'},inclusions:[{name:'骨灰瓮及盒',quantity:2,unit:'套'},{name:'火化服务',quantity:2,unit:'次'}],prices:[{offer_id:'offer',offer_name:'角头方案',price_type:'standard',amount:20000,facing_override:'朝北',area_sqft_override:66,position_type:'角头'}]};
const render=(product:ReturnType<typeof mapPublicProduct>)=>renderToStaticMarkup(<ProductNavigationContext.Provider value={{website:true,homePath:'/',listPath:()=> '/',detailPath:()=> '/'}}><ProductDetailContent product={product}/></ProductNavigationContext.Provider>);

test('offer differences and previously dropped public fields survive API and unsaved preview equally',()=>{
  const bundle:any={product:{...raw},burial_details:[raw.attributes],product_offers:[{id:'offer',name:'角头方案',is_active:true,...raw.prices[0]}],offer_prices:[{id:'price',offer_id:'offer',price_type:'standard',price_amount:20000,is_published:true}],product_religions:[{religion_id:1,is_published:true,...raw.religions[0]}],product_images:[],product_inclusions:raw.inclusions!.map((item,i)=>({id:`item-${i}`,product_id:raw.id,item_name:item.name,quantity:item.quantity,unit:item.unit,sort_order:i}))};
  const published=mapPublicProduct(raw),preview=mapAdminPreviewProduct(bundle,refs);
  assert.equal(render(preview),render(published));
  assert.deepEqual(preview.specifications,published.specifications);
  const html=render(published);
  for(const text of ['骨灰瓮及盒 × 2套','火化服务 × 2次','已填写安葬说明','莲花设计配置','按宗教安排仪式','面积：66 平方英尺','朝向：朝北','位置：角头']) assert(html.includes(text),text);
});
test('same common/offer attributes are not repeated, while a single differing offer still displays its specs',()=>{
  const same={...raw,prices:[{...raw.prices[0],area_sqft_override:56,facing_override:'朝南',position_type:null}]};
  assert.equal(hasOfferDifferences({facing_override:'朝南',area_sqft_override:'56.00'},raw.attributes!),false);
  assert.doesNotMatch(render(mapPublicProduct(same)),/fgp-offer-attributes/);
  assert.match(render(mapPublicProduct(raw)),/面积：66 平方英尺/);
});
test('category attribute allowlists display real specs and notes without internal fields',()=>{
  const cases:[number,Record<string,unknown>,string[]][]=[
    [1,{length_ft:7,width_ft:8,urn_capacity:2,cremation_count:2,burial_notes:'安葬说明测试'},['长度','宽度','安葬说明测试']],
    [2,{length_ft:9,width_ft:10,burial_notes:'福地说明测试'},['长度','宽度','福地说明测试']],
    [3,{theme_name:'楼阁主题',niche_style:'款式说明测试',niche_notes:'骨灰位补充测试'},['楼阁主题','款式说明测试','骨灰位补充测试']],
    [5,{tablet_type:'双人牌位',tablet_capacity:2,tablet_notes:'牌位补充测试'},['双人牌位','牌位容量','牌位补充测试']],
    [6,{fengshui_type:'生基类型测试',configuration_notes:'生基配置测试'},['生基类型测试','生基配置测试']],
    [7,{pet_size_class:'小型',pet_burial_method:'ash_burial',length_ft:2,width_ft:3,pet_notes:'宠物说明测试'},['小型','骨灰安葬','长度','宽度','宠物说明测试']],
  ];
  for(const [category_id,attributes,texts] of cases){
    const html=render(mapPublicProduct({...raw,category_id,attributes:{...attributes,internal_notes:'PRIVATE_SENTINEL',source_reference:'PRIVATE_SOURCE'}}));
    texts.forEach(text=>assert(html.includes(text),`${category_id}: ${text}`));
    assert.doesNotMatch(html,/PRIVATE_SENTINEL|PRIVATE_SOURCE/);
    if(category_id===3)assert.doesNotMatch(html,/面积：66|朝向：朝北/);
  }
});


test('urn and cremation counts belong only to inclusion items, never the specification header',()=>{
  const product=mapPublicProduct(raw),html=render(product);
  const header=html.slice(html.indexOf('<header'),html.indexOf('</header>'));
  assert.doesNotMatch(header,/骨灰瓮|火化次数|火化服务/);
  assert.equal((html.match(/骨灰瓮及盒 × 2套/g)||[]).length,1);
  assert.equal((html.match(/火化服务 × 2次/g)||[]).length,1);
  assert(html.indexOf('骨灰瓮及盒 × 2套')>html.indexOf('id="fgp-inclusions"'));
});
