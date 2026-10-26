import { PublicFixture } from "./publicFixtures";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { WebsiteRoutes } from "./eagerWebsiteRoutes";
import { prototypeProducts } from "../src/prototype/products";
import { categories } from "../src/prototype/model";
import { lowestPrice, sortProducts } from "../src/prototype/model";

function render(path: string, state?: unknown) {
  return renderToStaticMarkup(<PublicFixture><MemoryRouter initialEntries={[{ pathname: path.split("?")[0], search: path.includes("?") ? "?" + path.split("?")[1] : "", state }]}><WebsiteRoutes /></MemoryRouter></PublicFixture>);
}

test("网站富贵山庄页沿用主导航，七类产品的详情与列表不跳到原型", () => {
  const home = render("/nirvana");
  assert.match(home, /<h1 class="fgp-sr">富贵山庄<\/h1>/);
  assert.match(home, /aria-label="主导航"/);
  assert.doesNotMatch(home, /交互原型|href="\/prototype/);
  assert.doesNotMatch(home, /资料清楚，选择从容|无需逐项填写|查看完整列表/);
  for (const category of categories) {
    const html = render(`/nirvana/products/${category.slug}`);
    assert.match(html, /查看详情/);
    assert.doesNotMatch(html, /href="\/prototype/);
  }
  for (const product of prototypeProducts) {
    const html = render(`/nirvana/products/item/${product.id}`);
    assert(html.includes(product.name));
    assert.match(html, /href="\/nirvana\/products\//);
    assert.doesNotMatch(html, /href="\/prototype/);
  }
});

test("网站详情保留筛选返回地址，拒绝外部及其他产品页返回地址", () => {
  const path = "/nirvana/products/item/w-double-package";
  const returnTo = "/nirvana/products/traditional-burial?capacity=double&religion=2";
  assert(render(path, { returnTo }).includes('href="' + returnTo.replaceAll('&', '&amp;') + '"'));
  for (const returnTo of ["https://example.com", "//example.com", "/nirvana/products/item/aa-double-package"]) {
    const html = render(path, { returnTo });
    assert.match(html, /href="\/nirvana\/products\/traditional-burial"/);
    assert(!html.includes(`href="${returnTo}"`));
  }
});

test("网站组合筛选、空结果与未知产品有正确返回入口", () => {
  assert.match(render("/nirvana/products/niches?capacity=single&religion=2"), /暂时没有符合条件的产品/);
  assert.match(render("/nirvana/products/funeral-services?religion=2"), /共 4 项产品/);
  assert.match(render("/nirvana/products/item/unknown"), /href="\/nirvana"/);
  assert.match(render("/nirvana/products/unknown"), /没有找到这个产品页面/);
});

test("W区卡片显示两种宗教，骨灰位卡片及详情显示明确安放环境", () => {
  for (const product of prototypeProducts.filter(p => p.id.startsWith("w-"))) {
    const html = render(`/nirvana/products/item/${product.id}`);
    assert.match(html, /<span>佛教<\/span><span>基督教<\/span>/);
  }
  const niches = render("/nirvana/products/niches");
  assert.equal((niches.match(/class="fgp-environment">室内/g) || []).length, 7);
  assert.equal((niches.match(/class="fgp-environment">室外/g) || []).length, 5);
  for (const product of prototypeProducts.filter(p => p.category === 3)) {
    const html = render(`/nirvana/products/item/${product.id}`);
    const environment = product.id.startsWith("juxian-") ? "室内" : "室外";
    assert(html.includes(`<dt>安放环境</dt><dd>${environment}</dd>`));
    assert.doesNotMatch(html, /<dt>(楼层|层位|面积|朝向)<\/dt>/);
  }
});

test("仁爱园按已确认宗教进入单人佛教筛选，详情保留最低起价和包含项目", () => {
  const buddhist = render("/nirvana/products/niches?capacity=single&religion=1");
  assert.match(buddhist, /仁爱园 2.0 · 单人骨灰位/);
  assert.doesNotMatch(render("/nirvana/products/niches?capacity=single&religion=2"), /仁爱园 2.0/);
  const detail = render("/nirvana/products/item/loving-kindness-2-single");
  assert.match(detail, /RM 6,888<em>起<\/em>/);
  assert.match(detail, /<dt>安放环境<\/dt><dd>室外<\/dd>/);
  for (const item of ["单人骨灰位", "骨灰瓮", "火化费用", "永久管理费"]) assert(detail.includes(item));
  assert.doesNotMatch(detail, /<dt>(朝向|面积|楼层|层位)<\/dt>/);
});

test("一般产品卡片保留现有最低价规则并提供正式备注，完整方案售价留在详情", () => {
  const html = render('/nirvana?category=2');
  const cards = html.match(/<article class="fgp-card fgp-catalog-card">.*?<\/article>/g)!;
  assert.equal(cards.length, 6);
  assert(cards[0].includes('RM 238,888'));
  assert.match(cards[0], /RM 238,888<em>起<\/em>/);
  assert.doesNotMatch(cards[0], /RM 258,888|RM 308,888|普通地段|角头地段/);
  for(const card of cards) {
    assert.doesNotMatch(card, /fgp-card-link/);
    assert.equal((card.match(/class="fgp-price-entry"/g) || []).length, 1);
    assert.equal((card.match(/<a /g) || []).length, 1);
  }
  assert.match(cards[0], /class="fgp-price-note">以上价格未包含印花税/);
  assert.doesNotMatch(html, /fgp-source-note|每一份纪念/);
  const listCards = render('/nirvana?category=2&view=list');
  assert.doesNotMatch(listCards, /RM 258,888|RM 308,888|普通地段|角头地段/);
  const detail = render('/nirvana/products/item/w-family-lot');
  assert.match(detail, /<h3>864 sqft<\/h3>/);
  assert.match(detail, />普通地段 864 sqft</);
  assert.match(detail, />角头地段 864 sqft</);
  assert.match(detail, /RM 258,888/);
  assert.match(detail, /RM 308,888/);
});

test("排序按产品最低价格，缺价产品始终放最后", () => {
  const family = prototypeProducts.find(p=>p.id==='w-family-lot')!;
  const aa = prototypeProducts.find(p=>p.id==='aa-double-package')!;
  const missing = { ...aa, id:'missing', offers:[] };
  assert.equal(lowestPrice(family),238888);
  assert.deepEqual(sortProducts([missing,family,aa],'price-asc').map(p=>p.id),[aa.id,family.id,'missing']);
  assert.deepEqual(sortProducts([missing,aa,family],'price-desc').map(p=>p.id),[family.id,aa.id,'missing']);
  const ascending = render('/nirvana?category=2&sort=price-asc');
  assert(ascending.indexOf('单人福地地段 · W区') < ascending.indexOf('家庭福地 · W区'));
});

test("两种展示模式均展示殡仪双价格且不加起、不显示照片", () => {
  const grid = render('/nirvana?category=4');
  assert.match(grid, /fgp-view-grid/);
  assert.match(grid, /预购价格/); assert.match(grid, /即用价格/); assert.doesNotMatch(grid, /<em>起<\/em>/); assert.doesNotMatch(grid, /fgp-product-visual/);
  assert.doesNotMatch(grid, /fgp-product-visual|fgp-gallery/);
  const list = render('/nirvana?category=4&view=list');
  assert.match(list,/fgp-view-list/);
  assert.match(list,/预购价格/); assert.match(list,/即用价格/);
  assert.match(render('/nirvana?view=large'),/fgp-view-grid/);
  assert.doesNotMatch(grid, /单列大图/);
  assert.match(render('/nirvana?view=invalid'),/fgp-view-grid/);
});

test("公开卡片及价格区不展示编辑核实提示", () => {
  const html = render('/nirvana?category=3');
  assert.doesNotMatch(html,/参考起价待核实|宣传参考起价|fgp-card-reference/);
  const detail = render('/nirvana/products/item/juxian-1');
  assert.doesNotMatch(detail,/参考起价待核实|宣传参考起价/);
  assert.match(detail,/RM 19,800/);
});

test("殡仪服务完全不展示照片或画廊，其他类别保留图片", () => {
  const funeral = render('/nirvana/products/item/funeral-1-1');
  assert.doesNotMatch(funeral, /class="fgp-gallery"|aria-label="产品图片"|fgp-image-large|设计图片选择/);
  assert.match(render('/nirvana/products/item/w-family-lot'), /class="fgp-gallery"/);
});
