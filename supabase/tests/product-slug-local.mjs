// Local-only regression: creation defaults, rename stability, duplicate rejection.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from './node_modules/pg/lib/index.js';
import {loadConfig} from './support.mjs';
const cfg=loadConfig();
assert.equal(new URL(cfg.db).hostname,'127.0.0.1');
const db=new pg.Client({connectionString:cfg.db}), uid=randomUUID(), results=[];
async function rpc(name,args){return (await db.query(`select api.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as data`,args)).rows[0].data;}
async function check(name,fn){await fn();results.push({name,passed:true});}
try{
 await db.connect();await db.query('BEGIN');
 await check('slug has a non-null UUID default and a valid unique constraint',async()=>{
  const col=(await db.query("select column_default,is_nullable from information_schema.columns where table_schema='private' and table_name='products' and column_name='slug'")).rows[0];
  assert.match(col.column_default,/gen_random_uuid/);assert.equal(col.is_nullable,'NO');
  const unique=(await db.query("select conname from pg_constraint where conrelid='private.products'::regclass and contype='u' and pg_get_constraintdef(oid)='UNIQUE (slug)' and convalidated")).rows;
  assert.equal(unique.length,1);
 });
 await db.query('insert into auth.users(id,email) values($1,$2)',[uid,'slug-'+uid+'@example.test']);
 await db.query("insert into private.admin_members(user_id,role) values($1,'admin')",[uid]);
 await db.query('SET LOCAL ROLE authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);
 let original;
 await check('same-name and unnamed products receive distinct server-generated stable identifiers',async()=>{
  const slugs=[];
  for(let i=0;i<25;i++){
   const p=await rpc('save_product',[null,null,i===0?{category_id:4}:{category_id:4,name:'相同产品名称'},{}]);
   const b=await rpc('admin_product',[p.id]);
   assert.match(b.product.slug,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
   slugs.push(b.product.slug);if(i===0)original=b.product;
  }
  assert.equal(new Set(slugs).size,25);
 });
 await check('renaming and repeated saves never regenerate the existing identifier',async()=>{
  let p=original;
  for(const name of ['首次填写名称','再次更名','再次更名']){
   p=await rpc('save_product',[p.id,p.updated_at,{name},{}]);
   const b=await rpc('admin_product',[p.id]);
   assert.equal(b.product.slug,original.slug);assert.equal(b.product.name,name);
  }
 });
 await check('legacy readable identifiers remain unchanged after editing',async()=>{
  let p=await rpc('save_product',[null,null,{category_id:4,slug:'legacy-'+uid,name:'旧产品'},{}]);
  p=await rpc('save_product',[p.id,p.updated_at,{name:'旧产品新名称'},{}]);
  assert.equal((await rpc('admin_product',[p.id])).product.slug,'legacy-'+uid);
 });
 await check('duplicate slug is rejected atomically by the database',async()=>{
  await db.query('SAVEPOINT duplicate_slug');
  await assert.rejects(()=>rpc('save_product',[null,null,{category_id:4,slug:original.slug},{}]),e=>e.code==='23505'&&e.constraint==='products_slug_key');
  await db.query('ROLLBACK TO SAVEPOINT duplicate_slug');
  assert.equal((await rpc('admin_product',[original.id])).product.slug,original.slug);
 });
 await check('copying receives a new URL and leaves the source URL untouched',async()=>{
  const source=(await rpc('admin_product',[original.id])).product,target=randomUUID();
  const copy=await rpc('admin_copy_product',[source.id,source.updated_at,target,JSON.stringify([])]);
  assert.equal(copy.product.slug,target);assert.notEqual(copy.product.slug,source.slug);
  assert.equal((await rpc('admin_product',[source.id])).product.slug,source.slug);
 });
 await db.query('ROLLBACK');
 console.log(JSON.stringify({localOnly:true,rolledBack:true,results},null,2));
}finally{await db.query('ROLLBACK').catch(()=>{});await db.end();}
