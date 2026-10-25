// Local-only, rollback-only verification. Does not deploy or retain fixture edits.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import pg from './node_modules/pg/lib/index.js';
import {loadConfig,root} from './support.mjs';
const cfg=loadConfig();
if(new URL(cfg.db).hostname!=='127.0.0.1')throw new Error('Localhost required');
const db=new pg.Client({connectionString:cfg.db});
try {
 await db.connect();await db.query('BEGIN');
 const metadata=async()=> (await db.query("SELECT proname,proowner,proacl::text,prosecdef,proconfig FROM pg_proc WHERE oid IN ('api.catalog_product_detail(text)'::regprocedure,'api.catalog_product_prices(uuid)'::regprocedure) ORDER BY proname")).rows;
 const before=await metadata();
 const originalNotices=(await db.query('SELECT * FROM private.catalog_notices ORDER BY id')).rows;
 for(const file of ['20261025145141_catalog_product_price_note.sql','20261025150802_catalog_explicit_price_notes.sql']) {
  await db.query(await fs.readFile(new URL('supabase/migrations/'+file,root),'utf8'));
 }
 assert.deepEqual(await metadata(),before);
 const anon=async(sql,args=[])=>{await db.query('SET LOCAL ROLE anon');try{return (await db.query(sql,args)).rows[0].data;}finally{await db.query('RESET ROLE');}};
 const list=await anon('SELECT api.catalog_product_list() AS data');
 assert(list.length,'Local published fixture required');
 const item=list.find(p=>p.category_id===4)||list[0];
 const detail=()=>anon('SELECT api.catalog_product_detail($1) AS data',[item.slug]);
 const baseline=await detail();
 await db.query('UPDATE private.products SET price_note_override=$1 WHERE id=$2',['产品备注事务测试',item.id]);
 const withNote=await detail();assert.equal(withNote.price_note_override,'产品备注事务测试');
 const {price_note_override:oldNote,...oldFields}=baseline;
 const {price_note_override:newNote,...newFields}=withNote;
 // Product notes must not overwrite any independently returned price note.
 assert.deepEqual(newFields,oldFields);
 // A local transaction-only global notice ensures this tests an active fallback source.
 await db.query("INSERT INTO private.catalog_notices(content,is_active,sort_order) VALUES('全局备注事务测试',true,0)");
 await db.query('UPDATE private.offer_prices SET price_note=NULL WHERE offer_id IN (SELECT id FROM private.product_offers WHERE product_id=$1)',[item.id]);
 const empty=await detail();assert.equal(empty.price_note_override,'产品备注事务测试');
 assert(empty.prices.every(p=>!p.price_note),'Empty price notes must not inherit product/global text');
 const prices=await anon('SELECT api.catalog_product_prices($1) AS data',[item.id]);
 assert(prices.every(p=>p.price_note===null));
 const refreshedList=await anon('SELECT api.catalog_product_list() AS data');
 assert(refreshedList.find(p=>p.id===item.id).prices.every(p=>!p.price_note));
 const priceRow=(await db.query('SELECT pr.id FROM private.offer_prices pr JOIN private.product_offers o ON o.id=pr.offer_id WHERE o.product_id=$1 ORDER BY pr.id LIMIT 1',[item.id])).rows[0];
 await db.query('UPDATE private.offer_prices SET price_note=$1 WHERE id=$2',['单档备注事务测试',priceRow.id]);
 const explicit=await detail();assert.equal(explicit.prices.filter(p=>p.price_note==='单档备注事务测试').length,1);
 await db.query('UPDATE private.products SET price_note_override=NULL WHERE id=$1',[item.id]);
 assert.equal((await detail()).price_note_override,undefined);
 await db.query("UPDATE private.products SET publication_status='hidden' WHERE id=$1",[item.id]);
 assert.equal(await detail(),null);
 await db.query('ROLLBACK');
 assert.deepEqual(await metadata(),before);
 assert.deepEqual((await db.query('SELECT * FROM private.catalog_notices ORDER BY id')).rows,originalNotices);
 console.log('PASS: list/detail/prices never fill empty notes from active globals or product notes; explicit notes preserved; product note separate; hidden products protected; roles/ACL unchanged. All local schema/data edits rolled back.');
} finally {try{await db.query('ROLLBACK');}catch{}await db.end();}
