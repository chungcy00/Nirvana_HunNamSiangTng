-- Phase 1: bounded admin RPCs on the existing 18 tables. No columns or data seeds.
BEGIN;
CREATE FUNCTION api.admin_reference_data() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM private.require_member(false);
  RETURN jsonb_build_object(
    'categories',(SELECT jsonb_agg(to_jsonb(x) ORDER BY sort_order,id) FROM private.product_categories x),
    'series',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY sort_order,id) FROM private.product_series x),'[]'::jsonb),
    'religions',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY id) FROM private.religions x),'[]'::jsonb),
    'notices',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY sort_order,id) FROM private.catalog_notices x),'[]'::jsonb));
END $$;

CREATE FUNCTION api.admin_product_list(p_query text DEFAULT '',p_category smallint DEFAULT NULL,
 p_series uuid DEFAULT NULL,p_status text DEFAULT NULL,p_page integer DEFAULT 1) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; total integer;
BEGIN
 PERFORM private.require_member(false);
 IF p_page<1 OR p_page>100000 OR p_page IS NULL OR length(p_query)>200
   OR (p_status IS NOT NULL AND p_status NOT IN ('draft','published','hidden')) THEN
   RAISE EXCEPTION '无效列表参数' USING ERRCODE='22023'; END IF;
 SELECT count(*) INTO total FROM private.products p WHERE
   (p_query='' OR p.name ILIKE '%'||p_query||'%' OR p.product_code ILIKE '%'||p_query||'%')
   AND (p_category IS NULL OR p.category_id=p_category) AND (p_series IS NULL OR p.series_id=p_series)
   AND (p_status IS NULL OR p.publication_status=p_status);
 SELECT coalesce(jsonb_agg(api.admin_product(x.id) ORDER BY x.category_id,x.sort_order,x.id),'[]'::jsonb)
 INTO result FROM (SELECT p.id,p.category_id,p.sort_order FROM private.products p WHERE
   (p_query='' OR p.name ILIKE '%'||p_query||'%' OR p.product_code ILIKE '%'||p_query||'%')
   AND (p_category IS NULL OR p.category_id=p_category) AND (p_series IS NULL OR p.series_id=p_series)
   AND (p_status IS NULL OR p.publication_status=p_status)
   ORDER BY p.category_id,p.sort_order,p.id LIMIT 20 OFFSET (p_page-1)*20) x;
 RETURN jsonb_build_object('items',result,'total',total,'page',p_page,'page_size',20);
END $$;

CREATE FUNCTION api.admin_category_order(p_category smallint) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.require_member(false);
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,
   'publication_status',publication_status,'updated_at',updated_at) ORDER BY sort_order,id)
   FROM private.products WHERE category_id=p_category),'[]'::jsonb);
END $$;
CREATE FUNCTION api.admin_reorder_products(p_category smallint,p_order jsonb) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer; rowj jsonb; position integer:=0;
BEGIN
 PERFORM private.require_member(true); PERFORM private.catalog_write_lock();
 IF jsonb_typeof(p_order) IS DISTINCT FROM 'array' OR jsonb_array_length(p_order)>10000 THEN
   RAISE EXCEPTION '无效排序' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM private.products WHERE category_id=p_category ORDER BY id FOR UPDATE;
 SELECT count(*) INTO n FROM private.products WHERE category_id=p_category;
 IF jsonb_array_length(p_order)<>n OR (SELECT count(DISTINCT v->>'id') FROM jsonb_array_elements(p_order) v)<>n
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_order) v LEFT JOIN private.products p
     ON p.id=(v->>'id')::uuid AND p.category_id=p_category WHERE p.id IS NULL
       OR (v->>'updated_at')::timestamptz IS DISTINCT FROM p.updated_at) THEN
   RAISE EXCEPTION '此类别资料已变更，请重新载入排序，当前调整未覆盖' USING ERRCODE='PT409'; END IF;
 FOR rowj IN SELECT value FROM jsonb_array_elements(p_order) LOOP
   UPDATE private.products SET sort_order=position WHERE id=(rowj->>'id')::uuid;
   position:=position+1;
 END LOOP;
 RETURN api.admin_category_order(p_category);
END $$;

-- New/reclassified products go to the end in the same product transaction.
DO $patch$
DECLARE definition text; marker text:='PERFORM private.apply_row(''products'',p_product||jsonb_build_object(''id'',pid));';
BEGIN
 SELECT pg_get_functiondef('api.save_product(uuid,timestamptz,jsonb,jsonb)'::regprocedure) INTO definition;
 IF position(marker in definition)=0 THEN RAISE EXCEPTION 'Unknown save_product baseline'; END IF;
 EXECUTE replace(definition,marker,
   'IF p_id IS NULL OR (p_product ? ''category_id'' AND (p_product->>''category_id'')::smallint<>oldp.category_id) THEN
      p_product:=p_product||jsonb_build_object(''sort_order'',(SELECT coalesce(max(sort_order)+1,0) FROM private.products
       WHERE category_id=coalesce((p_product->>''category_id'')::smallint,oldp.category_id) AND id<>pid));
    ELSIF p_product ? ''sort_order'' THEN
      RAISE EXCEPTION ''请使用整类排序操作'' USING ERRCODE=''22023'';
    END IF; '||marker);
END $patch$;

GRANT INSERT,UPDATE ON private.product_series,private.religions,private.catalog_notices TO fg_catalog_writer;
CREATE POLICY admin_reference_insert_series ON private.product_series FOR INSERT TO fg_catalog_writer
 WITH CHECK(private.require_member(true) IS NOT NULL);
CREATE POLICY admin_reference_update_series ON private.product_series FOR UPDATE TO fg_catalog_writer
 USING(private.require_member(true) IS NOT NULL) WITH CHECK(private.require_member(true) IS NOT NULL);
CREATE POLICY admin_reference_insert_religions ON private.religions FOR INSERT TO fg_catalog_writer
 WITH CHECK(private.require_member(true) IS NOT NULL);
CREATE POLICY admin_reference_update_religions ON private.religions FOR UPDATE TO fg_catalog_writer
 USING(private.require_member(true) IS NOT NULL) WITH CHECK(private.require_member(true) IS NOT NULL);
CREATE POLICY admin_reference_insert_notices ON private.catalog_notices FOR INSERT TO fg_catalog_writer
 WITH CHECK(private.require_member(true) IS NOT NULL);
CREATE POLICY admin_reference_update_notices ON private.catalog_notices FOR UPDATE TO fg_catalog_writer
 USING(private.require_member(true) IS NOT NULL) WITH CHECK(private.require_member(true) IS NOT NULL);

CREATE FUNCTION api.admin_save_reference(p_kind text,p_values jsonb,p_id text DEFAULT NULL,p_expected jsonb DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE t text; allowed text[]; k text; previous jsonb; data jsonb; rid text; cols text; vals text; sets text; result jsonb; duplicate_name boolean;
BEGIN
 PERFORM private.require_member(true); PERFORM private.catalog_write_lock();
 CASE p_kind
  WHEN 'series' THEN t:='product_series'; allowed:=ARRAY['name','code','series_type','description','sort_order','is_active'];
  WHEN 'religions' THEN t:='religions'; allowed:=ARRAY['name','code','is_active'];
  WHEN 'notices' THEN t:='catalog_notices'; allowed:=ARRAY['content','is_active','sort_order'];
  ELSE RAISE EXCEPTION '无效字典' USING ERRCODE='22023';
 END CASE;
 IF jsonb_typeof(p_values) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION '无效资料' USING ERRCODE='22023'; END IF;
 FOR k IN SELECT jsonb_object_keys(p_values) LOOP
  IF NOT k=ANY(allowed) THEN RAISE EXCEPTION '不允许的字典字段: %',k USING ERRCODE='22023'; END IF;
 END LOOP;
 IF p_id IS NOT NULL THEN
  EXECUTE format('SELECT to_jsonb(x) FROM private.%I x WHERE id::text=$1 FOR UPDATE',t) INTO previous USING p_id;
  IF previous IS NULL THEN RAISE EXCEPTION '资料不存在' USING ERRCODE='P0002'; END IF;
  IF previous IS DISTINCT FROM p_expected THEN RAISE EXCEPTION '资料已被修改，请重新载入' USING ERRCODE='PT409'; END IF;
  rid:=p_id;
 ELSE
  IF p_kind='religions' THEN SELECT (coalesce(max(id),0)+1)::text INTO rid FROM private.religions;
  ELSE rid:=gen_random_uuid()::text; END IF;
 END IF;
 data:=coalesce(previous,'{}'::jsonb)||p_values||jsonb_build_object('id',rid);
 IF p_kind<>'notices' THEN
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM private.%I WHERE lower(btrim(name))=lower(btrim($1)) AND id::text<>$2)',t)
   INTO duplicate_name USING data->>'name',rid;
  IF duplicate_name THEN RAISE EXCEPTION '名称已存在，请选择已有资料' USING ERRCODE='23505'; END IF;
 END IF;
 SELECT string_agg(format('%I',key),','),string_agg(format('r.%I',key),','),
   string_agg(format('%I=EXCLUDED.%I',key,key),',') FILTER(WHERE key<>'id')
 INTO cols,vals,sets FROM jsonb_object_keys(p_values||jsonb_build_object('id',rid)) x(key);
 EXECUTE format('INSERT INTO private.%I(%s) SELECT %s FROM jsonb_populate_record(NULL::private.%I,$1) r
  ON CONFLICT(id) DO UPDATE SET %s RETURNING to_jsonb(%I.*)',t,cols,vals,t,sets,t) INTO result USING data;
 SET CONSTRAINTS ALL IMMEDIATE;
 RETURN result;
END $$;

CREATE FUNCTION api.admin_copy_product(p_source uuid,p_expected_updated_at timestamptz,p_target uuid,p_images jsonb DEFAULT '[]'::jsonb) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE source private.products%ROWTYPE; rowj jsonb; rowid uuid; map jsonb:='{}'; oldid text; t text; target_data jsonb; imagej jsonb;
BEGIN
 PERFORM private.require_member(false); PERFORM private.catalog_write_lock();
 SELECT * INTO source FROM private.products WHERE id=p_source FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION '源产品不存在' USING ERRCODE='P0002'; END IF;
 IF source.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION '源产品已变更，请重新载入后复制' USING ERRCODE='PT409'; END IF;
 IF p_target IS NULL OR EXISTS(SELECT 1 FROM private.products WHERE id=p_target) THEN RAISE EXCEPTION '目标编号不可复用' USING ERRCODE='23514'; END IF;
 IF jsonb_typeof(p_images) IS DISTINCT FROM 'array' OR jsonb_array_length(p_images)<>(SELECT count(*) FROM private.product_images WHERE product_id=p_source)
  OR (SELECT count(DISTINCT x->>'source_id') FROM jsonb_array_elements(p_images) x)<>jsonb_array_length(p_images) THEN
  RAISE EXCEPTION '图片副本不完整' USING ERRCODE='23514'; END IF;
 SET CONSTRAINTS ALL DEFERRED;
 target_data:=to_jsonb(source)-ARRAY['id','created_at','updated_at','updated_by','price_display_mode','product_code','internal_notes','source_reference'];
 target_data:=target_data||jsonb_build_object('id',p_target,'slug',p_target::text,'name',coalesce(source.name,'未命名')||'（副本）',
  'publication_status','draft','sort_order',(SELECT coalesce(max(sort_order)+1,0) FROM private.products WHERE category_id=source.category_id));
 IF source.series_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM private.product_series WHERE id=source.series_id AND is_active) THEN
   target_data:=target_data||jsonb_build_object('series_id',NULL); END IF;
 PERFORM private.apply_row('products',target_data);
 FOREACH t IN ARRAY ARRAY['burial_details','niche_details','funeral_details','tablet_details','fengshui_details','pet_details','product_religions','product_offers','product_inclusions','product_images'] LOOP
  FOR rowj IN EXECUTE format('SELECT to_jsonb(x) FROM private.%I x WHERE product_id=$1 ORDER BY to_jsonb(x)->>''id''',t) USING p_source LOOP
   oldid:=rowj->>'id'; rowid:=gen_random_uuid();
   rowj:=rowj||jsonb_build_object('product_id',p_target);
   IF oldid IS NOT NULL THEN rowj:=rowj||jsonb_build_object('id',rowid); END IF;
   IF t IN ('product_religions','product_images') THEN rowj:=rowj||jsonb_build_object('is_published',false); END IF;
   IF t='product_offers' THEN map:=map||jsonb_build_object(oldid,rowid); END IF;
   IF t='product_inclusions' AND rowj->>'offer_id' IS NOT NULL THEN rowj:=rowj||jsonb_build_object('offer_id',map->>(rowj->>'offer_id')); END IF;
   IF t='product_images' THEN
    SELECT x INTO imagej FROM jsonb_array_elements(p_images) x WHERE x->>'source_id'=oldid;
    IF imagej IS NULL OR imagej->>'bucket' IS DISTINCT FROM rowj->>'storage_bucket'
      OR imagej->>'bucket' NOT IN ('catalog-media-private','catalog-media-restricted')
      OR private.media_product_id(imagej->>'path') IS DISTINCT FROM p_target
      OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=imagej->>'bucket' AND name=imagej->>'path') THEN
      RAISE EXCEPTION '图片副本尚未就绪或归属不符' USING ERRCODE='23514'; END IF;
    rowj:=rowj||jsonb_build_object('storage_bucket',imagej->>'bucket','storage_path',imagej->>'path');
   END IF;
   PERFORM private.apply_row(t,rowj);
  END LOOP;
 END LOOP;
 FOR rowj IN SELECT to_jsonb(pr)-'updated_at' FROM private.offer_prices pr JOIN private.product_offers o ON o.id=pr.offer_id WHERE o.product_id=p_source LOOP
  rowj:=rowj||jsonb_build_object('id',gen_random_uuid(),'offer_id',map->>(rowj->>'offer_id'),'is_published',false);
  PERFORM private.apply_row('offer_prices',rowj);
 END LOOP;
 PERFORM private.assert_product(p_target); SET CONSTRAINTS ALL IMMEDIATE;
 RETURN api.admin_product(p_target);
END $$;

-- Audit and storage lookups require trusted helpers; the writer still cannot alter logs.
CREATE FUNCTION private.admin_audit_page(p_page integer) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.require_member(true);
 IF p_page IS NULL OR p_page<1 OR p_page>100000 THEN RAISE EXCEPTION '无效页码' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('total',(SELECT count(*) FROM private.audit_logs),'items',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM
  (SELECT id,actor_user_id,table_name,record_id,action,created_at,old_data,new_data FROM private.audit_logs
   ORDER BY created_at DESC,id LIMIT 30 OFFSET (p_page-1)*30) x),'[]'::jsonb));
END $$;
CREATE FUNCTION api.admin_audit_logs(p_page integer DEFAULT 1) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$ SELECT private.admin_audit_page(p_page) $$;
CREATE FUNCTION api.admin_cleanup_candidates(p_bucket text,p_paths text[]) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE member_role text;
BEGIN
 member_role:=private.require_member(false);
 IF p_bucket NOT IN ('catalog-media-private','catalog-media-restricted') OR cardinality(p_paths)>1000 THEN
  RAISE EXCEPTION '无效清理范围' USING ERRCODE='22023'; END IF;
 RETURN coalesce((SELECT jsonb_agg(path) FROM unnest(p_paths) path
  WHERE private.media_product_id(path) IS NOT NULL
   AND (member_role='admin' OR NOT EXISTS(SELECT 1 FROM private.products WHERE id=private.media_product_id(path))
     OR EXISTS(SELECT 1 FROM private.products WHERE id=private.media_product_id(path)
       AND publication_status='draft' AND NOT private.was_published(id)))
   AND NOT EXISTS(SELECT 1 FROM private.product_images WHERE storage_bucket=p_bucket AND storage_path=path)),'[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION private.admin_audit_page(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.admin_audit_page(integer),private.media_product_id(text) TO fg_catalog_writer;
-- File readiness is checked through a minimal helper rather than broad Storage grants.
CREATE FUNCTION private.copied_media_ready(p_bucket text,p_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=p_bucket AND name=p_path)
$$;
REVOKE ALL ON FUNCTION private.copied_media_ready(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.copied_media_ready(text,text) TO fg_catalog_writer;
DO $patch$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('api.admin_copy_product(uuid,timestamptz,uuid,jsonb)'::regprocedure) INTO definition;
 EXECUTE replace(definition,'EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=imagej->>''bucket'' AND name=imagej->>''path'')',
  'private.copied_media_ready(imagej->>''bucket'',imagej->>''path'')');
END $patch$;
GRANT CREATE ON SCHEMA api TO fg_catalog_writer;
DO $$ DECLARE signature regprocedure; BEGIN
 FOR signature IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='api' AND p.proname IN ('admin_reference_data','admin_product_list','admin_category_order','admin_reorder_products',
   'admin_save_reference','admin_copy_product','admin_audit_logs','admin_cleanup_candidates') LOOP
  EXECUTE format('ALTER FUNCTION %s OWNER TO fg_catalog_writer',signature);
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',signature);
 END LOOP;
END $$;
REVOKE CREATE ON SCHEMA api FROM fg_catalog_writer;
-- Serialize media cleanup with reference changes, including privileged Storage
-- operations. Neither a stale cleanup result nor service_role can delete a live file.
CREATE FUNCTION private.guard_catalog_media_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF OLD.bucket_id IN ('catalog-media-private','catalog-media-restricted') THEN
  PERFORM private.catalog_write_lock();
  IF EXISTS(SELECT 1 FROM private.product_images WHERE storage_bucket=OLD.bucket_id AND storage_path=OLD.name) THEN
   RAISE EXCEPTION '文件仍被产品引用，不能删除' USING ERRCODE='23503'; END IF;
 END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER catalog_media_delete_guard BEFORE DELETE ON storage.objects
 FOR EACH ROW EXECUTE FUNCTION private.guard_catalog_media_delete();
CREATE FUNCTION private.guard_catalog_media_ready() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.catalog_write_lock();
 IF NEW.storage_bucket IN ('catalog-media-private','catalog-media-restricted')
  AND NOT private.copied_media_ready(NEW.storage_bucket,NEW.storage_path) THEN
   RAISE EXCEPTION '图片文件尚未上传或已清理，请重新上传' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER zz_catalog_media_ready BEFORE INSERT OR UPDATE ON private.product_images
 FOR EACH ROW EXECUTE FUNCTION private.guard_catalog_media_ready();
REVOKE ALL ON FUNCTION private.guard_catalog_media_delete(),private.guard_catalog_media_ready() FROM PUBLIC,anon,authenticated;
-- End media fences.
NOTIFY pgrst,'reload schema';
COMMIT;
