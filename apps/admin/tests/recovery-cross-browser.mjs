// Actual local Auth + mail + separate browser storage; no hosted writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { randomUUID, randomBytes } from 'node:crypto';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import pg from '../../../supabase/tests/node_modules/pg/lib/index.js';
import { loadConfig, client } from '../../../supabase/tests/support.mjs';
const cfg = loadConfig(),
  service = client(cfg, cfg.service),
  db = new pg.Client({ connectionString: cfg.db });
const browser = await chromium.launch({ headless: true }),
  ids = [],
  tests = [];
const base = 'http://127.0.0.1:3003';
async function test(name, fn) {
  try {
    await fn();
    tests.push({ name, status: 'PASS' });
    console.log('PASS ' + name);
  } catch (e) {
    tests.push({ name, status: 'FAIL', message: e.message });
    throw e;
  }
}
async function account(member) {
  const email = `recovery-${randomUUID()}@example.test`;
  const r = await service.auth.admin.createUser({ email, email_confirm: true });
  if (r.error) throw r.error;
  ids.push(r.data.user.id);
  if (member)
    await db.query("insert into private.admin_members(user_id,role) values($1,'admin')", [
      r.data.user.id,
    ]);
  const sender = createClient(cfg.url, cfg.anon, {
    auth: {
      flowType: 'pkce',
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const sent = await sender.auth.resetPasswordForEmail(email, {
    redirectTo: 'http://127.0.0.1:3002/reset-password',
  });
  if (sent.error) throw sent.error;
  let message;
  for (let n = 0; n < 25; n++) {
    const inbox = await (await fetch('http://127.0.0.1:56324/api/v1/messages')).json();
    message = inbox.messages.find((m) => m.To?.some((t) => t.Address === email));
    if (message) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  assert(message, 'actual email received');
  const mail = await (await fetch('http://127.0.0.1:56324/api/v1/message/' + message.ID)).json();
  const href = mail.HTML.match(/href="([^"]+)"/)[1].replaceAll('&amp;', '&');
  assert(new URL(href).searchParams.get('token').startsWith('pkce_'));
  return { email, href };
}
try {
  await db.connect();
  const admin = await account(true),
    ctx = await browser.newContext(),
    page = await ctx.newPage();
  await test('No session or pasted link cannot expose password form', async () => {
    await page.goto(base + '/reset-password?method=link');
    await page.getByLabel('邮件恢复链接', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('新密码', { exact: true }).count(), 0);
    await page
      .getByLabel('邮件恢复链接', { exact: true })
      .fill('https://evil.test/auth/v1/verify?token=' + 'a'.repeat(64) + '&type=recovery');
    await page.getByRole('button', { name: '验证并设置密码', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByLabel('新密码', { exact: true }).count(), 0);
  });
  await test('Real PKCE recovery email works in a fresh browser context without sender verifier', async () => {
    await page.getByLabel('邮件恢复链接', { exact: true }).fill(admin.href);
    await page.getByRole('button', { name: '验证并设置密码', exact: true }).click();
    await page.getByRole('heading', { name: '设置后台密码', exact: true }).waitFor();
    assert.equal(page.url(), base + '/reset-password');
    assert.equal(await page.getByLabel('邮件恢复链接', { exact: true }).count(), 0);
  });
  await test('Consumed recovery link is rejected in another browser context', async () => {
    const other = await browser.newPage();
    await other.goto(base + '/reset-password?method=link');
    await other.getByLabel('邮件恢复链接', { exact: true }).fill(admin.href);
    await other.getByRole('button', { name: '验证并设置密码', exact: true }).click();
    await other.getByRole('alert').waitFor();
    assert.equal(await other.getByLabel('新密码', { exact: true }).count(), 0);
    await other.close();
  });
  await test('Actual password update, logout and new password login succeed for local test admin', async () => {
    const password = randomBytes(24).toString('base64url') + 'Aa1!';
    await page.getByLabel('新密码', { exact: true }).fill(password);
    await page.getByLabel('确认新密码', { exact: true }).fill(password);
    await page.getByRole('button', { name: '设置密码并重新登录', exact: true }).click();
    await page.getByRole('heading', { name: '后台登录', exact: true }).waitFor();
    await page.getByLabel('邮箱', { exact: true }).fill(admin.email);
    await page.getByLabel('密码', { exact: true }).fill(password);
    await page.getByRole('button', { name: '登录后台', exact: true }).click();
    await page.getByText('云端管理员登录验证通过', { exact: true }).waitFor();
  });
  await test('Valid recovery email for non-member cannot enable admin password form', async () => {
    const outsider = await account(false),
      other = await browser.newPage();
    await other.goto(base + '/reset-password?method=link');
    await other.getByLabel('邮件恢复链接', { exact: true }).fill(outsider.href);
    await other.getByRole('button', { name: '验证并设置密码', exact: true }).click();
    await other.getByRole('alert').waitFor();
    assert.equal(await other.getByLabel('新密码', { exact: true }).count(), 0);
    await other.goto(base + '/login');
    await other.getByRole('heading', { name: '后台登录', exact: true }).waitFor();
    await other.close();
  });
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  for (const id of ids) await service.auth.admin.deleteUser(id);
  await db.end();
  await browser.close();
  const report = {
    environment: 'actual-local-supabase-auth-mail-and-isolated-browser-contexts',
    production_product_writes: false,
    tests,
    passed: tests.filter((t) => t.status === 'PASS').length,
    failed: tests.filter((t) => t.status === 'FAIL').length,
    finished_at: new Date().toISOString(),
  };
  await fs.writeFile(
    new URL('recovery-cross-browser-result.json', import.meta.url),
    JSON.stringify(report, null, 2) + '\n',
  );
}
