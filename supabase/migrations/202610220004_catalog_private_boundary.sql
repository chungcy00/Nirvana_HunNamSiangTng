-- Explicit application deny policies document the intentional default-deny boundary.
-- Trusted owner-run identity/audit helpers retain their existing maintenance access.
BEGIN;
CREATE POLICY admin_members_application_deny ON private.admin_members
  AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
CREATE POLICY audit_logs_application_deny ON private.audit_logs
  AS RESTRICTIVE FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
-- The 1.3 design exposes only api RPCs. This is a documented SQL override of the
-- hosted Dashboard's Exposed schemas setting; private is never exposed.
ALTER ROLE authenticator SET pgrst.db_schemas='api';
NOTIFY pgrst,'reload config';
NOTIFY pgrst,'reload schema';
COMMIT;
