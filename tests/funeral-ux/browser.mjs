// Isolated API fixtures; never reads or writes a real Supabase project.
import { chromium } from '../../apps/admin/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const stage = process.argv[2] || 'after';
const base = process.env.REVIEW_URL || 'http://127.0.0.1:3101';
const output = new URL('../../docs/funeral-ux/', import.meta.url);
const { record } = await import('./fixture.mjs');
await fs.mkdir(new URL('screenshots/', output), {recursive:true});
const browser = await chromium.launch({headless:true});
const report = {stage,environment:'Chromium / production Vite preview / isolated Supabase API fixtures / 3 cold contexts per viewport / CPU 4x, 40ms latency, 10Mbps down',items:record.inclusions.length,runs:[],checks:[]};
for (const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]) {
 for(let run=0;run<3;run++) {
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:device==='mobile',hasTouch:device==='mobile'});
  const page=await context.newPage(); let requests=0; const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fixture.supabase.co/**',async route=>{requests++;await route.fulfill({json:route.request().url().endsWith('_list')?[record]:record});});
  await page.addInitScript(()=>{window.reviewVitals={lcp:0,cls:0,longTasks:0,interactionMax:0};new PerformanceObserver(list=>{for(const e of list.getEntries())window.reviewVitals.interactionMax=Math.max(window.reviewVitals.interactionMax,e.duration);}).observe({type:'event',buffered:true,durationThreshold:16});for(const type of ['largest-contentful-paint','layout-shift','longtask'])new PerformanceObserver(list=>{for(const e of list.getEntries()){if(type==='largest-contentful-paint')window.reviewVitals.lcp=e.startTime;if(type==='layout-shift'&&!e.hadRecentInput)window.reviewVitals.cls+=e.value;if(type==='longtask')window.reviewVitals.longTasks+=Math.max(0,e.duration-50);}}).observe({type,buffered:true});});
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:40,downloadThroughput:1250000,uploadThroughput:625000});
  await page.goto(base+'/nirvana/products/item/review-funeral');
  await page.locator('.fgp-price-panel').waitFor();
  const contentMs=await page.evaluate(()=>performance.now());
  await page.waitForTimeout(1300);
  const measurement=await page.evaluate(()=>({...window.reviewVitals,fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,documentHeight:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth>innerWidth,scriptBytes:performance.getEntriesByType('resource').filter(e=>e.initiatorType==='script').reduce((n,e)=>n+e.decodedBodySize,0)}));
  const interactiveSummary=page.locator('.fgp-inclusions summary').first();
  await interactiveSummary.click();await page.waitForTimeout(60);
  await interactiveSummary.click();await page.waitForTimeout(60);
  measurement.observedInteractionMaxMs=await page.evaluate(()=>window.reviewVitals.interactionMax);
  report.runs.push({device,run:run+1,contentMs,...measurement,apiRequests:requests,errors});
  if(run===0){
   await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:new URL(`screenshots/${stage}-${device}.png`,output).pathname,fullPage:true});
   await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:new URL(`screenshots/${stage}-${device}-top.png`,output).pathname});
   if(stage==='before') {
    await page.locator('.fgp-inclusions details').evaluateAll(elements=>elements.forEach(e=>e.open=true));
    report.runs[report.runs.length-1].expandedDocumentHeight=await page.evaluate(()=>document.documentElement.scrollHeight);
    await page.screenshot({path:new URL(`screenshots/before-${device}-expanded.png`,output).pathname,fullPage:true});
   }
   if(stage==='after'){
    assert.equal(measurement.overflow,false);assert.deepEqual(errors,[]);
    const groups=page.locator('.fgp-inclusions details');
    assert.equal(await groups.count(),3);
    for(const group of await groups.all())assert.equal(await group.getAttribute('open'),'');
    const first=groups.first();const summary=first.locator('summary');await summary.focus();await page.keyboard.press('Enter');assert.equal(await first.getAttribute('open'),null);assert.equal(await groups.nth(1).getAttribute('open'),'');await page.keyboard.press('Space');assert.equal(await first.getAttribute('open'),'');
    assert.deepEqual(await page.locator('.fgp-inclusions li').allTextContents(),record.inclusions.map(i=>i.name));
    const grid=await first.locator('ul').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);assert.equal(grid,device==='desktop'?2:1);
    const panel=page.locator('.fgp-price-panel');assert.equal(await panel.getByText('以上价格未包含印花税',{exact:true}).count(),1);
    assert.match(await panel.locator('a').getAttribute('href'),/^https:\/\/wa.me\//);
    const summaryVisible=await page.locator('.fgp-service-price-summary').isVisible();assert.equal(summaryVisible,device==='mobile');
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({path:new URL(`screenshots/after-${device}-price.png`,output).pathname});
    report.checks.push(`${device}: layout, source order, independent keyboard disclosure, notes, consultant URL, mobile summary, no overflow/errors`);
   }
  }
  await context.close();
 }
}
await fs.writeFile(new URL(`${stage}.json`,output),JSON.stringify(report,null,2));
await browser.close();console.log(JSON.stringify(report,null,2));
