// Local real Supabase only; synthetic published records never touch hosted data.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import pg from "pg";
import { loadConfig, client, rpc, root } from "./support.mjs";
import {
  loadPublicProducts,
  publicRpc,
  imageEndpoint,
  publicHeaders,
} from "../../src/catalog/publicRepository.ts";
const cfg = loadConfig(),
  db = new pg.Client({ connectionString: cfg.db }),
  service = client(cfg, cfg.service),
  anon = client(cfg),
  u = client(cfg),
  run = randomUUID().slice(0, 8),
  ids = [],
  files = [],
  results = [];
assert.equal(new URL(cfg.url).hostname, "127.0.0.1");
const config = { url: cfg.url, key: cfg.anon },
  mode = process.argv[2] || "test";
let uid;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1S4AAAAASUVORK5CYII=",
  "base64",
);
const check = async (name, fn) => {
  await fn();
  results.push(name);
  console.log("PASS " + name);
};
const get = (id) => rpc(u, "admin_product", { p_id: id });
async function save(id, product = {}, changes = {}) {
  const prev = id ? await get(id) : null;
  const r = await rpc(u, "save_product", {
    p_id: id,
    p_expected_updated_at: prev?.product.updated_at || null,
    p_product: product,
    p_changes: changes,
  });
  if (!id) ids.push(r.id);
  return r;
}
const stateFile = new URL(
  "work/catalog-security/phase5-local-state.json",
  root,
);
async function upload(id) {
  const path = id + "/" + randomUUID() + ".png",
    bucket = "catalog-media-private";
  const r = await u.storage
    .from(bucket)
    .upload(path, png, { contentType: "image/png", cacheControl: "0" });
  assert.ifError(r.error);
  files.push({ bucket, path });
  return { bucket, path };
}
await db.connect();
try {
  const email = `phase5-${run}@example.test`,
    password = randomBytes(30).toString("base64url") + "Aa1!";
  const user = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.ifError(user.error);
  uid = user.data.user.id;
  await db.query(
    "insert into private.admin_members(user_id,role) values($1,$2)",
    [uid, "admin"],
  );
  const sign = await u.auth.signInWithPassword({ email, password });
  assert.ifError(sign.error);
  const fixture = JSON.parse(
    await fs.readFile(
      new URL("supabase/fixtures/real-product-structures.json", root),
    ),
  );
  const cases = [
    fixture.products.find((f) => f.key === "w-cremation"),
    fixture.products.find((f) => f.key === "aa-double-package"),
    {
      key: "juxian",
      name: "聚仙楼测试规格（非实际报价）",
      category_id: 3,
      capacity_group: "single",
      religions: [1],
      prices: [{ code: "default", name: "TEST ONLY", standard: 12345 }],
      inclusions: ["TEST ONLY"],
    },
    fixture.products.find((f) => f.category_id === 4),
  ];
  for (const f of cases) {
    assert(f);
    await check("Create and publish independent " + f.key, async () => {
      const offers = f.prices.map((o) => ({
        id: randomUUID(),
        offer_code: o.code,
        name: o.name,
        is_active: true,
      }));
      const p = await save(
        null,
        {
          category_id: f.category_id,
          name: "TEST PHASE5 " + run + " " + f.name,
          slug: "phase5-" + run + "-" + f.key,
          capacity_group: f.capacity_group || null,
          product_form: f.category_id <= 2 ? "package" : null,
        },
        {
          product_religions: {
            upsert: f.religions.map((religion_id) => ({
              id: randomUUID(),
              religion_id,
              is_published: true,
            })),
          },
          ...(f.category_id === 3
            ? { niche_details: { upsert: [{ placement_type: "indoor" }] } }
            : {}),
          product_offers: { upsert: offers },
          offer_prices: {
            upsert: f.prices.flatMap((o, i) =>
              ["standard", "pre_need", "at_need"]
                .filter((t) => o[t] != null)
                .map((price_type) => ({
                  id: randomUUID(),
                  offer_id: offers[i].id,
                  price_type,
                  price_amount: o[price_type],
                  is_published: true,
                })),
            ),
          },
          product_inclusions: {
            upsert: [
              { item_name: "TEST ONLY public common" },
              { item_name: "TEST ONLY Buddhist detail", religion_id: 1 },
            ],
          },
        },
      );
      const img = await upload(p.id);
      await save(
        p.id,
        {},
        {
          product_images: {
            upsert: [
              {
                id: randomUUID(),
                storage_bucket: img.bucket,
                storage_path: img.path,
                image_type: "primary",
                is_primary: true,
                is_published: true,
                alt_text: "TEST ONLY",
              },
            ],
          },
        },
      );
      await save(p.id, { publication_status: "published" });
    });
  }
  const data = await loadPublicProducts(config);
  const ours = data.filter((p) => ids.includes(p.databaseId));
  await check(
    "Actual anonymous list-detail adapter returns four published cases and correct prices",
    async () => {
      assert.equal(ours.length, 4);
      for (const p of ours) {
        assert(p.offers.length || p.preNeed);
        assert(p.primaryImage);
        assert(p.inclusions.includes("TEST ONLY public common"));
        assert.equal(p.placement, p.category === 3 ? "indoor" : undefined);
      }
    },
  );
  await check("Actual anonymous private image download", async () => {
    for (const p of ours) {
      const r = await fetch(imageEndpoint(config, p.primaryImage), {
        headers: publicHeaders(config),
        cache: "no-store",
      });
      assert.equal(r.status, 200);
      assert.equal((await r.arrayBuffer()).byteLength, png.length);
    }
  });
  const w = ours.find((p) => p.category === 1),
    full = await get(w.databaseId);
  const buddhist = full.product_religions.find((r) => r.religion_id === 1);
  await check(
    "Unpublished religion removes associated inclusions from real public detail",
    async () => {
      await save(
        w.databaseId,
        {},
        {
          product_religions: {
            upsert: [{ id: buddhist.id, is_published: false }],
          },
        },
      );
      const p = await publicRpc(config, "catalog_product_detail", {
        p_slug: w.id,
      });
      assert(!p.religions.some((r) => r.id === 1));
      assert(!p.inclusions.some((i) => i.religion_id === 1));
    },
  );
  await check(
    "Hidden product disappears from actual list, detail and direct image authorization",
    async () => {
      await save(w.databaseId, { publication_status: "hidden" });
      const all = await loadPublicProducts(config);
      assert(!all.some((p) => p.databaseId === w.databaseId));
      assert.equal(
        await publicRpc(config, "catalog_product_detail", { p_slug: w.id }),
        null,
      );
      const r = await fetch(
        imageEndpoint(config, w.primaryImage) + "?fresh=" + randomUUID(),
        { headers: publicHeaders(config), cache: "no-store" },
      );
      assert.notEqual(r.status, 200);
    },
  );
  await check("Anonymous cannot read private tables or admin RPC", async () => {
    const r = await anon.rpc("admin_product", { p_id: ids[0] });
    assert(r.error);
    const http = await fetch(cfg.url + "/rest/v1/products", {
      headers: { ...publicHeaders(config), "Accept-Profile": "private" },
    });
    assert.notEqual(http.status, 200);
  });
  if (mode === "prepare-browser") {
    // Leave local-only fixtures available for browser acceptance; never production.
    await fs.writeFile(
      stateFile,
      JSON.stringify({ ids, files, uid, run, results }, null, 2),
      { mode: 0o600 },
    );
    console.log("LOCAL BROWSER FIXTURES READY");
  } else await cleanup();
  await fs.writeFile(
    new URL("supabase/tests/phase5-public-result.json", root),
    JSON.stringify(
      {
        environment: "localhost-real-supabase",
        results,
        cleaned: mode !== "prepare-browser",
        run,
      },
      null,
      2,
    ),
  );
} finally {
  await db.end();
}
async function cleanup() {
  await db.query(
    "update private.products set publication_status='hidden' where id=any($1::uuid[]) and name like $2",
    [ids, "TEST PHASE5 " + run + "%"],
  );
  await db.query(
    "delete from private.product_images where product_id=any($1::uuid[])",
    [ids],
  );
  // Unlink hidden test media first: the database correctly refuses deleting
  // any Storage object still referenced by a product, even for service_role.
  for (const f of files) {
    const r = await service.storage.from(f.bucket).remove([f.path]);
    assert.ifError(r.error);
  }
  await u.auth.signOut({ scope: "global" });
  if (uid) {
    await db.query("delete from private.admin_members where user_id=$1", [uid]);
    const r = await service.auth.admin.deleteUser(uid);
    assert.ifError(r.error);
  }
}
