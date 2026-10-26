-- Store generated previews separately; originals remain immutable and private.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('catalog-media-previews','catalog-media-previews',false,2097152,ARRAY['image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE FUNCTION private.preview_allowed(p_name text,p_action text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE parts text[];
BEGIN
 IF NOT private.media_operation_allowed() THEN RETURN false; END IF;
 parts:=regexp_match(p_name,'^(160|480|960|1920)/(catalog-media-private|catalog-media-restricted)/(.+)\.webp$');
 IF parts IS NULL OR private.media_product_id(parts[3]) IS NULL THEN RETURN false; END IF;
 IF p_action='read' THEN RETURN private.media_can_read(parts[2],parts[3]); END IF;
 IF p_action='insert' THEN
   RETURN private.media_can_insert(parts[2],parts[3]) AND EXISTS (
     SELECT 1 FROM storage.objects WHERE bucket_id=parts[2] AND name=parts[3]);
 END IF;
 IF p_action='delete' THEN RETURN private.media_can_delete(parts[2],parts[3]); END IF;
 RETURN false;
END $$;
REVOKE ALL ON FUNCTION private.preview_allowed(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.preview_allowed(text,text) TO anon,authenticated;

CREATE POLICY catalog_preview_select ON storage.objects FOR SELECT TO anon,authenticated
 USING (bucket_id='catalog-media-previews' AND private.preview_allowed(name,'read'));
CREATE POLICY catalog_preview_select_fence ON storage.objects AS RESTRICTIVE FOR SELECT TO anon,authenticated
 USING (bucket_id<>'catalog-media-previews' OR private.preview_allowed(name,'read'));
CREATE POLICY catalog_preview_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id='catalog-media-previews' AND private.preview_allowed(name,'insert'));
CREATE POLICY catalog_preview_insert_fence ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated
 WITH CHECK (bucket_id<>'catalog-media-previews' OR private.preview_allowed(name,'insert'));
CREATE POLICY catalog_preview_update_fence ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated
 USING (bucket_id<>'catalog-media-previews') WITH CHECK (bucket_id<>'catalog-media-previews');
CREATE POLICY catalog_preview_delete ON storage.objects FOR DELETE TO authenticated
 USING (bucket_id='catalog-media-previews' AND private.preview_allowed(name,'delete'));
CREATE POLICY catalog_preview_delete_fence ON storage.objects AS RESTRICTIVE FOR DELETE TO anon,authenticated
 USING (bucket_id<>'catalog-media-previews' OR private.preview_allowed(name,'delete'));
NOTIFY pgrst,'reload schema';
