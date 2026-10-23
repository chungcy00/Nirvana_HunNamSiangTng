import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "./node_modules/pg/lib/index.js";
import { loadConfig } from "./support.mjs";
const cfg = loadConfig();
if (new URL(cfg.db).hostname !== "127.0.0.1") throw Error("Local only");
fs.mkdirSync("work/catalog-security/inclusion-groups", { recursive: true });
const db = new pg.Client({ connectionString: cfg.db });
const tests = [];
let uid;
async function role(name) {
  await db.query("RESET ROLE");
  await db.query("SET LOCAL ROLE " + name);
  if (name === "authenticated")
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
}
async function rpc(name, args) {
  const qs = args.map((_, i) => "$" + (i + 1));
  return (
    await db.query(
      "select api." + name + "(" + qs.join(",") + ") as data",
      args,
    )
  ).rows[0].data;
}
async function check(name, fn) {
  await fn();
  tests.push(name);
}
try {
  await db.connect();
  await db.query("BEGIN");
  if (
    !(
      await db.query(
        "select 1 from information_schema.columns where table_schema='private' and table_name='product_inclusions' and column_name='group_title'",
      )
    ).rowCount
  )
    await db.query(
      fs.readFileSync(
        "supabase/migrations/20261023140432_inclusion_group_titles.sql",
        "utf8",
      ),
    );
  uid = randomUUID();
  await db.query("insert into auth.users(id,email) values($1,$2)", [
    uid,
    "group-" + uid + "@example.test",
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
      category_id: 4,
      slug: "groups-" + uid,
      name: "独立分组测试",
      product_form: "other",
      publication_status: "draft",
    },
    {},
  ]);
  const pid = p.id;
  let bundle = await rpc("admin_product", [pid]);
  let offer = bundle.product_offers[0].id;
  let iid = randomUUID();
  let id2 = randomUUID();
  const changes = {
    product_religions: {
      upsert: [
        {
          id: randomUUID(),
          product_id: pid,
          religion_id: 1,
          is_published: true,
        },
        {
          id: randomUUID(),
          product_id: pid,
          religion_id: 2,
          is_published: false,
        },
      ],
    },
    funeral_details: { upsert: [{ product_id: pid, funeral_method: "both" }] },
    offer_prices: {
      upsert: [
        {
          id: randomUUID(),
          offer_id: offer,
          price_type: "pre_need",
          price_amount: 23888,
          is_published: true,
        },
        {
          id: randomUUID(),
          offer_id: offer,
          price_type: "at_need",
          price_amount: 26888,
          is_published: true,
        },
      ],
    },
    product_inclusions: {
      upsert: [
        {
          id: iid,
          product_id: pid,
          item_name: "项目一",
          group_title: "服务安排",
          sort_order: 0,
        },
        {
          id: id2,
          product_id: pid,
          item_name: "项目二",
          group_title: "遗体护理",
          sort_order: 1,
        },
        {
          id: randomUUID(),
          product_id: pid,
          item_name: "隐藏项目",
          group_title: "隐藏分组",
          religion_id: 2,
          sort_order: 2,
        },
      ],
    },
  };
  await check("real administrator RPC saves and rereads headings", async () => {
    p = await rpc("save_product", [pid, p.updated_at, {}, changes]);
    bundle = await rpc("admin_product", [pid]);
    assert.equal(
      bundle.product_inclusions.find((i) => i.id === iid).group_title,
      "服务安排",
    );
  });
  await check("anonymous draft remains invisible", async () => {
    await role("anon");
    assert.equal(await rpc("catalog_product_detail", ["groups-" + uid]), null);
    await role("authenticated");
  });
  await check("blank and overlong titles fail atomically", async () => {
    for (const title of ["", "x".repeat(121)]) {
      await db.query("SAVEPOINT invalid");
      let failed = false;
      try {
        await rpc("save_product", [
          pid,
          p.updated_at,
          {},
          {
            product_inclusions: {
              upsert: [{ id: iid, product_id: pid, group_title: title }],
            },
          },
        ]);
      } catch (e) {
        assert.equal(e.code, "23514");
        failed = true;
      }
      await db.query("ROLLBACK TO SAVEPOINT invalid");
      assert(failed);
    }
  });
  await check("rename, reorder and clear via real save RPC", async () => {
    p = await rpc("save_product", [
      pid,
      p.updated_at,
      {},
      {
        product_inclusions: {
          upsert: [
            { id: iid, product_id: pid, group_title: null, sort_order: 3 },
            {
              id: id2,
              product_id: pid,
              group_title: "临终咨询",
              sort_order: 0,
            },
          ],
        },
      },
    ]);
    bundle = await rpc("admin_product", [pid]);
    assert.equal(
      bundle.product_inclusions.find((i) => i.id === iid).group_title,
      null,
    );
  });
  await check(
    "publication returns headings in order and excludes hidden religion",
    async () => {
      p = await rpc("save_product", [
        pid,
        p.updated_at,
        { publication_status: "published" },
        {},
      ]);
      await role("anon");
      const d = await rpc("catalog_product_detail", ["groups-" + uid]);
      assert.equal(d.inclusions[0].group_title, "临终咨询");
      assert.equal(d.inclusions.length, 2);
      assert(!JSON.stringify(d).includes("隐藏分组"));
      await role("authenticated");
    },
  );
  await check("copy retains section headings and remains a draft", async () => {
    const c = await rpc("admin_copy_product", [
      pid,
      p.updated_at,
      randomUUID(),
      "[]",
    ]);
    assert.equal(c.product.publication_status, "draft");
    assert.equal(
      c.product_inclusions.find((i) => i.item_name === "项目二").group_title,
      "临终咨询",
    );
  });
  await check("anonymous cannot write sections", async () => {
    await role("anon");
    await db.query("SAVEPOINT denied");
    let failed = false;
    try {
      await rpc("save_product", [pid, p.updated_at, {}, {}]);
    } catch {
      failed = true;
    }
    await db.query("ROLLBACK TO SAVEPOINT denied");
    assert(failed);
    await role("authenticated");
  });
  await check("hidden product removes public headings", async () => {
    p = await rpc("save_product", [
      pid,
      p.updated_at,
      { publication_status: "hidden" },
      {},
    ]);
    await role("anon");
    assert.equal(await rpc("catalog_product_detail", ["groups-" + uid]), null);
  });
  await db.query("ROLLBACK");
  fs.writeFileSync(
    "work/catalog-security/inclusion-groups/local-results.json",
    JSON.stringify({ passed: true, tests, rolledBack: true }, null, 2),
  );
  console.log(tests);
} finally {
  try {
    await db.query("ROLLBACK");
  } catch {}
  await db.end();
}
