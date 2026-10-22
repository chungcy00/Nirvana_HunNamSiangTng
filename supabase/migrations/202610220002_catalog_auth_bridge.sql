-- Supabase owns the auth schema; the project postgres role cannot necessarily grant
-- its USAGE to a custom executor. Delegate the minimal identity read to a private,
-- fixed-path trusted helper instead of depending on that grant or broadening auth ACLs.
BEGIN;
CREATE FUNCTION private.current_member_identity() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object('user_id',auth.uid(),'role',private.require_member(false))
$$;
REVOKE ALL ON FUNCTION private.current_member_identity() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.current_member_identity() TO fg_catalog_writer;
CREATE OR REPLACE FUNCTION api.current_catalog_member() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT private.current_member_identity()
$$;
REVOKE ALL ON FUNCTION api.current_catalog_member() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION api.current_catalog_member() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
