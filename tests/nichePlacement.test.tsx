import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { placementLabel, readNichePlacement, nichePlacementChanges } from "../src/catalog/nichePlacement";
import { NichePlacementField } from "../src/components/NichePlacementField";
import { ProductCard } from "../src/components/catalog/ui";
import PackageDetail from "../src/pages/PackageDetail";
import { Routes, Route } from "react-router-dom";
import { CatalogProvider } from "../src/catalog/context";
import { catalogData } from "../src/data/catalog";

test("安放环境映射只读取骨灰位的明确值，不按名称推断", () => {
  assert.equal(placementLabel("indoor"), "室内");
  assert.equal(placementLabel("outdoor"), "室外");
  assert.equal(placementLabel(null), null);
  assert.deepEqual(readNichePlacement({ category_id: 3 }), { placementType: null });
  assert.deepEqual(readNichePlacement({ category_id: 3, attributes: { placement_type: "indoor" } }), { placementType: "indoor" });
  assert.deepEqual(readNichePlacement({ category_id: 3, placement_type: "outdoor" }), { placementType: "outdoor" });
  assert.deepEqual(readNichePlacement({ category_id: 3, placement_type: "unknown" }), { placementType: null });
  assert.equal(readNichePlacement({ category_id: 4, placement_type: "indoor" }), undefined);
});

test("保存载荷支持室内室外及空草稿，拒绝其他类别与非法值", () => {
  for (const value of ["indoor", "outdoor", null] as const)
    assert.deepEqual(nichePlacementChanges(3, value), { niche_details: { upsert: [{ placement_type: value }] } });
  assert.throws(() => nichePlacementChanges(4, "indoor"));
  assert.throws(() => nichePlacementChanges(3, "both" as never));
});

test("后台字段使用单选，草稿可空，发布必选，非骨灰位不显示", () => {
  const props = { categoryId: 3, value: null, onChange: () => {} };
  const draft = renderToStaticMarkup(<NichePlacementField {...props} />);
  assert.equal((draft.match(/type="radio"/g) || []).length, 2);
  assert.doesNotMatch(draft, /required=""/);
  const publish = renderToStaticMarkup(<NichePlacementField {...props} publishing />);
  assert.equal((publish.match(/required=""/g) || []).length, 2);
  assert.equal(renderToStaticMarkup(<NichePlacementField {...props} categoryId={4} />), "");
});

for (const value of ["indoor", "outdoor", null] as const) {
  test(`前台卡片及详情渲染 ${value ?? "空值"}，保留最低起价`, () => {
    const data = structuredClone(catalogData);
    const product = data.products.find(p => p.slug === "the-moon")!;
    product.nicheDetails = { placementType: value };
    product.price = 29800; // Rendering fixture only, not a confirmed sale price.
    const card = renderToStaticMarkup(<CatalogProvider data={data}><MemoryRouter><ProductCard product={product} /></MemoryRouter></CatalogProvider>);
    const detail = renderToStaticMarkup(<CatalogProvider data={data}><MemoryRouter initialEntries={[`/nirvana/packages/${product.slug}`]}><Routes><Route path="/:providerSlug/packages/:slug" element={<PackageDetail />} /></Routes></MemoryRouter></CatalogProvider>);
    for (const html of [card, detail]) {
      assert.match(html, /RM 29,800 起/);
      if (value) assert.ok(html.includes(placementLabel(value)!));
      else assert.doesNotMatch(html, /安放环境|>室内<|>室外</);
      assert.doesNotMatch(html, /楼层|层位/);
    }
  });
}
