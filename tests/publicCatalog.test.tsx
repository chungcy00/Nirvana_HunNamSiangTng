import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { PublicCatalogContext } from "../src/catalog/publicContext";
import { WebsiteRoutes } from "./eagerWebsiteRoutes";
import {
  publicConfig,
  mapPublicProduct,
  loadPublicProducts,
  imageEndpoint,
  type PublicRecord,
} from "../src/catalog/publicRepository";
import {
  inquirySummary,
  emptyAnswers,
  applicableVariants,
} from "../src/data/questionnaire";
import { nirvanaQuestionnaireProducts } from "../src/data/questionnaireCatalog";
const raw: PublicRecord = {
  id: "db1",
  slug: "live-w",
  name: "已公开产品",
  category_id: 1,
  capacity_group: "double",
  religions: [{ id: 1, name: "佛教" }],
  prices: [
    {
      offer_id: "o1",
      offer_name: "普通地段",
      price_type: "standard",
      amount: 238888,
    },
  ],
  inclusions: [{ name: "公开包含项目" }],
};
const render = (
  status: "ready" | "error" | "loading",
  path = "/nirvana",
  products = [mapPublicProduct(raw)],
) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <PublicCatalogContext.Provider
        value={{
          status,
          products: status === "ready" ? products : [],
          retry: () => {},
        }}
      >
        <WebsiteRoutes />
      </PublicCatalogContext.Provider>
    </MemoryRouter>,
  );
test("production data never falls back to static catalogue during loading/error/empty", () => {
  for (const state of ["loading", "error", "ready"] as const) {
    const html = render(state, "/nirvana", []);
    assert.doesNotMatch(html, /w-double-package|RM 21,888|双人火化土葬配套/);
    assert.match(
      html,
      state === "loading"
        ? /正在载入/
        : state === "error"
          ? /重新载入/
          : /当前分类暂无产品/,
    );
  }
  assert.match(render("ready", "/nirvana/products/item/live-w"), /已公开产品/);
  assert.match(
    render("ready", "/nirvana/products/item/unpublished"),
    /没有找到这个产品页面/,
  );
  assert.doesNotMatch(
    render("ready", "/prototype"),
    /w-double-package|RM 21,888/,
  );
});
test("public projection preserves database order, data and religious price isolation without placement inference", () => {
  const p = mapPublicProduct({
    ...raw,
    attributes: { placement_type: "outdoor" },
    prices: [
      ...raw.prices,
      {
        offer_id: "hidden",
        offer_name: "非公开宗教",
        religion_id: 2,
        price_type: "standard",
        amount: 1,
      },
    ],
    inclusions: [
      ...raw.inclusions!,
      { name: "非公开宗教项目", religion_id: 2 },
    ],
  });
  assert.equal(p.placement, undefined);
  assert.equal(p.offers.length, 1);
  assert.deepEqual(p.inclusions, ["公开包含项目"]);
  const q = nirvanaQuestionnaireProducts([p]);
  assert.equal(q[0].id, "live-w");
  assert.doesNotMatch(
    inquirySummary(
      { ...emptyAnswers, category: "火化土葬" },
      ["live-w", "retired"],
      false,
      q,
    ),
    /retired|非公开/,
  );
  assert.deepEqual(
    applicableVariants(
      {
        ...q[0],
        variants: [
          { label: "佛教", price: 5, religion: "佛教" },
          { label: "基督教", price: 1, religion: "基督教" },
        ],
      },
      { ...emptyAnswers, religion: "佛教" },
    ).map((v) => v.price),
    [5],
  );
});
test("public configuration rejects privileged keys and untrusted image destinations", () => {
  for (const key of [
    "sb_secret_fake",
    "invalid",
    "eyJ." + btoa(JSON.stringify({ role: "service_role" })) + ".sig",
  ])
    assert.throws(() =>
      publicConfig("https://iapdtipxubhulsxqnriv.supabase.co", key),
    );
  const c = publicConfig(
    "https://iapdtipxubhulsxqnriv.supabase.co",
    "sb_publishable_test",
  );
  assert.throws(() =>
    imageEndpoint(c, { id: "1", bucket: "public", path: "x" }),
  );
  assert.throws(() =>
    imageEndpoint(c, {
      id: "1",
      bucket: "catalog-media-private",
      path: "../x",
    }),
  );
  assert.match(
    imageEndpoint(c, {
      id: "1",
      bucket: "catalog-media-private",
      path: "id/图片.png",
    }),
    /object\/authenticated\//,
  );
  assert.throws(() =>
    publicConfig("http://127.0.0.1:56321", "sb_publishable_test"),
  );
  assert.equal(
    publicConfig("http://127.0.0.1:56321", "sb_publishable_test", true).url,
    "http://127.0.0.1:56321",
  );
});
test("detail revocation and transport errors do not resurrect a list snapshot", async () => {
  const saved = globalThis.fetch;
  let count = 0;
  try {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(++count === 1 ? [raw] : null), {
        status: 200,
      })) as typeof fetch;
    assert.deepEqual(
      await loadPublicProducts({
        url: "https://example.supabase.co",
        key: "sb_publishable_test",
      }),
      [],
    );
    globalThis.fetch = (async () =>
      new Response("unavailable", { status: 503 })) as typeof fetch;
    await assert.rejects(() =>
      loadPublicProducts({
        url: "https://example.supabase.co",
        key: "sb_publishable_test",
      }),
    );
  } finally {
    globalThis.fetch = saved;
  }
});

test("approved niche placement maps explicit list/detail values only", () => {
  for (const value of ["indoor", "outdoor"] as const) {
    assert.equal(
      mapPublicProduct({ ...raw, category_id: 3, placement_type: value })
        .placement,
      value,
    );
    assert.equal(
      mapPublicProduct({
        ...raw,
        category_id: 3,
        attributes: { placement_type: value },
      }).placement,
      value,
    );
  }
  assert.equal(
    mapPublicProduct({ ...raw, category_id: 3, name: "聚仙楼" }).placement,
    undefined,
  );
  assert.equal(
    mapPublicProduct({
      ...raw,
      category_id: 3,
      attributes: { placement_type: "both" },
    }).placement,
    undefined,
  );
  assert.equal(
    mapPublicProduct({ ...raw, category_id: 2, placement_type: "indoor" })
      .placement,
    undefined,
  );
});

test("published funeral service needs no photo in grid, list or detail", () => {
  const service = mapPublicProduct({
    ...raw,
    category_id: 4,
    primary_image: undefined,
    images: [],
    prices: [
      {
        offer_id: "o1",
        offer_name: "默认",
        price_type: "pre_need",
        amount: 100,
      },
      {
        offer_id: "o1",
        offer_name: "默认",
        price_type: "at_need",
        amount: 200,
      },
    ],
  });
  for (const path of [
    "/nirvana?category=4",
    "/nirvana?category=4&view=list",
    "/nirvana/products/item/live-w",
  ]) {
    const html = render("ready", path, [service]);
    assert.match(html, /已公开产品/);
    assert.doesNotMatch(html, /实拍.*待补充/);
    assert.match(html, /殡仪服务/);
  }
});

 test("empty category offers contact; an active empty filter offers reset", () => {
  const category = render("ready", "/nirvana?category=2");
  assert.match(category, /当前分类暂无产品/);
  assert.match(category, /href="\/contact"[^>]*>联系代理/);
  assert.doesNotMatch(category, /清除筛选/);
  const filtered = render("ready", "/nirvana?category=1&capacity=family");
  assert.match(filtered, /暂时没有符合条件的产品/);
  assert.match(filtered, /清除筛选/);
  assert.doesNotMatch(filtered, /当前分类暂无产品/);
});

test("transport feedback is distinct from an empty result and never shows a zero count", () => {
  for (const status of ["loading", "error"] as const) {
    const html = render(status);
    assert.doesNotMatch(html, /共 0 项产品|当前分类暂无产品|清除筛选/);
    assert.match(html, status === "loading" ? /aria-busy="true"/ : /role="alert"/);
    assert.match(html, status === "loading" ? /请稍候/ : /请检查网络连接/);
    if (status === "loading") assert.doesNotMatch(html, />重新载入/);
    else assert.match(html, /type="button" class="fgp-primary"/);
  }
  const empty = render("ready", "/nirvana", []);
  assert.match(empty, /当前分类暂无产品/);
  assert.doesNotMatch(empty, /fgp-load-notice/);
});

test("funeral method labels follow public attributes on cards and details without photos", () => {
  for (const [method, label] of Object.entries({cremation: '适用火化', burial: '适用土葬', both: '火化／土葬皆适用'})) {
    const product = mapPublicProduct({...raw, category_id: 4, attributes: {funeral_method: method}});
    assert.equal(product.funeralMethod, method);
    for (const path of ['/nirvana?category=4', '/nirvana?category=4&view=list', '/nirvana/products/item/live-w']) {
      const html = render('ready', path, [product]);
      assert.match(html, new RegExp(label));
      assert.doesNotMatch(html, /fgp-product-visual|产品实拍待补充/);
    }
  }
  for (const method of [undefined, null, 'unknown']) {
    assert.equal(mapPublicProduct({...raw, category_id:4, attributes:{funeral_method:method}}).funeralMethod, undefined);
  }
  assert.equal(mapPublicProduct({...raw, attributes:{funeral_method:'both'}}).funeralMethod, undefined);
});
