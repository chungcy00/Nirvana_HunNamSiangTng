import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { catalogData } from "../src/data/catalog";
import {
  createCatalog,
  nextSortOrder,
  reorderRecords,
  categoryPath,
  productPath,
} from "../src/catalog/repository";
import { CatalogProvider } from "../src/catalog/context";
import { WebsiteRoutes } from "./eagerWebsiteRoutes";
import LegacyProvider from "../src/pages/Nirvana";
import CategoryPage from "../src/pages/Category";
import PackageDetail from "../src/pages/PackageDetail";
import { ProductCard } from "../src/components/catalog/ui";
import type { CatalogSnapshot, Category } from "../src/types";

const seed = () => structuredClone(catalogData);
function render(path: string, data = seed()) {
  return renderToStaticMarkup(
    <CatalogProvider data={data}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>{path==="/nirvana" && <Route path="/:providerSlug" element={<LegacyProvider/>}/>}<Route path="/:providerSlug/packages/:slug" element={<PackageDetail/>}/><Route path="/:providerSlug/:categorySlug" element={<CategoryPage/>}/><Route path="*" element={<WebsiteRoutes/>}/></Routes>
      </MemoryRouter>
    </CatalogProvider>,
  );
}
function addCategory(data: CatalogSnapshot, overrides: Partial<Category> = {}) {
  const category: Category = {
    id: "test-root",
    providerId: "provider-001",
    parentId: null,
    slug: "fuxing-land",
    name: "福星地",
    english: "Test category",
    description: "测试资料，不用于正式目录。",
    status: "published",
    showInCatalog: true,
    sortOrder: nextSortOrder(
      data.categories.filter(
        (item) => item.providerId === "provider-001" && item.parentId === null,
      ),
    ),
    ...overrides,
  };
  data.categories.push(category);
  return category;
}

test("legacy reusable templates retain their configured product content in isolation", () => {
  const data = seed();
  const repo = createCatalog(data);
  assert.equal(data.products.length, 29);
  assert.equal(repo.getCatalogCategories("provider-001").length, 6);
  assert.equal(new Set(data.products.map((p) => p.id)).size, 29);
  const paths = [
    "/",
    "/nirvana",
    "/about",
    "/contact",
    "/yunnan-siantang",
    ...repo
      .getCatalogCategories("provider-001")
      .map((c) => categoryPath("nirvana", c.slug)),
    ...data.products.map((p) => productPath("nirvana", p.slug)),
  ];
  for (const path of paths) {
    const html = render(path, data);
    assert(html.includes("<h1"), path);
    assert(!html.includes("PAGE NOT FOUND"), path);
    if (path === "/") {
      assert(html.includes("/images/home-hero.webp"), path);
    } else {
      const imageSources = Array.from(
        html.matchAll(/<img[^>]*src="([^"]+)"/g),
        (match) => match[1],
      );
      assert(
        imageSources.every((source) => source === "/images/brand-logo.png" ||
          (path === "/about" && source === "/images/advisor-zhong-yongxin.png") ||
          (path === "/nirvana" && /^\/images\/sort-(ascending|descending|default)\.png$/.test(source))),
        path,
      );
    }
    assert(!html.includes("undefined"), path);
  }
  for (const product of data.products)
    assert.equal(
      repo.getProductBySlug("provider-001", product.slug)?.id,
      product.id,
    );
});

test("new root, child and product appear using the existing templates", () => {
  const data = seed();
  const root = addCategory(data);
  const child = addCategory(data, {
    id: "test-child",
    parentId: root.id,
    slug: "fuxing-double",
    name: "双人",
    sortOrder: 1,
    showInCatalog: false,
  });
  const product = {
    ...data.products[0],
    id: "test-product",
    categoryId: root.id,
    slug: "fuxing-double-a",
    name: "福星双人 A",
    isFeatured: false,
  };
  data.products.push(product);
  data.productCategories.push({
    productId: product.id,
    categoryId: child.id,
    sortOrder: 1,
  });
  const repo = createCatalog(data);
  assert.equal(repo.getCatalogCategories("provider-001").at(-1)?.id, root.id);
  // This isolated legacy template still supports configured category links.
  assert(render("/nirvana", data).includes("/nirvana/fuxing-land"));
  assert(render("/nirvana/fuxing-land", data).includes("福星双人 A"));
  assert(
    render(`/nirvana/fuxing-land?filter=${child.id}`, data).includes(
      "共 1 项选择",
    ),
  );
  assert(
    render("/nirvana/packages/fuxing-double-a", data).includes("福星双人 A"),
  );
  assert(
    render("/nirvana/fuxing-double", data).includes("/nirvana/fuxing-land"),
  );
});

test("new provider uses generic routes and same slugs stay isolated by provider", () => {
  const data = seed();
  data.providers.push({
    ...data.providers[0],
    id: "provider-test",
    slug: "test-provider",
    name: "测试机构",
    sortOrder: 3,
  });
  const root = addCategory(data, {
    providerId: "provider-test",
    slug: "burial-plots",
  });
  const product = {
    ...data.products[0],
    id: "test-product",
    providerId: "provider-test",
    categoryId: root.id,
    name: "测试机构产品",
    isFeatured: false,
  };
  data.products.push(product);
  data.productCategories.push({
    productId: product.id,
    categoryId: root.id,
    sortOrder: 1,
  });
  const repo = createCatalog(data);
  assert.equal(
    repo.getProductBySlug("provider-test", product.slug)?.id,
    product.id,
  );
  assert.equal(
    repo.getProductBySlug("provider-001", product.slug)?.id,
    data.products[0].id,
  );
  assert(
    render("/test-provider", data).includes("/test-provider/burial-plots"),
  );
  assert(render("/test-provider/burial-plots", data).includes("测试机构产品"));
  assert(
    render(`/test-provider/packages/${product.slug}`, data).includes(
      "测试机构产品",
    ),
  );
  data.productCategories.push({
    productId: product.id,
    categoryId: "category-001",
    sortOrder: 0,
  });
  assert(
    !createCatalog(data)
      .getProducts("category-001")
      .some((p) => p.id === product.id),
  );
});

test("Yunnan can gain catalogue categories without replacing its service page", () => {
  const data = seed();
  addCategory(data, { providerId: "provider-002" });
  const html = render("/yunnan-siantang", data);
  assert(html.includes("可以进一步咨询的事项"));
  assert(html.includes("/yunnan-siantang/fuxing-land"));
});

test("stable IDs preserve associations after names or slugs change", () => {
  const data = seed();
  const root = data.categories.find((c) => c.id === "category-002")!;
  root.name = "安置空间";
  root.slug = "memorial-spaces";
  const child = data.categories.find((c) => c.name === "聚雅阁")!;
  child.name = "聚雅阁新名称";
  const repo = createCatalog(data);
  assert.equal(repo.getProducts(root.id, child.id).length, 1);
  assert.equal(repo.resolveFilter(root.id, "聚雅阁")?.id, child.id);
  assert(
    render("/nirvana/memorial-spaces?filter=" + child.id, data).includes(
      "共 1 项选择",
    ),
  );
});

test("legacy labels and new ID filters resolve to the same product sets", () => {
  const repo = createCatalog(seed());
  for (const [label, count] of [
    ["全部", 7],
    ["聚仙楼", 4],
    ["仁爱园", 1],
    ["聚雅阁", 1],
    ["腾黄阁", 1],
  ] as const) {
    const option = repo.resolveFilter("category-002", label)!;
    assert.equal(
      repo.getProducts(
        "category-002",
        option.kind === "category" ? option.id : undefined,
      ).length,
      count,
    );
    assert(
      render(
        `/nirvana/columbaria?filter=${encodeURIComponent(label)}`,
      ).includes(`共 ${count} 项选择`),
    );
  }
  assert.equal(
    repo.resolveFilter("category-003", "基督教")?.id,
    "category-003-02",
  );
  assert.equal(
    repo.resolveFilter("category-003", "unknown")?.id,
    "category-003-01",
  );
  assert.equal(repo.getProducts("category-001", "category-002-01").length, 0);
});

test("multi-category memberships preserve filters and do not duplicate parent counts", () => {
  const data = seed();
  data.productCategories.push({ ...data.productCategories[0] });
  const repo = createCatalog(data);
  assert.equal(repo.getProducts("category-001").length, 9);
  assert.equal(repo.getProducts("category-001", "category-001-02").length, 5);
  assert.equal(repo.getProducts("category-001", "category-001-04").length, 2);
  assert.equal(
    repo.getProducts("category-001", undefined, "zone aa").length,
    1,
  );
  assert.equal(
    repo.getProducts("category-001", undefined, "does-not-exist").length,
    0,
  );
});

test("category, child, product and featured orders are independent of array order", () => {
  const data = seed();
  const root = addCategory(data);
  const roots = data.categories.filter(
    (c) => c.providerId === "provider-001" && c.parentId === null,
  );
  const reordered = reorderRecords(roots, [
    roots[0].id,
    root.id,
    ...roots.slice(1, -1).map((c) => c.id),
  ]);
  data.categories = data.categories
    .map((c) => reordered.find((r) => r.id === c.id) || c)
    .reverse();
  const child = data.categories.find((c) => c.id === "category-002-04")!;
  child.sortOrder = 0;
  const parentPlacement = data.productCategories.find(
    (p) => p.productId === "product-003" && p.categoryId === "category-001",
  )!;
  parentPlacement.sortOrder = 0;
  data.products.find((p) => p.id === "product-023")!.isFeatured = true;
  data.products.find((p) => p.id === "product-023")!.featuredOrder = 0;
  data.products.reverse();
  data.productCategories.reverse();
  const repo = createCatalog(data);
  assert.equal(repo.getCatalogCategories("provider-001")[1].id, root.id);
  assert.equal(repo.getChildren("category-002")[0].id, child.id);
  assert.equal(repo.getProducts("category-001")[0].id, "product-003");
  assert.equal(
    repo.getProducts("category-001", "category-001-02")[0].id,
    "product-001",
  );
  assert.equal(repo.getFeaturedProducts()[0].id, "product-023");
  assert.throws(() => reorderRecords(roots, [roots[0].id, roots[0].id]));
});

test("hidden and draft products are absent from cards, details and recommendations", () => {
  for (const status of ["hidden", "draft"] as const) {
    const data = seed();
    data.products[0].status = status;
    const repo = createCatalog(data);
    assert(!repo.getProduct(data.products[0].id));
    assert(
      !repo.getFeaturedProducts().some((p) => p.id === data.products[0].id),
    );
    assert.equal(repo.getProducts("category-001").length, 8);
    assert(
      render("/nirvana/packages/" + data.products[0].slug, data).includes(
        "找不到该配套",
      ),
    );
  }
});

test("hidden ancestors and providers prevent direct navigation and public listing", () => {
  const data = seed();
  data.categories.find((c) => c.id === "category-001")!.status = "hidden";
  const repo = createCatalog(data);
  assert.equal(repo.getChildren("category-001").length, 0);
  assert.equal(repo.getProducts("category-001").length, 0);
  assert(!repo.getProduct("product-001"));
  assert(render("/nirvana/burial-plots", data).includes("找不到这个产品类别"));
  data.providers[0].status = "hidden";
  assert.equal(
    createCatalog(data).getCatalogCategories("provider-001").length,
    0,
  );
  assert.equal(createCatalog(data).getFeaturedProducts().length, 0);
  assert(render("/nirvana", data).includes("PAGE NOT FOUND"));
});

test("directory visibility is separate from publication", () => {
  const data = seed();
  data.categories.find((c) => c.id === "category-001")!.showInCatalog = false;
  const repo = createCatalog(data);
  assert.equal(repo.getCatalogCategories("provider-001").length, 5);
  assert.equal(repo.getProducts("category-001").length, 9);
  assert(render("/nirvana/burial-plots", data).includes("共 9 项选择"));
});

test("cycles, missing parents, invalid associations and duplicate keys are handled", () => {
  const data = seed();
  const root = data.categories.find((c) => c.id === "category-001")!;
  root.parentId = "category-001-01";
  const repo = createCatalog(data);
  assert(!repo.getCategory(root.id));
  assert(!repo.getProduct("product-001"));
  root.parentId = "missing";
  assert(!createCatalog(data).getCategory(root.id));
  root.parentId = "category-002";
  root.providerId = "provider-002";
  assert(!createCatalog(data).getCategory(root.id));
  const orphan = seed();
  orphan.products[0].categoryId = "missing";
  assert(
    render("/nirvana/packages/" + orphan.products[0].slug, orphan).includes(
      "找不到该配套",
    ),
  );
  const duplicates = seed();
  duplicates.categories.push({ ...duplicates.categories[0], slug: "new-slug" });
  assert.throws(() => createCatalog(duplicates), /重复 ID/);
  duplicates.categories.at(-1)!.id = "unique";
  duplicates.categories.at(-1)!.slug = duplicates.categories[0].slug;
  assert.throws(() => createCatalog(duplicates), /重复网址/);
});

test("comparison and inquiry depend on configuration, not category slug or Chinese labels", () => {
  const data = seed();
  const category = data.categories.find((c) => c.id === "category-003")!;
  category.slug = "ceremonies";
  category.name = "纪念服务";
  category.inquiryOption!.label = "特别安排";
  data.products.find((p) => p.id === "product-019")!.slug = "new-freedom-url";
  assert(render("/nirvana/ceremonies", data).includes("配套一览，清楚比较"));
  assert(render("/nirvana/ceremonies", data).includes("仅限火化"));
  assert(
    render("/nirvana/ceremonies?filter=inquiry-001", data).includes(
      "每个家庭，都有自己的纪念方式",
    ),
  );
  assert(
    !render("/nirvana/ceremonies?q=not-a-product", data).includes("<table>"),
  );
  category.displayMode = "cards";
  assert(!render("/nirvana/ceremonies", data).includes("<table>"));
});

test("zero and As-Need-only prices render, and partial installment fields do not leak undefined", () => {
  const data = seed();
  const product = data.products[0];
  delete product.price;
  delete product.preNeedPrice;
  product.asNeedPrice = 0;
  delete product.depositPercent;
  const html = render("/nirvana/packages/" + product.slug, data);
  assert(html.includes("即时需求价（As-Need）"));
  assert(html.includes("RM 0"));
  assert(!html.includes("undefined"));
  const card = renderToStaticMarkup(
    <CatalogProvider data={data}>
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>
    </CatalogProvider>,
  );
  assert(card.includes("即时需求价（As-Need）"));
  assert(card.includes("RM 0"));
});
