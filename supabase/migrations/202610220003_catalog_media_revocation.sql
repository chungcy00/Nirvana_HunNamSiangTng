-- Do not issue bearer URLs whose lifetime could outlast a product/religion/member
-- permission change. Storage sets storage.operation server-side for each request.
BEGIN;
CREATE FUNCTION private.media_operation_allowed() RETURNS boolean
LANGUAGE sql STABLE SET search_path='' AS $$
  SELECT lower(coalesce(current_setting('storage.operation',true),'')) !~ 'sign'
$$;
REVOKE ALL ON FUNCTION private.media_operation_allowed() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.media_operation_allowed() TO anon,authenticated;
ALTER POLICY catalog_media_select_fence ON storage.objects USING (
  bucket_id NOT IN ('catalog-media-private','catalog-media-restricted')
  OR (private.media_can_read(bucket_id,name) AND private.media_operation_allowed()));
ALTER POLICY catalog_media_insert_fence ON storage.objects WITH CHECK (
  bucket_id NOT IN ('catalog-media-private','catalog-media-restricted')
  OR (private.media_can_insert(bucket_id,name) AND private.media_operation_allowed()));
COMMIT;
