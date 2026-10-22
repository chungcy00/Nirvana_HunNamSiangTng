-- Additive migration: identity lookup and Storage access for the 18-table catalog.
-- Auth users are NOT administrators unless a trusted maintenance process explicitly
-- inserts them in private.admin_members. No service key is shipped to the website.
BEGIN;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES
 ('catalog-media-private','catalog-media-private',false,10485760,ARRAY['image/jpeg','image/png','image/webp']),
 ('catalog-media-restricted','catalog-media-restricted',false,10485760,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,
  allowed_mime_types=EXCLUDED.allowed_mime_types;

CREATE FUNCTION private.media_product_id(p_path text) RETURNS uuid
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
BEGIN
  IF p_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|jpeg|webp)$' THEN
    RETURN NULL;
  END IF;
  RETURN split_part(p_path,'/',1)::uuid;
EXCEPTION WHEN invalid_text_representation THEN RETURN NULL;
END $$;

CREATE FUNCTION private.media_can_read(p_bucket text,p_path text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid:=private.media_product_id(p_path);
BEGIN
  IF pid IS NULL OR p_bucket NOT IN ('catalog-media-private','catalog-media-restricted') THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM private.admin_members WHERE user_id=auth.uid() AND is_active) THEN
    RETURN EXISTS (SELECT 1 FROM private.products WHERE id=pid);
  END IF;
  IF p_bucket='catalog-media-restricted' THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM private.product_images i WHERE i.product_id=pid
    AND i.storage_bucket=p_bucket AND i.storage_path=p_path AND i.is_published
    AND private.public_product(pid) AND private.public_religion(pid,i.religion_id));
END $$;

CREATE FUNCTION private.media_can_insert(p_bucket text,p_path text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE pid uuid:=private.media_product_id(p_path);
BEGIN
  IF pid IS NULL OR p_bucket NOT IN ('catalog-media-private','catalog-media-restricted') THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM private.products p CROSS JOIN private.admin_members m
    WHERE p.id=pid AND m.user_id=auth.uid() AND m.is_active
    AND (m.role='admin' OR (p.publication_status='draft' AND NOT private.was_published(pid))));
END $$;

CREATE FUNCTION private.media_can_delete(p_bucket text,p_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT private.media_can_insert(p_bucket,p_path)
    AND NOT EXISTS (SELECT 1 FROM private.product_images WHERE storage_bucket=p_bucket AND storage_path=p_path)
$$;

-- Both permissive authorization and restrictive fences are needed: a broad existing
-- Storage policy must not accidentally authorize access to these reserved buckets.
CREATE POLICY catalog_media_select ON storage.objects FOR SELECT TO anon,authenticated
  USING (bucket_id IN ('catalog-media-private','catalog-media-restricted') AND private.media_can_read(bucket_id,name));
CREATE POLICY catalog_media_select_fence ON storage.objects AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (bucket_id NOT IN ('catalog-media-private','catalog-media-restricted') OR private.media_can_read(bucket_id,name));
CREATE POLICY catalog_media_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('catalog-media-private','catalog-media-restricted') AND private.media_can_insert(bucket_id,name));
CREATE POLICY catalog_media_insert_fence ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated
  WITH CHECK (bucket_id NOT IN ('catalog-media-private','catalog-media-restricted') OR private.media_can_insert(bucket_id,name));
-- No user may overwrite/move an existing object. Upload replacement at a new path,
-- atomically change the product reference, and only then remove the unused old object.
CREATE POLICY catalog_media_update_fence ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated
  USING (bucket_id NOT IN ('catalog-media-private','catalog-media-restricted'))
  WITH CHECK (bucket_id NOT IN ('catalog-media-private','catalog-media-restricted'));
CREATE POLICY catalog_media_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('catalog-media-private','catalog-media-restricted') AND private.media_can_delete(bucket_id,name));
CREATE POLICY catalog_media_delete_fence ON storage.objects AS RESTRICTIVE FOR DELETE TO anon,authenticated
  USING (bucket_id NOT IN ('catalog-media-private','catalog-media-restricted') OR private.media_can_delete(bucket_id,name));

-- Restricted assets never enter consumer-facing catalog responses.
ALTER POLICY reader_images ON private.product_images USING (
  private.public_product(product_id) AND is_published
  AND private.public_religion(product_id,religion_id)
  AND storage_bucket<>'catalog-media-restricted');

CREATE FUNCTION private.media_reference_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.storage_bucket IN ('catalog-media-private','catalog-media-restricted')
    AND private.media_product_id(NEW.storage_path) IS DISTINCT FROM NEW.product_id THEN
    RAISE EXCEPTION '图片路径必须归属当前产品，并使用新资产UUID' USING ERRCODE='23514';
  END IF;
  IF NEW.storage_bucket='catalog-media-restricted' AND (NEW.is_primary OR NEW.is_published) THEN
    RAISE EXCEPTION '受限素材只能用于后台，不可设为公开图片或主图' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER catalog_media_reference_before BEFORE INSERT OR UPDATE ON private.product_images
FOR EACH ROW EXECUTE FUNCTION private.media_reference_guard();

CREATE FUNCTION api.current_catalog_member() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object('user_id',auth.uid(),'role',private.require_member(false))
$$;
GRANT CREATE ON SCHEMA api TO fg_catalog_writer;
ALTER FUNCTION api.current_catalog_member() OWNER TO fg_catalog_writer;
REVOKE CREATE ON SCHEMA api FROM fg_catalog_writer;
REVOKE ALL ON FUNCTION api.current_catalog_member() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION api.current_catalog_member() TO authenticated;
REVOKE ALL ON FUNCTION private.media_product_id(text),private.media_can_read(text,text),
  private.media_can_insert(text,text),private.media_can_delete(text,text),private.media_reference_guard()
  FROM PUBLIC,anon,authenticated;
-- Policies refer to function OIDs. This EXECUTE grant does not grant USAGE on private.
GRANT EXECUTE ON FUNCTION private.media_can_read(text,text),private.media_can_insert(text,text),
  private.media_can_delete(text,text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
