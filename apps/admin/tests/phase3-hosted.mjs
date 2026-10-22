// Real hosted Auth/RPC/Storage; current-run drafts only, no committed publication.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { handler } from '../server/media.ts';
const root = new URL('../../../', import.meta.url),
  work = new URL('work/catalog-security/', root);
const cloud = JSON.parse(await fs.readFile(new URL('cloud-client.json', work), 'utf8'));
assert.equal(new URL(cloud.url).hostname, 'iapdtipxubhulsxqnriv.supabase.co');
const secret = JSON.parse(
  await fs.readFile(new URL('phase3-server-key.json', work), 'utf8'),
).service;
const client = (key = cloud.anon) =>
  createClient(cloud.url, key, {
    db: { schema: 'api' },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
const service = client(secret),
  anon = client(),
  mode = process.argv[2],
  statePath = new URL('phase3-hosted-state.json', work);
const s =
  mode === 'prepare'
    ? { run: randomUUID().slice(0, 8), users: {}, ids: [], files: [] }
    : JSON.parse(await fs.readFile(statePath, 'utf8'));
const report = {
    environment: 'hosted-real-auth-rpc-storage',
    run: s.run,
    tests: [],
    existing_product_writes: false,
    committed_publication: false,
  },
  clients = {};
const checkpoint = () =>
  fs.writeFile(statePath, JSON.stringify(s, null, 2) + '\n', { mode: 0o600 });
async function test(name, fn) {
  try {
    await fn();
    report.tests.push({ name, status: 'PASS' });
    console.log('PASS ' + name);
  } catch (e) {
    report.tests.push({ name, status: 'FAIL', message: e.message, code: e.code });
    throw e;
  }
}
async function rpc(c, name, args = {}) {
  const r = await c.rpc(name, args);
  if (r.error) throw Object.assign(new Error(r.error.message), r.error);
  return r.data;
}
async function reject(fn, re) {
  try {
    await fn();
  } catch (e) {
    if (re) assert.match((e.code || '') + ' ' + e.message, re);
    return;
  }
  throw new Error('Expected rejection');
}
function scoped(id) {
  assert(s.ids.includes(id), 'Only whitelisted current-run IDs may be mutated');
}
async function get(id) {
  scoped(id);
  return rpc(clients.admin, 'admin_product', { p_id: id });
}
async function save(id, v, p = {}, changes = {}, role = 'admin') {
  if (id) scoped(id);
  const r = await rpc(clients[role], 'save_product', {
    p_id: id,
    p_expected_updated_at: v,
    p_product: p,
    p_changes: changes,
  });
  if (!id) {
    s.ids.push(r.id);
    await checkpoint();
  }
  return r;
}
async function login() {
  for (const [role, u] of Object.entries(s.users)) {
    const c = (clients[role] = client());
    const r = await c.auth.signInWithPassword({ email: u.email, password: u.password });
    if (r.error) throw r.error;
    u.token = r.data.session.access_token;
    assert.equal(r.data.user.id, u.id);
  }
  await checkpoint();
}
const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1S4AAAAASUVORK5CYII=',
    'base64',
  ),
  bucket = 'catalog-media-private';
async function upload(id, b = bucket, role = 'admin') {
  scoped(id);
  const path = id + '/' + randomUUID() + '.png';
  const r = await clients[role].storage
    .from(b)
    .upload(path, png, { contentType: 'image/png', cacheControl: '0', upsert: false });
  if (r.error) throw r.error;
  s.files.push({ storage_bucket: b, storage_path: path });
  await checkpoint();
  return path;
}
async function bytes(c, b, path) {
  const r = await c.storage.from(b).download(path);
  if (r.error) throw r.error;
  return Buffer.from(await r.data.arrayBuffer());
}
let server;
async function startServer() {
  server = createServer(
    (req, res) =>
      void handler(req, res, {
        SUPABASE_URL: cloud.url,
        SUPABASE_PUBLISHABLE_KEY: cloud.anon,
        SUPABASE_SERVICE_ROLE_KEY: secret,
      }),
  );
  await new Promise((r) => server.listen(3005, '127.0.0.1', r));
}
async function http(path, body) {
  const r = await fetch('http://127.0.0.1:3005' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.users.admin.token },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  return { status: r.status, body: await r.json() };
}
try {
  if (mode === 'prepare') {
    for (const role of ['admin', 'editor', 'outsider']) {
      const email = `phase3-${role}-${s.run}@example.test`,
        password = randomBytes(24).toString('base64url') + 'Aa1!';
      const r = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'admin', test_run: s.run },
      });
      if (r.error) throw r.error;
      s.users[role] = { id: r.data.user.id, email, password };
      await checkpoint();
    }
    console.log(
      JSON.stringify({
        run: s.run,
        members: Object.fromEntries(Object.entries(s.users).map(([k, v]) => [k, v.id])),
      }),
    );
  } else if (mode === 'run') {
    await test('Real cloud Auth sessions and DB roles; forged metadata cannot promote outsider', async () => {
      await login();
      assert.equal((await rpc(clients.admin, 'current_catalog_member')).role, 'admin');
      assert.equal((await rpc(clients.editor, 'current_catalog_member')).role, 'editor');
      await reject(() => rpc(clients.outsider, 'current_catalog_member'), /42501/);
    });
    await startServer();
    s.records = {};
    const fixtures = JSON.parse(
      await fs.readFile(new URL('supabase/fixtures/real-product-structures.json', root), 'utf8'),
    ).products;
    for (const key of [
      'w-premium-package',
      'aa-double-package',
      'juxian-moon',
      'funeral-1-2',
      'funeral-2-2',
    ])
      await test('Source-based draft create and reread: ' + key, async () => {
        const f = fixtures.find((x) => x.key === key);
        assert(f, 'Missing source fixture');
        const religions = (f.religions || []).map((religion_id) => ({
          id: randomUUID(),
          religion_id,
          is_published: true,
        }));
        const offers = f.prices.map((o) => ({
          id: randomUUID(),
          offer_code: o.code,
          name: o.name,
          is_active: true,
          ...(o.area_sqft ? { area_sqft_override: o.area_sqft } : {}),
        }));
        const prices = f.prices.flatMap((o, i) =>
          ['standard', 'pre_need', 'at_need']
            .filter((k) => o[k] !== undefined)
            .map((price_type) => ({
              id: randomUUID(),
              offer_id: offers[i].id,
              price_type,
              price_amount: o[price_type],
              is_published: true,
            })),
        );
        const ch = {
          product_religions: { upsert: religions },
          product_offers: { upsert: offers },
          offer_prices: { upsert: prices },
        };
        const inc = [
          ...(f.inclusions || []).map((item_name) => ({ item_name })),
          ...(f.religious_inclusions || []),
        ];
        if (inc.length) ch.product_inclusions = { upsert: inc };
        if (f.category_id <= 2)
          ch.burial_details = { upsert: [{ facing: f.facing, area_sqft: f.area_sqft ?? null }] };
        if (f.category_id === 3) ch.niche_details = { upsert: [{ theme_name: f.name }] };
        if (f.category_id === 4)
          ch.funeral_details = {
            upsert: [
              {
                duration_days: f.duration_days,
                duration_nights: f.duration_nights,
                funeral_method: f.funeral_method,
                terms_summary: f.terms_summary,
              },
            ],
          };
        const p = await save(
          null,
          null,
          {
            category_id: f.category_id,
            name: `TEST-PHASE3 ${s.run}｜${f.name}`,
            slug: `phase3-${s.run}-${key}`,
            product_code: `TEST-PHASE3-${s.run}-${key}`,
            internal_notes: 'TEST ONLY independent integration fixture',
            source_reference: f.source,
            ...(f.capacity_group ? { capacity_group: f.capacity_group } : {}),
            ...(f.product_form ? { product_form: f.product_form } : {}),
          },
          ch,
        );
        assert.equal(p.publication_status, 'draft');
        assert.equal((await get(p.id)).offer_prices.length, prices.length);
        s.records[key] = p.id;
        await checkpoint();
      });
    await test('Zone W area/price variants and two religion inclusions remain separate', async () => {
      const p = await get(s.records['w-premium-package']);
      assert.deepEqual(
        p.offer_prices.map((x) => Number(x.price_amount)).sort((a, b) => a - b),
        [113888, 120888, 123888],
      );
      assert.deepEqual(
        p.product_offers.map((x) => Number(x.area_sqft_override)).sort((a, b) => a - b),
        [216, 216, 252],
      );
      assert.equal(p.product_religions.length, 2);
      for (const id of [1, 2]) assert(p.product_inclusions.some((x) => x.religion_id === id));
    });
    await test('Actual cloud file bytes match; anonymous and ordinary user denied', async () => {
      const id = s.records['aa-double-package'];
      s.aaPath = await upload(id);
      assert.deepEqual(await bytes(clients.admin, bucket, s.aaPath), png);
      await reject(() => bytes(anon, bucket, s.aaPath));
      await reject(() => bytes(clients.outsider, bucket, s.aaPath));
      await reject(() => upload(id, bucket, 'outsider'));
    });
    await test('AA main and four religion design images persist with one shared 63888 price', async () => {
      const id = s.records['aa-double-package'],
        p = await get(id),
        images = [
          {
            id: randomUUID(),
            storage_bucket: bucket,
            storage_path: s.aaPath,
            image_type: 'primary',
            is_primary: true,
            is_published: true,
            alt_text: 'TEST ONLY not a product photo',
          },
        ];
      for (const [religion_id, design_name] of [
        [1, '甲款'],
        [1, '乙款'],
        [2, '丙款'],
        [2, '丁款'],
      ])
        images.push({
          id: randomUUID(),
          storage_bucket: bucket,
          storage_path: await upload(id),
          image_type: 'design',
          is_published: true,
          religion_id,
          design_name,
        });
      await save(id, p.product.updated_at, {}, { product_images: { upsert: images } });
      const a = await get(id);
      assert.equal(a.product_images.length, 5);
      assert.equal(a.offer_prices.length, 1);
      assert.equal(Number(a.offer_prices[0].price_amount), 63888);
    });
    await test('Private test main images; unconfirmed Juxian quote stays absent and publication rejected', async () => {
      for (const [key, id] of Object.entries(s.records)) {
        if (key === 'aa-double-package') continue;
        const p = await get(id),
          path = await upload(id);
        await save(
          id,
          p.product.updated_at,
          {},
          {
            product_images: {
              upsert: [
                {
                  id: randomUUID(),
                  storage_bucket: bucket,
                  storage_path: path,
                  image_type: 'primary',
                  is_primary: true,
                  is_published: true,
                  alt_text: 'TEST ONLY not a product photo',
                },
              ],
            },
          },
        );
      }
      const p = await get(s.records['juxian-moon']);
      assert.equal(p.offer_prices.length, 0);
      await reject(
        () => save(p.product.id, p.product.updated_at, { publication_status: 'published' }),
        /23514/,
      );
      assert.deepEqual(await get(p.product.id), p);
    });
    await test('Restricted cloud files require member; signed URLs cannot bypass policies', async () => {
      const path = await upload(s.records['w-premium-package'], 'catalog-media-restricted');
      assert.deepEqual(await bytes(clients.admin, 'catalog-media-restricted', path), png);
      await reject(() => bytes(anon, 'catalog-media-restricted', path));
      assert(
        (await clients.admin.storage.from('catalog-media-restricted').createSignedUrl(path, 60))
          .error,
      );
    });
    await test('One funeral price edit preserves counterpart and Christian product stays independent', async () => {
      const id = s.records['funeral-1-2'],
        p = await get(id),
        pre = p.offer_prices.find((x) => x.price_type === 'pre_need'),
        at = p.offer_prices.find((x) => x.price_type === 'at_need');
      await save(
        id,
        p.product.updated_at,
        {},
        { offer_prices: { upsert: [{ id: pre.id, price_amount: Number(pre.price_amount) + 1 }] } },
      );
      const a = await get(id);
      assert.equal(
        Number(a.offer_prices.find((x) => x.id === at.id).price_amount),
        Number(at.price_amount),
      );
      assert.equal(a.product.price_display_mode, 'funeral_dual');
      assert.equal((await get(s.records['funeral-2-2'])).product_religions[0].religion_id, 2);
    });
    await test('Invalid multi-table save rolls back product and price together', async () => {
      const id = s.records['funeral-1-2'],
        p = await get(id);
      await reject(
        () =>
          save(
            id,
            p.product.updated_at,
            { name: 'MUST NOT COMMIT' },
            { offer_prices: { upsert: [{ id: p.offer_prices[0].id, price_amount: -1 }] } },
          ),
        /23514/,
      );
      assert.deepEqual(await get(id), p);
    });
    await test('Two concurrent real cloud HTTP saves yield one 200 and one 409', async () => {
      const id = s.records['w-premium-package'],
        p = await get(id);
      const responses = await Promise.all(
        ['first', 'second'].map((v) =>
          fetch(cloud.url + '/rest/v1/rpc/save_product', {
            method: 'POST',
            headers: {
              apikey: cloud.anon,
              Authorization: 'Bearer ' + s.users.admin.token,
              'Content-Profile': 'api',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              p_id: id,
              p_expected_updated_at: p.product.updated_at,
              p_product: { internal_notes: 'TEST-PHASE3 concurrent ' + v },
              p_changes: {},
            }),
          }),
        ),
      );
      assert.deepEqual(responses.map((x) => x.status).sort(), [200, 409]);
    });
    await test('Editor can update independent draft but cannot publish', async () => {
      const id = s.records['aa-double-package'],
        p = await get(id);
      await save(
        id,
        p.product.updated_at,
        { internal_notes: 'TEST-PHASE3 editor edit' },
        {},
        'editor',
      );
      const a = await get(id);
      await reject(
        () => save(id, a.product.updated_at, { publication_status: 'published' }, {}, 'editor'),
        /42501/,
      );
    });
    await test('Production copy handler creates independent real cloud bytes and unpublished children', async () => {
      const p = await get(s.records['aa-double-package']),
        r = await http('/api/copy-product', { id: p.product.id, version: p.product.updated_at });
      assert.equal(r.status, 200, r.body.message);
      const a = r.body;
      s.ids.push(a.product.id);
      await checkpoint();
      assert.equal(a.product.publication_status, 'draft');
      assert.equal(a.product_images.length, 5);
      assert(a.offer_prices.every((x) => !x.is_published));
      for (const i of a.product_images) {
        assert(!i.is_published && i.storage_path.startsWith(a.product.id + '/'));
        s.files.push({ storage_bucket: i.storage_bucket, storage_path: i.storage_path });
        await checkpoint();
        assert.deepEqual(await bytes(clients.admin, i.storage_bucket, i.storage_path), png);
      }
      assert.deepEqual(await get(p.product.id), p);
    });
    await test('Referenced cleanup cannot delete live draft image; stale copy returns 409', async () => {
      const p = await get(s.records['aa-double-package']);
      assert.equal(
        (
          await http('/api/media-cleanup', {
            images: [{ storage_bucket: bucket, storage_path: s.aaPath }],
          })
        ).status,
        200,
      );
      assert.deepEqual(await bytes(clients.admin, bucket, s.aaPath), png);
      assert.equal(
        (await http('/api/copy-product', { id: p.product.id, version: '2000-01-01T00:00:00Z' }))
          .status,
        409,
      );
    });
    await test('Public cloud list and details never reveal this run drafts', async () => {
      const rows = await rpc(anon, 'catalog_product_list');
      assert(!rows.some((x) => s.ids.includes(x.id)));
      for (const id of s.ids) {
        const p = await get(id);
        assert.equal(p.product.publication_status, 'draft');
        assert.equal(await rpc(anon, 'catalog_product_detail', { p_slug: p.product.slug }), null);
      }
    });
  } else if (mode === 'cleanup') {
    await login();
    await startServer();
    await test('Delete only whitelisted never-published drafts via actual RPC', async () => {
      for (const id of s.ids) {
        const p = await get(id);
        assert.equal(p.product.publication_status, 'draft');
        assert(p.product.name.includes('TEST-PHASE3 ' + s.run));
        await rpc(clients.admin, 'delete_draft', {
          p_id: id,
          p_expected_updated_at: p.product.updated_at,
        });
        assert.equal(await get(id), null);
      }
    });
    await test('Actual server cleanup removes current-run unreferenced storage bytes', async () => {
      const r = await http('/api/media-cleanup', { images: s.files });
      assert.equal(r.status, 200, r.body.message);
      for (const f of s.files) await reject(() => bytes(service, f.storage_bucket, f.storage_path));
    });
    await test('Revoke temporary sessions and remove temporary Auth accounts', async () => {
      for (const [role, u] of Object.entries(s.users)) {
        await clients[role].auth.signOut();
        const r = await service.auth.admin.deleteUser(u.id);
        if (r.error) throw r.error;
      }
    });
    s.cleaned_at = new Date().toISOString();
    await checkpoint();
  } else throw new Error('Use prepare, run or cleanup');
} catch (e) {
  console.error('Hosted phase3: ' + e.message);
  process.exitCode = 1;
} finally {
  if (server) await new Promise((r) => server.close(r));
  if (mode !== 'prepare') {
    report.fixture_ids = s.ids;
    report.passed = report.tests.filter((x) => x.status === 'PASS').length;
    report.failed = report.tests.filter((x) => x.status === 'FAIL').length;
    report.finished_at = new Date().toISOString();
    await fs.writeFile(
      new URL('phase3-hosted-' + mode + '-result.json', import.meta.url),
      JSON.stringify(report, null, 2) + '\n',
    );
  }
}
