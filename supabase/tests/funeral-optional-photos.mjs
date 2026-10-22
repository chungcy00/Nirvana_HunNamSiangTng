// Isolated localhost Auth and real RPC; never writes hosted product data.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import pg from 'pg';
import {loadConfig,client,rpc,mustReject} from './support.mjs';
const cfg=loadConfig(),db=new pg.Client({connectionString:cfg.db}),service=client(cfg,cfg.service),anon=client(cfg),admin=client(cfg),run=randomUUID().slice(0,8),ids=[],files=[],results=[];let uid;
const check=async(name,fn)=>{await fn();results.push(name);console.log('PASS '+name)};
const save=async(p,product={},changes={})=>rpc(admin,'save_product',{p_id:p?.id??null,p_expected_updated_at:p?.updated_at??null,p_product:product,p_changes:changes});
await db.connect();
try{
 const email=`optional-photo-${run}@example.test`,password=randomBytes(24).toString('base64url')+'Aa1!';
 const u=await service.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(u.error);uid=u.data.user.id;
 await db.query("insert into private.admin_members(user_id,role) values($1,'admin')",[uid]);
 assert.ifError((await admin.auth.signInWithPassword({email,password})).error);
 const religion=(await db.query('select id from private.religions where is_active order by id limit 1')).rows[0].id;
 let funeral;
 for(const category of [1,2,3,4,5,6,7]){
  let p=await save(null,{category_id:category,name:`TEST OPTIONAL PHOTO ${run} ${category}`,slug:`optional-photo-${run}-${category}`,...(category<=3?{capacity_group:'single'}:{}),...(category<=2?{product_form:'package'}:{})});ids.push(p.id);
  const d=await rpc(admin,'admin_product',{p_id:p.id}),offer=d.product_offers[0].id;
  p=await save(p,{}, {
   ...(category<=4?{product_religions:{upsert:[{religion_id:religion,is_published:true}]}}:{}),
   ...(category===3?{niche_details:{upsert:[{placement_type:'indoor'}]}}:{}),
   offer_prices:{upsert:(category===4?['pre_need','at_need']:['standard']).map(price_type=>({offer_id:offer,price_type,price_amount:100,is_published:true}))}
  });
  if(category!==4){await check(`Category ${category} still rejects publication without a photo`,()=>mustReject(()=>save(p,{publication_status:'published'}),/主图/));}
  else{
   const path=p.id+'/'+randomUUID()+'.png';
   const upload=await service.storage.from('catalog-media-private').upload(path,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1S4AAAAASUVORK5CYII=','base64'),{contentType:'image/png'});assert.ifError(upload.error);files.push(path);
   await check('Funeral drafts reject actual uploaded photo attachments',()=>mustReject(()=>save(p,{}, {product_images:{upsert:[{storage_bucket:'catalog-media-private',storage_path:path,image_type:'real',is_primary:false,is_published:false}]}}),/殡仪服务不使用照片/));
   funeral=await save(p,{publication_status:'published'});
   await check('Funeral publishes with both prices and no image',async()=>{
    const detail=await rpc(anon,'catalog_product_detail',{p_slug:`optional-photo-${run}-${category}`});assert.equal(detail.category_id,4);assert.equal(detail.images.length,0);assert.equal(detail.prices.length,2);
    assert((await rpc(anon,'catalog_product_list')).some(x=>x.id===p.id));
   });
   await check('Removing one funeral price still rolls back',async()=>{
    const detail=await rpc(admin,'admin_product',{p_id:p.id});
    await mustReject(()=>save(funeral,{}, {offer_prices:{delete:[detail.offer_prices[0].id]}}),/两种价格/);
    assert.equal((await rpc(admin,'admin_product',{p_id:p.id})).offer_prices.length,2);
   });
   await check('Removing the only public religion still rolls back',async()=>{
    const detail=await rpc(admin,'admin_product',{p_id:p.id});await mustReject(()=>save(funeral,{}, {product_religions:{upsert:[{id:detail.product_religions[0].id,is_published:false}]}}),/宗教/);
   });
   await check('Missing Storage object still cannot be published as a funeral image',()=>mustReject(()=>save(funeral,{}, {product_images:{upsert:[{storage_bucket:'catalog-media-private',storage_path:p.id+'/'+randomUUID()+'.png',image_type:'real',is_primary:true,is_published:true}]}}),/23514|图片|照片|文件|Storage/));
   await check('Photo-free funeral hides from public endpoints',async()=>{
    funeral=await save(funeral,{publication_status:'hidden'});assert.equal(await rpc(anon,'catalog_product_detail',{p_slug:`optional-photo-${run}-${category}`}),null);assert(!(await rpc(anon,'catalog_product_list')).some(x=>x.id===p.id));
   });
  }
 }
 await fs.writeFile(new URL('funeral-optional-photos-result.json',import.meta.url),JSON.stringify({environment:'localhost-real-supabase',passed:results.length,results},null,2)+'\n');
}finally{
 // Keep the published test's audit history; dispose drafts and temporary identity.
 for(const id of ids){const p=(await db.query('select * from private.products where id=$1',[id])).rows[0];if(!p)continue;if(!p.published_at)try{await rpc(admin,'delete_draft',{p_id:id,p_expected_updated_at:p.updated_at.toISOString()});}catch{await db.query("update private.products set publication_status='hidden' where id=$1",[id]);}}
 for(const path of files){const removed=await service.storage.from('catalog-media-private').remove([path]);assert.ifError(removed.error);}
 await admin.auth.signOut({scope:'global'});if(uid){await db.query('delete from private.admin_members where user_id=$1',[uid]);const r=await service.auth.admin.deleteUser(uid);assert.ifError(r.error);}await db.end();
}
