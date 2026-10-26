import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {ProductPrices} from '../src/prototype/ProductPresentation';
import {ProductNavigationContext} from '../src/prototype/navigation';
import {mapPublicProduct,type PublicRecord} from '../src/catalog/publicRepository';
import {mapAdminPreviewProduct} from '../apps/admin/src/previewModel';
import {formatSqft,groupPricesByArea,pricePlanLabel} from '../shared/areaPriceGroups';
const record:PublicRecord={id:'zone-w-test',slug:'zone-w-test',name:'家庭福地 · Zone W',category_id:2,capacity_group:'family',religions:[{id:1,name:'佛教'}],attributes:{facing:'西北'},prices:[
 {offer_id:'1080',offer_name:'普通地段 1080 sqft',price_type:'standard',amount:308888,area_sqft_override:1080},
 {offer_id:'864-normal',offer_name:'普通地段 864 sqft',price_type:'standard',amount:238888,area_sqft_override:864},
 {offer_id:'864-corner',offer_name:'角头地段 864 sqft',price_type:'standard',amount:258888,area_sqft_override:864},
]};
const render=(raw=record,compact=false)=>renderToStaticMarkup(<ProductNavigationContext.Provider value={{website:true,homePath:'/',listPath:()=> '/',detailPath:()=> '/'}}><ProductPrices product={mapPublicProduct(raw)} detailed={!compact} compact={compact}/></ProductNavigationContext.Provider>);
test('Zone W prices form ascending area groups and show types and unchanged prices once',()=>{
 const before=JSON.stringify(record),html=render();
 assert(html.indexOf('<h3>864 sqft</h3>')<html.indexOf('<h3>1,080 sqft</h3>'));
 const first=html.slice(html.indexOf('<h3>864 sqft</h3>'),html.indexOf('<h3>1,080 sqft</h3>'));
 assert.match(first,/>普通地段</);assert.match(first,/>角头地段</);
 for(const amount of ['RM 238,888','RM 258,888','RM 308,888'])assert.equal(html.split(amount).length-1,1);
 assert.doesNotMatch(html,/普通地段 1080 sqft|角头地段 864 sqft|面积：|平方英尺/);
 assert.equal(JSON.stringify(record),before);
});
test('single prices keep a product-price row; compact/niche/funeral layouts do not acquire area groups',()=>{
 const single={...record,prices:[record.prices[0]]};
 assert.match(render(single),/fgp-price-table/);assert.match(render(single),/>产品售价</);assert.doesNotMatch(render(single),/fgp-area-price-group/);
 assert.doesNotMatch(render(record,true),/fgp-area-price-group/);
 assert.doesNotMatch(render({...record,category_id:3}),/fgp-area-price-group|sqft/);
 const funeral={...record,category_id:4,prices:record.prices.slice(0,2).map((price,index)=>({...price,price_type:index?'at_need':'pre_need'}))};
 assert.match(render(funeral),/预购价格/);assert.match(render(funeral),/即用价格/);assert.doesNotMatch(render(funeral),/fgp-area-price-group/);
});
test('missing structured area is explicit, never inferred from a name, and notes remain associated',()=>{
 const raw={...record,prices:record.prices.map((price,index)=>({...price,area_sqft_override:index===0?null:price.area_sqft_override,price_note:index===2?'角头独立备注':null}))};
 const html=render(raw);
 assert.match(html,/<h3>面积未填写<\/h3>/);assert.doesNotMatch(html,/<h3>1,080 sqft<\/h3>/);
 assert(html.indexOf('角头独立备注')>html.indexOf('角头地段'));
 assert.equal(pricePlanLabel('普通地段 1080 sqft',null,864),'普通地段 1080 sqft');
 assert.equal(pricePlanLabel('普通地段 1080 sqft',null,1080),'普通地段');
 assert.equal(pricePlanLabel('普通地段 1080 sqft','角头地段',1080),'角头地段');
 assert.equal(formatSqft(1080),'1,080 sqft');
 assert.equal(formatSqft(10.83),'10.83 sqft');
 assert.deepEqual(groupPricesByArea([{area:1080},{area:864},{area:864}]).map(group=>group.items.length),[2,1]);
});
test('inherited area groups correctly and scoped prices retain religion labels and filtering',()=>{
 const raw={...record,attributes:{area_sqft:864},religions:[{id:1,name:'佛教'},{id:2,name:'基督教'}],prices:record.prices.slice(1).map((price,index)=>({...price,area_sqft_override:null,religion_id:index+1}))};
 const html=render(raw);assert.match(html,/<h3>864 sqft<\/h3>/);assert.match(html,/普通地段（佛教）/);assert.match(html,/角头地段（基督教）/);
});


test('unsaved admin preview uses the same area groups and prices as the public detail',()=>{
 const bundle:any={product:{...record},burial_details:[record.attributes],product_offers:record.prices.map((price,index)=>({id:price.offer_id,name:price.offer_name,area_sqft_override:price.area_sqft_override,is_active:true,sort_order:index})),offer_prices:record.prices.map((price,index)=>({id:`price-${index}`,offer_id:price.offer_id,price_type:price.price_type,price_amount:price.amount,is_published:true})),product_religions:[{religion_id:1,is_published:true}],product_images:[],product_inclusions:[]};
 const preview=mapAdminPreviewProduct(bundle,{religions:[{id:1,name:'佛教',is_active:true}],categories:[],series:[],notices:[]});
 const html=renderToStaticMarkup(<ProductNavigationContext.Provider value={{website:true,homePath:'/',listPath:()=> '/',detailPath:()=> '/'}}><ProductPrices product={preview} detailed/></ProductNavigationContext.Provider>);
 assert.equal(html,render());
});
