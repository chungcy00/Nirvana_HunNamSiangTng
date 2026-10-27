import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {PublicCatalogContext} from '../src/catalog/publicContext';
import {WebsiteRoutes} from './eagerWebsiteRoutes';
import {prototypeProducts} from '../src/prototype/products';
import {emptyAnswers,productStatus,inquirySummary} from '../src/data/questionnaire';
import {institutionQuestionnaireProducts,nirvanaQuestionnaireProducts,questionnaireProductPath} from '../src/data/questionnaireCatalog';
import {loadPublicProducts,mapPublicProduct,type PublicRecord} from '../src/catalog/publicRepository';
const funeral=prototypeProducts.find(p=>p.category===4)!;
const yunnan={...funeral,id:'isolated-yunnan-funeral',name:'隔离测试云南配套',institution:'yunnan' as const};
const products=[...prototypeProducts,yunnan];
function render(path:string,status:'ready'|'loading'|'error'='ready') {return renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><PublicCatalogContext.Provider value={{products,status,retry:()=>{}}}><WebsiteRoutes/></PublicCatalogContext.Provider></MemoryRouter>);}
test('public catalogue and detail routes isolate institutions, including guessed foreign slugs',()=>{
 assert(!render('/nirvana?category=4').includes(yunnan.name));
 const html=render('/yunnan-siantang');assert(html.includes(yunnan.name));assert(!html.includes(funeral.name));
 assert(render('/yunnan-siantang/products/item/'+yunnan.id).includes(yunnan.name));
 assert(render('/nirvana/products/item/'+yunnan.id).includes('没有找到这个产品页面'));
 assert(render('/yunnan-siantang/products/item/'+funeral.id).includes('没有找到这个产品页面'));
 assert(render('/yunnan-siantang','error').includes('产品资料暂时无法载入'));
 assert(!render('/yunnan-siantang','loading').includes('当前暂无公开配套'));
});
test('questionnaire includes published Yunnan funeral packages without changing burial providers',()=>{
 const all=institutionQuestionnaireProducts(products),p=all.find(p=>p.id===yunnan.id)!;
 assert.equal(p.provider,'云南善堂');assert(!nirvanaQuestionnaireProducts(products).some(p=>p.id===yunnan.id));
 const a={...emptyAnswers,category:'殡仪服务' as const,religion:p.religions![0],situation:'提前规划',budget:'any'};
 assert.equal(productStatus(p,a),'match');assert.equal(productStatus(p,{...a,category:'传统土葬'}),'exclude');
 assert.equal(questionnaireProductPath(p),'/yunnan-siantang/products/item/'+yunnan.id);
 const text=inquirySummary(a,[p.id],false,all);assert(text.includes('云南善堂'));assert(text.includes(p.name));
 assert(!institutionQuestionnaireProducts([{...yunnan,saleStatus:'sold_out'}]).length);
});
test('old public API remains a safe Nirvana-only fallback during rollout',async t=>{
 const raw:PublicRecord={id:'id',slug:'legacy',name:'legacy',category_id:4,religions:[{id:1,name:'佛教'}],prices:[]};
 const calls:string[]=[];t.mock.method(globalThis,'fetch',async (url: unknown)=>{calls.push(String(url));return calls.length===1?new Response('{}',{status:404}):Response.json([raw]);});
 const result=await loadPublicProducts({url:'https://example.supabase.co',key:'sb_publishable_test'});
 assert.equal(result[0].institution,'nirvana');assert(calls[0].endsWith('/catalog_institution_snapshot'));assert(calls[1].endsWith('/catalog_product_snapshot'));
 assert.throws(()=>mapPublicProduct({...raw,institution:'yunnan',category_id:1}));
});
