// Isolated browser regression; all catalogue reads are delayed fixtures.
// Run with a frontend dev server (or FRONTEND_TEST_URL) and admin dev dependencies.
import {chromium} from '../apps/admin/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
const base=process.env.FRONTEND_TEST_URL||'http://127.0.0.1:3004';
const browser=await chromium.launch();const page=await browser.newPage();
let calls=0, mode='ready';const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/rest/v1/rpc/catalog_product_snapshot',async route=>{
 calls++;const responseMode=mode;await new Promise(r=>setTimeout(r,1800));
 if(responseMode==='error')return route.fulfill({status:500,json:{message:'offline'}});
 return route.fulfill({json:responseMode==='empty'?[]:[{id:'read-only-fixture',slug:'cache-check',name:'缓存测试产品',category_id:1,capacity_group:'double',religions:[{id:1,name:'佛教'}],prices:[{offer_id:'o',offer_name:'标准',price_type:'standard',amount:12345}],images:[],inclusions:[]}]});
});
const card=page.locator('a[href="/nirvana/products/item/cache-check"]').first();
await page.goto(base+'/nirvana');await card.waitFor();await page.waitForTimeout(100);const initialCalls=calls;
await card.click();await page.locator('.fgp-back').waitFor();let start=Date.now();await page.locator('.fgp-back').click();await card.waitFor();const backMs=Date.now()-start;
assert.equal(calls,initialCalls,'list/detail navigation reuses the in-memory snapshot');assert(backMs<1000);
start=Date.now();await page.reload({waitUntil:'domcontentloaded'});await card.waitFor();const reloadMs=Date.now()-start;assert(reloadMs<1400,'warm reload renders before delayed 1800ms RPC');
await page.waitForTimeout(2000);
mode='empty';await page.reload({waitUntil:'domcontentloaded'});await card.waitFor();await card.waitFor({state:'detached'});assert((await page.locator('body').innerText()).includes('当前分类暂无产品'));
mode='error';await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'产品资料暂时无法载入'}).waitFor();assert.equal(await page.evaluate(()=>sessionStorage.getItem('public-catalog-snapshot-v1')),null);
assert.deepEqual(errors,[]);console.log(JSON.stringify({base,backMs,reloadMs,requests: calls,publicationRemoval:true,errorClearsCache:true,passed:true}));await browser.close();
