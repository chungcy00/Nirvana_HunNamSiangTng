-- The restricted RPC owner roles evaluate the same storage predicates as their callers.
GRANT EXECUTE ON FUNCTION private.media_can_read(text,text) TO fg_catalog_reader,fg_catalog_writer;
GRANT EXECUTE ON FUNCTION private.media_can_insert(text,text),private.media_can_delete(text,text),private.media_product_id(text) TO fg_catalog_writer;
NOTIFY pgrst, 'reload schema';
