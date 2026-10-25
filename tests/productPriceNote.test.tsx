import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { PublicCatalogContext } from '../src/catalog/publicContext';
import { mapPublicProduct, type PublicRecord } from '../src/catalog/publicRepository';
import { nirvanaQuestionnaireProducts } from '../src/data/questionnaireCatalog';
import { WebsiteRoutes } from './eagerWebsiteRoutes';

const record: PublicRecord = {
  id: 'note-source', slug: 'note-source', name: '备注来源测试', category_id: 4,
  religions: [{id: 1, name: '佛教'}],
  prices: [
    {offer_id:'o',offer_name:'默认方案',price_type:'pre_need',amount:23888,price_note:'预购须至少提前3天购买'},
    {offer_id:'o',offer_name:'默认方案',price_type:'at_need',amount:26888,price_note:'以上价格未包含印花税'},
  ],
};
function catalog(raw: PublicRecord) {
  return renderToStaticMarkup(<PublicCatalogContext.Provider value={{products:[mapPublicProduct(raw)],status:'ready',retry:()=>{}}}><MemoryRouter initialEntries={['/nirvana?category=4']}><WebsiteRoutes/></MemoryRouter></PublicCatalogContext.Provider>);
}
test('only an explicit backend product note creates a note outside the catalog price panel', () => {
  const html = catalog({...record,price_note_override:'产品专属测试备注'});
  assert.match(html, /<\/div><\/div><p class="fgp-catalog-product-note">产品专属测试备注<\/p>/);
  assert.match(html, /预购价格<\/span><strong>RM 23,888<\/strong><p class="fgp-price-note">预购须至少提前3天购买/);
  assert.match(html, /即用价格<\/span><strong>RM 26,888<\/strong><p class="fgp-price-note">以上价格未包含印花税/);
});
test('missing, blank and null product notes never promote resolved price/global notes outside', () => {
  for (const price_note_override of [undefined,null,'',' \n ']) {
    const raw={...record,price_note_override};
    assert.equal(mapPublicProduct(raw).productPriceNote,undefined);
    assert.doesNotMatch(catalog(raw),/class="fgp-catalog-product-note"/);
    const shared={...raw,prices:raw.prices.map(p=>({...p,price_note:'两档共用的接口备注'}))};
    assert.equal(mapPublicProduct(shared).priceNote,'两档共用的接口备注');
    assert.equal(mapPublicProduct(shared).productPriceNote,undefined);
    assert.doesNotMatch(catalog(shared),/class="fgp-catalog-product-note"/);
  }
});
test('empty individual notes stay empty even when a product note exists; detail and questionnaire keep the sources separate', () => {
  const raw={...record,price_note_override:'产品专属说明',prices:record.prices.map((p,i)=>({...p,price_note:i===0?'预购独立条件':null}))};
  const html=catalog(raw);
  assert.match(html,/class="fgp-catalog-product-note">产品专属说明<\/p>/);
  assert.doesNotMatch(html,/RM 26,888<\/strong><p/);
  assert.match(html,/RM 23,888<\/strong><p class="fgp-price-note">预购独立条件/);
  const product=mapPublicProduct(raw);
  const detail=renderToStaticMarkup(<PublicCatalogContext.Provider value={{products:[product],status:'ready',retry:()=>{}}}><MemoryRouter initialEntries={['/nirvana/products/item/note-source']}><WebsiteRoutes/></MemoryRouter></PublicCatalogContext.Provider>);
  assert.match(detail,/fgp-product-price-note">产品专属说明<\/p>/);
  assert.doesNotMatch(detail,/RM 26,888<\/strong><p/);
  const [questionnaire]=nirvanaQuestionnaireProducts([product]);
  assert(questionnaire.restriction?.includes('产品专属说明'));
  assert(questionnaire.restriction?.includes('预购价格：预购独立条件'));
  assert(!questionnaire.restriction?.includes('即用价格：'));
});
