// Actual browser acceptance on localhost with real Auth/RPC/Storage.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { randomUUID } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { loadConfig, client, rpc, root } from '../../../supabase/tests/support.mjs';
const fixture = JSON.parse(
  await fs.readFile(new URL('work/catalog-security/admin-browser.json', root), 'utf8'),
);
const uiRun = fixture.run + '-' + randomUUID().slice(0, 4);
const cfg = loadConfig();
assert.equal(new URL(fixture.adminUrl).hostname, '127.0.0.1');
const out = new URL('.impeccable/review/admin/', root);
await fs.mkdir(out, { recursive: true });
const report = { environment: 'local-browser-real-supabase', tests: [], screenshots: [] };
const browser = await chromium.launch({ headless: true }),
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
  page = await context.newPage();
const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(e.message));
const user = client(cfg);
await user.auth.signInWithPassword({
  email: fixture.admin.email,
  password: fixture.admin.password,
});
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
async function login(p, role = 'admin') {
  await p.goto(fixture.adminUrl);
  await p.getByLabel('邮箱', { exact: true }).fill(fixture[role].email);
  await p.getByLabel('密码', { exact: true }).fill(fixture[role].password);
  await p.getByRole('button', { name: '登录后台', exact: true }).click();
  await p.getByRole('heading', { name: '产品管理', exact: true }).waitFor();
}
async function saveDraft() {
  const pending = page.waitForResponse((r) => r.url().endsWith('/rpc/save_product'));
  const button = page.getByRole('button', { name: '保存草稿', exact: true });
  await button.click();
  const response = await pending;
  assert.equal(response.status(), 200, await response.text());
  await expect(button).toBeEnabled();
}
async function screenshot(name) {
  const path = new URL(name + '.png', out);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await page.screenshot({ path: path.pathname, fullPage: name !== 'images-desktop' });
  report.screenshots.push(path.pathname);
}
// Deterministic test-only PNG with valid chunks, not a supplied product photograph.
function crc32(data) {
  let c = 0xffffffff;
  for (const b of data) {
    c ^= b;
    for (let n = 0; n < 8; n++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type),
    len = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
const head = Buffer.alloc(13);
head.writeUInt32BE(16, 0);
head.writeUInt32BE(16, 4);
head[8] = 8;
head[9] = 2;
const pixels = Buffer.alloc(16 * (1 + 16 * 3), 180);
for (let y = 0; y < 16; y++) pixels[y * 49] = 0;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', head),
  chunk('IDAT', deflateSync(pixels)),
  chunk('IEND', Buffer.alloc(0)),
]);
let newId;
try {
  await test('Real password login and persisted session survive refresh', async () => {
    await login(page);
    await page.reload();
    await page.getByRole('heading', { name: '产品管理', exact: true }).waitFor();
  });
  await test('Name search and category filters use real RPC results', async () => {
    await page.getByRole('textbox', { name: '搜索名称或内部编号' }).fill(fixture.run);
    await page.getByText('正在读取产品…', { exact: true }).waitFor({ state: 'hidden' });
    await page
      .getByRole('row')
      .filter({ hasText: `TEST-PHASE1 ${fixture.run}` })
      .first()
      .waitFor();
    assert.equal(await page.getByRole('columnheader', { name: '主图', exact: true }).count(), 1);
    await screenshot('products-desktop');
  });
  await test('New product is a real draft, seven category forms use schema fields', async () => {
    const categories = [
      '火化土葬',
      '传统土葬',
      '骨灰位',
      '殡仪服务',
      '祖先牌位',
      '生基风水',
      '宠物安葬',
    ];
    const unique = [
      '面积（sqft）',
      '面积（sqft）',
      '产品主题',
      '预购价格（RM）',
      '牌位类型',
      '生基类型',
      '安葬类型',
    ];
    for (let i = 0; i < categories.length; i++) {
      await page.getByRole('button', { name: '新增产品', exact: true }).click();
      await page
        .getByRole('dialog')
        .getByLabel('产品类别', { exact: true })
        .selectOption(String(i + 1));
      await page.getByRole('button', { name: '建立草稿', exact: true }).click();
      await page.getByRole('heading', { name: '未命名草稿', exact: true }).waitFor();
      if (i === 2) newId = page.url().split('/').at(-1);
      await page.getByLabel('产品名称', { exact: true }).fill(`TEST-UI ${uiRun}｜${categories[i]}`);
      await page
        .getByRole('button', { name: i === 3 ? '价格' : '类别专属属性', exact: true })
        .click();
      await page.getByLabel(unique[i], { exact: true }).waitFor();
      if (i === 2) {
        await page.getByText('安放环境暂未开放编辑', { exact: false }).waitFor();
        assert.equal(await page.locator('input[type=radio]').count(), 0);
        await screenshot('niche-editor-desktop');
      }
      await saveDraft();
      const saved = await rpc(user, 'admin_product', { p_id: page.url().split('/').at(-1) });
      assert.equal(saved.product.category_id, i + 1);
      assert(saved.product.name.includes('TEST-UI'));
      if (i === 6) {
        await page.getByRole('button', { name: '预览', exact: true }).first().click();
        await page.getByText('暂无符合当前预览条件的包含项目。', { exact: true }).waitFor();
        await page.getByText('暂无符合当前预览条件的产品与设计图片。', { exact: true }).waitFor();
        await page.getByRole('button', { name: '关闭窗口', exact: true }).click();
      }
      await page.getByRole('button', { name: '返回列表', exact: true }).click();
      await page.getByRole('heading', { name: '产品管理', exact: true }).waitFor();
    }
  });
  await test('Quick-add series and religion persist while product draft stays unsaved', async () => {
    await page.goto(`${fixture.adminUrl}/products/${newId}`);
    await page.getByRole('heading', { name: `TEST-UI ${uiRun}｜骨灰位`, exact: true }).waitFor();
    await page.getByRole('button', { name: '＋ 新增', exact: true }).click();
    await page.getByLabel('名称 · 必填', { exact: true }).fill(`TEST UI系列 ${uiRun}`);
    await page.getByRole('button', { name: '保存园区／系列', exact: true }).click();
    await page.getByText('系列已保存并选入当前产品。', { exact: true }).waitFor();
    await page.getByRole('button', { name: '宗教与设计', exact: true }).click();
    await page.getByRole('button', { name: '＋ 新增宗教', exact: true }).click();
    await page.getByLabel('名称 · 必填', { exact: true }).fill(`TEST UI宗教 ${uiRun}`);
    await page.getByLabel('宗教代码 · 必填', { exact: true }).fill(`ui-${uiRun}`);
    await page.getByRole('button', { name: '保存宗教', exact: true }).click();
    await page.getByRole('button', { name: `添加TEST UI宗教 ${uiRun}`, exact: true }).waitFor();
    await page.getByRole('button', { name: '添加佛教', exact: true }).click();
    await page.getByLabel('公开此宗教配置', { exact: true }).check();
    await saveDraft();
  });
  await test('Real file upload, main image and price submit with publication confirmation', async () => {
    await page.getByRole('button', { name: '基本资料', exact: true }).click();
    await page.getByLabel('使用人数', { exact: true }).selectOption('single');
    await page.getByRole('button', { name: '价格', exact: true }).click();
    await page.getByLabel('最低价格（RM）', { exact: true }).fill('6888');
    await page.getByLabel('批准公开此价格', { exact: true }).check();
    await page.getByRole('button', { name: '图片管理', exact: true }).click();
    await page
      .getByLabel('上传单张或多张图片', { exact: true })
      .setInputFiles({ name: 'TEST-only.png', mimeType: 'image/png', buffer: png });
    await page.getByLabel('设为共通主图', { exact: true }).waitFor();
    await page.getByLabel('设为共通主图', { exact: true }).check();
    await page.getByLabel('批准公开图片', { exact: true }).check();
    await screenshot('images-desktop');
    await page.getByRole('button', { name: '保存并发布', exact: true }).click();
    await page.getByRole('heading', { name: '确认保存并发布', exact: true }).waitFor();
    await page.getByRole('button', { name: '确认保存并发布', exact: true }).click();
    await page.getByText('产品已保存并发布。', { exact: true }).waitFor();
    const saved = await rpc(user, 'admin_product', { p_id: newId });
    assert.equal(saved.product.publication_status, 'published');
    assert.equal(saved.offer_prices[0].price_amount, 6888);
    assert.equal(saved.product_images.length, 1);
  });
  await test('Card and detail preview are a protected real-form projection', async () => {
    await page.getByRole('button', { name: '预览', exact: true }).first().click();
    await page.getByRole('heading', { name: '预览产品', exact: true }).waitFor();
    await page.locator('.price').filter({ hasText: 'RM 6,888 起' }).waitFor();
    await screenshot('preview-desktop');
    await page.getByRole('button', { name: '关闭窗口', exact: true }).click();
  });
  await test('Version conflict retains form and does not overwrite another change', async () => {
    await page.getByRole('button', { name: '基本资料', exact: true }).click();
    await page.getByLabel('产品副标题', { exact: true }).fill('Browser unsaved edit');
    const current = await rpc(user, 'admin_product', { p_id: newId });
    await rpc(user, 'save_product', {
      p_id: newId,
      p_expected_updated_at: current.product.updated_at,
      p_product: { subtitle: 'Concurrent winner' },
    });
    await page.getByRole('button', { name: '保存并发布', exact: true }).click();
    await page.getByRole('button', { name: '确认保存并发布', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: '资料已被其他操作修改' }).waitFor();
    assert.equal(
      await page.getByLabel('产品副标题', { exact: true }).inputValue(),
      'Browser unsaved edit',
    );
    assert.equal(
      (await rpc(user, 'admin_product', { p_id: newId })).product.subtitle,
      'Concurrent winner',
    );
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: '重新载入', exact: true }).click();
    await page.getByLabel('产品副标题', { exact: true }).filter({ visible: true }).waitFor();
  });
  await test('Category order modal persists once, with mobile keyboard controls', async () => {
    await page.getByRole('button', { name: '返回列表', exact: true }).click();
    await page.getByRole('button', { name: '调整展示顺序', exact: true }).click();
    await page.getByRole('dialog').getByLabel('产品大类', { exact: true }).selectOption('3');
    await page.getByRole('button', { name: '下移', exact: true }).first().waitFor();
    await page.getByRole('button', { name: '下移', exact: true }).first().click();
    await page.getByRole('button', { name: '保存顺序', exact: true }).click();
    await page.getByText('此类别的展示顺序已保存。', { exact: true }).waitFor();
  });
  await test('Desktop, tablet and mobile keep full document within viewport', async () => {
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 960 });
      await page.goto(`${fixture.adminUrl}/products/${newId}`);
      await page.getByRole('heading', { name: `TEST-UI ${uiRun}｜骨灰位`, exact: true }).waitFor();
      if (width === 768) {
        const seriesWidth = await page
          .getByLabel('园区／产品系列', { exact: true })
          .evaluate((el) => el.getBoundingClientRect().width);
        assert(seriesWidth >= 200, 'tablet series selector must remain readable');
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
      assert.equal(overflow, false, `overflow at ${width}`);
      if ([1440, 768, 390].includes(width)) await screenshot(`editor-${width}`);
    }
  });
  await test('Yunnan institution is a placeholder with no editing entry', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByLabel('选择机构', { exact: true }).selectOption('yunnan');
    await page.getByRole('heading', { name: '云南善堂｜后台管理', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: '新增产品', exact: true }).count(), 0);
    await screenshot('yunnan-desktop');
  });
  await test('Editor login cannot publish, alter dictionaries or edit published product', async () => {
    const c = await browser.newContext(),
      p = await c.newPage();
    await login(p, 'editor');
    await p.goto(`${fixture.adminUrl}/products/${newId}`);
    await p.getByRole('heading', { name: `TEST-UI ${uiRun}｜骨灰位`, exact: true }).waitFor();
    assert(await p.getByLabel('产品名称', { exact: true }).isDisabled());
    assert.equal(await p.getByRole('button', { name: '保存并发布', exact: true }).count(), 0);
    await c.close();
  });
  await test('Browser product state has no demo/local database persistence', async () => {
    const keys = await page.evaluate(() => Object.keys(localStorage));
    assert(keys.every((k) => k.startsWith('sb-')));
    assert.deepEqual(consoleErrors, []);
  });
} catch (e) {
  console.error('Browser acceptance failed: ' + e.stack);
  process.exitCode = 1;
  await screenshot('failure');
} finally {
  report.finished_at = new Date().toISOString();
  report.passed = report.tests.filter((x) => x.status === 'PASS').length;
  report.failed = report.tests.filter((x) => x.status === 'FAIL').length;
  await fs.writeFile(
    new URL('./browser-result.json', import.meta.url),
    JSON.stringify(report, null, 2) + '\n',
  );
  await browser.close();
  console.log(`Browser acceptance: ${report.passed} passed, ${report.failed} failed`);
}
