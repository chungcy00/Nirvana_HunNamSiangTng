// Phase 2: real LOCAL Auth sessions, API grants/RLS and private Storage. Never hosted writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import pg from '../../../supabase/tests/node_modules/pg/lib/index.js';
import { chromium } from '@playwright/test';
import {
  loadConfig,
  client,
  rpc,
  mustReject,
  storageOK,
} from '../../../supabase/tests/support.mjs';
const cfg = loadConfig(),
  db = new pg.Client({ connectionString: cfg.db }),
  service = client(cfg, cfg.service),
  run = randomUUID().slice(0, 8);
const report = {
  environment: 'local-real-auth-rls-storage',
  tests: [],
  production_product_writes: false,
};
const password = randomBytes(24).toString('base64url') + 'Aa1!',
  email = `auth-phase2-${run}@example.test`,
  user = client(cfg);
const browser = await chromium.launch({ headless: true });
let uid, p, session, path;
const bytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1S4AAAAASUVORK5CYII=',
  'base64',
);
async function test(name, fn) {
  try {
    await fn();
    report.tests.push({ name, status: 'PASS' });
    console.log('PASS ' + name);
  } catch (e) {
    report.tests.push({ name, status: 'FAIL', message: e.message });
    throw e;
  }
}
try {
  await db.connect();
  await test('Public signup disabled and anonymous login disabled in actual Auth configuration', async () => {
    const r = await fetch(cfg.url + '/auth/v1/settings', { headers: { apikey: cfg.anon } });
    const settings = await r.json();
    assert.equal(settings.disable_signup, true);
    assert.equal(settings.external.anonymous_users, false);
  });
  await test('Real administrator password login validates getUser and DB membership, wrong password rejected', async () => {
    const r = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin' },
    });
    if (r.error) throw r.error;
    uid = r.data.user.id;
    await db.query('INSERT INTO private.admin_members(user_id,role) VALUES($1,$2)', [uid, 'admin']);
    const wrong = await client(cfg).auth.signInWithPassword({
      email,
      password: password + 'wrong',
    });
    assert(wrong.error);
    const login = await user.auth.signInWithPassword({ email, password });
    if (login.error) throw login.error;
    session = login.data.session;
    assert.equal((await user.auth.getUser()).data.user.id, uid);
    assert.equal((await rpc(user, 'current_catalog_member')).role, 'admin');
  });
  await test('Actual refresh rotates a valid session; logout rejects its refresh token', async () => {
    const c = client(cfg);
    const first = await c.auth.signInWithPassword({ email, password });
    if (first.error) throw first.error;
    const refreshed = await c.auth.refreshSession();
    if (refreshed.error) throw refreshed.error;
    const token = refreshed.data.session.refresh_token;
    const out = await c.auth.signOut();
    if (out.error) throw out.error;
    assert.equal((await c.auth.getSession()).data.session, null);
    const replay = await client(cfg).auth.refreshSession({ refresh_token: token });
    assert(replay.error);
  });
  await test('Anonymous and forged JWT cannot call admin RPC, ordinary authenticated user cannot self-promote', async () => {
    for (const token of [null, 'not-a-jwt']) {
      const r = await fetch(cfg.url + '/rest/v1/rpc/current_catalog_member', {
        method: 'POST',
        headers: {
          apikey: cfg.anon,
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: '{}',
      });
      assert(r.status >= 400);
    }
    const o = await service.auth.admin.createUser({
      email: `outsider-${run}@example.test`,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin', is_active: true },
    });
    if (o.error) throw o.error;
    const c = client(cfg);
    await c.auth.signInWithPassword({ email: o.data.user.email, password });
    await mustReject(() => rpc(c, 'current_catalog_member'), /42501/);
    await mustReject(() => rpc(c, 'admin_reference_data'), /42501/);
  });
  await test('Even a real admin JWT has no direct private-table REST access', async () => {
    for (const table of ['products', 'admin_members', 'audit_logs', 'product_images']) {
      const response = await fetch(`${cfg.url}/rest/v1/${table}?select=*`, {
        headers: {
          apikey: cfg.anon,
          Authorization: 'Bearer ' + session.access_token,
          'Accept-Profile': 'private',
        },
      });
      assert.equal(response.status, 406);
    }
  });
  await test('Downgrading DB role applies immediately to existing JWT without token refresh', async () => {
    await db.query("UPDATE private.admin_members SET role='editor' WHERE user_id=$1", [uid]);
    assert.equal((await rpc(user, 'current_catalog_member')).role, 'editor');
    await mustReject(() => rpc(user, 'admin_audit_logs'), /42501/);
    await mustReject(
      () =>
        rpc(user, 'admin_save_reference', {
          p_kind: 'series',
          p_values: { name: 'must-not-save' },
        }),
      /42501/,
    );
    await db.query("UPDATE private.admin_members SET role='admin' WHERE user_id=$1", [uid]);
  });
  await test('Private and restricted file uploads, reads and signed URL denial use actual Storage', async () => {
    const saved = await rpc(user, 'save_product', {
      p_product: { category_id: 1, name: `TEST-AUTH ${run}` },
    });
    p = saved;
    path = `${p.id}/${randomUUID()}.png`;
    await storageOK(
      user.storage
        .from('catalog-media-restricted')
        .upload(path, bytes, { contentType: 'image/png' }),
    );
    assert.equal(
      (await storageOK(user.storage.from('catalog-media-restricted').download(path))).size,
      bytes.length,
    );
    await mustReject(() =>
      storageOK(client(cfg).storage.from('catalog-media-restricted').download(path)),
    );
    await mustReject(() =>
      storageOK(user.storage.from('catalog-media-restricted').createSignedUrl(path, 60)),
    );
  });
  await test('Disabled member JWT loses all admin APIs and restricted bytes immediately', async () => {
    await db.query('UPDATE private.admin_members SET is_active=false WHERE user_id=$1', [uid]);
    try {
      for (const [name, args] of [
        ['current_catalog_member', {}],
        ['admin_reference_data', {}],
        ['admin_product_list', {}],
        ['admin_product', { p_id: p.id }],
        ['admin_audit_logs', {}],
        ['admin_category_order', { p_category: 1 }],
        [
          'save_product',
          { p_id: p.id, p_expected_updated_at: p.updated_at, p_product: { name: 'must-not-save' } },
        ],
      ])
        await mustReject(() => rpc(user, name, args), /42501/);
      await mustReject(() =>
        storageOK(user.storage.from('catalog-media-restricted').download(path)),
      );
    } finally {
      await db.query('UPDATE private.admin_members SET is_active=true WHERE user_id=$1', [uid]);
    }
  });
  await test('Real recovery token opens password form, clears URL secrets and submits password through Auth', async () => {
    const link = await service.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: 'http://127.0.0.1:3002/reset-password' },
    });
    if (link.error) throw link.error;
    const verify = await client(cfg).auth.verifyOtp({
      token_hash: link.data.properties.hashed_token,
      type: 'recovery',
    });
    if (verify.error) throw verify.error;
    const s = verify.data.session;
    const page = await browser.newPage();
    await page.goto(
      `http://127.0.0.1:3002/reset-password#access_token=${s.access_token}&refresh_token=${s.refresh_token}&type=recovery`,
    );
    await page.getByRole('heading', { name: '设置后台密码', exact: true }).waitFor();
    assert.equal(page.url(), 'http://127.0.0.1:3002/reset-password');
    const next = randomBytes(24).toString('base64url') + 'aA1!';
    await page.getByLabel('新密码', { exact: true }).fill(next);
    await page.getByLabel('确认新密码', { exact: true }).fill(next);
    await page.getByRole('button', { name: '设置密码并重新登录', exact: true }).click();
    await page.getByRole('heading', { name: '后台登录', exact: true }).waitFor();
    const result = await client(cfg).auth.signInWithPassword({ email, password: next });
    if (result.error) throw result.error;
    await page.close();
  });
  await test('Actual recovery email and PKCE code exchange complete in the same browser', async () => {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:3002/login');
    await page.getByRole('button', { name: '忘记密码／激活邀请', exact: true }).click();
    await page.getByLabel('邮箱', { exact: true }).fill(email);
    await page.getByRole('button', { name: '发送恢复邮件', exact: true }).click();
    await page
      .getByText(
        '如果此邮箱属于可恢复的账号，将收到恢复邮件。请复制邮件中恢复按钮的链接，在下方验证页面粘贴；先不要打开邮件链接。',
        {
          exact: true,
        },
      )
      .waitFor();
    let message;
    for (let n = 0; n < 20; n++) {
      const inbox = await (await fetch('http://127.0.0.1:56324/api/v1/messages')).json();
      message = inbox.messages.find((m) => m.To?.some((t) => t.Address === email));
      if (message) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    assert(message, 'real local recovery email not received');
    const mail = await (await fetch('http://127.0.0.1:56324/api/v1/message/' + message.ID)).json();
    const href = (mail.HTML.match(/href="([^"]+)"/) || [])[1]?.replaceAll('&amp;', '&');
    assert(href, 'recovery email link');
    const url = new URL(href);
    assert.equal(url.origin, cfg.url);
    assert.equal(url.pathname, '/auth/v1/verify');
    assert.equal(new URL(url.searchParams.get('redirect_to')).origin, 'http://127.0.0.1:3002');
    await page.goto(href);
    await page.getByRole('heading', { name: '设置后台密码', exact: true }).waitFor();
    assert.equal(page.url(), 'http://127.0.0.1:3002/reset-password');
    await page.close();
  });
  await test('Missing, expired and forged callback parameters show failure, never expose admin shell', async () => {
    const page = await browser.newPage();
    for (const suffix of [
      '/auth/callback',
      '/reset-password#error=access_denied',
      '/auth/callback?code=not-real&next=https://evil.test',
    ]) {
      await page.goto('http://127.0.0.1:3002' + suffix);
      await page.getByRole('alert').waitFor();
      assert.equal(await page.getByRole('heading', { name: '产品管理', exact: true }).count(), 0);
      assert(!page.url().includes('code='));
    }
    await page.close();
  });
  await test('Deleting Auth user cascades membership; cached JWT no longer authorizes data', async () => {
    const out = await service.auth.admin.deleteUser(uid);
    if (out.error) throw out.error;
    await mustReject(() => rpc(user, 'current_catalog_member'), /42501/);
    await mustReject(() => storageOK(user.storage.from('catalog-media-restricted').download(path)));
  });
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  await db.end();
  report.passed = report.tests.filter((t) => t.status === 'PASS').length;
  report.failed = report.tests.filter((t) => t.status === 'FAIL').length;
  report.finished_at = new Date().toISOString();
  await fs.writeFile(
    new URL('auth-security-result.json', import.meta.url),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(`Phase 2 Auth: ${report.passed} passed, ${report.failed} failed`);
}
