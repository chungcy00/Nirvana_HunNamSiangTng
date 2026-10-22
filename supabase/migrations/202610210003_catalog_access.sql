-- migration 3/3 · default-deny RLS + constrained read/write RPCs
BEGIN;
CREATE ROLE fg_catalog_reader NOLOGIN NOINHERIT NOBYPASSRLS;
CREATE ROLE fg_catalog_writer NOLOGIN NOINHERIT NOBYPASSRLS;
DO $$ BEGIN
  EXECUTE format('GRANT fg_catalog_reader,fg_catalog_writer TO %I',current_user);
END $$;
GRANT USAGE ON SCHEMA private,api TO fg_catalog_reader,fg_catalog_writer;
-- Required for ALTER FUNCTION OWNER on a non-superuser Supabase migration role;
-- revoked after ownership is assigned.
GRANT CREATE ON SCHEMA api TO fg_catalog_reader,fg_catalog_writer;
GRANT USAGE ON SCHEMA auth TO fg_catalog_writer;
GRANT EXECUTE ON FUNCTION auth.uid() TO fg_catalog_writer;
GRANT USAGE ON SCHEMA api TO anon,authenticated;

CREATE FUNCTION private.public_product(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (SELECT 1 FROM private.products p JOIN private.product_categories c ON c.id=p.category_id
    WHERE p.id=p_id AND p.publication_status='published' AND c.is_active)
$$;
CREATE FUNCTION private.public_religion(p_id uuid,p_religion smallint) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT p_religion IS NULL OR EXISTS (
    SELECT 1 FROM private.product_religions r JOIN private.religions d ON d.id=r.religion_id
    WHERE r.product_id=p_id AND r.religion_id=p_religion AND r.is_published AND d.is_active)
$$;
CREATE FUNCTION private.require_member(p_admin boolean DEFAULT false) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r text;
BEGIN
  SELECT role INTO r FROM private.admin_members WHERE user_id=auth.uid() AND is_active;
  IF r IS NULL OR (p_admin AND r<>'admin') THEN
    RAISE EXCEPTION '无有效后台权限或操作超出角色权限' USING ERRCODE='42501';
  END IF;
  RETURN r;
END $$;
CREATE FUNCTION private.was_published(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (SELECT 1 FROM private.audit_logs WHERE table_name='products'
                 AND record_id=p_id::text AND action='PUBLISH')
$$;

GRANT SELECT ON private.product_categories,private.product_series,private.religions,
  private.burial_details,private.niche_details,private.funeral_details,private.tablet_details,
  private.fengshui_details,private.pet_details,private.product_religions,private.product_offers,
  private.offer_prices,private.product_inclusions,private.product_images,private.catalog_notices TO fg_catalog_reader;
-- Internal product columns are not granted even to the public RPC executor.
GRANT SELECT(id,category_id,series_id,name,slug,capacity_group,capacity_count,subtitle,description,
  price_display_mode,price_note_override,publication_status,sort_order) ON private.products TO fg_catalog_reader;
CREATE POLICY reader_categories ON private.product_categories FOR SELECT TO fg_catalog_reader USING (is_active);
CREATE POLICY reader_series ON private.product_series FOR SELECT TO fg_catalog_reader USING (true);
CREATE POLICY reader_religions ON private.religions FOR SELECT TO fg_catalog_reader USING (is_active);
CREATE POLICY reader_products ON private.products FOR SELECT TO fg_catalog_reader USING (private.public_product(id));
CREATE POLICY reader_product_religions ON private.product_religions FOR SELECT TO fg_catalog_reader
  USING (private.public_product(product_id) AND is_published AND private.public_religion(product_id,religion_id));
CREATE POLICY reader_offers ON private.product_offers FOR SELECT TO fg_catalog_reader
  USING (private.public_product(product_id) AND is_active AND private.public_religion(product_id,religion_id));
CREATE POLICY reader_prices ON private.offer_prices FOR SELECT TO fg_catalog_reader
  USING (is_published AND EXISTS (SELECT 1 FROM private.product_offers o JOIN private.products p ON p.id=o.product_id
    WHERE o.id=offer_id AND ((p.category_id=4 AND price_type IN ('pre_need','at_need'))
      OR (p.category_id<>4 AND price_type='standard'))));
CREATE POLICY reader_images ON private.product_images FOR SELECT TO fg_catalog_reader
  USING (private.public_product(product_id) AND is_published AND private.public_religion(product_id,religion_id));
CREATE POLICY reader_inclusions ON private.product_inclusions FOR SELECT TO fg_catalog_reader
  USING (private.public_product(product_id) AND private.public_religion(product_id,religion_id)
    AND (offer_id IS NULL OR EXISTS (SELECT 1 FROM private.product_offers o WHERE o.id=offer_id)));
CREATE POLICY reader_notices ON private.catalog_notices FOR SELECT TO fg_catalog_reader USING (is_active);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['burial_details','niche_details','funeral_details','tablet_details','fengshui_details','pet_details'] LOOP
    EXECUTE format('CREATE POLICY reader_details ON private.%I FOR SELECT TO fg_catalog_reader USING (private.public_product(product_id))',t);
  END LOOP;
  -- The writer role is NOLOGIN and never granted to web roles. It can only be entered
  -- through the separately checked SECURITY DEFINER RPCs below.
  FOREACH t IN ARRAY ARRAY['product_categories','product_series','products','burial_details','niche_details',
    'funeral_details','tablet_details','fengshui_details','pet_details','religions','product_religions',
    'product_offers','offer_prices','product_inclusions','product_images','catalog_notices'] LOOP
    EXECUTE format('GRANT SELECT ON private.%I TO fg_catalog_writer',t);
    EXECUTE format('CREATE POLICY writer_read ON private.%I FOR SELECT TO fg_catalog_writer USING (private.require_member(false) IS NOT NULL)',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['products','burial_details','niche_details','funeral_details','tablet_details',
    'fengshui_details','pet_details','product_religions','product_offers','offer_prices','product_inclusions','product_images'] LOOP
    EXECUTE format('GRANT INSERT,UPDATE,DELETE ON private.%I TO fg_catalog_writer',t);
    EXECUTE format('CREATE POLICY writer_insert ON private.%I FOR INSERT TO fg_catalog_writer WITH CHECK (private.require_member(false) IS NOT NULL)',t);
    EXECUTE format('CREATE POLICY writer_update ON private.%I FOR UPDATE TO fg_catalog_writer USING (private.require_member(false) IS NOT NULL) WITH CHECK (private.require_member(false) IS NOT NULL)',t);
    EXECUTE format('CREATE POLICY writer_delete ON private.%I FOR DELETE TO fg_catalog_writer USING (private.require_member(false) IS NOT NULL)',t);
  END LOOP;
END $$;

-- Private helper: caller cannot choose arbitrary SQL identifiers; all tables and columns
-- are checked against a fixed catalog allowlist and PostgreSQL's own attribute metadata.
CREATE FUNCTION private.apply_row(p_table text,p_row jsonb) RETURNS uuid
LANGUAGE plpgsql VOLATILE SET search_path='' AS $$
DECLARE pk text; rid uuid; cols text; vals text; sets text; k text; found_row boolean;
BEGIN
  IF p_table<>ALL(ARRAY['products','burial_details','niche_details','funeral_details','tablet_details',
    'fengshui_details','pet_details','product_religions','product_offers','offer_prices','product_inclusions','product_images'])
    OR jsonb_typeof(p_row)<>'object' THEN RAISE EXCEPTION '无效表或记录' USING ERRCODE='22023'; END IF;
  pk:=CASE WHEN p_table LIKE '%\_details' ESCAPE '\' THEN 'product_id' ELSE 'id' END;
  rid:=coalesce((p_row->>pk)::uuid,gen_random_uuid());
  p_row:=p_row||jsonb_build_object(pk,rid);
  FOR k IN SELECT jsonb_object_keys(p_row) LOOP
    IF k=ANY(ARRAY['created_at','updated_at','updated_by','price_display_mode']) OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid=to_regclass('private.'||p_table)
      AND attname=k AND attnum>0 AND NOT attisdropped) THEN
      RAISE EXCEPTION '不允许写入字段: %.%',p_table,k USING ERRCODE='22023';
    END IF;
  END LOOP;
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM private.%I WHERE %I=$1)',p_table,pk) INTO found_row USING rid;
  IF found_row THEN
    SELECT string_agg(format('%I=r.%I',key,key),',' ORDER BY key) INTO sets
      FROM jsonb_object_keys(p_row) AS x(key) WHERE key<>pk;
    IF sets IS NOT NULL THEN
      EXECUTE format('UPDATE private.%I AS dst SET %s FROM jsonb_populate_record(NULL::private.%I,$1) r WHERE dst.%I=$2',
        p_table,sets,p_table,pk) USING p_row,rid;
    END IF;
    RETURN rid;
  END IF;
  SELECT string_agg(format('%I',key),',' ORDER BY key),
         string_agg(format('r.%I',key),',' ORDER BY key),
         string_agg(format('%I=EXCLUDED.%I',key,key),',' ORDER BY key) FILTER (WHERE key<>pk)
    INTO cols,vals,sets FROM jsonb_object_keys(p_row) AS x(key);
  IF sets IS NULL THEN sets:=format('%I=EXCLUDED.%I',pk,pk); END IF;
  EXECUTE format('INSERT INTO private.%I(%s) SELECT %s FROM jsonb_populate_record(NULL::private.%I,$1) r ON CONFLICT(%I) DO UPDATE SET %s',
                 p_table,cols,vals,p_table,pk,sets) USING p_row;
  RETURN rid;
END $$;

CREATE FUNCTION api.save_product(p_id uuid DEFAULT NULL,p_expected_updated_at timestamptz DEFAULT NULL,
  p_product jsonb DEFAULT '{}'::jsonb,p_changes jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid:=coalesce(p_id,gen_random_uuid()); r text; oldp private.products%ROWTYPE;
  t text; entry jsonb; rowj jsonb; pk text; rid uuid; ownerid uuid; k text;
BEGIN
  r:=private.require_member(false);
  PERFORM private.catalog_write_lock();
  IF jsonb_typeof(p_product)<>'object' OR jsonb_typeof(p_changes)<>'object' THEN
    RAISE EXCEPTION '产品与修改集必须为对象' USING ERRCODE='22023'; END IF;
  IF p_product ?| ARRAY['id','created_at','updated_at','updated_by','price_display_mode'] THEN
    RAISE EXCEPTION '编号、时间、操作人和价格显示模式由系统管理' USING ERRCODE='22023'; END IF;
  SELECT * INTO oldp FROM private.products WHERE id=pid FOR UPDATE;
  IF p_id IS NOT NULL AND NOT FOUND THEN RAISE EXCEPTION '产品不存在' USING ERRCODE='P0002'; END IF;
  IF p_id IS NOT NULL AND (p_expected_updated_at IS NULL OR p_expected_updated_at<>oldp.updated_at) THEN
    RAISE EXCEPTION '产品已被修改，请重新载入' USING ERRCODE='40001'; END IF;
  IF r<>'admin' AND ((p_id IS NOT NULL AND (oldp.publication_status<>'draft' OR private.was_published(pid)))
    OR coalesce(p_product->>'publication_status','draft')<>'draft') THEN
    RAISE EXCEPTION '编辑员仅能编辑从未发布的草稿' USING ERRCODE='42501'; END IF;
  PERFORM private.apply_row('products',p_product||jsonb_build_object('id',pid));
  -- Defer only within this atomic request; commit still verifies every FK.
  SET CONSTRAINTS ALL DEFERRED;
  FOR k IN SELECT jsonb_object_keys(p_changes) LOOP
    IF k<>ALL(ARRAY['burial_details','niche_details','funeral_details','tablet_details','fengshui_details',
      'pet_details','product_religions','product_offers','offer_prices','product_inclusions','product_images']) THEN
      RAISE EXCEPTION '未知修改表: %',k USING ERRCODE='22023'; END IF;
  END LOOP;
  FOREACH t IN ARRAY ARRAY['burial_details','niche_details','funeral_details','tablet_details','fengshui_details',
    'pet_details','product_religions','product_offers','offer_prices','product_inclusions','product_images'] LOOP
    entry:=p_changes->t;
    IF entry IS NULL THEN CONTINUE; END IF;
    IF jsonb_typeof(entry)<>'object' OR (entry ? 'upsert' AND jsonb_typeof(entry->'upsert')<>'array')
      OR (entry ? 'delete' AND jsonb_typeof(entry->'delete')<>'array') THEN
      RAISE EXCEPTION '修改集须包含 upsert/delete 数组' USING ERRCODE='22023'; END IF;
    FOR k IN SELECT jsonb_object_keys(entry) LOOP
      IF k NOT IN ('upsert','delete') THEN RAISE EXCEPTION '未知操作: %',k USING ERRCODE='22023'; END IF;
    END LOOP;
    pk:=CASE WHEN t LIKE '%\_details' ESCAPE '\' THEN 'product_id' ELSE 'id' END;
    FOR rowj IN SELECT value FROM jsonb_array_elements(coalesce(entry->'delete','[]'::jsonb)) LOOP
      rid:=(rowj#>>'{}')::uuid;
      IF t='offer_prices' THEN
        SELECT o.product_id INTO ownerid FROM private.offer_prices pr JOIN private.product_offers o ON o.id=pr.offer_id WHERE pr.id=rid;
      ELSE EXECUTE format('SELECT product_id FROM private.%I WHERE %I=$1',t,pk) INTO ownerid USING rid;
      END IF;
      IF ownerid IS NULL OR ownerid<>pid THEN RAISE EXCEPTION '删除记录不属于当前产品' USING ERRCODE='42501'; END IF;
      EXECUTE format('DELETE FROM private.%I WHERE %I=$1',t,pk) USING rid;
    END LOOP;
    FOR rowj IN SELECT value FROM jsonb_array_elements(coalesce(entry->'upsert','[]'::jsonb)) LOOP
      IF jsonb_typeof(rowj)<>'object' THEN RAISE EXCEPTION '子记录必须为对象' USING ERRCODE='22023'; END IF;
      IF t<>'offer_prices' THEN
        IF rowj ? 'product_id' AND (rowj->>'product_id')::uuid IS DISTINCT FROM pid THEN
          RAISE EXCEPTION '不能引用其他产品' USING ERRCODE='42501'; END IF;
        rowj:=rowj||jsonb_build_object('product_id',pid);
      END IF;
      rid:=coalesce((rowj->>pk)::uuid,gen_random_uuid());
      IF t='offer_prices' THEN
        IF rowj ? 'offer_id' THEN
          SELECT product_id INTO ownerid FROM private.product_offers WHERE id=(rowj->>'offer_id')::uuid;
          IF ownerid IS NULL OR ownerid<>pid THEN RAISE EXCEPTION '价格方案不属于当前产品' USING ERRCODE='42501'; END IF;
        END IF;
        SELECT o.product_id INTO ownerid FROM private.offer_prices pr JOIN private.product_offers o ON o.id=pr.offer_id WHERE pr.id=rid;
      ELSE EXECUTE format('SELECT product_id FROM private.%I WHERE %I=$1',t,pk) INTO ownerid USING rid;
      END IF;
      IF ownerid IS NOT NULL AND ownerid<>pid THEN RAISE EXCEPTION '子记录属于其他产品' USING ERRCODE='42501'; END IF;
      PERFORM private.apply_row(t,rowj||jsonb_build_object(pk,rid));
    END LOOP;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM private.product_offers WHERE product_id=pid) THEN
    INSERT INTO private.product_offers(product_id,offer_code,name) VALUES(pid,'default','默认方案');
  END IF;
  PERFORM private.assert_product(pid);
  RETURN (SELECT jsonb_build_object('id',id,'updated_at',updated_at,'publication_status',publication_status,
                                   'price_display_mode',price_display_mode) FROM private.products WHERE id=pid);
END $$;

CREATE FUNCTION api.admin_product(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; t text; items jsonb;
BEGIN
  PERFORM private.require_member(false);
  SELECT to_jsonb(p) INTO result FROM private.products p WHERE id=p_id;
  IF result IS NULL THEN RETURN NULL; END IF;
  result:=jsonb_build_object('product',result);
  FOREACH t IN ARRAY ARRAY['burial_details','niche_details','funeral_details','tablet_details','fengshui_details',
    'pet_details','product_religions','product_offers','product_inclusions','product_images'] LOOP
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x)),''[]''::jsonb) FROM private.%I x WHERE product_id=$1',t) INTO items USING p_id;
    result:=result||jsonb_build_object(t,items);
  END LOOP;
  SELECT coalesce(jsonb_agg(to_jsonb(pr)),'[]'::jsonb) INTO items FROM private.offer_prices pr
    JOIN private.product_offers o ON o.id=pr.offer_id WHERE o.product_id=p_id;
  RETURN result||jsonb_build_object('offer_prices',items);
END $$;
CREATE FUNCTION api.delete_draft(p_id uuid,p_expected_updated_at timestamptz) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path='' AS $$
DECLARE p private.products%ROWTYPE;
BEGIN
  PERFORM private.require_member(false); PERFORM private.catalog_write_lock();
  SELECT * INTO p FROM private.products WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '产品不存在' USING ERRCODE='P0002'; END IF;
  IF p_expected_updated_at IS NULL OR p_expected_updated_at<>p.updated_at THEN
    RAISE EXCEPTION '产品已被修改，请重新载入' USING ERRCODE='40001'; END IF;
  IF p.publication_status<>'draft' OR private.was_published(p_id) THEN
    RAISE EXCEPTION '只能删除从未发布的草稿' USING ERRCODE='23514'; END IF;
  SET CONSTRAINTS ALL DEFERRED;
  DELETE FROM private.products WHERE id=p_id;
END $$;

CREATE FUNCTION api.catalog_product_prices(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'offer_id',o.id,'offer_name',o.name,'religion_id',o.religion_id,
    'price_type',pr.price_type,'amount',pr.price_amount,'currency',pr.currency,
    'label',CASE WHEN p.category_id=3 THEN '最低价格' WHEN pr.price_type='pre_need' THEN '预购价格'
                WHEN pr.price_type='at_need' THEN '即用价格' ELSE '总价格' END,
    'starting_from',p.category_id=3,
    'price_note',coalesce(nullif(btrim(pr.price_note),''),nullif(btrim(p.price_note_override),''),
      (SELECT string_agg(n.content,E'\n' ORDER BY n.sort_order,n.content) FROM (
        SELECT content,min(sort_order) AS sort_order FROM private.catalog_notices WHERE is_active GROUP BY content) n))
    ) ORDER BY o.sort_order,o.id,pr.price_type),'[]'::jsonb)
  FROM private.products p JOIN private.product_offers o ON o.product_id=p.id
  JOIN private.offer_prices pr ON pr.offer_id=o.id WHERE p.id=p_id
$$;

CREATE FUNCTION api.catalog_product_list(p_category smallint DEFAULT NULL,p_capacity text DEFAULT NULL,
  p_religion smallint DEFAULT NULL) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(x.obj ORDER BY x.ord,x.pid),'[]'::jsonb) FROM (
    SELECT p.id AS pid,p.sort_order AS ord,jsonb_strip_nulls(jsonb_build_object(
      'id',p.id,'slug',p.slug,'name',p.name,'category_id',p.category_id,
      'capacity_group',p.capacity_group,'capacity_count',p.capacity_count,
      'primary_image',(SELECT jsonb_build_object('id',i.id,'bucket',i.storage_bucket,'path',i.storage_path,'alt',i.alt_text)
        FROM private.product_images i WHERE i.product_id=p.id AND i.is_primary),
      'religions',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',d.id,'name',d.name) ORDER BY d.id),'[]'::jsonb)
        FROM private.product_religions r JOIN private.religions d ON d.id=r.religion_id WHERE r.product_id=p.id),
      'prices',api.catalog_product_prices(p.id))) AS obj
    FROM private.products p WHERE (p_category IS NULL OR p.category_id=p_category)
      AND (p_capacity IS NULL OR (p.category_id IN (1,2,3) AND p.capacity_group=p_capacity))
      AND (p_religion IS NULL OR (p.category_id IN (1,2,3,4) AND EXISTS (
        SELECT 1 FROM private.product_religions r WHERE r.product_id=p.id AND r.religion_id=p_religion)))
  ) x
$$;

CREATE FUNCTION api.catalog_product_detail(p_slug text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE p record; result jsonb; attrs jsonb;
BEGIN
  SELECT id,slug,name,category_id,capacity_group,capacity_count,subtitle,description,price_display_mode
    INTO p FROM private.products WHERE slug=p_slug;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT obj INTO result FROM jsonb_array_elements(api.catalog_product_list(p.category_id)) AS x(obj)
    WHERE obj->>'id'=p.id::text;
  CASE p.category_id
    WHEN 1,2 THEN SELECT to_jsonb(d)-'product_id' INTO attrs FROM private.burial_details d WHERE product_id=p.id;
    WHEN 3 THEN SELECT to_jsonb(d)-'product_id' INTO attrs FROM private.niche_details d WHERE product_id=p.id;
    WHEN 4 THEN SELECT to_jsonb(d)-'product_id' INTO attrs FROM private.funeral_details d WHERE product_id=p.id;
    WHEN 5 THEN SELECT to_jsonb(d)-'product_id' INTO attrs FROM private.tablet_details d WHERE product_id=p.id;
    WHEN 6 THEN SELECT to_jsonb(d)-'product_id' INTO attrs FROM private.fengshui_details d WHERE product_id=p.id;
    WHEN 7 THEN SELECT to_jsonb(d)-'product_id' INTO attrs FROM private.pet_details d WHERE product_id=p.id;
  END CASE;
  RETURN jsonb_strip_nulls(result||jsonb_build_object('subtitle',p.subtitle,'description',p.description,
    'price_display_mode',p.price_display_mode,'attributes',attrs,
    'images',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'religion_id',i.religion_id,'bucket',i.storage_bucket,
      'path',i.storage_path,'alt',i.alt_text,'image_type',i.image_type,'design_name',i.design_name,'sort_order',i.sort_order)
      ORDER BY i.sort_order,i.id),'[]'::jsonb) FROM private.product_images i WHERE i.product_id=p.id),
    'inclusions',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'offer_id',i.offer_id,'religion_id',i.religion_id,
      'name',i.item_name,'quantity',i.quantity,'unit',i.unit,'description',i.description) ORDER BY i.sort_order,i.id),'[]'::jsonb)
      FROM private.product_inclusions i WHERE i.product_id=p.id)));
END $$;

-- Helpers remain inaccessible to web roles. Trigger functions execute under the
-- trusted migration owner; web RPCs use the limited non-owner executor roles.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.public_product(uuid),private.public_religion(uuid,smallint) TO fg_catalog_reader;
GRANT EXECUTE ON FUNCTION private.require_member(boolean),private.was_published(uuid),
  private.catalog_write_lock(),private.apply_row(text,jsonb),private.assert_product(uuid) TO fg_catalog_writer;
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='api'
    AND p.proname IN ('save_product','admin_product','delete_draft','catalog_product_prices','catalog_product_list','catalog_product_detail') LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO %I',f.sig,
      CASE WHEN f.proname LIKE 'catalog_%' THEN 'fg_catalog_reader' ELSE 'fg_catalog_writer' END);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.sig);
    IF f.proname LIKE 'catalog_%' THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon',f.sig); END IF;
  END LOOP;
END $$;
-- Prevent newly created helpers from silently acquiring PostgreSQL PUBLIC execute.
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC,anon,authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA api REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC,anon,authenticated;
REVOKE CREATE ON SCHEMA api FROM fg_catalog_reader,fg_catalog_writer;
NOTIFY pgrst,'reload schema';
COMMIT;
