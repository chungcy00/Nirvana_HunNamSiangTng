// Local-only save -> public RPC -> shared model verification; all fixture rows roll back.
import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "./node_modules/pg/lib/index.js";
import { loadConfig } from "./support.mjs";
const cfg = loadConfig();
if (new URL(cfg.db).hostname !== "127.0.0.1")
  throw Error("Local database required");
const db = new pg.Client({ connectionString: cfg.db }),
  uid = randomUUID(),
  slug = "funeral-fix-" + uid,
  results = [];
async function role(r) {
  await db.query("RESET ROLE");
  await db.query("SET LOCAL ROLE " + r);
  if (r === "authenticated")
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
}
async function rpc(n, args) {
  return (
    await db.query(
      "select api." +
        n +
        "(" +
        args.map((_, i) => "$" + (i + 1)).join(",") +
        ") as data",
      args,
    )
  ).rows[0].data;
}
async function check(name, fn) {
  await fn();
  results.push({ name, passed: true });
}
try {
  await db.connect();
  await db.query("BEGIN");
  await db.query("insert into auth.users(id,email) values($1,$2)", [
    uid,
    slug + "@example.test",
  ]);
  await db.query(
    "insert into private.admin_members(user_id,role) values($1,'admin')",
    [uid],
  );
  await role("authenticated");
  let p = await rpc("save_product", [
    null,
    null,
    {
      name: "独立殡仪测试",
      slug,
      category_id: 4,
      publication_status: "draft",
      source_reference: "保留来源",
      internal_notes: "保留内部备注",
      price_note_override: "产品专属备注",
    },
    {},
  ]);
  let b = await rpc("admin_product", [p.id]);
  const oid = b.product_offers[0].id,
    pre = randomUUID(),
    now = randomUUID(),
    relig = randomUUID();
  await check(
    "save duration, two independent notes, groups and legacy fields",
    async () => {
      p = await rpc("save_product", [
        p.id,
        p.updated_at,
        {},
        {
          funeral_details: {
            upsert: [
              {
                product_id: p.id,
                duration_days: 3,
                duration_nights: 2,
                funeral_method: "both",
                terms_summary: "保留旧适用条件",
              },
            ],
          },
          product_religions: {
            upsert: [
              {
                id: relig,
                product_id: p.id,
                religion_id: 1,
                is_published: true,
                configuration_name: "保留旧配置",
                configuration_notes: "保留旧说明",
              },
            ],
          },
          offer_prices: {
            upsert: [
              {
                id: pre,
                offer_id: oid,
                price_type: "pre_need",
                price_amount: 23888,
                price_note: "预购须至少提前3天购买。",
                is_published: true,
              },
              {
                id: now,
                offer_id: oid,
                price_type: "at_need",
                price_amount: 26888,
                price_note: "适用于即时安排的服务。",
                is_published: true,
              },
            ],
          },
          product_inclusions: {
            upsert: [
              {
                id: randomUUID(),
                product_id: p.id,
                item_name: "3天2夜佛教殡仪服务",
                group_title: "服务安排",
                religion_id: null,
                offer_id: null,
                sort_order: 0,
              },
            ],
          },
        },
      ]);
      b = await rpc("admin_product", [p.id]);
      assert.equal(b.funeral_details[0].duration_days, 3);
      assert.equal(b.offer_prices.length, 2);
    },
  );
  await check(
    "editing duration does not clear hidden source/terms/religion configuration or notes",
    async () => {
      p = await rpc("save_product", [
        p.id,
        p.updated_at,
        {},
        {
          funeral_details: {
            upsert: [
              { product_id: p.id, duration_days: 5, duration_nights: 4 },
            ],
          },
        },
      ]);
      b = await rpc("admin_product", [p.id]);
      assert.equal(b.product.source_reference, "保留来源");
      assert.equal(b.product.internal_notes, "保留内部备注");
      assert.equal(b.funeral_details[0].terms_summary, "保留旧适用条件");
      assert.equal(b.product_religions[0].configuration_name, "保留旧配置");
      assert.equal(
        b.offer_prices.find((x) => x.id === pre).price_note,
        "预购须至少提前3天购买。",
      );
    },
  );
  await check(
    "publication and public detail pass duration and independently owned remarks",
    async () => {
      p = await rpc("save_product", [
        p.id,
        p.updated_at,
        { publication_status: "published" },
        {},
      ]);
      await role("anon");
      const raw = await rpc("catalog_product_detail", [slug]);
      assert.equal(raw.attributes.duration_days, 5);
      assert.equal(raw.attributes.duration_nights, 4);
      assert.equal(
        raw.prices.find((x) => x.price_type === "pre_need").price_note,
        "预购须至少提前3天购买。",
      );
      assert.equal(
        raw.prices.find((x) => x.price_type === "at_need").price_note,
        "适用于即时安排的服务。",
      );
      assert.equal(raw.inclusions[0].group_title, "服务安排");
      await role("authenticated");
    },
  );
  await check(
    "blank price note falls back to product override without overwriting counterpart",
    async () => {
      p = await rpc("save_product", [
        p.id,
        p.updated_at,
        {},
        {
          offer_prices: {
            upsert: [{ id: pre, offer_id: oid, price_note: "" }],
          },
        },
      ]);
      await role("anon");
      const raw = await rpc("catalog_product_detail", [slug]);
      assert.equal(
        raw.prices.find((x) => x.price_type === "pre_need").price_note,
        "产品专属备注",
      );
      assert.equal(
        raw.prices.find((x) => x.price_type === "at_need").price_note,
        "适用于即时安排的服务。",
      );
      await role("authenticated");
    },
  );
  await check(
    "system notice fallback remains effective when individual and product notes are blank",
    async () => {
      p = await rpc("save_product", [
        p.id,
        p.updated_at,
        { price_note_override: "" },
        {
          offer_prices: {
            upsert: [{ id: now, offer_id: oid, price_note: "" }],
          },
        },
      ]);
      await role("anon");
      const raw = await rpc("catalog_product_detail", [slug]);
      for (const price of raw.prices)
        assert.match(price.price_note, /以上价格未包含印花税/);
      await role("authenticated");
    },
  );
  await check(
    "hidden product and unapproved price remain outside public results",
    async () => {
      p = await rpc("save_product", [
        p.id,
        p.updated_at,
        { publication_status: "hidden" },
        {
          offer_prices: {
            upsert: [{ id: now, offer_id: oid, is_published: false }],
          },
        },
      ]);
      await role("anon");
      assert.equal(await rpc("catalog_product_detail", [slug]), null);
    },
  );
  await db.query("ROLLBACK");
  fs.mkdirSync("work/catalog-security/funeral-corrections", {
    recursive: true,
  });
  fs.writeFileSync(
    "work/catalog-security/funeral-corrections/database-results.json",
    JSON.stringify(
      { passed: true, localOnly: true, rolledBack: true, results },
      null,
      2,
    ),
  );
  console.log(results);
} finally {
  try {
    await db.query("ROLLBACK");
  } catch {}
  await db.end();
}
