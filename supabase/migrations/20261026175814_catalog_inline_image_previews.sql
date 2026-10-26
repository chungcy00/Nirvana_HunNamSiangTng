-- Tiny first-paint images travel with the authorized product response.
CREATE TABLE private.image_placeholders (
 storage_bucket text NOT NULL CHECK(storage_bucket IN ('catalog-media-private','catalog-media-restricted')),
 storage_path text NOT NULL,
 data_uri text NOT NULL CHECK(length(data_uri)<=65536 AND data_uri ~ '^data:image/webp;base64,[A-Za-z0-9+/]+=*$'),
 PRIMARY KEY(storage_bucket,storage_path)
);
ALTER TABLE private.image_placeholders ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON private.image_placeholders TO fg_catalog_reader,fg_catalog_writer;
GRANT INSERT,UPDATE,DELETE ON private.image_placeholders TO fg_catalog_writer;
CREATE POLICY placeholder_reader ON private.image_placeholders FOR SELECT TO fg_catalog_reader
 USING(private.media_can_read(storage_bucket,storage_path));
CREATE POLICY placeholder_writer ON private.image_placeholders FOR ALL TO fg_catalog_writer
 USING(auth.jwt()->>'role'='service_role' OR private.media_can_read(storage_bucket,storage_path))
 WITH CHECK(auth.jwt()->>'role'='service_role' OR private.media_can_insert(storage_bucket,storage_path));
CREATE FUNCTION private.image_placeholder(p_bucket text,p_path text) RETURNS text
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT data_uri FROM private.image_placeholders WHERE storage_bucket=p_bucket AND storage_path=p_path
$$;
REVOKE ALL ON FUNCTION private.image_placeholder(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.image_placeholder(text,text) TO fg_catalog_reader,fg_catalog_writer;
CREATE FUNCTION api.cache_image_placeholder(p_bucket text,p_path text,p_data text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE bytes bytea; trusted_service boolean:=coalesce(auth.jwt()->>'role'='service_role',false);
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
GRANT CREATE ON SCHEMA api TO fg_catalog_writer;
ALTER FUNCTION api.cache_image_placeholder(text,text,text) OWNER TO fg_catalog_writer;
REVOKE CREATE ON SCHEMA api FROM fg_catalog_writer;
REVOKE ALL ON FUNCTION api.cache_image_placeholder(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION api.cache_image_placeholder(text,text,text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION api.catalog_product_list(p_category smallint DEFAULT NULL,p_capacity text DEFAULT NULL,
  p_religion smallint DEFAULT NULL) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(x.obj ORDER BY x.ord,x.pid),'[]'::jsonb) FROM (
    SELECT p.id AS pid,p.sort_order AS ord,jsonb_strip_nulls(jsonb_build_object(
      'id',p.id,'slug',p.slug,'name',p.name,'category_id',p.category_id,
      'capacity_group',p.capacity_group,'capacity_count',p.capacity_count,
      'placement_type',CASE WHEN p.category_id=3 THEN
        (SELECT d.placement_type FROM private.niche_details d WHERE d.product_id=p.id) END,
      'primary_image',(SELECT jsonb_build_object('id',i.id,'bucket',i.storage_bucket,'path',i.storage_path,'alt',i.alt_text,'preview_placeholder',private.image_placeholder(i.storage_bucket,i.storage_path))
        FROM private.product_images i WHERE i.product_id=p.id AND i.is_primary),
      'religions',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',d.id,'name',d.name) ORDER BY d.id),'[]'::jsonb)
        FROM private.product_religions r JOIN private.religions d ON d.id=r.religion_id WHERE r.product_id=p.id),
      'prices',api.catalog_product_prices(p.id))) AS obj
    FROM private.products p WHERE (p_category IS NULL OR p.category_id=p_category)
      AND (p_capacity IS NULL OR (p.category_id IN (1,2,3) AND p.capacity_group=p_capacity))
      AND (p_religion IS NULL OR (p.category_id IN (1,2,3,4) AND EXISTS (
        SELECT 1 FROM private.product_religions r WHERE r.product_id=p.id AND r.religion_id=p_religion)))
  ) x
$$;

CREATE OR REPLACE FUNCTION api.catalog_product_detail(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE p record; result jsonb; attrs jsonb;
BEGIN
  SELECT id,slug,name,category_id,capacity_group,capacity_count,subtitle,description,price_display_mode,price_note_override
    INTO p FROM private.products WHERE slug=p_slug;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT obj INTO result FROM jsonb_array_elements(api.catalog_product_list(p.category_id)) AS x(obj)
    WHERE obj->>'id'=p.id::text;
  CASE p.category_id
    WHEN 1,2 THEN SELECT to_jsonb(d)-'product_id' INTO attrs FROM private.burial_details d WHERE product_id=p.id;
    WHEN 3 THEN SELECT to_jsonb(d)-'product_id' INTO attrs FROM private.niche_details d WHERE product_id=p.id;
    WHEN 4 THEN SELECT to_jsonb(d)-'product_id' INTO attrs FROM private.funeral_details d WHERE product_id=p.id;
    WHEN 5 THEN SELECT to_jsonb(d)-'product_id' INTO attrs FROM private.tablet_details d WHERE product_id=p.id;
    WHEN 6 THEN SELECT to_jsonb(d)-'product_id' INTO attrs FROM private.fengshui_details d WHERE product_id=p.id;
    WHEN 7 THEN SELECT to_jsonb(d)-'product_id' INTO attrs FROM private.pet_details d WHERE product_id=p.id;
  END CASE;
  RETURN jsonb_strip_nulls(result||jsonb_build_object('subtitle',p.subtitle,'description',p.description,
    'price_display_mode',p.price_display_mode,'price_note_override',p.price_note_override,'attributes',attrs,
    'religions',(SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id',r.religion_id,'name',d.name,'configuration_name',CASE WHEN p.category_id<>4 THEN nullif(btrim(r.configuration_name),'') END,
      'configuration_notes',CASE WHEN p.category_id<>4 THEN nullif(btrim(r.configuration_notes),'') END) ORDER BY r.religion_id),'[]'::jsonb)
      FROM private.product_religions r JOIN private.religions d ON d.id=r.religion_id WHERE r.product_id=p.id),
    'images',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'religion_id',i.religion_id,'bucket',i.storage_bucket,
      'path',i.storage_path,'alt',i.alt_text,'image_type',i.image_type,'design_name',i.design_name,'sort_order',i.sort_order,'preview_placeholder',private.image_placeholder(i.storage_bucket,i.storage_path))
      ORDER BY i.sort_order,i.id),'[]'::jsonb) FROM private.product_images i WHERE i.product_id=p.id),
    'inclusions',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'offer_id',i.offer_id,'religion_id',i.religion_id,
      'name',i.item_name,'quantity',i.quantity,'unit',i.unit,'description',i.description,'group_title',i.group_title) ORDER BY i.sort_order,i.id),'[]'::jsonb)
      FROM private.product_inclusions i WHERE i.product_id=p.id)));
END $function$
;

CREATE OR REPLACE FUNCTION api.catalog_product_snapshot()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $function$
 SELECT coalesce(jsonb_agg(jsonb_strip_nulls(x.obj || jsonb_build_object(
   'subtitle',p.subtitle,'description',p.description,'price_display_mode',p.price_display_mode,
   'price_note_override',p.price_note_override,
   'attributes',CASE p.category_id
     WHEN 1 THEN (SELECT to_jsonb(d)-'product_id' FROM private.burial_details d WHERE d.product_id=p.id)
     WHEN 2 THEN (SELECT to_jsonb(d)-'product_id' FROM private.burial_details d WHERE d.product_id=p.id)
     WHEN 3 THEN (SELECT to_jsonb(d)-'product_id' FROM private.niche_details d WHERE d.product_id=p.id)
     WHEN 4 THEN (SELECT to_jsonb(d)-'product_id' FROM private.funeral_details d WHERE d.product_id=p.id)
     WHEN 5 THEN (SELECT to_jsonb(d)-'product_id' FROM private.tablet_details d WHERE d.product_id=p.id)
     WHEN 6 THEN (SELECT to_jsonb(d)-'product_id' FROM private.fengshui_details d WHERE d.product_id=p.id)
     WHEN 7 THEN (SELECT to_jsonb(d)-'product_id' FROM private.pet_details d WHERE d.product_id=p.id) END,
   'religions',(SELECT coalesce(jsonb_agg(jsonb_build_object(
     'id',r.religion_id,'name',d.name,
     'configuration_name',CASE WHEN p.category_id<>4 THEN nullif(btrim(r.configuration_name),'') END,
     'configuration_notes',CASE WHEN p.category_id<>4 THEN nullif(btrim(r.configuration_notes),'') END)
     ORDER BY r.religion_id),'[]'::jsonb)
     FROM private.product_religions r JOIN private.religions d ON d.id=r.religion_id WHERE r.product_id=p.id),
   'images',(SELECT coalesce(jsonb_agg(jsonb_build_object(
     'id',i.id,'religion_id',i.religion_id,'bucket',i.storage_bucket,'path',i.storage_path,
     'alt',i.alt_text,'image_type',i.image_type,'design_name',i.design_name,'sort_order',i.sort_order,'preview_placeholder',private.image_placeholder(i.storage_bucket,i.storage_path))
     ORDER BY i.sort_order,i.id),'[]'::jsonb) FROM private.product_images i WHERE i.product_id=p.id),
   'inclusions',(SELECT coalesce(jsonb_agg(jsonb_build_object(
     'id',i.id,'offer_id',i.offer_id,'religion_id',i.religion_id,'name',i.item_name,
     'quantity',i.quantity,'unit',i.unit,'description',i.description,'group_title',i.group_title)
     ORDER BY i.sort_order,i.id),'[]'::jsonb) FROM private.product_inclusions i WHERE i.product_id=p.id)
 )) ORDER BY x.ord),'[]'::jsonb)
 FROM jsonb_array_elements(api.catalog_product_list()) WITH ORDINALITY x(obj,ord)
 JOIN private.products p ON p.id=(x.obj->>'id')::uuid;
$function$;

CREATE OR REPLACE FUNCTION api.admin_product(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; t text; items jsonb;
BEGIN
  PERFORM private.require_member(false);
  SELECT to_jsonb(p) INTO result FROM private.products p WHERE id=p_id;
  IF result IS NULL THEN RETURN NULL; END IF;
  result:=jsonb_build_object('product',result);
  FOREACH t IN ARRAY ARRAY['burial_details','niche_details','funeral_details','tablet_details','fengshui_details',
    'pet_details','product_religions','product_offers','product_inclusions','product_images'] LOOP
 IF t='product_images' THEN
 SELECT coalesce(jsonb_agg(to_jsonb(x)||jsonb_build_object('preview_placeholder',private.image_placeholder(x.storage_bucket,x.storage_path))),'[]'::jsonb) INTO items FROM private.product_images x WHERE product_id=p_id;
 ELSE
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x)),''[]''::jsonb) FROM private.%I x WHERE product_id=$1',t) INTO items USING p_id;
 END IF;
    result:=result||jsonb_build_object(t,items);
  END LOOP;
  SELECT coalesce(jsonb_agg(to_jsonb(pr)),'[]'::jsonb) INTO items FROM private.offer_prices pr
    JOIN private.product_offers o ON o.id=pr.offer_id WHERE o.product_id=p_id;
  RETURN result||jsonb_build_object('offer_prices',items);
END $$;

NOTIFY pgrst, 'reload schema';
