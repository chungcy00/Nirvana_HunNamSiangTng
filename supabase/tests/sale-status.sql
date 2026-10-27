-- Transactional regression: exercise existing authorized RPCs, roll back all rows.
BEGIN;
DO $test$
DECLARE pid uuid; oid uuid; iid uuid; version timestamptz; slug text;
  original_count int; result jsonb; images jsonb; prices jsonb;
BEGIN
  SELECT p.id,p.updated_at,p.slug INTO pid,version,slug FROM private.products p
  WHERE p.publication_status='published' AND p.category_id IN (1,2)
    AND EXISTS(SELECT 1 FROM private.product_images i WHERE i.product_id=p.id AND i.image_type='design' AND i.is_published)
    AND EXISTS(SELECT 1 FROM private.product_offers o WHERE o.product_id=p.id AND o.is_active)
  ORDER BY p.updated_at DESC LIMIT 1;
  IF pid IS NULL THEN RAISE EXCEPTION 'Regression requires an existing published design fixture'; END IF;
  SELECT id INTO oid FROM private.product_offers WHERE product_id=pid AND is_active ORDER BY sort_order LIMIT 1;
  SELECT id INTO iid FROM private.product_images WHERE product_id=pid AND image_type='design' AND is_published ORDER BY sort_order LIMIT 1;
  PERFORM set_config('request.jwt.claims',(SELECT jsonb_build_object('sub',user_id,'role','authenticated')::text FROM private.admin_members WHERE role='admin' AND is_active LIMIT 1),true);
  SELECT jsonb_array_length(api.catalog_product_snapshot()) INTO original_count;
  PERFORM api.save_product(pid,version,'{}',jsonb_build_object('product_offers',jsonb_build_object('upsert',jsonb_build_array(jsonb_build_object('id',oid,'sale_status','sold_out'))),'product_images',jsonb_build_object('upsert',jsonb_build_array(jsonb_build_object('id',iid,'sale_status','sold_out')))));
  result:=api.catalog_product_detail(slug);
  IF result IS NULL OR jsonb_array_length(api.catalog_product_snapshot())<>original_count THEN RAISE EXCEPTION 'Partial sold-out product disappeared'; END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result->'images') i WHERE i->>'id'=iid::text AND i->>'sale_status'='sold_out') THEN RAISE EXCEPTION 'Design sale flag lost'; END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result->'prices') pr WHERE pr->>'offer_id'=oid::text AND pr->>'sale_status'='sold_out') THEN RAISE EXCEPTION 'Plan sale flag lost'; END IF;
  SELECT updated_at INTO version FROM private.products WHERE id=pid;
  PERFORM api.save_product(pid,version,'{"sale_status":"sold_out"}','{}');
  IF api.catalog_product_detail(slug)->>'sale_status'<>'sold_out' OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(api.catalog_product_list()) p WHERE p->>'id'=pid::text) OR jsonb_array_length(api.catalog_product_snapshot())<>original_count THEN RAISE EXCEPTION 'Sold-out reference disappeared'; END IF;
  IF jsonb_array_length(api.catalog_product_prices(pid))=0 THEN RAISE EXCEPTION 'Reference prices disappeared'; END IF;
  IF NOT private.public_product(pid) THEN RAISE EXCEPTION 'Reference media eligibility lost'; END IF;
  SELECT updated_at INTO version FROM private.products WHERE id=pid;
  PERFORM api.save_product(pid,version,'{"publication_status":"hidden"}','{}');
  IF api.catalog_product_detail(slug) IS NOT NULL OR private.public_product(pid) THEN RAISE EXCEPTION 'Hidden product leaked as a sold-out reference'; END IF;
  SELECT updated_at INTO version FROM private.products WHERE id=pid;
  PERFORM api.save_product(pid,version,'{"publication_status":"published"}','{}');
  IF NOT EXISTS(SELECT 1 FROM private.products WHERE id=pid AND sale_status='sold_out' AND publication_status='published') THEN RAISE EXCEPTION 'Sale flag incorrectly changed publication'; END IF;
  SELECT updated_at INTO version FROM private.products WHERE id=pid;
  PERFORM api.save_product(pid,version,'{"sale_status":"available"}','{}');
  IF api.catalog_product_detail(slug) IS NULL THEN RAISE EXCEPTION 'Restocking failed'; END IF;
  BEGIN
    UPDATE private.product_offers SET sale_status='invalid' WHERE id=oid;
    RAISE EXCEPTION 'Invalid sale status accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  RAISE NOTICE 'PASS: partial design/plan retained, sold-out reference retained, hidden publication excluded, restocking restored, invalid values rejected';
END $test$;
ROLLBACK;
