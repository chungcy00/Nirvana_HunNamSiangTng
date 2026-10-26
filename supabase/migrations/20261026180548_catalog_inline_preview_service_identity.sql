CREATE FUNCTION private.preview_service_request() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(auth.jwt()->>'role'='service_role',false)
$$;
REVOKE ALL ON FUNCTION private.preview_service_request() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.preview_service_request() TO fg_catalog_writer;
ALTER POLICY placeholder_writer ON private.image_placeholders
 USING(private.preview_service_request() OR private.media_can_read(storage_bucket,storage_path))
 WITH CHECK(private.preview_service_request() OR private.media_can_insert(storage_bucket,storage_path));
CREATE OR REPLACE FUNCTION api.cache_image_placeholder(p_bucket text,p_path text,p_data text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE bytes bytea; trusted_service boolean:=private.preview_service_request();
BEGIN
 IF NOT trusted_service THEN
  PERFORM private.require_member(false);
  IF NOT (CASE WHEN p_data IS NULL THEN private.media_can_delete(p_bucket,p_path)
    ELSE private.media_can_insert(p_bucket,p_path) END) THEN RAISE EXCEPTION '无权准备此图片预览' USING ERRCODE='42501'; END IF;
 END IF;
 IF p_bucket NOT IN ('catalog-media-private','catalog-media-restricted') OR private.media_product_id(p_path) IS NULL THEN
  RAISE EXCEPTION '无效图片路径' USING ERRCODE='22023'; END IF;
 IF p_data IS NULL THEN DELETE FROM private.image_placeholders WHERE storage_bucket=p_bucket AND storage_path=p_path; RETURN; END IF;
 IF length(p_data)>65536 OR p_data !~ '^data:image/webp;base64,[A-Za-z0-9+/]+=*$' THEN
  RAISE EXCEPTION '无效图片预览' USING ERRCODE='22023'; END IF;
 bytes:=decode(split_part(p_data,',',2),'base64');
 IF substring(bytes FROM 1 FOR 4)<>decode('52494646','hex') OR substring(bytes FROM 9 FOR 4)<>decode('57454250','hex') THEN
  RAISE EXCEPTION '无效图片预览格式' USING ERRCODE='22023'; END IF;
 INSERT INTO private.image_placeholders(storage_bucket,storage_path,data_uri) VALUES(p_bucket,p_path,p_data)
 ON CONFLICT(storage_bucket,storage_path) DO UPDATE SET data_uri=excluded.data_uri;
END $$;
