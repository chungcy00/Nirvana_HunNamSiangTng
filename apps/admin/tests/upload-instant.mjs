// Read-only browser regression: intercept every data/storage operation with isolated fixtures.
import { chromium } from '../node_modules/@playwright/test/index.mjs';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const imageBytes=await sharp({create:{width:800,height:600,channels:3,background:'#a42c38'}}).webp().toBuffer();
const imageRequests=[];let originalPosts=0,previewPosts=0,activePreviews=0,maxPreviews=0,failOriginal=false;let releaseOriginal;const originalGate=new Promise(resolve=>{releaseOriginal=resolve;});
const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:1440,height:1000}});
page.setDefaultTimeout(12000);
const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
page.on('request', r=>{if(r.url().includes('/rpc/'))console.log('RPC',r.url().split('/').pop());});
const id='00000000-0000-4000-8000-000000000001';
const user={id,email:'preview@example.com',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
const token='preview.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.preview';
const bundle={product:{id,name:'双人火化土葬',category_id:1,publication_status:'draft',updated_at:new Date().toISOString(),product_form:'package',capacity_group:'double'},product_offers:[{id:'offer',name:'默认方案',product_id:id,is_active:true,facing_override:'朝南',area_sqft_override:56}],offer_prices:[{id:'price',offer_id:'offer',price_type:'standard',price_amount:21888,is_published:true}],product_inclusions:[{id:'urn',product_id:id,item_name:'骨灰瓮及盒 × 2',sort_order:0},{id:'cremation',product_id:id,item_name:'双人火化费',sort_order:1}],product_religions:[{id:'r',religion_id:1,is_published:true}],product_images:[{id:'image',product_id:id,storage_bucket:'catalog-media-private',storage_path:id+'/sample.png',image_type:'design',religion_id:1,design_name:null,is_published:true,is_primary:false}],burial_details:[{product_id:id,facing:'朝南',area_sqft:56,urn_capacity:2,cremation_count:2}],niche_details:[],funeral_details:[],tablet_details:[],fengshui_details:[],pet_details:[]};
bundle.burial_details[0]={product_id:id,facing:'西北',area_sqft:864};
bundle.product_offers=[{id:'common',product_id:id,name:'普通地段',is_active:true,facing_override:null,area_sqft_override:null},{id:'large',product_id:id,name:'普通地段 1080 sqft',is_active:true,facing_override:null,area_sqft_override:1080}];
bundle.offer_prices=bundle.product_offers.map((o,index)=>({id:'price'+index,offer_id:o.id,price_type:'standard',price_amount:index?308888:238888,is_published:true}));
bundle.product_images[0].is_primary=true;bundle.product_images[0].image_type='real';bundle.product_images[0].religion_id=null;
bundle.product_images[0].preview_placeholder='data:image/webp;base64,'+imageBytes.toString('base64');
await page.route('**/api/catalog-image?*',route=>{throw new Error('Unexpected on-demand resize request');});
// Isolated response fixtures: no remote requests or production writes.
await page.route('**/auth/v1/**',route=>route.fulfill({json:{access_token:token,refresh_token:'preview',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user}}));
await page.route('**/rest/v1/rpc/**',route=>{
 const method=route.request().url().split('/').pop();
 if(method==='cache_image_placeholder')return route.fulfill({json:null});
 const replies={current_catalog_member:{user_id:id,role:'admin'},admin_reference_data:{categories:[],series:[],religions:[{id:1,name:'佛教'}],notices:[]},admin_product_list:{items:[bundle],total:1},admin_product:bundle};
 if(!(method in replies)) throw new Error('Unexpected mutation '+method);
 return route.fulfill({json:replies[method]});
});
await page.route('**/storage/v1/**',async route=>{
 if(route.request().method()==='POST'){
  if(route.request().url().includes('/catalog-media-previews/')){previewPosts++;activePreviews++;maxPreviews=Math.max(maxPreviews,activePreviews);await new Promise(resolve=>setTimeout(resolve,1000));activePreviews--;}
  else {originalPosts++;await originalGate;if(failOriginal)return route.fulfill({status:400,json:{message:'Upload unavailable',error:'Upload unavailable'}});}
  return route.fulfill({json:{Key:'uploaded'}});
 }
 return route.fulfill({contentType:'image/webp',body:imageBytes});
});
await page.goto((process.env.ADMIN_TEST_URL || 'http://127.0.0.1:3002')+'/products');
await page.waitForTimeout(1000);
console.log('INITIAL', (await page.locator('body').innerText()).slice(0,500));
if(await page.getByLabel('邮箱',{exact:true}).count()){
 await page.getByLabel('邮箱',{exact:true}).fill(user.email);
 await page.getByLabel('密码',{exact:true}).fill('PreviewOnly123!');
 await page.getByRole('button',{name:'登录后台',exact:true}).click();
}
await page.waitForTimeout(1000); console.log('AFTER LOGIN', (await page.locator('body').innerText()).slice(0,1800));
await page.getByRole('heading',{name:'产品管理',exact:true}).waitFor();


await page.getByRole('button',{name:'编辑',exact:true}).click();
await page.getByRole('heading',{name:'双人火化土葬',exact:true}).waitFor();
await page.getByRole('button',{name:'图片管理',exact:true}).click();
const before=Date.now();await page.getByLabel('上传单张或多张图片',{exact:true}).setInputFiles({name:'instant-upload.png',mimeType:'image/png',buffer:await sharp(imageBytes).png().toBuffer()});
const pending=page.locator('article.imageitem[aria-busy=true]');await pending.waitFor();await pending.locator('img').evaluate(image=>image.decode());
assert.equal(originalPosts,1);assert.equal(previewPosts,0);assert(Date.now()-before<1500,'local card appears without awaiting the original upload');
console.log('Immediate card shown while original upload is held:',Date.now()-before,'ms');

releaseOriginal();
await page.getByText('原图已上传，正在准备清晰预览…',{exact:true}).waitFor();
assert.equal(await pending.count(),0);
await page.getByRole('button',{name:'保存草稿',exact:true}).waitFor({state:'visible'});
await page.waitForFunction(()=>!document.querySelector('fieldset[disabled]'));
assert.equal(originalPosts,1);assert.equal(previewPosts,4);assert.equal(maxPreviews,4,'preview uploads run in parallel');
assert.equal(await page.locator('article.imageitem').count(),2);
console.log('PASS: immediate local card, promotion before preview completion, four previews uploaded, no product mutation');
failOriginal=true;
await page.getByLabel('上传单张或多张图片',{exact:true}).setInputFiles({name:'failed-upload.png',mimeType:'image/png',buffer:await sharp(imageBytes).png().toBuffer()});
await page.waitForFunction(()=>!document.querySelector('fieldset[disabled]'));
assert.equal(await page.locator('article.imageitem').count(),2,'failed uploads never enter the product bundle');
assert.equal(await page.locator('article.imageitem[aria-busy=true]').count(),0);
assert.equal(previewPosts,4,'failed originals never start preview writes');
console.log('PASS failed upload leaves the existing photos intact and clears pending cards');
assert.deepEqual(pageErrors,[]);
await browser.close();
