// Independent localhost DB only; schema and fixture edits are rolled back together.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import pg from './node_modules/pg/lib/index.js';
import { loadConfig, root } from './support.mjs';
const db = new pg.Client({connectionString:loadConfig().db});
await db.connect();
const metadata = `select proname,pg_get_userbyid(proowner) owner,proacl::text,proconfig from pg_proc where oid in ('api.catalog_product_prices(uuid)'::regprocedure,'api.catalog_product_detail(text)'::regprocedure) order by proname`;
try {
  const before = (await db.query(metadata)).rows;
  await db.query('BEGIN');
  await db.query('SET CONSTRAINTS ALL DEFERRED');
  await db.query(await fs.readFile(new URL('supabase/migrations/20261026135045_catalog_offer_attributes.sql',root),'utf8'));
  assert.deepEqual((await db.query(metadata)).rows,before,'ownership and privileges unchanged');
  const {rows:[fixture]} = await db.query(`select p.id,p.slug,p.updated_at,o.id offer_id,r.religion_id from private.products p
    join private.product_offers o on o.product_id=p.id and o.is_active
    join private.offer_prices pr on pr.offer_id=o.id and pr.is_published
    join private.product_religions r on r.product_id=p.id and r.is_published
    where p.category_id=1 and p.publication_status='published' limit 1`);
  assert(fixture,'local published security fixture required');
  await db.query('update private.burial_details set facing=$2,area_sqft=$3,urn_capacity=2,cremation_count=2 where product_id=$1',[fixture.id,'共通南向',56]);
  await db.query('update private.product_offers set facing_override=$2,area_sqft_override=66,position_type=$3 where id=$1',[fixture.offer_id,'方案北向','角头']);
  await db.query('update private.product_religions set configuration_name=$3,configuration_notes=$4 where product_id=$1 and religion_id=$2',[fixture.id,fixture.religion_id,'测试宗教配置','测试配置说明']);
  await db.query('SET LOCAL ROLE anon');
  const record=(await db.query('select api.catalog_product_detail($1) record',[fixture.slug])).rows[0].record;
  const price=record.prices.find(p=>p.offer_id===fixture.offer_id);
  assert.equal(price.facing_override,'方案北向');assert.equal(Number(price.area_sqft_override),66);assert.equal(price.position_type,'角头');
  assert.equal(record.religions.find(r=>r.id===fixture.religion_id).configuration_name,'测试宗教配置');
  assert.equal(Number(record.attributes.urn_capacity),2);
  assert(!('internal_notes' in record));
  await db.query('RESET ROLE');
  await db.query('update private.product_offers set is_active=false where id=$1',[fixture.offer_id]);
  await db.query('SET LOCAL ROLE anon');
  assert(!(await db.query('select api.catalog_product_prices($1) rows',[fixture.id])).rows[0].rows.some(p=>p.offer_id===fixture.offer_id),'inactive offers stay private');
  await db.query('RESET ROLE');
  await db.query('update private.products set publication_status=$2 where id=$1',[fixture.id,'hidden']);
  await db.query('SET LOCAL ROLE anon');
  assert.equal((await db.query('select api.catalog_product_detail($1) record',[fixture.slug])).rows[0].record,null);
  assert.deepEqual((await db.query('select api.catalog_product_prices($1) rows',[fixture.id])).rows[0].rows,[]);
  await db.query('RESET ROLE');
  await db.query('ROLLBACK');
  assert.deepEqual((await db.query(metadata)).rows,before);
  assert.equal((await db.query('select updated_at from private.products where id=$1',[fixture.id])).rows[0].updated_at.toISOString(),fixture.updated_at.toISOString());
  console.log('PASS: actual anonymous SQL projection exposes offer differences and religious configuration; inactive/hidden data excluded; owner/grants retained; all schema/data changes rolled back.');
} finally { await db.query('ROLLBACK'); await db.end(); }
