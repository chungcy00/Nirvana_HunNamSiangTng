-- Requires SET LOCAL test.phase3_run for the current whitelisted run.
-- Tests actual deployed RPCs and RLS projections in ONE transaction which MUST roll back.
-- Does not upload fake storage metadata, disable policies, or publish committed test data.
DO $phase3$
DECLARE
 run text:=current_setting('test.phase3_run'); uid uuid; pid uuid; slug text;
 p jsonb; d jsonb; result jsonb; cfg jsonb; key text; stale timestamptz;
 audit_before bigint; total integer:=0;
BEGIN
 IF run !~ '^[a-f0-9]{8}$' THEN RAISE EXCEPTION 'Invalid test run'; END IF;
 SELECT u.id INTO STRICT uid FROM auth.users u JOIN private.admin_members m ON m.user_id=u.id
 WHERE u.email='phase3-admin-'||run||'@example.test' AND u.raw_user_meta_data->>'test_run'=run
 AND m.role='admin' AND m.is_active;
 IF (SELECT count(*) FROM private.products WHERE product_code LIKE 'TEST-PHASE3-'||run||'-%' AND publication_status='draft')<>5
 THEN RAISE EXCEPTION 'Expected five independent current-run drafts'; END IF;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 SET LOCAL ROLE authenticated;
 FOREACH key IN ARRAY ARRAY['w-premium-package','aa-double-package','funeral-1-2','funeral-2-2'] LOOP
   result:=api.admin_product_list(p_query=>'TEST-PHASE3-'||run||'-'||key);
   IF (result->>'total')::int<>1 THEN RAISE EXCEPTION 'Ambiguous fixture'; END IF;
   pid:=(result->'items'->0->'product'->>'id')::uuid;
   p:=api.admin_product(pid); slug:=p->'product'->>'slug';
   PERFORM api.save_product(pid,(p->'product'->>'updated_at')::timestamptz,'{"publication_status":"published"}'::jsonb);
   d:=api.catalog_product_detail(slug);
   IF d IS NULL THEN RAISE EXCEPTION 'Published product not projected'; END IF;
   IF key='w-premium-package' THEN
     IF jsonb_array_length(d->'prices')<>3 OR jsonb_array_length(d->'religions')<>2
     THEN RAISE EXCEPTION 'W price/religion mismatch'; END IF;
   ELSIF key='aa-double-package' THEN
     IF jsonb_array_length(d->'prices')<>1 OR (d->'prices'->0->>'amount')::numeric<>63888
       OR jsonb_array_length(d->'images')<>5 OR jsonb_array_length(d->'religions')<>2
     THEN RAISE EXCEPTION 'AA shared price/design mismatch'; END IF;
     p:=api.admin_product(pid);
     SELECT x INTO STRICT cfg FROM jsonb_array_elements(p->'product_religions') x WHERE (x->>'religion_id')::int=2;
     PERFORM api.save_product(pid,(p->'product'->>'updated_at')::timestamptz,'{}'::jsonb,
       jsonb_build_object('product_religions',jsonb_build_object('upsert',jsonb_build_array(jsonb_build_object('id',cfg->>'id','is_published',false)))));
     d:=api.catalog_product_detail(slug);
     IF jsonb_array_length(d->'religions')<>1 OR EXISTS(SELECT 1 FROM jsonb_array_elements(d->'images') x WHERE x->>'religion_id'='2')
     THEN RAISE EXCEPTION 'Religion-specific public image leak'; END IF;
     IF EXISTS(SELECT 1 FROM jsonb_array_elements(api.catalog_product_list(p_category=>1::smallint,p_religion=>2::smallint)) x WHERE x->>'id'=pid::text)
     THEN RAISE EXCEPTION 'Disabled religion filter leak'; END IF;
   ELSE
     IF jsonb_array_length(d->'prices')<>2 OR d->>'price_display_mode'<>'funeral_dual'
     THEN RAISE EXCEPTION 'Funeral dual price mismatch'; END IF;
     p:=api.admin_product(pid);audit_before:=(api.admin_audit_logs()->>'total')::bigint;
     BEGIN
       PERFORM api.save_product(pid,(p->'product'->>'updated_at')::timestamptz,'{"name":"MUST NOT COMMIT"}'::jsonb,
         jsonb_build_object('offer_prices',jsonb_build_object('delete',(SELECT jsonb_agg(x->>'id') FROM jsonb_array_elements(p->'offer_prices') x WHERE x->>'price_type'='at_need'))));
       RAISE EXCEPTION 'Missing funeral price was published';
     EXCEPTION WHEN check_violation THEN NULL; END;
     IF api.admin_product(pid) IS DISTINCT FROM p OR (api.admin_audit_logs()->>'total')::bigint<>audit_before
     THEN RAISE EXCEPTION 'Failed publication did not roll back all rows/audit'; END IF;
   END IF;
   p:=api.admin_product(pid);stale:=(p->'product'->>'updated_at')::timestamptz;
   PERFORM api.save_product(pid,stale,'{"publication_status":"hidden"}'::jsonb);
   IF api.catalog_product_detail(slug) IS NOT NULL THEN RAISE EXCEPTION 'Hidden product leaked'; END IF;
   IF api.admin_product(pid) IS NULL THEN RAISE EXCEPTION 'Admin lost hidden record'; END IF;
   BEGIN
     PERFORM api.save_product(pid,stale,'{"description":"stale must fail"}'::jsonb);
     RAISE EXCEPTION 'Stale save accepted';
   EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
   p:=api.admin_product(pid);
   BEGIN
     PERFORM api.delete_draft(pid,(p->'product'->>'updated_at')::timestamptz);
     RAISE EXCEPTION 'Formerly published product deleted';
   EXCEPTION WHEN check_violation THEN NULL; END;
   PERFORM api.save_product(pid,(p->'product'->>'updated_at')::timestamptz,'{"publication_status":"published"}'::jsonb);
   total:=total+1;
 END LOOP;
 IF total<>4 THEN RAISE EXCEPTION 'Incomplete publication coverage'; END IF;
 RESET ROLE;
END $phase3$;
