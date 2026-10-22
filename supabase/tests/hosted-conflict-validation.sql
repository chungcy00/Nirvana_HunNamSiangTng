-- Uses an existing member identity and explicitly marked test draft, no login token.
-- This is a database-role test; actual human password login is a separate acceptance.
BEGIN;
SET LOCAL statement_timeout='5s';
DO $checks$
DECLARE pid uuid; uid uuid;
BEGIN
  SELECT id INTO STRICT pid FROM private.products
    WHERE product_code='TEST-CLOUD-20261022-aa-double-package' AND publication_status='draft';
  SELECT user_id INTO uid FROM private.admin_members WHERE role='admin' AND is_active LIMIT 1;
  IF uid IS NULL THEN RAISE EXCEPTION 'Existing active administrator required'; END IF;
  PERFORM set_config('request.jwt.claim.sub',uid::text,true);
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM api.save_product(pid,'2000-01-01T00:00:00Z'::timestamptz,'{}'::jsonb,'{}'::jsonb);
    RAISE EXCEPTION 'Stale product save was accepted';
  EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
  RESET ROLE;
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM api.delete_draft(pid,'2000-01-01T00:00:00Z'::timestamptz);
    RAISE EXCEPTION 'Stale draft deletion was accepted';
  EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
  RESET ROLE;
END $checks$;
ROLLBACK;
SELECT jsonb_build_object('passed',true,'stale_save','PT409','stale_delete','PT409',
  'data_changes',false,'human_login_tested',false) AS hosted_conflict_validation;
