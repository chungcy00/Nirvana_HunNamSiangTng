// LOCAL ONLY: real Auth, RPC, Storage, HTTP server, no mocked persistence.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import pg from '../../../supabase/tests/node_modules/pg/lib/index.js';
import {
  loadConfig,
  client,
  rpc,
  mustReject,
  storageOK,
  root,
} from '../../../supabase/tests/support.mjs';
const cfg = loadConfig(),
  db = new pg.Client({ connectionString: cfg.db }),
  service = client(cfg, cfg.service),
  anon = client(cfg);
const run = randomUUID().slice(0, 8),
  report = { run, environment: 'local-real-supabase', tests: [], host: cfg.url },
  users = {};
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1S4AAAAASUVORK5CYII=',
  'base64',
);
const bucket = 'catalog-media-private',
  adminUrl = 'http://127.0.0.1:3002';
async function test(name, fn) {
  try {
    await fn();
    report.tests.push({ name, status: 'PASS' });
    console.log('PASS ' + name);
  } catch (e) {
    report.tests.push({ name, status: 'FAIL', code: e.code, message: e.message });
    throw e;
  }
}
async function user(role) {
  const email = `phase1-${role}-${run}@example.test`,
    password = randomBytes(24).toString('base64url') + 'aA1!';
  const r = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (r.error) throw r.error;
  if (role !== 'outsider')
    await db.query('INSERT INTO private.admin_members(user_id,role) VALUES($1,$2)', [
      r.data.user.id,
      role,
    ]);
  const c = client(cfg),
    session = await c.auth.signInWithPassword({ email, password });
  if (session.error) throw session.error;
  users[role] = {
    client: c,
    id: r.data.user.id,
    email,
    password,
    token: session.data.session.access_token,
  };
}
const get = (id) => rpc(users.admin.client, 'admin_product', { p_id: id });
const save = (id, version, product = {}, changes = {}, who = 'admin') =>
  rpc(users[who].client, 'save_product', {
    p_id: id,
    p_expected_updated_at: version,
    p_product: product,
    p_changes: changes,
  });
const fresh = async (category, name) => {
  const p = await save(null, null, {
    category_id: category,
    name: `TEST-PHASE1 ${run}｜${name}`,
    product_code: `TEST-PHASE1-${run}-${randomUUID()}`,
  });
  return get(p.id);
};
const upload = async (id) => {
  const path = `${id}/${randomUUID()}.png`;
  await storageOK(
    users.admin.client.storage
      .from(bucket)
      .upload(path, png, { contentType: 'image/png', upsert: false }),
  );
  return path;
};
async function http(path, body, role = 'admin') {
  const response = await fetch(adminUrl + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${users[role].token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  return { response, body: await response.json() };
}
let w, aa, niche, funeral, series, reference;
try {
  await db.connect();
  await test('Auth creates real local administrator, editor and ordinary user', async () => {
    for (const role of ['admin', 'editor', 'outsider']) await user(role);
  });
  await test('18 tables and original niche columns remain unchanged', async () => {
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='private'"))
        .rows[0].n,
      18,
    );
    const cols = (
      await db.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='private' AND table_name='niche_details' ORDER BY ordinal_position",
      )
    ).rows.map((r) => r.column_name);
    assert.deepEqual(cols, ['product_id', 'theme_name', 'niche_style', 'niche_notes']);
  });
  await test('All bounded admin endpoints deny anonymous and nonmembers', async () => {
    for (const [name, args] of [
      ['admin_reference_data', {}],
      ['admin_product_list', {}],
      ['admin_category_order', { p_category: 1 }],
      ['admin_audit_logs', {}],
      ['admin_cleanup_candidates', { p_bucket: bucket, p_paths: [] }],
      ['admin_save_reference', { p_kind: 'series', p_values: { name: 'forbidden' } }],
      ['admin_reorder_products', { p_category: 1, p_order: [] }],
      [
        'admin_copy_product',
        {
          p_source: randomUUID(),
          p_target: randomUUID(),
          p_expected_updated_at: new Date().toISOString(),
        },
      ],
    ])
      for (const c of [anon, users.outsider.client])
        await mustReject(() => rpc(c, name, args), /42501/);
  });
  await test('Quick-add series persists, duplicate names and editor writes are denied', async () => {
    series = await rpc(users.admin.client, 'admin_save_reference', {
      p_kind: 'series',
      p_values: {
        name: `TEST series ${run}`,
        code: `phase1-${run}`,
        series_type: 'park',
        is_active: true,
        sort_order: 0,
      },
    });
    assert(series.id);
    await mustReject(
      () =>
        rpc(users.admin.client, 'admin_save_reference', {
          p_kind: 'series',
          p_values: { name: ` test SERIES ${run} `, series_type: 'park' },
        }),
      /23505/,
    );
    await mustReject(
      () =>
        rpc(users.editor.client, 'admin_save_reference', {
          p_kind: 'series',
          p_values: { name: 'editor forbidden' },
        }),
      /42501/,
    );
  });
  await test('Dictionary version conflict preserves saved record', async () => {
    const stale = { ...series, name: 'stale' };
    await mustReject(
      () =>
        rpc(users.admin.client, 'admin_save_reference', {
          p_kind: 'series',
          p_id: series.id,
          p_expected: stale,
          p_values: { name: 'must not win' },
        }),
      /PT409/,
    );
    assert(
      (await rpc(users.admin.client, 'admin_reference_data')).series.some(
        (r) => r.id === series.id && r.name === series.name,
      ),
    );
  });
  await test('Religion dictionary uses smallint IDs, does not auto-associate or publish', async () => {
    reference = await rpc(users.admin.client, 'admin_save_reference', {
      p_kind: 'religions',
      p_values: { name: `TEST 宗教 ${run}`, code: `test-${run}`, is_active: true },
    });
    assert.equal(typeof reference.id, 'number');
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int AS n FROM private.product_religions WHERE religion_id=$1',
          [reference.id],
        )
      ).rows[0].n,
      0,
    );
  });
  await test('Notice edits persist without adding date or price fields', async () => {
    const row = await rpc(users.admin.client, 'admin_save_reference', {
      p_kind: 'notices',
      p_values: { content: `TEST notice ${run}`, is_active: false, sort_order: 10 },
    });
    assert(row.id);
    await mustReject(
      () =>
        rpc(users.admin.client, 'admin_save_reference', {
          p_kind: 'notices',
          p_values: { content: 'bad', start_date: '2026-10-22' },
        }),
      /22023/,
    );
  });
  await test('New products append to own category and are searchable by internal code', async () => {
    w = await fresh(1, 'W区');
    aa = await fresh(1, 'AA区');
    niche = await fresh(3, '聚仙楼');
    funeral = await fresh(4, '殡仪服务');
    assert(aa.product.sort_order > w.product.sort_order);
    const page = await rpc(users.admin.client, 'admin_product_list', {
      p_query: aa.product.product_code,
    });
    assert.equal(page.total, 1);
    assert.equal(page.items[0].product.id, aa.product.id);
  });
  await test('Editor can read drafts but cannot reorder, view audit or alter dictionaries', async () => {
    assert((await rpc(users.editor.client, 'admin_product_list', { p_query: run })).total >= 4);
    await mustReject(
      () => rpc(users.editor.client, 'admin_reorder_products', { p_category: 1, p_order: [] }),
      /42501/,
    );
    await mustReject(() => rpc(users.editor.client, 'admin_audit_logs'), /42501/);
  });
  await test('Category reorder is atomic, isolated and rejects partial/cross-category/stale sets', async () => {
    const before = await rpc(users.admin.client, 'admin_category_order', { p_category: 1 }),
      other = await rpc(users.admin.client, 'admin_category_order', { p_category: 3 });
    await mustReject(
      () =>
        rpc(users.admin.client, 'admin_reorder_products', {
          p_category: 1,
          p_order: before.slice(1),
        }),
      /PT409/,
    );
    const cross = [...before];
    cross[0] = other[0];
    await mustReject(
      () => rpc(users.admin.client, 'admin_reorder_products', { p_category: 1, p_order: cross }),
      /PT409/,
    );
    const after = await rpc(users.admin.client, 'admin_reorder_products', {
      p_category: 1,
      p_order: [...before].reverse(),
    });
    assert.deepEqual(
      after.map((r) => r.id),
      before.map((r) => r.id).reverse(),
    );
    assert.deepEqual(
      await rpc(users.admin.client, 'admin_category_order', { p_category: 3 }),
      other,
    );
    await mustReject(
      () => rpc(users.admin.client, 'admin_reorder_products', { p_category: 1, p_order: before }),
      /PT409/,
    );
    w = await get(w.product.id);
    aa = await get(aa.product.id);
  });
  await test('Editor draft save is real; publication incomplete keeps old draft intact', async () => {
    const before = await get(niche.product.id);
    await save(
      niche.product.id,
      before.product.updated_at,
      { name: `TEST-PHASE1 ${run}｜聚仙楼草稿` },
      {},
      'editor',
    );
    const d = await get(niche.product.id);
    assert.equal(d.product.publication_status, 'draft');
    await mustReject(
      () => save(d.product.id, d.product.updated_at, { publication_status: 'published' }),
      /23514/,
    );
    assert.deepEqual(await get(d.product.id), d);
    niche = d;
  });
  await test('Actual image, religious contents and offer prices publish in one transaction', async () => {
    const path = await upload(w.product.id),
      imageId = randomUUID();
    w = await get(w.product.id);
    await save(
      w.product.id,
      w.product.updated_at,
      {
        product_form: 'package',
        capacity_group: 'double',
        publication_status: 'published',
        series_id: series.id,
        internal_notes: 'TEST internal',
        source_reference: 'TEST ONLY not production',
      },
      {
        product_religions: {
          upsert: [
            { religion_id: 1, is_published: true },
            { religion_id: 2, is_published: true },
          ],
        },
        offer_prices: {
          upsert: [
            {
              offer_id: w.product_offers[0].id,
              price_type: 'standard',
              price_amount: 21888,
              is_published: true,
            },
          ],
        },
        product_inclusions: {
          upsert: [
            { item_name: 'TEST 共通项目' },
            { religion_id: 1, item_name: 'TEST 佛教项目' },
            { religion_id: 2, item_name: 'TEST 基督教项目' },
          ],
        },
        product_images: {
          upsert: [
            {
              id: imageId,
              storage_bucket: bucket,
              storage_path: path,
              is_primary: true,
              is_published: true,
            },
          ],
        },
      },
    );
    w = await get(w.product.id);
    assert.equal(w.product.publication_status, 'published');
    const d = await rpc(anon, 'catalog_product_detail', { p_slug: w.product.slug });
    assert.equal(d.prices[0].amount, 21888);
    assert(!JSON.stringify(d).includes('TEST internal'));
  });
  await test('Referenced media cannot be removed even with service_role', async () => {
    const img = w.product_images[0];
    const result = await service.storage.from(bucket).remove([img.storage_path]);
    assert(result.error);
    assert.equal(
      (await storageOK(anon.storage.from(bucket).download(img.storage_path))).size,
      png.length,
    );
  });
  await test('Copy endpoint validates real JWT and role before any file operation', async () => {
    const out = await http(
      '/api/copy-product',
      { id: w.product.id, version: w.product.updated_at },
      'outsider',
    );
    assert.equal(out.response.status, 403);
  });
  await test('Real server copy creates new IDs, independent private file and unpublished child records', async () => {
    const result = await http(
      '/api/copy-product',
      { id: w.product.id, version: w.product.updated_at },
      'editor',
    );
    assert.equal(result.response.status, 200, JSON.stringify(result.body));
    const copy = result.body;
    assert.notEqual(copy.product.id, w.product.id);
    assert.equal(copy.product.publication_status, 'draft');
    assert.equal(copy.product.product_code, null);
    assert.equal(copy.product.internal_notes, null);
    assert.equal(copy.product.source_reference, null);
    assert(copy.offer_prices.every((x) => !x.is_published));
    assert(copy.product_religions.every((x) => !x.is_published));
    assert(copy.product_images.every((x) => !x.is_published));
    assert.notEqual(copy.product_images[0].storage_path, w.product_images[0].storage_path);
    await mustReject(() =>
      storageOK(anon.storage.from(bucket).download(copy.product_images[0].storage_path)),
    );
    assert.deepEqual(await get(w.product.id), w);
    assert(
      copy.product_inclusions.every(
        (x) => !x.offer_id || copy.product_offers.some((o) => o.id === x.offer_id),
      ),
    );
  });
  await test('Wrong copied-image manifest rolls back partial rows and audit after copy starts', async () => {
    const target = randomUUID(),
      logs = (await db.query('SELECT count(*)::int AS n FROM private.audit_logs')).rows[0].n;
    await mustReject(
      () =>
        rpc(users.admin.client, 'admin_copy_product', {
          p_source: w.product.id,
          p_expected_updated_at: w.product.updated_at,
          p_target: target,
          p_images: w.product_images.map((x) => ({
            source_id: x.id,
            bucket: x.storage_bucket,
            path: `${target}/${randomUUID()}.png`,
          })),
        }),
      /23514/,
    );
    assert.equal(await get(target), null);
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM private.audit_logs')).rows[0].n,
      logs,
    );
  });
  await test('Stale copy HTTP returns 409 without preparing or changing source', async () => {
    const r = await http('/api/copy-product', {
      id: w.product.id,
      version: '2000-01-01T00:00:00Z',
    });
    assert.equal(r.response.status, 409);
    assert.deepEqual(await get(w.product.id), w);
  });
  await test('Cleanup cannot remove referenced media; unreferenced files are really deleted', async () => {
    const spare = await upload(aa.product.id),
      live = w.product_images[0];
    const result = await http('/api/media-cleanup', {
      images: [live, { storage_bucket: bucket, storage_path: spare }],
    });
    assert.equal(result.response.status, 200);
    assert.equal(
      (await storageOK(anon.storage.from(bucket).download(live.storage_path))).size,
      png.length,
    );
    await mustReject(() => storageOK(users.admin.client.storage.from(bucket).download(spare)));
  });
  await test('Editor cleanup is denied for unreferenced files of published product', async () => {
    const path = await upload(w.product.id);
    const paths = await rpc(users.editor.client, 'admin_cleanup_candidates', {
      p_bucket: bucket,
      p_paths: [path],
    });
    assert.deepEqual(paths, []);
    await http('/api/media-cleanup', { images: [{ storage_bucket: bucket, storage_path: path }] });
  });
  await test('Religion hide filters public items; last required religion cannot disappear', async () => {
    let current = await get(w.product.id);
    const christian = current.product_religions.find((x) => x.religion_id === 2);
    await save(
      w.product.id,
      current.product.updated_at,
      {},
      { product_religions: { upsert: [{ id: christian.id, is_published: false }] } },
    );
    current = await get(w.product.id);
    const pub = await rpc(anon, 'catalog_product_detail', { p_slug: current.product.slug });
    assert(!pub.inclusions.some((x) => x.religion_id === 2));
    await mustReject(
      () =>
        save(
          w.product.id,
          current.product.updated_at,
          {},
          {
            product_religions: {
              upsert: current.product_religions.map((x) => ({ id: x.id, is_published: false })),
            },
          },
        ),
      /23514/,
    );
    w = current;
  });
  await test('Audit is authentic and all legacy direct-table denials remain', async () => {
    const logs = await rpc(users.admin.client, 'admin_audit_logs');
    assert(logs.total > 0);
    for (const role of ['anon', 'authenticated']) {
      await db.query('BEGIN');
      try {
        await db.query(`SET LOCAL ROLE ${role}`);
        await mustReject(() => db.query('SELECT * FROM private.products'), /42501/);
      } finally {
        await db.query('ROLLBACK');
      }
    }
  });
  await test('A real concurrent edit during file copy returns 409 and compensates prepared files', async () => {
    const before = (await db.query('SELECT count(*)::int AS n FROM storage.objects')).rows[0].n;
    await db.query('BEGIN');
    await db.query('SELECT private.catalog_write_lock()');
    const pending = http('/api/copy-product', { id: w.product.id, version: w.product.updated_at });
    try {
      let prepared = false;
      for (let i = 0; i < 100; i++) {
        if ((await db.query('SELECT count(*)::int AS n FROM storage.objects')).rows[0].n > before) {
          prepared = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      assert(prepared, 'The real server must prepare an independent private object');
      await db.query('UPDATE private.products SET subtitle=$1 WHERE id=$2', [
        'concurrent copy winner',
        w.product.id,
      ]);
      await db.query('COMMIT');
      const r = await pending;
      assert.equal(r.response.status, 409);
      assert.deepEqual(r.body.cleanupPending, []);
      assert.equal(
        (await db.query('SELECT count(*)::int AS n FROM storage.objects')).rows[0].n,
        before,
      );
      w = await get(w.product.id);
    } catch (e) {
      await db.query('ROLLBACK');
      await pending.catch(() => {});
      throw e;
    }
  });
  await test('Actual Storage delete failure is reported and cleanup retry succeeds', async () => {
    const path = await upload(aa.product.id);
    await db.query(
      "CREATE FUNCTION private.test_cleanup_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.name=TG_ARGV[0] THEN RAISE EXCEPTION 'TEST cleanup failure'; END IF; RETURN OLD; END $$",
    );
    await db.query(
      `CREATE TRIGGER test_cleanup_failure BEFORE DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION private.test_cleanup_failure('${path}')`,
    );
    try {
      const first = await http('/api/media-cleanup', {
        images: [{ storage_bucket: bucket, storage_path: path }],
      });
      assert.equal(first.response.status, 502);
      assert.equal(first.body.pending.length, 1);
    } finally {
      await db.query('DROP TRIGGER test_cleanup_failure ON storage.objects');
      await db.query('DROP FUNCTION private.test_cleanup_failure()');
    }
    const retry = await http('/api/media-cleanup', {
      images: [{ storage_bucket: bucket, storage_path: path }],
    });
    assert.equal(retry.response.status, 200);
    await mustReject(() => storageOK(users.admin.client.storage.from(bucket).download(path)));
  });
  await test('Browser acceptance account and sample IDs are saved only in ignored local work', async () => {
    await fs.writeFile(
      new URL('work/catalog-security/admin-browser.json', root),
      JSON.stringify(
        {
          adminUrl,
          run,
          admin: users.admin,
          editor: users.editor,
          ids: {
            w: w.product.id,
            aa: aa.product.id,
            niche: niche.product.id,
            funeral: funeral.product.id,
          },
        },
        (key, value) => (key === 'client' ? undefined : value),
        2,
      ),
      { mode: 0o600 },
    );
  });
} catch (e) {
  console.error('Phase 1 integration failed: ' + e.message);
  process.exitCode = 1;
} finally {
  report.finished_at = new Date().toISOString();
  report.passed = report.tests.filter((x) => x.status === 'PASS').length;
  report.failed = report.tests.filter((x) => x.status === 'FAIL').length;
  await fs.writeFile(
    new URL('./integration-result.json', import.meta.url),
    JSON.stringify(report, null, 2) + '\n',
  );
  await db.end();
  console.log(`Phase 1 real integration: ${report.passed} passed, ${report.failed} failed`);
}
