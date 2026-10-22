// Real localhost Supabase: Auth JWTs + PostgREST RPCs + Storage bytes + two DB sessions.
// Intentionally refuses hosted URLs. Hosted projects require a separate reviewed preflight.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import pg from 'pg';
import {loadConfig,client,rpc,mustReject,storageOK,root} from './support.mjs';
import {requirements} from './requirements.mjs';
const cfg=loadConfig(),db=new pg.Client({connectionString:cfg.db});
const fixture=JSON.parse(await fs.readFile(new URL('supabase/fixtures/real-product-structures.json',root),'utf8'));
assert(fixture.test_only && fixture.not_production_seed);
const report={environment:'local-supabase-real-services',host:new URL(cfg.url).hostname,
  run_id:randomUUID(),tests:[],products:[],limitations:fixture.rules};
const run=report.run_id.slice(0,8),service=client(cfg,cfg.service),anon=client(cfg);
const users={},records=new Map(),bucket='catalog-media-private',restricted='catalog-media-restricted';
// Deliberately TEST ONLY transparent PNG, never claimed to be a real product photograph.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1S4AAAAASUVORK5CYII=','base64');
const results=[];
async function test(name,fn){
  try{await fn();report.tests.push({name,status:'PASS'});console.log('PASS '+name);}
  catch(e){report.tests.push({name,status:'FAIL',code:e.code||null,message:e.message});throw e;}
}
function save(c,id,version,product={},changes={}){
  return rpc(c,'save_product',{p_id:id,p_expected_updated_at:version,p_product:product,p_changes:changes});
}
async function get(id){return (await rpc(users.admin.client,'admin_product',{p_id:id}));}
async function image(c,id,b=bucket){
  const path=id+'/'+randomUUID()+'.png';
  await storageOK(c.storage.from(b).upload(path,png,{contentType:'image/png',cacheControl:'0',upsert:false}));
  return path;
}
async function download(c,path,b=bucket){return storageOK(c.storage.from(b).download(path));}
async function user(role){
  const email=`catalog-${role}-${run}@example.test`,password=randomBytes(24).toString('base64url')+'Aa1!';
  const u=await service.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{role:'admin'}});
  if(u.error)throw u.error;
  if(['admin','editor'].includes(role))await db.query('INSERT INTO private.admin_members(user_id,role) VALUES ($1,$2)',[u.data.user.id,role]);
  const c=client(cfg),s=await c.auth.signInWithPassword({email,password});if(s.error)throw s.error;
  users[role]={id:u.data.user.id,client:c,token:s.data.session.access_token};
}
async function sqlRole(conn,id){
  await conn.query('BEGIN');await conn.query('SET LOCAL ROLE authenticated');
  await conn.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[id]);
}

try{
  await db.connect();
  report.postgres=(await db.query('SELECT version()')).rows[0].version;
  report.migrations=(await db.query('SELECT version FROM supabase_migrations.schema_migrations ORDER BY version')).rows.map(x=>x.version);
  await test('文档③：18张表、22个外键、执行角色和RPC授权与安全契约一致',async()=>{
    const sql=await fs.readFile(new URL('schema-contract.sql',import.meta.url),'utf8');
    await db.query(sql);
  });
  await test('基线迁移已应用，18张业务表全部启用RLS',async()=>{
    assert.ok(report.migrations.includes('20261022040009'));
    const n=await db.query("SELECT count(*)::int AS n,bool_and(c.relrowsecurity) AS secured FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private' AND c.relkind='r'");
    assert.equal(n.rows[0].n,18);assert(n.rows[0].secured);
  });
  await test('由真实Supabase Auth创建并登录管理员、编辑员和无后台权限用户',async()=>{
    for(const role of ['admin','editor','outsider'])await user(role);
  });
  await test('管理员身份来自数据库；普通用户伪造metadata.role无效',async()=>{
    assert.equal((await rpc(users.admin.client,'current_catalog_member')).role,'admin');
    assert.equal((await rpc(users.editor.client,'current_catalog_member')).role,'editor');
    await mustReject(()=>rpc(users.outsider.client,'current_catalog_member'),/42501/);
  });
  await test('伪造JWT被网关或Auth拒绝',async()=>{
    const response=await fetch(cfg.url+'/rest/v1/rpc/current_catalog_member',{method:'POST',headers:{apikey:cfg.anon,Authorization:'Bearer not-a-valid-jwt','Content-Type':'application/json'},body:'{}'});
    assert(response.status===401||response.status===403);
  });
  await test('匿名不能调用后台入口或原表',async()=>{
    await mustReject(()=>rpc(anon,'current_catalog_member'));
    const r=await fetch(cfg.url+'/rest/v1/products?select=*',{headers:{apikey:cfg.anon}});assert(r.status>=400);
    const p=await fetch(cfg.url+'/rest/v1/products?select=*',{headers:{apikey:cfg.anon,'Accept-Profile':'private'}});assert(p.status>=400);
  });
  await test('两个媒体bucket私有、限制10MiB及JPEG/PNG/WebP',async()=>{
    const rows=(await db.query('SELECT public,file_size_limit,allowed_mime_types FROM storage.buckets WHERE id=ANY($1)',[[bucket,restricted]])).rows;
    assert.equal(rows.length,2);for(const b of rows){assert.equal(b.public,false);assert.equal(Number(b.file_size_limit),10485760);assert.deepEqual(b.allowed_mime_types,['image/jpeg','image/png','image/webp']);}
  });

  for(const f of fixture.products){
    await test(f.group+'｜录入真实结构：'+f.name,async()=>{
      const religionRows=(f.religions||[]).map(id=>({id:randomUUID(),religion_id:id,is_published:false}));
      const offers=f.prices.map(o=>({id:randomUUID(),offer_code:o.code,name:o.name,
        ...(o.area_sqft?{area_sqft_override:o.area_sqft}:{}),is_active:true}));
      const prices=f.prices.flatMap((o,i)=>['standard','pre_need','at_need'].filter(k=>o[k]!==undefined)
        .map(type=>({id:randomUUID(),offer_id:offers[i].id,price_type:type,price_amount:o[type],is_published:true})));
      const changes={};
      if(religionRows.length)changes.product_religions={upsert:religionRows};
      if(offers.length)changes.product_offers={upsert:offers};
      if(prices.length)changes.offer_prices={upsert:prices};
      const inc=[...(f.inclusions||[]).map(item_name=>({item_name})),...(f.religious_inclusions||[])];
      if(inc.length)changes.product_inclusions={upsert:inc};
      if(f.category_id<=2)changes.burial_details={upsert:[{facing:f.facing,area_sqft:f.area_sqft??null}]};
      if(f.category_id===3)changes.niche_details={upsert:[{theme_name:f.name}]};
      if(f.category_id===4)changes.funeral_details={upsert:[{duration_days:f.duration_days,duration_nights:f.duration_nights,funeral_method:f.funeral_method,terms_summary:f.terms_summary}]};
      const p=await save(users.admin.client,null,null,{
        category_id:f.category_id,name:f.name,slug:`security-${run}-${f.key}`,product_code:`TEST-${run}-${f.key}`,
        internal_notes:'TEST ONLY — supplied product structures, not live merchandise',
        source_reference:f.source,...(f.capacity_group?{capacity_group:f.capacity_group}:{}),
        ...(f.product_form?{product_form:f.product_form}:{})
      },changes);
      records.set(f.key,{...p,source:f,religionRows,offers,prices});
      assert.equal(p.publication_status,'draft');
    });
  }
  const aa=records.get('aa-double-package'),w=records.get('w-cremation');
  await test('草稿文件真实上传Storage，匿名不能下载',async()=>{
    aa.main=await image(users.admin.client,aa.id);
    await mustReject(()=>download(anon,aa.main));
  });
  await test('编辑员可上传草稿照片；普通登录用户不可上传',async()=>{
    const draft=records.get('juxian-moon');draft.editorAsset=await image(users.editor.client,draft.id);
    await mustReject(()=>image(users.outsider.client,draft.id));
  });
  await test('不符合路径、MIME及大小限制的文件不能上传',async()=>{
    await mustReject(()=>storageOK(users.admin.client.storage.from(bucket).upload('unscoped.png',png,{contentType:'image/png'})));
    await mustReject(()=>storageOK(users.admin.client.storage.from(bucket).upload(aa.id+'/'+randomUUID()+'.png',Buffer.from('%PDF-test'),{contentType:'application/pdf'})));
    await mustReject(()=>storageOK(users.admin.client.storage.from(bucket).upload(aa.id+'/'+randomUUID()+'.png',Buffer.alloc(10485761),{contentType:'image/png'})));
  });
  await test('编辑员不能发布真实产品，管理员缺主图也不能发布',async()=>{
    await mustReject(()=>save(users.editor.client,w.id,w.updated_at,{publication_status:'published'}),/42501/);
    await mustReject(()=>save(users.admin.client,w.id,w.updated_at,{publication_status:'published'}),/23514/);
  });
  for(const r of records.values()){
    await test(r.source.group+'｜照片引用及发布验证：'+r.source.name,async()=>{
      r.main ||= await image(users.admin.client,r.id);
      const images=[{id:randomUUID(),storage_bucket:bucket,storage_path:r.main,is_primary:true,is_published:true,image_type:'primary',alt_text:'TEST ONLY 权限验证图片，不是产品照片'}];
      r.designs=[];
      for(const d of r.source.designs||[]){
        const path=await image(users.admin.client,r.id);
        const entry={id:randomUUID(),religion_id:d.religion_id,storage_bucket:bucket,storage_path:path,is_published:true,image_type:'design',design_name:d.name};
        images.push(entry);r.designs.push(entry);
      }
      const current=await get(r.id);
      const patch={product_images:{upsert:images},...(r.religionRows.length?{product_religions:{upsert:r.religionRows.map(x=>({id:x.id,is_published:true}))}}:{})};
      const ready=await save(users.admin.client,r.id,current.product.updated_at,{},patch);
      if(r.source.religions?.length && r.source.prices.length){
        Object.assign(r,await save(users.admin.client,r.id,ready.updated_at,{publication_status:'published'}));
        assert.equal((await download(anon,r.main)).size,png.length);
        report.products.push({name:r.source.name,group:r.source.group,status:'published-in-local-test',actual_photo:false});
      }else{
        await mustReject(()=>save(users.admin.client,r.id,ready.updated_at,{publication_status:'published'}),/23514/);
        assert.equal((await get(r.id)).product.publication_status,'draft');
        report.products.push({name:r.source.name,group:r.source.group,status:'correctly-blocked-missing-source-data',missing:r.source.missing,actual_photo:false});
      }
    });
  }
  await test('Zone AA双宗教四设计共用63888售价，不重复产品',async()=>{
    const d=await rpc(anon,'catalog_product_detail',{p_slug:`security-${run}-aa-double-package`});
    assert.equal(d.religions.length,2);assert.equal(d.prices.length,1);assert.equal(d.prices[0].amount,63888);
    assert.deepEqual(d.images.filter(x=>x.design_name).map(x=>x.design_name).sort(),['丙款','乙款','甲款','丁款'].sort());
    assert.equal(d.attributes.area_sqft,56);assert.equal(d.attributes.facing,'朝南');
  });
  await test('Zone W尊贵配套普通／角头及面积覆盖价格不混合',async()=>{
    const d=await rpc(anon,'catalog_product_detail',{p_slug:`security-${run}-w-premium-package`});
    assert.deepEqual(d.prices.map(p=>p.amount).sort((a,b)=>a-b),[113888,120888,123888]);
    const a=await get(records.get('w-premium-package').id);
    assert.deepEqual(a.product_offers.map(o=>Number(o.area_sqft_override)).sort((a,b)=>a-b),[216,216,252]);
    assert.equal(d.price_display_mode,'multiple');
  });
  await test('Zone W地段不继承配套宗教用品；家庭人数不强填数字',async()=>{
    const p=await get(records.get('w-family-lot').id);assert.equal(p.product.capacity_count,null);
    const lot=await get(records.get('w-single-lot').id);assert.equal(lot.product_religions.length,0);
    assert(!lot.product_inclusions.some(x=>/香炉|天使|墓碑/.test(x.item_name)));
  });
  await test('八款殡仪均分别返回来源中的预购／即用价格，无总价及人数条件',async()=>{
    for(const r of records.values())if(r.source.category_id===4){
      const d=await rpc(anon,'catalog_product_detail',{p_slug:`security-${run}-${r.source.key}`});
      assert.equal(d.prices.length,2);assert.equal(d.capacity_group,undefined);
      for(const type of ['pre_need','at_need'])assert.equal(d.prices.find(x=>x.price_type===type).amount,r.source.prices[0][type]);
      assert(!d.prices.some(x=>x.label==='总价格'));
    }
  });
  await test('真实资料不足的聚仙楼四产品均保留草稿，无虚构起价',async()=>{
    for(const r of records.values())if(r.source.group==='聚仙楼'){
      const d=await get(r.id);assert.equal(d.product.publication_status,'draft');assert.equal(d.offer_prices.length,0);
      assert.equal(d.product.capacity_count,null);assert.equal(d.product_religions.length,0);
      assert.equal(await rpc(anon,'catalog_product_detail',{p_slug:d.product.slug}),null);
    }
  });
  await test('公开目录及详情排除内部字段，后台可以读取',async()=>{
    const d=await rpc(anon,'catalog_product_list');const s=JSON.stringify(d);
    for(const k of ['internal_notes','source_reference','product_code','updated_by','supplied product structures, not live merchandise'])assert(!s.includes(k));
    const p=await get(aa.id);assert.equal(p.product.source_reference,'Zone AA.docx');
  });
  await test('直接SQL使用authenticated角色也不能读私表、改权限或改审计',async()=>{
    for(const sql of ['SELECT * FROM private.products','UPDATE private.admin_members SET role=\'admin\'','DELETE FROM private.audit_logs']){
      await db.query('BEGIN');await db.query('SET LOCAL ROLE authenticated');
      await mustReject(()=>db.query(sql),/42501/);await db.query('ROLLBACK');
    }
  });
  await test('已有公开主图不能原地覆盖或删除',async()=>{
    await mustReject(()=>storageOK(users.admin.client.storage.from(bucket).upload(aa.main,png,{contentType:'image/png',upsert:true})));
    const deletion=await users.admin.client.storage.from(bucket).remove([aa.main]);
    assert(deletion.error || !deletion.data.some(x=>x.name===aa.main));
    assert.equal((await download(anon,aa.main)).size,png.length);
  });
  await test('编辑员不能向已发布产品上传新图或修改价格',async()=>{
    await mustReject(()=>image(users.editor.client,aa.id));
    const p=await get(aa.id);await mustReject(()=>save(users.editor.client,aa.id,p.product.updated_at,{}, {offer_prices:{upsert:[{id:p.offer_prices[0].id,price_amount:1}]}}),/42501/);
  });
  await test('关闭AA基督教配置后标签、设计图片字节及筛选同时隐藏',async()=>{
    let p=await get(aa.id),religion=p.product_religions.find(x=>x.religion_id===2);
    await save(users.admin.client,aa.id,p.product.updated_at,{}, {product_religions:{upsert:[{id:religion.id,is_published:false}]}});
    const d=await rpc(anon,'catalog_product_detail',{p_slug:p.product.slug});assert.equal(d.religions.length,1);
    assert.equal(d.images.filter(x=>x.religion_id===2).length,0);
    for(const img of aa.designs.filter(x=>x.religion_id===2))await mustReject(()=>download(anon,img.storage_path));
    const filtered=await rpc(anon,'catalog_product_list',{p_category:1,p_religion:2});assert(!filtered.some(x=>x.id===aa.id));
    p=await get(aa.id);await save(users.admin.client,aa.id,p.product.updated_at,{}, {product_religions:{upsert:[{id:religion.id,is_published:true}]}});
  });
  let restrictedPath;
  await test('受限素材可后台读取，不能匿名读取、设为主图或输出目录',async()=>{
    restrictedPath=await image(users.admin.client,aa.id,restricted);
    assert.equal((await download(users.admin.client,restrictedPath,restricted)).size,png.length);
    await mustReject(()=>download(anon,restrictedPath,restricted));
    let p=await get(aa.id);
    await mustReject(()=>save(users.admin.client,aa.id,p.product.updated_at,{}, {product_images:{upsert:[{storage_bucket:restricted,storage_path:restrictedPath,is_published:true}]}}),/23514/);
    p=await get(aa.id);await save(users.admin.client,aa.id,p.product.updated_at,{}, {product_images:{upsert:[{storage_bucket:restricted,storage_path:restrictedPath,is_published:false}]}});
    const d=await rpc(anon,'catalog_product_detail',{p_slug:p.product.slug});assert(!JSON.stringify(d).includes(restrictedPath));
  });
  await test('停用管理员账号：现有JWT仍有效但后台和受限图访问立即被拒',async()=>{
    await db.query('UPDATE private.admin_members SET is_active=false WHERE user_id=$1',[users.admin.id]);
    try{
      await mustReject(()=>rpc(users.admin.client,'current_catalog_member'),/42501/);
      await mustReject(()=>download(users.admin.client,restrictedPath,restricted));
    }finally{await db.query('UPDATE private.admin_members SET is_active=true WHERE user_id=$1',[users.admin.id]);}
  });
  await test('私有普通图与受限图均不能签发绕过后续权限检查的下载／上传URL',async()=>{
    for(const [b,path] of [[bucket,aa.main],[restricted,restrictedPath]]){
      await mustReject(()=>storageOK(users.admin.client.storage.from(b).createSignedUrl(path,3600)));
      await mustReject(()=>storageOK(users.admin.client.storage.from(b).createSignedUploadUrl(aa.id+'/'+randomUUID()+'.png')));
    }
  });
  await test('即使已有宽松Storage策略，目录bucket的限制仍不能被旁路',async()=>{
    await db.query('CREATE POLICY test_broad_media_allow ON storage.objects FOR ALL TO anon,authenticated USING (true) WITH CHECK (true)');
    try{
      await mustReject(()=>download(anon,restrictedPath,restricted));
      await mustReject(()=>image(users.outsider.client,aa.id));
      await mustReject(()=>storageOK(users.admin.client.storage.from(bucket).upload(aa.main,png,{contentType:'image/png',upsert:true})));
    }finally{await db.query('DROP POLICY test_broad_media_allow ON storage.objects');}
  });
  await test('不能把另一个产品的已上传图片路径关联到当前产品',async()=>{
    const p=await get(w.id);
    await mustReject(()=>save(users.admin.client,w.id,p.product.updated_at,{}, {
      product_images:{upsert:[{storage_bucket:bucket,storage_path:aa.main}]}}),/23514/);
  });
  await test('失败的正式改价事务保留原价格、更新时间及审计数',async()=>{
    const f=records.get('funeral-1-2'),p=await get(f.id);
    const logs=(await db.query('SELECT count(*)::int AS n FROM private.audit_logs')).rows[0].n;
    await mustReject(()=>save(users.admin.client,f.id,p.product.updated_at,{name:'不应提交'}, {offer_prices:{delete:[p.offer_prices.find(x=>x.price_type==='at_need').id]}}),/23514/);
    const after=await get(f.id);assert.deepEqual(after.product,p.product);assert.deepEqual(after.offer_prices,p.offer_prices);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM private.audit_logs')).rows[0].n,logs);
  });
  await test('两个真实数据库连接同时编辑：第二人等待后收到冲突，不覆盖第一人',async()=>{
    const a=new pg.Client({connectionString:cfg.db}),b=new pg.Client({connectionString:cfg.db});
    await a.connect();await b.connect();
    try{
      const p=await get(w.id);
      await sqlRole(a,users.admin.id);await sqlRole(b,users.admin.id);
      await a.query('SELECT api.save_product($1,$2,$3::jsonb)',[w.id,p.product.updated_at,JSON.stringify({internal_notes:'first editor committed'})]);
      const pending=b.query('SELECT api.save_product($1,$2,$3::jsonb)',[w.id,p.product.updated_at,JSON.stringify({internal_notes:'second editor must not overwrite'})]).then(()=>({ok:true}),e=>({error:e}));
      await new Promise(r=>setTimeout(r,120));await a.query('COMMIT');
      const second=await pending;assert.equal(second.error?.code,'PT409');await b.query('ROLLBACK');
      assert.equal((await get(w.id)).product.internal_notes,'first editor committed');
    }finally{await a.end();await b.end();}
  });
  await test('隐藏产品后公开RPC和旧普通图片下载均拒绝，后台仍可查看',async()=>{
    const p=await get(aa.id);await save(users.admin.client,aa.id,p.product.updated_at,{publication_status:'hidden'});
    assert.equal(await rpc(anon,'catalog_product_detail',{p_slug:p.product.slug}),null);
    await mustReject(()=>download(anon,aa.main));assert.equal((await download(users.admin.client,aa.main)).size,png.length);
    const restored=await get(aa.id);await save(users.admin.client,aa.id,restored.product.updated_at,{publication_status:'published'});
  });
  await requirements({test,db,users,anon,save,get,image,bucket,run,records});
}catch(e){
  console.error('Integration failed: '+(e.code||e.name)+' '+e.message);process.exitCode=1;
}finally{
  report.passed=report.tests.filter(x=>x.status==='PASS').length;report.failed=report.tests.filter(x=>x.status==='FAIL').length;
  report.finished_at=new Date().toISOString();
  await fs.writeFile(new URL('integration-result.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  await db.end();
  console.log(`Integration results: ${report.passed} passed, ${report.failed} failed`);
}
