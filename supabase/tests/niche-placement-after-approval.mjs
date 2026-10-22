// Run ONLY after the migration is approved and applied. Never applies migrations.
// Refuses hosted URLs; uses disposable localhost Auth users and TEST ONLY PNG.
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import fs from 'node:fs/promises';
import pg from 'pg';
import {loadConfig,client,rpc,mustReject,storageOK} from './support.mjs';
if(!process.argv.includes('--confirmed'))throw new Error('Await user confirmation; then pass --confirmed after applying the reviewed migration locally.');
const cfg=loadConfig(), db=new pg.Client({connectionString:cfg.db});
const service=client(cfg,cfg.service),anon=client(cfg),run=randomUUID().slice(0,8),tests=[];
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1S4AAAAASUVORK5CYII=','base64');
async function test(name,fn){await fn();tests.push({name,status:'PASS'});console.log('PASS '+name);}
async function member(role){
 const email=`niche-${role}-${run}@example.test`,password=randomBytes(24).toString('base64url')+'Aa1!';
 const u=await service.auth.admin.createUser({email,password,email_confirm:true});if(u.error)throw u.error;
 if(role!=='outsider')await db.query('INSERT INTO private.admin_members(user_id,role) VALUES($1,$2)',[u.data.user.id,role]);
 const c=client(cfg),s=await c.auth.signInWithPassword({email,password});if(s.error)throw s.error;return c;
}
const save=(c,p,changes={},product={})=>rpc(c,'save_product',{p_id:p?.id??null,p_expected_updated_at:p?.updated_at??null,p_product:product,p_changes:changes});
const change=value=>({niche_details:{upsert:[{placement_type:value}]}});
try{
 await db.connect();
 await test('18张表、七类别、placement_type为可空text且无默认值',async()=>{
  const n=await db.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='private'");assert.equal(n.rows[0].n,18);
  assert.equal((await db.query('SELECT count(*)::int n FROM private.product_categories')).rows[0].n,7);
  const c=(await db.query("SELECT data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='private' AND table_name='niche_details' AND column_name='placement_type'")).rows[0];
  assert.deepEqual(c,{data_type:'text',is_nullable:'YES',column_default:null});
 });
 const admin=await member('admin'),editor=await member('editor'),outsider=await member('outsider');
 let p=await save(editor,null,change(null),{category_id:3,name:'TEST ONLY 安放环境',slug:`test-niche-${run}`,capacity_group:'single',capacity_count:1});
 await test('编辑员通过后台RPC保存空环境草稿',async()=>{
  assert.equal((await rpc(editor,'admin_product',{p_id:p.id})).niche_details[0].placement_type,null);
 });
 for(const value of ['indoor','outdoor'])await test('后台保存并读取 '+value,async()=>{
  p=await save(editor,p,change(value));assert.equal((await rpc(editor,'admin_product',{p_id:p.id})).niche_details[0].placement_type,value);
 });
 for(const value of ['both','','INDOOR',1])await test('拒绝非法环境 '+JSON.stringify(value),()=>mustReject(()=>save(editor,p,change(value)),/23514/));
 await test('非成员与匿名不能保存',async()=>{
  await mustReject(()=>save(outsider,p,change('indoor')),/42501/);
  await mustReject(()=>save(anon,p,change('indoor')));
 });
 await test('其他类别不能写入骨灰位专属资料',()=>mustReject(()=>save(admin,null,change('indoor'),{category_id:5,name:'TEST ONLY 非骨灰位'}),/23514/));
 p=await save(editor,p,change(null));
 await test('管理员发布空环境草稿被拒绝',()=>mustReject(()=>save(admin,p,{}, {publication_status:'published'}),/23514/));
 // Complete the remaining pre-existing requirements to isolate environment checks.
 const data=await rpc(admin,'admin_product',{p_id:p.id}),offer=data.product_offers[0].id;
 const religion=(await db.query("SELECT id FROM private.religions WHERE is_active ORDER BY id LIMIT 1")).rows[0].id;
 const path=p.id+'/'+randomUUID()+'.png';
 await storageOK(admin.storage.from('catalog-media-private').upload(path,png,{contentType:'image/png',upsert:false}));
 p=await save(admin,p,{
  product_religions:{upsert:[{religion_id:religion,is_published:true}]},
  offer_prices:{upsert:[{offer_id:offer,price_type:'standard',price_amount:1,is_published:true}]},
  product_images:{upsert:[{storage_bucket:'catalog-media-private',storage_path:path,image_type:'real',is_primary:true,is_published:true}]}
 });
 await test('其他资料齐全时空环境仍禁止发布',()=>mustReject(()=>save(admin,p,{}, {publication_status:'published'}),/23514/));
 p=await save(admin,p,change('indoor'),{publication_status:'published'});
 await test('室内发布成功、公开列表与详情一致且保持最低起价',async()=>{
  const list=await rpc(anon,'catalog_product_list');assert.equal(list.find(x=>x.id===p.id).placement_type,'indoor');
  const d=await rpc(anon,'catalog_product_detail',{p_slug:`test-niche-${run}`});assert.equal(d.attributes.placement_type,'indoor');
  assert.equal(d.price_display_mode,'starting_from');assert.equal(d.prices[0].starting_from,true);
 });
 await test('编辑员不能修改已发布产品的环境',()=>mustReject(()=>save(editor,p,change('outdoor')),/42501/));
 await test('已发布环境不可清空，失败保留室内值',async()=>{
  await mustReject(()=>save(admin,p,change(null)),/23514/);
  assert.equal((await rpc(admin,'admin_product',{p_id:p.id})).niche_details[0].placement_type,'indoor');
 });
 p=await save(admin,p,change('outdoor'));
 await test('管理员更新室外，公开读取更新且写审计',async()=>{
  assert.equal((await rpc(anon,'catalog_product_detail',{p_slug:`test-niche-${run}`})).attributes.placement_type,'outdoor');
  const logs=await db.query("SELECT 1 FROM private.audit_logs WHERE table_name='niche_details' AND record_id=$1 AND new_data->>'placement_type'='outdoor'",[p.id]);assert(logs.rowCount>0);
 });
 p=await save(admin,p,{}, {publication_status:'hidden'});
 await test('隐藏后公开读取和原图片下载均拒绝',async()=>{
  assert.equal(await rpc(anon,'catalog_product_detail',{p_slug:`test-niche-${run}`}),null);
  await mustReject(()=>storageOK(anon.storage.from('catalog-media-private').download(path)));
 });
 await fs.writeFile(new URL('niche-placement-result.json',import.meta.url),JSON.stringify({environment:'localhost-real-supabase',test_only:true,tests,passed:tests.length,failed:0},null,2)+'\n');
}finally{await db.end();}
