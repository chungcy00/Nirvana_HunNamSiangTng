-- Service-role RPC execution still requires explicit access to this custom API schema.
GRANT USAGE ON SCHEMA api TO service_role;
NOTIFY pgrst, 'reload schema';
