import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProductDetailContent } from '../src/prototype/ProductPresentation';
import { ProductNavigationContext } from '../src/prototype/navigation';
import { prototypeProducts } from '../src/prototype/products';
import type { PrototypeProduct } from '../src/prototype/model';
const render = (product: PrototypeProduct) => renderToStaticMarkup(<ProductNavigationContext.Provider value={{website:true,homePath:'/nirvana',listPath:()=>'/nirvana',detailPath:()=>''}}><ProductDetailContent product={product}/></ProductNavigationContext.Provider>);
test('six general categories use the scoped layout with one consultation between prices and inclusions', () => {
  for (const category of [1,2,3,5,6,7]) {
    const product = prototypeProducts.find(p => p.category === category)!;
    const html = render(product);
    assert.match(html, /fgp-general-detail/);
    assert.equal((html.match(/直接咨询/g)||[]).length, 1);
    assert(html.indexOf('fgp-general-consult') < html.indexOf('id="fgp-inclusions"'));
    assert(html.indexOf('fgp-price-panel') < html.indexOf('fgp-general-consult'));
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
  assert.doesNotMatch(render({...product,images:[],primaryImage:undefined}), /查看产品大图|产品图片选择/);
  const image = {id:'image-1',bucket:'test',path:'sample.png',alt:'已提供图片'};
  const html = render({...product,primaryImage:image,images:[image,{...image,id:'image-2'}]});
  assert.equal((html.match(/aria-label="查看图片 /g)||[]).length,2);
  assert.match(html,/aria-label="查看产品大图"/);
});

test('design reference cards show named and unnamed designs without fabricated names', () => {
  const product = prototypeProducts.find(p => p.category === 1)!;
  const image = {id:'design-1',bucket:'test',path:'sample.png',image_type:'design',design_name:'Type A',alt:'图片替代文字',religion_id:Number(product.religions[0].id)};
  const html = render({...product,images:[image,{...image,id:'design-2'}]});
  assert.match(html, /宗教与设计参考/);
  assert.equal((html.match(/<h3>Type A<\/h3>/g)||[]).length,1);
  assert.doesNotMatch(html, /Type C|核准总价|永久管理信托保障|沉稳黑金/);
  const unnamed = render({...product,images:[{...image,design_name:''},{...image,id:'unnamed-2',path:'second.png',design_name:null}]});
  assert.match(unnamed, /fgp-design-comparison/);
  assert.equal((unnamed.match(/class="fgp-design-photo"/g)||[]).length,2);
  assert.doesNotMatch(unnamed.slice(unnamed.indexOf('class="fgp-design-comparison"'),unnamed.indexOf('class="fgp-general-purchase"')), /<h3>|Type A/);

});

test('design images never enter the environment gallery, including an incorrectly marked primary', () => {
  const product = prototypeProducts.find(p => p.category === 1)!;
  const real = {id:'real-photo',bucket:'test',path:'real.png',image_type:'real',alt:'园区实景'};
  const design = {id:'design-only',bucket:'test',path:'design.png',image_type:'design',design_name:'Type A',alt:'设计专用'};
  const html = render({...product,primaryImage:design,images:[real,design]});
  const gallery = html.slice(html.indexOf('class="fgp-gallery"'),html.indexOf('class="fgp-design-comparison"'));
  assert.doesNotMatch(gallery, /设计专用|design-only|design.png/);
  assert.doesNotMatch(html, /宗教对应内容选择/);
  assert.match(html, /<h3>Type A<\/h3>/);
  assert.doesNotMatch(html, /fgp-design-footer/);
});

test('general inclusion title counts displayed rows from current data without double counting groups', () => {
  const product = {...prototypeProducts.find(p => p.category === 1)!,
    inclusions:['共通一','共通二'], inclusionGroups:[{title:'共通分组',items:['共通一','共通二']}],
    religions:[{id:'1',name:'佛教',isPublished:true,inclusions:['宗教一'],designs:[]}]};
  assert.match(render(product), /fgp-general-inclusion-count">3 项/);
  assert.match(render({...product,inclusions:[],inclusionGroups:undefined,religions:[]}), /fgp-general-inclusion-count">0 项/);
  assert.match(render({...product,inclusions:['新增项目'],inclusionGroups:undefined}), /fgp-general-inclusion-count">2 项/);
});
