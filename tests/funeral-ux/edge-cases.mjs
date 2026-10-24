import {chromium} from '../../apps/admin/node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {record} from './fixture.mjs';
const out=new URL('../../docs/funeral-ux/',import.meta.url);
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
let current=structuredClone(record),mode='ready',delay=0,requests=[];
await context.route('https://fixture.supabase.co/**',async route=>{requests.push(route.request().url());if(delay)await new Promise(r=>setTimeout(r,delay));await route.fulfill(mode==='error'?{status:503,json:{message:'INTERNAL TEST DETAIL MUST STAY HIDDEN'}}:{json:route.request().url().endsWith('_list')?[current]:current});});
const checks=[];async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
async function load(base='http://127.0.0.1:3102'){await page.goto(base+'/nirvana/products/item/'+current.slug);await page.locator('.fgp-price-panel').waitFor();}
await check('sticky remains below navigation, inside detail, before footer; short viewport disables it',async()=>{
 await load();const panel=page.locator('.fgp-price-panel');
 await page.waitForFunction(()=>document.querySelector('.fgp-price-panel').dataset.sticky==='true');
 const gridTop=await page.locator('.fgp-service-content').evaluate(e=>e.getBoundingClientRect().top+scrollY);
 await page.evaluate(y=>scrollTo(0,y),gridTop+250);await page.waitForTimeout(80);
 const bound=await panel.evaluate(e=>({top:e.getBoundingClientRect().top,header:document.querySelector('.site-header').getBoundingClientRect().bottom}));assert.ok(bound.top>=bound.header+15 && bound.top<=bound.header+17);
 await page.screenshot({path:new URL('screenshots/after-desktop-sticky.png',out).pathname});
 await page.evaluate(()=>scrollTo(0,document.querySelector('.fgp-service-content').getBoundingClientRect().bottom+scrollY-350));
 const bottom=await panel.evaluate(e=>({card:e.getBoundingClientRect().bottom,grid:e.parentElement.getBoundingClientRect().bottom,footer:document.querySelector('footer').getBoundingClientRect().top}));assert.ok(bottom.card<=bottom.grid+1);assert.ok(bottom.card<=bottom.footer);
 await page.setViewportSize({width:1440,height:400});await page.waitForFunction(()=>document.querySelector('.fgp-price-panel').dataset.sticky==='false');assert.equal(await panel.evaluate(e=>getComputedStyle(e).position),'static');
 await page.setViewportSize({width:1440,height:1000});
});
await check('reference layout uses two by two specs, equal lower columns and unboxed groups',async()=>{
 await load();
 const layout=await page.evaluate(()=>{const specs=document.querySelector('.fgp-service-detail .fgp-specs'),content=document.querySelector('.fgp-service-content'),group=document.querySelector('.fgp-inclusion-section');return {specColumns:getComputedStyle(specs).gridTemplateColumns.split(' ').length,columns:getComputedStyle(content).gridTemplateColumns.split(' ').map(parseFloat),specDirection:getComputedStyle(specs.firstElementChild).flexDirection,groupBorder:parseFloat(getComputedStyle(group).borderTopWidth)};});
 assert.equal(layout.specColumns,2);assert.equal(layout.specDirection,'column');assert.ok(Math.abs(layout.columns[0]-layout.columns[1])<1);assert.equal(layout.groupBorder,0);
 assert.equal(await page.locator('.fgp-overview-next').count(),0);
 assert.equal(await page.locator('.fgp-specs dd').nth(1).textContent(),'丧府 / 殡仪礼堂');
 for(const note of await page.locator('.fgp-price-note').all())assert.equal(await note.evaluate(e=>getComputedStyle(e).borderTopWidth),'0px');
});
await check('oversized notes disable sticky; price note content remains accessible',async()=>{
 current.prices[0].price_note=Array.from({length:40},(_,i)=>'备注内容 '+i).join('\n');await load();await page.waitForFunction(()=>document.querySelector('.fgp-price-panel').dataset.sticky==='false');assert.equal(await page.locator('.fgp-price-panel').evaluate(e=>getComputedStyle(e).position),'static');current=structuredClone(record);
});
await check('few items, no grouping, no notes, missing price and empty inclusions',async()=>{
 current.inclusions=record.inclusions.slice(0,3).map(i=>({name:i.name}));current.prices=current.prices.slice(0,1).map(p=>({...p,price_note:''}));
 await load();assert.equal(await page.locator('.fgp-inclusions details').count(),1);assert.equal(await page.locator('.fgp-inclusions h3').textContent(),'包含项目');assert.equal(await page.locator('.fgp-inclusions li').count(),3);assert.equal(await page.locator('.fgp-price-note').count(),0);assert.match(await page.locator('.fgp-price-panel').textContent(),/即用价格欢迎咨询/);
 current.inclusions=[];current.prices=[];await load();assert.equal(await page.locator('.fgp-inclusions ul').count(),0);assert.match(await page.locator('.fgp-inclusions').textContent(),/尚待核实/);assert.doesNotMatch(await page.locator('.fgp-price-panel').textContent(),/RM 0|NaN/);current=structuredClone(record);
});
await check('320, 768 and 1024px layout, wrapping, touch targets and scoped sticky',async()=>{
 for(const width of [320,768,1024]){await page.setViewportSize({width,height:900});await load();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);for(const locator of [page.locator('.fgp-back'),page.locator('.fgp-service-consult'),page.locator('.fgp-inclusions summary').first()]){const box=await locator.boundingBox();assert.ok(box.height>=44);}if(width<1024)assert.equal(await page.locator('.fgp-price-panel').evaluate(e=>getComputedStyle(e).position),'static');}
 await page.setViewportSize({width:1440,height:1000});
});
await check('loading never shows a price; API error hides internal data and retry recovers',async()=>{
 mode='error';await page.goto('http://127.0.0.1:3102/nirvana/products/item/'+record.slug);await page.getByRole('alert').waitFor();assert.doesNotMatch(await page.locator('main').textContent(),/INTERNAL|stack|数据库/);assert.equal(await page.locator('.fgp-price-panel').count(),0);
 await page.screenshot({path:new URL('screenshots/after-error.png',out).pathname});mode='ready';delay=700;await page.getByRole('button',{name:'重新载入'}).click();await page.locator('[aria-busy="true"]').waitFor();assert.equal(await page.locator('.fgp-price-panel').count(),0);await page.locator('.fgp-price-panel').waitFor();delay=0;
});
await check('all six other categories preserve identical rendered detail markup',async()=>{
 for(const category_id of [1,2,3,5,6,7]){current={...record,category_id,prices:[{offer_id:'review',offer_name:'默认方案',price_type:'standard',amount:12345,price_note:'原有备注'}]};await load('http://127.0.0.1:3101');const before=await page.locator('.fgp-detail').innerHTML();await load();assert.equal(await page.locator('.fgp-detail').innerHTML(),before);assert.equal(await page.locator('.fgp-service-consult,.fgp-service-price-summary').count(),0);}current=structuredClone(record);
});
await check('text contrast reaches WCAG AA on both service surfaces',async()=>{
 await load();const contrasts=await page.evaluate(()=>{const luminance=c=>{const rgb=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};return ['.fgp-specs dt','.fgp-specs dd','.fgp-price-panel .fgp-prices span','.fgp-price-note','.fgp-inclusions li','.fgp-inclusions summary h3'].map(s=>{const e=document.querySelector(s);let p=e;while(p&&['rgba(0, 0, 0, 0)','transparent'].includes(getComputedStyle(p).backgroundColor))p=p.parentElement;const a=luminance(getComputedStyle(e).color),b=luminance(getComputedStyle(p).backgroundColor);return {selector:s,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});});for(const c of contrasts)assert.ok(c.ratio>=4.5,JSON.stringify(c));await fs.writeFile(new URL('contrast.json',out),JSON.stringify(contrasts,null,2));
});
await check('admin iframe matches public details and updates unsaved form state without API requests',async()=>{
 await load();const publicContents=await page.locator('.fgp-detail').evaluate(e=>({overview:e.querySelector('.fgp-product-overview').innerHTML,inclusions:e.querySelector('.fgp-inclusions').innerHTML,price:e.querySelector('.fgp-price-panel').innerHTML}));
 const count=requests.length;await page.goto('http://127.0.0.1:3003/tests/funeral-ux-preview.html');const frame=page.frameLocator('iframe');await frame.locator('.fgp-price-panel').waitFor();
 const preview=await frame.locator('.fgp-detail').evaluate(e=>({overview:e.querySelector('.fgp-product-overview').innerHTML,inclusions:e.querySelector('.fgp-inclusions').innerHTML,price:e.querySelector('.fgp-price-panel').innerHTML}));assert.deepEqual(preview,publicContents);
 await page.getByRole('button',{name:'修改未保存表单'}).click();await frame.getByText('5天2夜殡仪服务配套').waitFor();assert.match(await frame.locator('.fgp-price-panel').textContent(),/RM 30,000/);assert.match(await frame.locator('.fgp-inclusions').textContent(),/未保存的项目/);assert.equal(requests.length,count);
 await page.screenshot({path:new URL('screenshots/after-admin-preview.png',out).pathname});
 await page.goto('http://127.0.0.1:3003/tests/funeral-ux-preview.html?mobile');await frame.locator('.fgp-price-panel').waitFor();assert.equal(await frame.locator('.fgp-service-price-summary').isVisible(),true);
});
assert.deepEqual(errors,[]);await fs.writeFile(new URL('edge-cases.json',out),JSON.stringify({checks,consoleErrors:errors,api:'intercepted fixtures only; no production access or publishing'},null,2));await browser.close();
