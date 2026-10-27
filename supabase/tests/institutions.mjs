// Isolated localhost integration. Never use hosted credentials or seed real packages.
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import fs from 'node:fs/promises';
import pg from 'pg';
import {loadConfig,client,rpc,mustReject} from './support.mjs';
const cfg=loadConfig(), db=new pg.Client({connectionString:cfg.db}),service=client(cfg,cfg.service),anon=client(cfg);
const run=randomUUID().slice(0,8),users={},created=[];
const work=new URL('../../work/yunnan-integration/',import.meta.url);
await fs.mkdir(work,{recursive:true});
async function account(role){const email=`institution-${role}-${run}@example.test`,password=randomBytes(24).toString('base64url')+'aA1!';const {data,error}=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{role:'admin'}});if(error)throw error;if(role!=='outsider')await db.query('insert into private.admin_members(user_id,role) values($1,$2)',[data.user.id,role]);const c=client(cfg);const signed=await c.auth.signInWithPassword({email,password});if(signed.error)throw signed.error;users[role]={client:c,email,password};}
async function save(c,p,product={},changes={}){const result=await rpc(c,'save_product',{p_id:p?.id||null,p_expected_updated_at:p?.updated_at||null,p_product:product,p_changes:changes});return (await rpc(c,'admin_product',{p_id:result.id})).product;}
async function draft(institution,c=users.admin.client){const offer=randomUUID();const p=await save(c,null,{institution,category_id:4,name:`ISOLATED-${run}-${institution}`,slug:`isolated-${run}-${institution}-${randomUUID().slice(0,6)}`,internal_notes:'NEVER_PUBLIC',source_reference:'TEST ONLY'}, {funeral_details:{upsert:[{duration_days:3,duration_nights:2,funeral_method:'cremation',service_venue:'TEST VENUE'}]},product_religions:{upsert:[{religion_id:1,is_published:true}]},product_offers:{upsert:[{id:offer,name:'测试方案',is_active:true}]},offer_prices:{upsert:[{offer_id:offer,price_type:'pre_need',price_amount:10000,is_published:true},{offer_id:offer,price_type:'at_need',price_amount:15000,is_published:true}]},product_inclusions:{upsert:[{item_name:'隔离测试项目'}]}});created.push(p.id);return p;}
try{
 await db.connect();await account('admin');await account('editor');await account('outsider');
 for(const c of [anon,users.outsider.client])await mustReject(()=>rpc(c,'admin_institution_product_list',{p_institution:'yunnan'}));
 let n=await draft('nirvana'),y=await draft('yunnan'),e=await draft('yunnan',users.editor.client);
 assert.equal((await rpc(users.admin.client,'admin_product',{p_id:y.id})).product.institution,'yunnan');
 await mustReject(()=>save(users.admin.client,y,{institution:'nirvana'}),/22023/);
 await mustReject(()=>save(users.admin.client,y,{category_id:2}),/23514/);
 await mustReject(()=>save(users.admin.client,null,{institution:'unknown',category_id:4}),/23514/);
 await mustReject(()=>save(users.editor.client,e,{publication_status:'published'}),/42501/);
 const unpublished=await rpc(anon,'catalog_institution_snapshot');assert(!unpublished.some(p=>p.id===y.id));
 n=await save(users.admin.client,n,{publication_status:'published'});y=await save(users.admin.client,y,{publication_status:'published'});
 const both=await rpc(anon,'catalog_institution_snapshot');assert(both.some(p=>p.id===n.id&&p.institution==='nirvana'));assert(both.some(p=>p.id===y.id&&p.institution==='yunnan'));assert(!JSON.stringify(both).includes('NEVER_PUBLIC'));
 const legacy=await rpc(anon,'catalog_product_snapshot');assert(!legacy.some(p=>p.id===y.id));assert.equal(await rpc(anon,'catalog_product_detail',{p_slug:y.slug}),null);
 const scoped=await rpc(users.admin.client,'admin_institution_product_list',{p_institution:'yunnan',p_query:run});assert.equal(scoped.total,2);assert(scoped.items.every(x=>x.product.institution==='yunnan'));
 const oldAdmin=await rpc(users.admin.client,'admin_product_list',{p_query:run});assert(oldAdmin.items.every(x=>x.product.institution==='nirvana'));
 const originalOrder=await rpc(users.admin.client,'admin_category_order',{p_category:4});const order=await rpc(users.admin.client,'admin_institution_category_order',{p_institution:'yunnan',p_category:4});
 await mustReject(()=>rpc(users.admin.client,'admin_institution_reorder_products',{p_institution:'yunnan',p_category:4,p_order:order.map((p,i)=>({id:i===0?n.id:p.id,updated_at:p.updated_at}))}),/PT409/);
 await rpc(users.admin.client,'admin_institution_reorder_products',{p_institution:'yunnan',p_category:4,p_order:order.slice().reverse().map(({id,updated_at})=>({id,updated_at}))});assert.deepEqual(await rpc(users.admin.client,'admin_category_order',{p_category:4}),originalOrder);
 y=(await rpc(users.admin.client,'admin_product',{p_id:y.id})).product;
 const copied=await rpc(users.admin.client,'admin_copy_product',{p_source:y.id,p_expected_updated_at:y.updated_at,p_target:randomUUID(),p_images:[]});created.push(copied.product.id);assert.equal(copied.product.institution,'yunnan');assert.equal(copied.product.publication_status,'draft');
 await fs.writeFile(new URL('browser-fixture.json',work),JSON.stringify({admin:{email:users.admin.email,password:users.admin.password},yunnanId:y.id,yunnanSlug:y.slug,nirvanaId:n.id}),{mode:0o600});
 const hidden=await save(users.admin.client,y,{publication_status:'hidden'});assert(!(await rpc(anon,'catalog_institution_snapshot')).some(p=>p.id===y.id));
 await mustReject(()=>save(users.admin.client,y,{name:'STALE'}),/PT409/);
 await save(users.admin.client,hidden,{publication_status:'published'});
 await fs.writeFile(new URL('result.json',work),JSON.stringify({passed:true,environment:'localhost only',checks:['admin/editor/anonymous boundaries','institution isolation','immutable institution and funeral-only Yunnan','draft hidden until published','both-institution public snapshot','legacy Nirvana RPC isolation','no internal fields','scoped sort and cross-institution rejection','copy preserves institution','hidden products revoked','stale write conflict']}));
 console.log('PASS localhost institution management, publication, public projections, role boundaries, copy, sorting and revocation');
} finally {await db.end();}
