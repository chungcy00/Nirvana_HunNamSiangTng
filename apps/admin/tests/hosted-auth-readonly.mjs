// Existing hosted project: public key only, reads only, no users/fixtures/product writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const config = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const url = config.url,
  key = config.anon || config.key;
assert.equal(new URL(url).hostname, 'iapdtipxubhulsxqnriv.supabase.co');
assert(key);
const report = {
  environment: 'hosted-public-key-only-read-only',
  checks: [],
  product_writes: false,
};
async function test(name, fn) {
  try {
    const details = await fn();
    report.checks.push({ name, status: 'PASS', ...details });
    console.log('PASS ' + name);
  } catch (e) {
    report.checks.push({ name, status: 'FAIL', message: e.message });
    throw e;
  }
}
try {
  await test('Hosted Auth enables email, disables public signup and anonymous login', async () => {
    const r = await fetch(url + '/auth/v1/settings', { headers: { apikey: key } });
    assert.equal(r.status, 200);
    const s = await r.json();
    assert.equal(s.disable_signup, true);
    assert.equal(s.external.email, true);
    assert.equal(s.external.anonymous_users, false);
    return { http_status: r.status };
  });
  for (const [name, args] of [
    ['current_catalog_member', {}],
    ['admin_reference_data', {}],
    ['admin_product_list', {}],
    ['admin_category_order', { p_category: 1 }],
    ['admin_audit_logs', {}],
    ['admin_product', { p_id: '00000000-0000-0000-0000-000000000000' }],
  ])
    await test('Anonymous denied ' + name, async () => {
      const r = await fetch(url + '/rest/v1/rpc/' + name, {
        method: 'POST',
        headers: { apikey: key, 'Content-Type': 'application/json', 'Content-Profile': 'api' },
        body: JSON.stringify(args),
      });
      assert([401, 403].includes(r.status));
      return { http_status: r.status };
    });
  for (const table of ['products', 'admin_members', 'audit_logs'])
    await test('Private schema not exposed: ' + table, async () => {
      const r = await fetch(url + '/rest/v1/' + table + '?select=*', {
        headers: { apikey: key, 'Accept-Profile': 'private' },
      });
      assert.equal(r.status, 406);
      return { http_status: r.status };
    });
  for (const bucket of ['catalog-media-private', 'catalog-media-restricted'])
    await test('Private bucket is not publicly addressable: ' + bucket, async () => {
      const r = await fetch(url + '/storage/v1/bucket/' + bucket, { headers: { apikey: key } });
      assert(r.status >= 400);
      return { http_status: r.status };
    });
  await test('Public catalogue reads only published eligible products', async () => {
    const r = await fetch(url + '/rest/v1/rpc/catalog_product_list', {
      method: 'POST',
      headers: { apikey: key, 'Content-Profile': 'api', 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(r.status, 200);
    const rows = await r.json();
    assert.deepEqual(rows, []);
    return { http_status: r.status, published_count: rows.length };
  });
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  report.passed = report.checks.filter((c) => c.status === 'PASS').length;
  report.failed = report.checks.filter((c) => c.status === 'FAIL').length;
  report.finished_at = new Date().toISOString();
  await fs.writeFile(
    new URL('hosted-auth-readonly-result.json', import.meta.url),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(`Hosted read-only Auth: ${report.passed} passed, ${report.failed} failed`);
}
