-- Business conflicts are permanent until the caller reloads the product.
-- SQLSTATE 40001 triggers PostgREST 14 transaction retries instead of responding.
-- Use PT409 for a deterministic HTTP 409 without changing permissions or data.
BEGIN;
DO $migration$
DECLARE signature text; definition text; original_owner oid; original_acl aclitem[];
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'api.save_product(uuid,timestamp with time zone,jsonb,jsonb)',
    'api.delete_draft(uuid,timestamp with time zone)'
  ] LOOP
    SELECT pg_get_functiondef(p.oid),p.proowner,p.proacl
      INTO STRICT definition,original_owner,original_acl
      FROM pg_proc p WHERE p.oid=to_regprocedure(signature);
    IF (length(definition)-length(replace(definition,'ERRCODE=''40001''','')))
        /length('ERRCODE=''40001''')<>1 THEN
      RAISE EXCEPTION 'Unexpected conflict handling baseline: %',signature;
    END IF;
    EXECUTE replace(definition,'ERRCODE=''40001''','ERRCODE=''PT409''');
    IF EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure(signature)
      AND (p.proowner<>original_owner OR p.proacl IS DISTINCT FROM original_acl)) THEN
      RAISE EXCEPTION 'Function owner or grants unexpectedly changed: %',signature;
    END IF;
  END LOOP;
END $migration$;
NOTIFY pgrst,'reload schema';
COMMIT;
