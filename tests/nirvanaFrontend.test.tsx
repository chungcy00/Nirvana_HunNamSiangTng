import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { WebsiteRoutes } from "../src/App";
import { prototypeProducts } from "../src/prototype/products";
import { categories } from "../src/prototype/model";

function render(path: string, state?: unknown) {
  return renderToStaticMarkup(<MemoryRouter initialEntries={[{ pathname: path.split("?")[0], search: path.includes("?") ? "?" + path.split("?")[1] : "", state }]}><WebsiteRoutes /></MemoryRouter>);
}

test("网站富贵山庄页沿用主导航，七类产品的详情与列表不跳到原型", () => {
  const home = render("/nirvana");
  assert.match(home, /<h1>富贵山庄<\/h1>/);
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
