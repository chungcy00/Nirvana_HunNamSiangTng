-- User approved: funeral services may publish without photos. No product DML.
BEGIN;
DO $guard$
BEGIN
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid='private.assert_product(uuid)'::regprocedure)
      <> '0ba426efe1f66be5cd3e5ade5a8d5237' THEN
    RAISE EXCEPTION 'Publication validation baseline changed; review before applying';
  END IF;
END $guard$;
CREATE OR REPLACE FUNCTION private.assert_product(p_id uuid) RETURNS void
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
  IF p.category_id=3 AND NOT EXISTS (
    SELECT 1 FROM private.niche_details d WHERE d.product_id=p.id
      AND d.placement_type IN ('indoor','outdoor')) THEN
    RAISE EXCEPTION '骨灰位发布前须选择安放环境（室内或室外）' USING ERRCODE='23514';
  END IF;
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
  IF (p.category_id<>4 AND primary_count<>1) OR primary_count>1 THEN
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

-- CREATE OR REPLACE preserves the existing owner, ACL and security boundary.
NOTIFY pgrst, 'reload schema';
COMMIT;
