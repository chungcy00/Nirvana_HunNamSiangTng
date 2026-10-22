// Clean this run's disposable local fixtures only. Never accepts hosted config.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import pg from "pg";
import { loadConfig, client, root } from "./support.mjs";
const cfg = loadConfig();
assert.equal(new URL(cfg.url).hostname, "127.0.0.1");
const stateFile = new URL(
  "work/catalog-security/phase5-local-state.json",
  root,
);
const s = JSON.parse(await fs.readFile(stateFile)),
  db = new pg.Client({ connectionString: cfg.db }),
  service = client(cfg, cfg.service);
await db.connect();
try {
  const r = await db.query(
    "select id,name from private.products where id=any($1::uuid[])",
    [s.ids],
  );
  assert(r.rows.every((p) => p.name.startsWith("TEST PHASE5 " + s.run)));
  // Publication history intentionally prevents physical product deletion. Hide
  // only this run's disposable records and detach their images instead.
  await db.query(
    "update private.products set publication_status='hidden' where id=any($1::uuid[]) and name like $2",
    [s.ids, "TEST PHASE5 " + s.run + "%"],
  );
  await db.query(
    "delete from private.product_images where product_id=any($1::uuid[])",
    [s.ids],
  );
  for (const f of s.files) {
    assert(s.ids.includes(f.path.split("/")[0]));
    const r = await service.storage.from(f.bucket).remove([f.path]);
    assert.ifError(r.error);
  }
  await db.query("delete from private.admin_members where user_id=$1", [s.uid]);
  await db.query("delete from auth.sessions where user_id=$1", [s.uid]);
  const del = await service.auth.admin.deleteUser(s.uid);
  assert.ifError(del.error);
  const remain = await db.query(
    "select count(*) from private.products where id=any($1::uuid[]) and publication_status<>'hidden'",
    [s.ids],
  );
  assert.equal(Number(remain.rows[0].count), 0);
  for (const f of s.files) {
    const r = await service.storage.from(f.bucket).list(f.path.split("/")[0]);
    assert.ifError(r.error);
    assert.equal(r.data.length, 0);
  }
  const result = new URL("supabase/tests/phase5-public-result.json", root),
    report = JSON.parse(await fs.readFile(result));
  report.cleaned = true;
  report.cleanup = {
    publicProducts: 0,
    retainedHiddenTestProducts: s.ids.length,
    files: 0,
    testUsers: 0,
  };
  await fs.writeFile(result, JSON.stringify(report, null, 2) + "\n");
  await fs.rm(stateFile);
  console.log(
    "Local test-only cleanup verified: retained hidden publication history, 0 public products, files or test users",
  );
} finally {
  await db.end();
}
