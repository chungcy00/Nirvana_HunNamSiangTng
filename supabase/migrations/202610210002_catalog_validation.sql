-- migration 2/3 · database invariants, audit, optimistic locking
BEGIN;

-- Catalog edits are infrequent. A single transaction-scoped catalog lock deliberately
-- serializes writes, including dictionary deactivation; readers remain nonblocking.
-- This avoids cross-product/dictionary write skew without relying on client ordering.
CREATE FUNCTION private.catalog_write_lock() RETURNS void
LANGUAGE sql VOLATILE SET search_path='' AS $$
  SELECT pg_catalog.pg_advisory_xact_lock(17261021,18)
$$;

CREATE FUNCTION private.product_mode(p_id uuid,p_category smallint) RETURNS text
LANGUAGE sql VOLATILE SET search_path='' AS $$
  SELECT CASE p_category WHEN 3 THEN 'starting_from' WHEN 4 THEN 'funeral_dual'
    ELSE CASE WHEN (SELECT count(*) FROM private.product_offers
                    WHERE product_id=p_id AND is_active)>1 THEN 'multiple' ELSE 'fixed' END END
$$;

CREATE FUNCTION private.before_product() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid;
BEGIN
  PERFORM private.catalog_write_lock();
  IF TG_OP='DELETE' THEN
    IF OLD.publication_status <> 'draft' OR EXISTS (
      SELECT 1 FROM private.audit_logs WHERE table_name='products'
      AND record_id=OLD.id::text AND action='PUBLISH') THEN
      RAISE EXCEPTION '曾发布产品只能隐藏，不能物理删除' USING ERRCODE='23514';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP='UPDATE' AND NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION '产品编号不可变更' USING ERRCODE='23514';
  END IF;
  IF TG_OP='INSERT' OR NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    PERFORM 1 FROM private.product_categories WHERE id=NEW.category_id AND is_active;
    IF NOT FOUND THEN RAISE EXCEPTION '请选择启用的产品类别' USING ERRCODE='23514'; END IF;
  END IF;
  IF NEW.series_id IS NOT NULL AND (TG_OP='INSERT' OR NEW.series_id IS DISTINCT FROM OLD.series_id) THEN
    PERFORM 1 FROM private.product_series WHERE id=NEW.series_id AND is_active;
    IF NOT FOUND THEN RAISE EXCEPTION '不能新增关联至停用或不存在的系列' USING ERRCODE='23514'; END IF;
  END IF;
  IF TG_OP='UPDATE' AND NEW.publication_status='draft' AND OLD.publication_status<>'draft' THEN
    RAISE EXCEPTION '正式产品不能改回草稿；请使用隐藏' USING ERRCODE='23514';
  END IF;
  IF NEW.category_id NOT IN (1,2) THEN NEW.product_form:='other'; END IF;
  NEW.price_display_mode:=private.product_mode(NEW.id,NEW.category_id);
  SELECT id INTO actor FROM auth.users WHERE id=auth.uid();
  NEW.updated_by:=actor;
  IF TG_OP='UPDATE' THEN
    NEW.created_at:=OLD.created_at;
    NEW.updated_at:=greatest(clock_timestamp(),OLD.updated_at+interval '1 microsecond');
  ELSE
    NEW.created_at:=clock_timestamp(); NEW.updated_at:=NEW.created_at;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER before_product BEFORE INSERT OR UPDATE OR DELETE ON private.products
FOR EACH ROW EXECUTE FUNCTION private.before_product();

CREATE FUNCTION private.before_child() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb; oldv jsonb; pid uuid;
BEGIN
  PERFORM private.catalog_write_lock();
  v:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  IF TG_OP='UPDATE' THEN
    oldv:=to_jsonb(OLD);
    IF (v->>'id') IS DISTINCT FROM (oldv->>'id')
       OR (v->>'product_id') IS DISTINCT FROM (oldv->>'product_id')
       OR (TG_TABLE_NAME='offer_prices' AND
          ((v->>'offer_id') IS DISTINCT FROM (oldv->>'offer_id') OR
           (v->>'price_type') IS DISTINCT FROM (oldv->>'price_type')))
       OR (TG_TABLE_NAME='product_religions' AND
           (v->>'religion_id') IS DISTINCT FROM (oldv->>'religion_id')) THEN
      RAISE EXCEPTION '子记录编号与归属不可原地变更，请删除后重建关联' USING ERRCODE='23514';
    END IF;
  END IF;
  IF TG_TABLE_NAME='offer_prices' THEN
    SELECT product_id INTO pid FROM private.product_offers WHERE id=(v->>'offer_id')::uuid;
    IF TG_OP<>'DELETE' THEN NEW.updated_at:=clock_timestamp(); END IF;
  ELSE pid:=(v->>'product_id')::uuid;
  END IF;
  PERFORM 1 FROM private.products WHERE id=pid FOR UPDATE;
  IF TG_TABLE_NAME='product_images' AND TG_OP<>'DELETE' THEN
    NEW.design_name:=nullif(btrim(NEW.design_name),'');
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION private.after_child() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb; pid uuid;
BEGIN
  v:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  IF TG_TABLE_NAME='offer_prices' THEN
    SELECT product_id INTO pid FROM private.product_offers WHERE id=(v->>'offer_id')::uuid;
  ELSE pid:=(v->>'product_id')::uuid;
  END IF;
  -- Recompute mode after the offer row has changed, not before the row is visible.
  UPDATE private.products SET updated_at=updated_at WHERE id=pid;
  RETURN NULL;
END $$;

CREATE FUNCTION private.assert_product(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p private.products%ROWTYPE; n integer; primary_count integer;
BEGIN
  SELECT * INTO p FROM private.products WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF; -- deleted draft; FK constraints check children
  IF p.price_display_mode<>private.product_mode(p.id,p.category_id) THEN
    RAISE EXCEPTION '价格显示模式不匹配' USING ERRCODE='23514';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (
      SELECT product_id,category_id=ANY(ARRAY[1,2]::smallint[]) AS valid FROM private.burial_details CROSS JOIN (SELECT p.category_id) c
      UNION ALL SELECT product_id,p.category_id=3 FROM private.niche_details
      UNION ALL SELECT product_id,p.category_id=4 FROM private.funeral_details
      UNION ALL SELECT product_id,p.category_id=5 FROM private.tablet_details
      UNION ALL SELECT product_id,p.category_id=6 FROM private.fengshui_details
      UNION ALL SELECT product_id,p.category_id=7 FROM private.pet_details
    ) x WHERE x.product_id=p.id AND NOT valid) THEN
    RAISE EXCEPTION '专属资料表与产品类别不符' USING ERRCODE='23514';
  END IF;
  IF p.category_id=2 AND EXISTS (SELECT 1 FROM private.burial_details
    WHERE product_id=p.id AND (urn_capacity IS NOT NULL OR cremation_count IS NOT NULL)) THEN
    RAISE EXCEPTION '传统土葬不能填写火化次数或骨灰瓮容量' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM private.offer_prices pr JOIN private.product_offers o ON o.id=pr.offer_id
     WHERE o.product_id=p.id AND ((p.category_id=4 AND pr.price_type='standard') OR
                                  (p.category_id<>4 AND pr.price_type<>'standard'))) THEN
    RAISE EXCEPTION '价格类型不适用于此产品类别' USING ERRCODE='23514';
  END IF;
  IF p.category_id IN (3,4) AND (
    (SELECT count(*) FROM private.product_offers WHERE product_id=p.id)>1 OR
    EXISTS (SELECT 1 FROM private.product_offers WHERE product_id=p.id AND
      (offer_code<>'default' OR religion_id IS NOT NULL OR position_type IS NOT NULL
       OR facing_override IS NOT NULL OR area_sqft_override IS NOT NULL))) THEN
    RAISE EXCEPTION '骨灰位／殡仪服务仅使用一个共通默认方案，无位置或面积分价' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM private.product_inclusions i JOIN private.product_offers o ON o.id=i.offer_id
    WHERE i.product_id=p.id AND o.religion_id IS NOT NULL
      AND i.religion_id IS DISTINCT FROM o.religion_id) THEN
    RAISE EXCEPTION '方案专属项目的宗教必须与方案一致' USING ERRCODE='23514';
  END IF;
  -- Draft files must be private. Previously approved public images may remain on hidden products.
  IF p.publication_status='draft' AND EXISTS (
    SELECT 1 FROM private.product_images i JOIN storage.buckets b ON b.id=i.storage_bucket
    WHERE i.product_id=p.id AND b.public) THEN
    RAISE EXCEPTION '草稿图片必须保存在私有空间' USING ERRCODE='23514';
  END IF;
  IF p.publication_status<>'published' THEN RETURN; END IF;
  IF nullif(btrim(p.name),'') IS NULL OR NOT EXISTS (
    SELECT 1 FROM private.product_categories WHERE id=p.category_id AND is_active) THEN
    RAISE EXCEPTION '发布需要产品名称及启用类别' USING ERRCODE='23514';
  END IF;
  IF p.category_id IN (1,2,3) AND p.capacity_group IS NULL THEN
    RAISE EXCEPTION '发布该类别前须填写人数类别' USING ERRCODE='23514';
  END IF;
  IF p.category_id IN (1,2) AND p.product_form IS NULL THEN
    RAISE EXCEPTION '发布墓地产品前须选择地段、配套或其他' USING ERRCODE='23514';
  END IF;
  IF p.category_id IN (1,2,3,4) AND NOT EXISTS (
    SELECT 1 FROM private.product_religions r JOIN private.religions d ON d.id=r.religion_id
    WHERE r.product_id=p.id AND r.is_published AND d.is_active) THEN
    RAISE EXCEPTION '此四类产品发布至少需要一项启用且公开的宗教配置' USING ERRCODE='23514';
  END IF;
  SELECT count(*) INTO primary_count FROM private.product_images
    WHERE product_id=p.id AND is_primary AND is_published AND religion_id IS NULL;
  IF primary_count<>1 THEN
    RAISE EXCEPTION '发布必须恰有一张共通公开主图' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM private.product_images i WHERE i.product_id=p.id AND i.is_published
    AND NOT EXISTS (SELECT 1 FROM storage.objects s WHERE s.bucket_id=i.storage_bucket AND s.name=i.storage_path)) THEN
    RAISE EXCEPTION '公开图片在 Storage 中不存在或尚未就绪' USING ERRCODE='23514';
  END IF;
  SELECT count(*) INTO n FROM private.product_offers WHERE product_id=p.id AND is_active;
  IF n=0 THEN RAISE EXCEPTION '发布需要有效价格方案' USING ERRCODE='23514'; END IF;
  IF p.category_id IN (3,4) AND n<>1 THEN
    RAISE EXCEPTION '该类别只允许一个默认方案' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM private.product_offers o WHERE o.product_id=p.id AND o.is_active
    AND (o.religion_id IS NULL OR EXISTS (
      SELECT 1 FROM private.product_religions r JOIN private.religions d ON d.id=r.religion_id
      WHERE r.product_id=p.id AND r.religion_id=o.religion_id AND r.is_published AND d.is_active))
    AND (SELECT count(*) FROM private.offer_prices pr WHERE pr.offer_id=o.id AND pr.is_published
      AND pr.price_type=ANY(CASE WHEN p.category_id=4 THEN ARRAY['pre_need','at_need']
                                                  ELSE ARRAY['standard'] END))
      <>CASE WHEN p.category_id=4 THEN 2 ELSE 1 END) THEN
    RAISE EXCEPTION '公开方案缺少有效公开售价（殡仪须两种价格）' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.product_offers o WHERE o.product_id=p.id AND o.is_active
    AND (o.religion_id IS NULL OR EXISTS (
      SELECT 1 FROM private.product_religions r JOIN private.religions d ON d.id=r.religion_id
      WHERE r.product_id=p.id AND r.religion_id=o.religion_id AND r.is_published AND d.is_active))) THEN
    RAISE EXCEPTION '发布至少需要一个可公开方案' USING ERRCODE='23514';
  END IF;
END $$;

CREATE FUNCTION private.check_product_deferred() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v jsonb; pid uuid;
BEGIN
  v:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  IF TG_TABLE_NAME='products' THEN pid:=(v->>'id')::uuid;
  ELSIF TG_TABLE_NAME='offer_prices' THEN
    SELECT product_id INTO pid FROM private.product_offers WHERE id=(v->>'offer_id')::uuid;
  ELSE pid:=(v->>'product_id')::uuid;
  END IF;
  PERFORM private.assert_product(pid);
  RETURN NULL;
END $$;

CREATE FUNCTION private.dictionary_before() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM private.catalog_write_lock();
  IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.code IS DISTINCT FROM OLD.code) THEN
    RAISE EXCEPTION '字典编号与代码不可原地修改' USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' THEN
    IF TG_TABLE_NAME='product_categories' THEN
      PERFORM 1 FROM private.products WHERE category_id=OLD.id ORDER BY id FOR UPDATE;
    ELSE
      PERFORM 1 FROM private.products WHERE id IN (
        SELECT product_id FROM private.product_religions WHERE religion_id=OLD.id) ORDER BY id FOR UPDATE;
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE FUNCTION private.dictionary_check() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid;
BEGIN
  IF TG_TABLE_NAME='product_categories' THEN
    FOR pid IN SELECT id FROM private.products WHERE category_id=NEW.id ORDER BY id LOOP
      PERFORM private.assert_product(pid);
    END LOOP;
  ELSE
    FOR pid IN SELECT product_id FROM private.product_religions WHERE religion_id=NEW.id ORDER BY product_id LOOP
      PERFORM private.assert_product(pid);
    END LOOP;
  END IF;
  RETURN NULL;
END $$;

CREATE FUNCTION private.record_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a text:=TG_OP; v jsonb; o jsonb;
BEGIN
  IF TG_OP<>'DELETE' THEN v:=to_jsonb(NEW); END IF;
  IF TG_OP<>'INSERT' THEN o:=to_jsonb(OLD); END IF;
  IF TG_TABLE_NAME='products' THEN
    IF v->>'publication_status'='published' AND (o->>'publication_status') IS DISTINCT FROM 'published' THEN a:='PUBLISH';
    ELSIF v->>'publication_status'='hidden' AND (o->>'publication_status') IS DISTINCT FROM 'hidden' THEN a:='HIDE'; END IF;
  END IF;
  INSERT INTO private.audit_logs(actor_user_id,table_name,record_id,action,old_data,new_data)
  VALUES ((SELECT id FROM auth.users WHERE id=auth.uid()),TG_TABLE_NAME,
    coalesce(v->>'id',o->>'id',v->>'product_id',o->>'product_id',v->>'user_id',o->>'user_id'),a,o,v);
  RETURN NULL;
END $$;

CREATE FUNCTION private.touch_misc() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  PERFORM private.catalog_write_lock();
  IF TG_OP<>'DELETE' AND TG_TABLE_NAME IN ('catalog_notices','admin_members') THEN
    NEW.updated_at:=clock_timestamp();
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['burial_details','niche_details','funeral_details','tablet_details',
    'fengshui_details','pet_details','product_religions','product_offers','offer_prices',
    'product_inclusions','product_images'] LOOP
    EXECUTE format('CREATE TRIGGER child_before BEFORE INSERT OR UPDATE OR DELETE ON private.%I FOR EACH ROW EXECUTE FUNCTION private.before_child()',t);
    EXECUTE format('CREATE TRIGGER child_after AFTER INSERT OR UPDATE OR DELETE ON private.%I FOR EACH ROW EXECUTE FUNCTION private.after_child()',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['products','burial_details','niche_details','funeral_details','tablet_details',
    'fengshui_details','pet_details','product_religions','product_offers','offer_prices','product_inclusions','product_images'] LOOP
    EXECUTE format('CREATE CONSTRAINT TRIGGER product_final_check AFTER INSERT OR UPDATE OR DELETE ON private.%I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.check_product_deferred()',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['product_categories','religions'] LOOP
    EXECUTE format('CREATE TRIGGER dictionary_before BEFORE INSERT OR UPDATE OR DELETE ON private.%I FOR EACH ROW EXECUTE FUNCTION private.dictionary_before()',t);
    EXECUTE format('CREATE CONSTRAINT TRIGGER dictionary_final_check AFTER UPDATE ON private.%I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.dictionary_check()',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['product_series','catalog_notices','admin_members'] LOOP
    EXECUTE format('CREATE TRIGGER misc_before BEFORE INSERT OR UPDATE OR DELETE ON private.%I FOR EACH ROW EXECUTE FUNCTION private.touch_misc()',t);
  END LOOP;
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='private' AND tablename<>'audit_logs' LOOP
    EXECUTE format('CREATE TRIGGER audit_after AFTER INSERT OR UPDATE OR DELETE ON private.%I FOR EACH ROW EXECUTE FUNCTION private.record_audit()',t);
  END LOOP;
END $$;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC,anon,authenticated;
COMMIT;
