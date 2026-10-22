-- Test only the explicitly marked hosted draft fixtures; negative writes roll back
-- in PL/pgSQL exception subtransactions. No real Auth users or files are fabricated.
DO $checks$
DECLARE pid uuid; other_id uuid; v_offer_id uuid; app_role text;
BEGIN
 IF (SELECT count(*) FROM private.products WHERE product_code LIKE 'TEST-CLOUD-20261022-%')<>20
    OR EXISTS(SELECT 1 FROM private.products WHERE product_code LIKE 'TEST-CLOUD-20261022-%' AND publication_status<>'draft') THEN
  RAISE EXCEPTION 'Hosted test fixtures must be exactly 20 nonpublic drafts'; END IF;
 IF (SELECT count(*) FROM private.offer_prices pr JOIN private.product_offers o ON o.id=pr.offer_id
   JOIN private.products p ON p.id=o.product_id WHERE p.product_code LIKE 'TEST-CLOUD-20261022-%')<>32 THEN
  RAISE EXCEPTION 'Expected exactly 32 source-backed prices'; END IF;
 IF (SELECT pr.price_amount FROM private.offer_prices pr JOIN private.product_offers o ON o.id=pr.offer_id
   JOIN private.products p ON p.id=o.product_id WHERE p.product_code='TEST-CLOUD-20261022-aa-double-package')<>63888 THEN
  RAISE EXCEPTION 'AA price mismatch'; END IF;
 IF (SELECT count(*) FROM private.products WHERE product_code LIKE 'TEST-CLOUD-20261022-funeral-%')<>8
   OR EXISTS (SELECT 1 FROM private.products p JOIN private.product_offers o ON o.product_id=p.id
    WHERE p.product_code LIKE 'TEST-CLOUD-20261022-funeral-%'
      AND ((SELECT count(*) FROM private.offer_prices pr WHERE pr.offer_id=o.id)<>2
       OR EXISTS(SELECT 1 FROM private.offer_prices pr WHERE pr.offer_id=o.id AND price_type='standard'))) THEN
  RAISE EXCEPTION 'Funeral dual-price structure mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM private.products p JOIN private.product_offers o ON o.product_id=p.id
   JOIN private.offer_prices pr ON pr.offer_id=o.id WHERE p.product_code LIKE 'TEST-CLOUD-20261022-juxian-%') THEN
  RAISE EXCEPTION 'Missing Juxian prices must not be invented'; END IF;
 IF EXISTS(SELECT 1 FROM private.products WHERE product_code='TEST-CLOUD-20261022-w-family-lot' AND capacity_count IS NOT NULL) THEN
  RAISE EXCEPTION 'Family capacity must remain unknown'; END IF;
 -- Every product must be refused publication without source product images.
 FOR pid IN SELECT id FROM private.products WHERE product_code LIKE 'TEST-CLOUD-20261022-%' LOOP
  BEGIN
   UPDATE private.products SET publication_status='published' WHERE id=pid;
   SET CONSTRAINTS ALL IMMEDIATE;
   RAISE EXCEPTION 'Publication unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
 END LOOP;
 SELECT id INTO pid FROM private.products WHERE product_code='TEST-CLOUD-20261022-aa-double-package';
 SELECT id INTO other_id FROM private.products WHERE product_code='TEST-CLOUD-20261022-w-single-lot';
 SELECT id INTO v_offer_id FROM private.product_offers WHERE product_id=pid;
 BEGIN
  INSERT INTO private.offer_prices(offer_id,price_type,price_amount) VALUES(v_offer_id,'standard',63888);
  RAISE EXCEPTION 'Duplicate current price unexpectedly accepted';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 BEGIN
  UPDATE private.offer_prices SET price_amount=0 WHERE private.offer_prices.offer_id=v_offer_id;
  RAISE EXCEPTION 'Zero price unexpectedly accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO private.product_inclusions(product_id,offer_id,item_name) VALUES(other_id,v_offer_id,'TEST cross-product reference');
  SET CONSTRAINTS ALL IMMEDIATE;
  RAISE EXCEPTION 'Cross-product offer unexpectedly accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 BEGIN
  INSERT INTO private.product_images(product_id,religion_id,storage_bucket,storage_path)
  VALUES(other_id,1,'catalog-media-private',other_id::text||'/'||gen_random_uuid()::text||'.png');
  SET CONSTRAINTS ALL IMMEDIATE;
  RAISE EXCEPTION 'Unbound religion unexpectedly accepted';
 EXCEPTION WHEN foreign_key_violation THEN NULL; END;
 BEGIN
  INSERT INTO private.burial_details(product_id,area_sqft) VALUES(pid,-1);
  RAISE EXCEPTION 'Negative area unexpectedly accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
 FOREACH app_role IN ARRAY ARRAY['anon','authenticated'] LOOP
  BEGIN
   EXECUTE 'SET LOCAL ROLE '||quote_ident(app_role);
   PERFORM count(*) FROM private.products;
   RAISE EXCEPTION 'Raw private read unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
 END LOOP;
 BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM api.current_catalog_member();
  RAISE EXCEPTION 'Non-member identity unexpectedly accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 RESET ROLE;
 SET LOCAL ROLE anon;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(api.catalog_product_list()) x
   WHERE x->>'slug' LIKE 'test-security-20261022-%') THEN RAISE EXCEPTION 'Draft data leaked in catalog'; END IF;
 RESET ROLE;
END $checks$;
SELECT jsonb_build_object('validation','passed','test_products',20,'source_price_records',32,
  'publication_rejections',20,'checks','source structures, current-price uniqueness, positive values, cross-product FK, religion FK, anonymous and nonmember access') AS hosted_validation;
