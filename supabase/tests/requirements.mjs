// Document ③ v1.3 regression cases. Called only by the localhost integration runner.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {rpc,mustReject} from './support.mjs';

export async function requirements({test,db,users,anon,save,get,image,bucket,run,records}) {
  const admin=users.admin.client,editor=users.editor.client;
  let draft,ready;
  const fresh=async(category=3,extra={})=>save(admin,null,null,{
    category_id:category,slug:`requirements-${run}-${randomUUID()}`,
    name:'TEST ONLY — document ③ regression',...extra
  });
  const rejectChange=async(id,product={},changes={},code=/23514/)=>{
    const before=await get(id);
    await mustReject(()=>save(admin,id,before.product.updated_at,product,changes),code);
    assert.deepEqual(await get(id),before,'Rejected transaction must preserve all product data');
  };
  const sqlReject=async(sql,args,code=/23514/)=>{
    await db.query('BEGIN');
    try {await mustReject(async()=>{await db.query(sql,args);await db.query('SET CONSTRAINTS ALL IMMEDIATE');},code);}
    finally {await db.query('ROLLBACK');}
  };
  await test('文档③：未完成骨灰位可存草稿，自动生成默认方案与起价模式',async()=>{
    draft=await fresh(3,{name:null});const d=await get(draft.id);
    assert.equal(d.product.price_display_mode,'starting_from');
    assert.equal(d.product.product_form,'other');assert.equal(d.product.name,null);
    assert.equal(d.product_offers.length,1);assert.equal(d.product_offers[0].offer_code,'default');
    assert.equal(d.offer_prices.length,0);
    await rejectChange(draft.id,{publication_status:'published'});
    assert.equal(await rpc(anon,'catalog_product_detail',{p_slug:d.product.slug}),null);
  });
  await test('文档③：零价、负价、NaN及空金额均不能保存',async()=>{
    const d=await get(draft.id);
    for(const price_amount of [0,-1,'NaN',null])await rejectChange(draft.id,{},
      {offer_prices:{upsert:[{offer_id:d.product_offers[0].id,price_type:'standard',price_amount}]}},/23514|23502/);
  });
  await test('文档③：同方案同类型即使均未公开也不能重复报价',async()=>{
    const d=await get(draft.id),offer_id=d.product_offers[0].id;
    await save(admin,draft.id,d.product.updated_at,{}, {offer_prices:{upsert:[{offer_id,price_type:'standard',price_amount:100,is_published:false}]}});
    await rejectChange(draft.id,{}, {offer_prices:{upsert:[{offer_id,price_type:'standard',price_amount:200,is_published:false}]}},/23505/);
  });
  await test('文档③：包含项目不能引用其他产品的方案',async()=>{
    const other=await get(records.get('aa-double-package').id);
    await rejectChange(draft.id,{}, {product_inclusions:{upsert:[{offer_id:other.product_offers[0].id,item_name:'invalid cross-product item'}]}},/23503/);
  });
  await test('文档③：方案、图片及包含项目均不能引用未绑定宗教',async()=>{
    const lot=await fresh(2);
    await rejectChange(lot.id,{}, {product_offers:{upsert:[{offer_code:'unbound',religion_id:2}]}},/23503/);
    await rejectChange(lot.id,{}, {product_inclusions:{upsert:[{religion_id:2,item_name:'unbound'}]}},/23503/);
    const path=await image(admin,lot.id);
    await rejectChange(lot.id,{}, {product_images:{upsert:[{religion_id:2,storage_bucket:bucket,storage_path:path}]}},/23503/);
  });
  await test('文档③：专属属性类别匹配，重分类不能遗留错误属性',async()=>{
    await rejectChange(draft.id,{}, {burial_details:{upsert:[{area_sqft:10}]}});
    let d=await get(draft.id);await save(admin,draft.id,d.product.updated_at,{}, {niche_details:{upsert:[{theme_name:'TEST'}]}});
    await rejectChange(draft.id,{category_id:5});
  });
  await test('文档③：人数类别与数量匹配，家庭允许未知人数',async()=>{
    await rejectChange(draft.id,{capacity_group:'single',capacity_count:2});
    await rejectChange(draft.id,{capacity_group:'family'});
    const family=await fresh(2,{capacity_group:'family'});
    assert.equal((await get(family.id)).product.capacity_count,null);
    const f=await fresh(4);await rejectChange(f.id,{capacity_group:'single',capacity_count:1});
  });
  await test('文档③：方案数变化自动调整模式，殡仪和骨灰位禁止位置分价',async()=>{
    const lot=await fresh(2),d=await get(lot.id);
    const offerId=randomUUID();
    let p=await save(admin,lot.id,d.product.updated_at,{}, {product_offers:{upsert:[{id:offerId,offer_code:'corner'}]}});
    assert.equal(p.price_display_mode,'multiple');
    p=await save(admin,lot.id,p.updated_at,{}, {product_offers:{delete:[offerId]}});
    assert.equal(p.price_display_mode,'fixed');
    await rejectChange(draft.id,{}, {product_offers:{upsert:[{offer_code:'floor-2'}]}});
    const f=await fresh(4);assert.equal(f.price_display_mode,'funeral_dual');
    await rejectChange(f.id,{}, {product_offers:{upsert:[{offer_code:'second'}]}});
  });
  await test('文档③：拒绝客户端伪造操作人、更新时间及价格模式',async()=>{
    for(const field of ['updated_by','updated_at','created_at','price_display_mode'])
      await rejectChange(draft.id,{[field]:field==='updated_by'?users.outsider.id:'forged'}, {}, /22023/);
  });
  await test('文档③：非殡仪不能写预购价，殡仪不能写标准总价',async()=>{
    const d=await get(draft.id);
    await rejectChange(draft.id,{}, {offer_prices:{upsert:[{offer_id:d.product_offers[0].id,price_type:'pre_need',price_amount:100}]}});
    const f=await fresh(4),p=await get(f.id);
    await rejectChange(f.id,{}, {offer_prices:{upsert:[{offer_id:p.product_offers[0].id,price_type:'standard',price_amount:100}]}});
  });
  await test('文档③：已发布产品不能移除最后宗教、当前价格或共通主图',async()=>{
    ready=records.get('w-double-package');const d=await get(ready.id);
    await rejectChange(ready.id,{}, {product_religions:{upsert:d.product_religions.map(x=>({id:x.id,is_published:false}))}});
    await rejectChange(ready.id,{}, {offer_prices:{delete:[d.offer_prices[0].id]}});
    await rejectChange(ready.id,{}, {product_images:{delete:[d.product_images.find(x=>x.is_primary).id]}});
  });
  await test('文档③：类别或宗教字典停用仍受发布完整性约束',async()=>{
    await sqlReject('UPDATE private.product_categories SET is_active=false WHERE id=1');
    await sqlReject('UPDATE private.religions SET is_active=false');
  });
  await test('文档③：停用系列不隐藏已有产品，但禁止新增绑定',async()=>{
    await db.query('BEGIN');
    try {
      const sid=randomUUID();
      await db.query("INSERT INTO private.product_series(id,name) VALUES($1,'TEST series')",[sid]);
      await db.query('UPDATE private.products SET series_id=$1 WHERE id=$2',[sid,ready.id]);
      await db.query('UPDATE private.product_series SET is_active=false WHERE id=$1',[sid]);
      await db.query('SET CONSTRAINTS ALL IMMEDIATE');
      await db.query('SET LOCAL ROLE anon');
      const list=(await db.query('SELECT api.catalog_product_list() AS data')).rows[0].data;
      assert(list.some(x=>x.id===ready.id));await db.query('RESET ROLE');
      await mustReject(()=>db.query('INSERT INTO private.products(category_id,series_id) VALUES(2,$1)',[sid]),/23514/);
    } finally {await db.query('ROLLBACK');}
  });
  await test('文档③：引用中的类别及宗教不能删除；孤立价格不能创建',async()=>{
    await sqlReject('DELETE FROM private.product_categories WHERE id=2',[],/23503/);
    await sqlReject('DELETE FROM private.religions WHERE id=1',[],/23503/);
    await sqlReject("INSERT INTO private.offer_prices(offer_id,price_type,price_amount) VALUES($1,'standard',100)",[randomUUID()],/23503/);
  });
  await test('文档③：骨灰位逐项校验名称、人数、公开宗教、主图及最低价后才可发布',async()=>{
    const p=await fresh(3,{capacity_group:'single'}),d=await get(p.id);
    const religionId=randomUUID(),priceId=randomUUID(),imageId=randomUUID();
    const path=await image(admin,p.id);
    await save(admin,p.id,d.product.updated_at,{}, {
      niche_details:{upsert:[{theme_name:'TEST'}]},
      product_religions:{upsert:[{id:religionId,religion_id:1,is_published:true}]},
      offer_prices:{upsert:[{id:priceId,offer_id:d.product_offers[0].id,price_type:'standard',price_amount:123,is_published:true}]},
      product_images:{upsert:[{id:imageId,storage_bucket:bucket,storage_path:path,is_primary:true,is_published:true}]}
    });
    for(const [product,changes] of [
      [{name:'  '},{}], [{capacity_group:null},{}],
      [{},{product_religions:{upsert:[{id:religionId,is_published:false}]}}],
      [{},{product_images:{upsert:[{id:imageId,is_published:false}]}}],
      [{},{offer_prices:{upsert:[{id:priceId,is_published:false}]}}]
    ])await rejectChange(p.id,{publication_status:'published',...product},changes);
    const latest=await get(p.id);
    await save(admin,p.id,latest.product.updated_at,{publication_status:'published'});
    const published=await rpc(anon,'catalog_product_detail',{p_slug:latest.product.slug});
    assert.equal(published.prices.length,1);assert.equal(published.prices[0].amount,123);
    assert.equal(published.prices[0].starting_from,true);
    assert(!('facing' in published.attributes));assert(!('area_sqft' in published.attributes));
  });
  await test('文档③：牌位、生基及宠物可在不填写人数和宗教时合法发布',async()=>{
    for(const category of [5,6,7]){
      const p=await fresh(category),d=await get(p.id),path=await image(admin,p.id);
      await save(admin,p.id,d.product.updated_at,{publication_status:'published'}, {
        offer_prices:{upsert:[{offer_id:d.product_offers[0].id,price_type:'standard',price_amount:100,is_published:true}]},
        product_images:{upsert:[{storage_bucket:bucket,storage_path:path,is_primary:true,is_published:true}]}
      });
      const result=await rpc(anon,'catalog_product_detail',{p_slug:d.product.slug});
      assert.equal(result.religions.length,0);assert.equal(result.price_display_mode,'fixed');
    }
  });
  await test('文档③：只修改殡仪预购价不覆盖即用价，旧更新时间保存被拒绝',async()=>{
    const p=records.get('funeral-1-2'),before=await get(p.id);
    const pre=before.offer_prices.find(x=>x.price_type==='pre_need'),at=before.offer_prices.find(x=>x.price_type==='at_need');
    await save(admin,p.id,before.product.updated_at,{}, {offer_prices:{upsert:[{id:pre.id,price_amount:Number(pre.price_amount)+1}]}});
    const after=await get(p.id);assert.deepEqual(after.offer_prices.find(x=>x.id===at.id),at);
    assert.notEqual(after.product.updated_at,before.product.updated_at);
    const conflict=await admin.rpc('save_product',{p_id:p.id,p_expected_updated_at:before.product.updated_at,p_product:{name:'stale update'}}).abortSignal(AbortSignal.timeout(5000));
    assert.equal(conflict.status,409);assert.equal(conflict.error?.code,'PT409');
    await save(admin,p.id,after.product.updated_at,{}, {offer_prices:{upsert:[{id:pre.id,price_amount:pre.price_amount}]}});
  });
  await test('文档③：草稿可删除并级联子记录，审计记录保留',async()=>{
    const d=await get(draft.id);
    const conflict=await editor.rpc('delete_draft',{p_id:draft.id,p_expected_updated_at:'2000-01-01T00:00:00Z'}).abortSignal(AbortSignal.timeout(5000));
    assert.equal(conflict.status,409);assert.equal(conflict.error?.code,'PT409');
    assert.deepEqual(await get(draft.id),d);
    await rpc(editor,'delete_draft',{p_id:draft.id,p_expected_updated_at:d.product.updated_at});
    assert.equal(await get(draft.id),null);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM private.product_offers WHERE product_id=$1',[draft.id])).rows[0].n,0);
    assert((await db.query('SELECT count(*)::int AS n FROM private.audit_logs WHERE record_id=$1',[draft.id])).rows[0].n>0);
  });
  await test('文档③：曾发布产品不能改回草稿、物理删除或交由编辑员修改',async()=>{
    let d=await get(ready.id);await rejectChange(ready.id,{publication_status:'draft'});
    await mustReject(()=>rpc(admin,'delete_draft',{p_id:ready.id,p_expected_updated_at:d.product.updated_at}),/23514/);
    await save(admin,ready.id,d.product.updated_at,{publication_status:'hidden'});d=await get(ready.id);
    await mustReject(()=>save(editor,ready.id,d.product.updated_at,{name:'forbidden'}),/42501/);
    await save(admin,ready.id,d.product.updated_at,{publication_status:'published'});
  });
  await test('文档③：审计写入失败时产品、价格及并发标识整体回滚',async()=>{
    const d=await get(ready.id);
    await db.query('BEGIN');
    try {
      await db.query("CREATE FUNCTION pg_temp.reject_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TEST audit failure' USING ERRCODE='P0001'; END $$");
      await db.query('CREATE TRIGGER test_audit_failure BEFORE INSERT ON private.audit_logs FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_test_audit()');
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[users.admin.id]);
      await mustReject(()=>db.query('SELECT api.save_product($1,$2,$3::jsonb,$4::jsonb)',[ready.id,d.product.updated_at,JSON.stringify({name:'must roll back'}),JSON.stringify({offer_prices:{upsert:[{id:d.offer_prices[0].id,price_amount:1}]}})]),/P0001/);
    } finally {await db.query('ROLLBACK');}
    assert.deepEqual(await get(ready.id),d);
  });
}
