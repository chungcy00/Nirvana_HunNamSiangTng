import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { PublicCatalogContext } from "../src/catalog/publicContext";
import { WebsiteRoutes } from "../src/App";
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
          : /暂时没有符合条件/,
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
