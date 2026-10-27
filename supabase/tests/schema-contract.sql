-- Read-only verification of document ③ v1.3. Safe on local and hosted databases.
DO $contract$
DECLARE item record; web_role text;
BEGIN
  IF (SELECT array_agg(tablename::text ORDER BY tablename) FROM pg_tables WHERE schemaname='private' AND tablename<>'image_placeholders')
     IS DISTINCT FROM ARRAY['admin_members','audit_logs','burial_details','catalog_notices',
       'fengshui_details','funeral_details','niche_details','offer_prices','pet_details',
       'product_categories','product_images','product_inclusions','product_offers',
       'product_religions','product_series','products','religions','tablet_details'] THEN
    RAISE EXCEPTION 'The 18 document tables do not match';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='private' AND c.relkind='r' AND
      (NOT c.relrowsecurity OR NOT EXISTS(SELECT 1 FROM pg_constraint k WHERE k.conrelid=c.oid AND k.contype='p')))
    OR (SELECT count(*) FROM pg_constraint k JOIN pg_namespace n ON n.oid=k.connamespace
         WHERE n.nspname='private' AND k.contype='f' AND k.convalidated)<>22 THEN
    RAISE EXCEPTION 'Missing RLS, primary key or validated foreign key';
  END IF;
  IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('fg_catalog_reader','fg_catalog_writer')
      AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper)<>2 THEN
    RAISE EXCEPTION 'RPC executors must be NOLOGIN / NOBYPASSRLS / NOSUPERUSER';
  END IF;
  FOREACH web_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF has_schema_privilege(web_role,'private','USAGE')
      OR pg_has_role(web_role,'fg_catalog_reader','MEMBER')
      OR pg_has_role(web_role,'fg_catalog_writer','MEMBER') THEN
      RAISE EXCEPTION 'Web role can enter a privileged schema or executor role';
    END IF;
    FOR item IN SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='private' AND c.relkind='r' LOOP
      IF has_table_privilege(web_role,item.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        OR has_any_column_privilege(web_role,item.oid,'SELECT,INSERT,UPDATE,REFERENCES') THEN
        RAISE EXCEPTION 'Web role has direct business table privileges';
      END IF;
    END LOOP;
  END LOOP;
  FOR item IN SELECT p.oid,p.proname,p.proowner,p.prosecdef,p.proconfig FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='api' LOOP
    IF item.proname NOT IN ('catalog_product_list','catalog_product_detail','catalog_product_prices',
        'save_product','delete_draft','admin_product','current_catalog_member',
        'admin_reference_data','admin_product_list','admin_category_order','admin_reorder_products',
        'admin_save_reference','admin_copy_product','admin_audit_logs','admin_cleanup_candidates',
        'catalog_product_snapshot','cache_image_placeholder','catalog_institution_snapshot',
        'admin_institution_product_list','admin_institution_category_order','admin_institution_reorder_products')
      OR NOT item.prosecdef OR NOT ('search_path=""'=ANY(item.proconfig))
      OR item.proowner<>(CASE WHEN item.proname LIKE 'catalog_%'
        THEN 'fg_catalog_reader'::regrole ELSE 'fg_catalog_writer'::regrole END)
      OR has_function_privilege('anon',item.oid,'EXECUTE')<>(item.proname LIKE 'catalog_%')
      OR NOT has_function_privilege('authenticated',item.oid,'EXECUTE') THEN
      RAISE EXCEPTION 'Unsafe API RPC configuration: %',item.proname;
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='api')
      <>((CASE WHEN to_regprocedure('api.admin_reference_data()') IS NULL THEN 7 ELSE 15 END)
        + CASE WHEN to_regprocedure('api.catalog_product_snapshot()') IS NULL THEN 0 ELSE 1 END
        + CASE WHEN to_regprocedure('api.cache_image_placeholder(text,text,text)') IS NULL THEN 0 ELSE 1 END
        + CASE WHEN to_regprocedure('api.catalog_institution_snapshot()') IS NULL THEN 0 ELSE 4 END)
    OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname IN ('api','private') AND EXISTS
        (SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
          WHERE a.grantee=0 AND a.privilege_type='EXECUTE')) THEN
    RAISE EXCEPTION 'Unexpected API surface or PUBLIC function execution';
  END IF;
  IF EXISTS(SELECT 1 FROM (VALUES('product_code'),('internal_notes'),('source_reference'),('updated_by')) x(col)
      WHERE has_column_privilege('fg_catalog_reader','private.products',x.col,'SELECT'))
    OR has_table_privilege('fg_catalog_writer','private.admin_members','INSERT,UPDATE,DELETE')
    OR has_table_privilege('fg_catalog_writer','private.audit_logs','INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'Executors can read internal fields or mutate membership/audit';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='api' AND p.proname IN ('save_product','delete_draft')
      AND (position('ERRCODE=''40001''' in p.prosrc)>0
        OR position('ERRCODE=''PT409''' in p.prosrc)=0)) THEN
    RAISE EXCEPTION 'Business conflicts must return HTTP 409 without serialization retries';
  END IF;
END $contract$;
SELECT jsonb_build_object('contract','document-3-v1.3','passed',true,
  'tables',18,'primary_keys',18,'validated_foreign_keys',22,'rls_tables',18,
  'api_rpcs',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='api'),
  'public_rpcs',(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='api' AND has_function_privilege('anon',p.oid,'EXECUTE')),'executor_roles_without_login_or_bypassrls',2) AS schema_contract;
