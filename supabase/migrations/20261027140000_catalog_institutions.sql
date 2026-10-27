-- Institutions share the existing publication, pricing and membership boundary.
-- Existing rows and legacy RPCs remain Nirvana-only; no product data is seeded.
BEGIN;
ALTER TABLE private.products ADD COLUMN institution text NOT NULL DEFAULT 'nirvana'
  CHECK (institution IN ('nirvana','yunnan'));
ALTER TABLE private.products ADD CONSTRAINT yunnan_funeral_only CHECK (institution <> 'yunnan' OR category_id=4);
CREATE INDEX products_institution_category_order ON private.products(institution,category_id,sort_order,id);
GRANT SELECT (institution) ON private.products TO fg_catalog_reader;
GRANT CREATE ON SCHEMA private,api TO fg_catalog_reader;
GRANT CREATE ON SCHEMA api TO fg_catalog_writer;

DO $patch$
DECLARE definition text; cloned text;
BEGIN
  -- A private all-institution list keeps the same reader role and RLS projection.
  SELECT pg_get_functiondef('api.catalog_product_list(smallint,text,smallint)'::regprocedure) INTO definition;
  cloned:=replace(definition,'api.catalog_product_list(', 'private.catalog_institution_product_list(');
  IF position('''id'',p.id' in cloned)=0 THEN RAISE EXCEPTION 'Unknown public list baseline'; END IF;
  cloned:=replace(cloned,'''id'',p.id','''institution'',p.institution,''id'',p.id');
  EXECUTE cloned;
  ALTER FUNCTION private.catalog_institution_product_list(smallint,text,smallint) OWNER TO fg_catalog_reader;
  REVOKE ALL ON FUNCTION private.catalog_institution_product_list(smallint,text,smallint) FROM PUBLIC,anon,authenticated;
  GRANT EXECUTE ON FUNCTION private.catalog_institution_product_list(smallint,text,smallint) TO fg_catalog_reader;
  -- Legacy clients must never mistake Yunnan packages for Nirvana packages.
  EXECUTE replace(definition,'FROM private.products p WHERE','FROM private.products p WHERE p.institution=''nirvana'' AND');

  SELECT pg_get_functiondef('api.catalog_product_snapshot()'::regprocedure) INTO definition;
  cloned:=replace(definition,'api.catalog_product_snapshot()', 'api.catalog_institution_snapshot()');
  cloned:=replace(cloned,'api.catalog_product_list()', 'private.catalog_institution_product_list()');
  EXECUTE cloned;
  ALTER FUNCTION api.catalog_institution_snapshot() OWNER TO fg_catalog_reader;
  REVOKE ALL ON FUNCTION api.catalog_institution_snapshot() FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION api.catalog_institution_snapshot() TO anon,authenticated;

  -- Retain existing admin RPCs for old clients, and add explicitly scoped variants.
  SELECT pg_get_functiondef('api.admin_product_list(text,smallint,uuid,text,integer)'::regprocedure) INTO definition;
  cloned:=replace(definition,'api.admin_product_list(', 'api.admin_institution_product_list(p_institution text, ');
  cloned:=replace(cloned,'FROM private.products p WHERE','FROM private.products p WHERE p.institution=p_institution AND');
  EXECUTE cloned;
  EXECUTE replace(definition,'FROM private.products p WHERE','FROM private.products p WHERE p.institution=''nirvana'' AND');

  SELECT pg_get_functiondef('api.admin_category_order(smallint)'::regprocedure) INTO definition;
  cloned:=replace(definition,'api.admin_category_order(', 'api.admin_institution_category_order(p_institution text, ');
  cloned:=replace(cloned,'WHERE category_id=p_category','WHERE institution=p_institution AND category_id=p_category');
  EXECUTE cloned;
  EXECUTE replace(definition,'WHERE category_id=p_category','WHERE institution=''nirvana'' AND category_id=p_category');

  SELECT pg_get_functiondef('api.admin_reorder_products(smallint,jsonb)'::regprocedure) INTO definition;
  cloned:=replace(definition,'api.admin_reorder_products(', 'api.admin_institution_reorder_products(p_institution text, ');
  cloned:=replace(cloned,'p.category_id=p_category','p.institution=p_institution AND p.category_id=p_category');
  cloned:=regexp_replace(cloned,'(?<!\.)category_id=p_category','institution=p_institution AND category_id=p_category','g');
  cloned:=replace(cloned,'api.admin_category_order(p_category)','api.admin_institution_category_order(p_institution,p_category)');
  EXECUTE cloned;
  definition:=replace(definition,'p.category_id=p_category','p.institution=''nirvana'' AND p.category_id=p_category');
  definition:=regexp_replace(definition,'(?<!\.)category_id=p_category','institution=''nirvana'' AND category_id=p_category','g');
  EXECUTE definition;

  SELECT pg_get_functiondef('api.save_product(uuid,timestamptz,jsonb,jsonb)'::regprocedure) INTO definition;
  definition:=replace(definition,'PERFORM private.apply_row(''products'',p_product||jsonb_build_object(''id'',pid));',
    'IF p_id IS NOT NULL AND p_product ? ''institution'' AND p_product->>''institution'' IS DISTINCT FROM oldp.institution THEN
       RAISE EXCEPTION ''已建立产品不可跨机构移动'' USING ERRCODE=''22023'';
     END IF;
     PERFORM private.apply_row(''products'',p_product||jsonb_build_object(''id'',pid));');
  definition:=replace(definition,'WHERE category_id=coalesce(',
    'WHERE institution=coalesce(p_product->>''institution'',oldp.institution,''nirvana'') AND category_id=coalesce(');
  EXECUTE definition;
  SELECT pg_get_functiondef('api.admin_copy_product(uuid,timestamptz,uuid,jsonb)'::regprocedure) INTO definition;
  EXECUTE replace(definition,'WHERE category_id=source.category_id','WHERE institution=source.institution AND category_id=source.category_id');
END $patch$;

ALTER FUNCTION api.admin_institution_product_list(text,text,smallint,uuid,text,integer) OWNER TO fg_catalog_writer;
ALTER FUNCTION api.admin_institution_category_order(text,smallint) OWNER TO fg_catalog_writer;
ALTER FUNCTION api.admin_institution_reorder_products(text,smallint,jsonb) OWNER TO fg_catalog_writer;
REVOKE ALL ON FUNCTION api.admin_institution_product_list(text,text,smallint,uuid,text,integer),
 api.admin_institution_category_order(text,smallint),api.admin_institution_reorder_products(text,smallint,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION api.admin_institution_product_list(text,text,smallint,uuid,text,integer),
 api.admin_institution_category_order(text,smallint),api.admin_institution_reorder_products(text,smallint,jsonb) TO authenticated;
REVOKE CREATE ON SCHEMA private,api FROM fg_catalog_reader;
REVOKE CREATE ON SCHEMA api FROM fg_catalog_writer;
NOTIFY pgrst,'reload schema';
COMMIT;
