import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {ProductDetailContent,ProductPrices} from '../src/prototype/ProductPresentation';
import {ProductNavigationContext} from '../src/prototype/navigation';
import {mapPublicProduct,loadPublicProducts,type PublicRecord} from '../src/catalog/publicRepository';
import {lowestPrice,sortProducts} from '../src/prototype/model';
import {nirvanaQuestionnaireProducts} from '../src/data/questionnaireCatalog';
import {sameDesign} from '../shared/saleStatus';
const raw:PublicRecord={id:'p',slug:'sales-check',name:'销售测试',category_id:2,religions:[{id:1,name:'佛教'}],prices:[{offer_id:'sold',offer_name:'售罄方案',price_type:'standard',amount:100,sale_status:'sold_out',area_sqft_override:216},{offer_id:'live',offer_name:'在售方案',price_type:'standard',amount:200,sale_status:'available',area_sqft_override:252}],images:[{id:'sold-design',bucket:'test',path:'a.jpg',image_type:'design',design_name:'售罄设计',sale_status:'sold_out'},{id:'live-design',bucket:'test',path:'b.jpg',image_type:'design',design_name:'在售设计',sale_status:'available'}]};
const render=(children:React.ReactNode)=>renderToStaticMarkup(<ProductNavigationContext.Provider value={{website:true,homePath:'/nirvana',listPath:()=>'/nirvana',detailPath:()=>''}}>{children}</ProductNavigationContext.Provider>);
test('partial sales retain designs and price plans with sold-out badges, cards quote the available price',()=>{
 const product=mapPublicProduct(raw);assert(product.visible);assert.equal(product.images?.length,2);assert.equal(product.offers.length,2);assert.equal(lowestPrice(product),200);
 assert.deepEqual(nirvanaQuestionnaireProducts([product])[0].variants.map(v=>v.price),[200]);
 const detail=render(<ProductDetailContent product={product}/>);assert.match(detail,/售罄设计/);assert.match(detail,/在售设计/);assert.match(detail,/售罄方案/);assert.match(detail,/在售方案/);assert.equal((detail.match(/class="fgp-sale-status"/g)||[]).length,1);assert.match(detail,/fgp-design-sold-badge/);assert.match(detail,/<del>RM 100<\/del>/);
 const compact=render(<ProductPrices product={product} compact/>);assert.match(compact,/RM 200/);assert.doesNotMatch(compact,/RM 100/);
 assert.equal(mapPublicProduct({...raw,sale_status:'sold_out'}).visible,true);
});
test('six categories retain sold-out references, funeral services keep their existing eligibility rule',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify([raw,{...raw,id:'hidden',sale_status:'sold_out'}]),{status:200,headers:{'Content-Type':'application/json'}}));
 assert.equal((await loadPublicProducts({url:'https://example.supabase.co',key:'sb_publishable_test'})).length,2);
 for (const category_id of [1,2,3,5,6,7]) assert(mapPublicProduct({...raw,category_id,sale_status:'sold_out'}).visible);
 assert(!mapPublicProduct({...raw,category_id:4,sale_status:'sold_out'}).visible);
 assert.equal(nirvanaQuestionnaireProducts([mapPublicProduct({...raw,sale_status:'sold_out'})]).length,0);
});
test('same named design synchronizes within a religion; unnamed and other religions stay independent',()=>{
 const a={id:'a',image_type:'design',design_name:'Type A',religion_id:1};
 assert(sameDesign(a,{...a,id:'b'}));assert(!sameDesign(a,{...a,id:'c',religion_id:2}));assert(!sameDesign({...a,design_name:null},{...a,id:'d',design_name:null}));
});

 test('sold-out products follow available products in every sort mode',()=>{
 const available=mapPublicProduct(raw),sold=mapPublicProduct({...raw,id:'sold',slug:'sold',sale_status:'sold_out'});
 for(const sort of ['default','price-asc','price-desc']) assert.deepEqual(sortProducts([sold,available],sort).map(p=>p.id),[available.id,sold.id]);
 });
