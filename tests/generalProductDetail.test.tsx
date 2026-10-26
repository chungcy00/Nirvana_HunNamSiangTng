import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductDetailContent } from '../src/prototype/ProductPresentation';
import { ProductNavigationContext } from '../src/prototype/navigation';
import { prototypeProducts } from '../src/prototype/products';
import type { PrototypeProduct } from '../src/prototype/model';
const render = (product: PrototypeProduct) => renderToStaticMarkup(<ProductNavigationContext.Provider value={{website:true,homePath:'/nirvana',listPath:()=>'/nirvana',detailPath:()=>''}}><ProductDetailContent product={product}/></ProductNavigationContext.Provider>);
test('six general categories use the scoped layout with one consultation after inclusions', () => {
  for (const category of [1,2,3,5,6,7]) {
    const product = prototypeProducts.find(p => p.category === category)!;
    const html = render(product);
    assert.match(html, /fgp-general-detail/);
    assert.equal((html.match(/直接咨询/g)||[]).length, 1);
    assert(html.indexOf('fgp-general-consult') > html.indexOf('id="fgp-inclusions"'));
    assert.doesNotMatch(html, /库存|销售状态|内部代码|楼层|预约园区专车/);
  }
  assert.doesNotMatch(render(prototypeProducts.find(p => p.category === 4)!), /fgp-general-detail|fgp-general-consult|全屏查看图片/);
});
test('niche specifications and offer areas cannot expose prohibited fields', () => {
  const product = {...prototypeProducts.find(p => p.category === 3)!, area: 123, facing: '禁止显示朝向', offers: [{name:'方案甲',amount:100,area:12},{name:'方案乙',amount:200,area:24}]};
  assert.doesNotMatch(render(product), /禁止显示朝向|面积|sqft|楼层/);
});
test('real image choices are deduplicated and empty galleries have no fabricated choices', () => {
  const product = prototypeProducts.find(p => p.category === 1)!;
  assert.doesNotMatch(render({...product,images:[],primaryImage:undefined}), /全屏查看图片|产品图片选择/);
  const image = {id:'image-1',bucket:'test',path:'sample.png',alt:'已提供图片'};
  const html = render({...product,primaryImage:image,images:[image,{...image,id:'image-2'}]});
  assert.equal((html.match(/aria-label="查看图片 /g)||[]).length,2);
  assert.match(html,/全屏查看图片/);
});
