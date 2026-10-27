-- Product availability is independent from publication. Partial sales retain
-- published designs and price plans; only the product-level flag hides a product.
BEGIN;
ALTER TABLE private.products ADD COLUMN sale_status text NOT NULL DEFAULT 'available' CHECK (sale_status IN ('available','sold_out'));
ALTER TABLE private.product_offers ADD COLUMN sale_status text NOT NULL DEFAULT 'available' CHECK (sale_status IN ('available','sold_out'));
ALTER TABLE private.product_images ADD COLUMN sale_status text NOT NULL DEFAULT 'available' CHECK (sale_status IN ('available','sold_out'));
GRANT SELECT (sale_status) ON private.products TO fg_catalog_reader;
CREATE OR REPLACE FUNCTION private.public_product(p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (SELECT 1 FROM private.products p JOIN private.product_categories c ON c.id=p.category_id
    WHERE p.id=p_id AND p.publication_status='published' AND p.sale_status='available' AND c.is_active
      AND (p.category_id<>3 OR EXISTS (SELECT 1 FROM private.niche_details d
        WHERE d.product_id=p.id AND d.placement_type IN ('indoor','outdoor'))))
$function$;

CREATE OR REPLACE FUNCTION api.catalog_product_prices(p_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'sale_status',o.sale_status,'offer_id',o.id,'offer_name',o.name,'religion_id',o.religion_id,
    'facing_override',nullif(btrim(o.facing_override),''),
    'area_sqft_override',o.area_sqft_override,'position_type',nullif(btrim(o.position_type),''),
    'price_type',pr.price_type,'amount',pr.price_amount,'currency',pr.currency,
    'label',CASE WHEN p.category_id=3 THEN '最低价格' WHEN pr.price_type='pre_need' THEN '预购价格'
                WHEN pr.price_type='at_need' THEN '即用价格' ELSE '总价格' END,
    'starting_from',p.category_id=3,
    'price_note',nullif(btrim(pr.price_note),'')
    ) ORDER BY o.sort_order,o.id,pr.price_type),'[]'::jsonb)
  FROM private.products p JOIN private.product_offers o ON o.product_id=p.id
  JOIN private.offer_prices pr ON pr.offer_id=o.id WHERE p.id=p_id
$function$;

CREATE OR REPLACE FUNCTION api.catalog_product_list(p_category smallint DEFAULT NULL::smallint, p_capacity text DEFAULT NULL::text, p_religion smallint DEFAULT NULL::smallint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT coalesce(jsonb_agg(x.obj ORDER BY x.ord,x.pid),'[]'::jsonb) FROM (
    SELECT p.id AS pid,p.sort_order AS ord,jsonb_strip_nulls(jsonb_build_object(
      'sale_status',p.sale_status,'id',p.id,'slug',p.slug,'name',p.name,'category_id',p.category_id,
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
$function$;

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
      'path',i.storage_path,'alt',i.alt_text,'image_type',i.image_type,'sale_status',i.sale_status,'design_name',i.design_name,'sort_order',i.sort_order,'preview_placeholder',private.image_placeholder(i.storage_bucket,i.storage_path))
      ORDER BY i.sort_order,i.id),'[]'::jsonb) FROM private.product_images i WHERE i.product_id=p.id),
    'inclusions',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'offer_id',i.offer_id,'religion_id',i.religion_id,
      'name',i.item_name,'quantity',i.quantity,'unit',i.unit,'description',i.description,'group_title',i.group_title) ORDER BY i.sort_order,i.id),'[]'::jsonb)
      FROM private.product_inclusions i WHERE i.product_id=p.id)));
END $function$;

CREATE OR REPLACE FUNCTION api.catalog_product_snapshot()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
     'alt',i.alt_text,'image_type',i.image_type,'sale_status',i.sale_status,'design_name',i.design_name,'sort_order',i.sort_order,'preview_placeholder',private.image_placeholder(i.storage_bucket,i.storage_path))
     ORDER BY i.sort_order,i.id),'[]'::jsonb) FROM private.product_images i WHERE i.product_id=p.id),
   'inclusions',(SELECT coalesce(jsonb_agg(jsonb_build_object(
     'id',i.id,'offer_id',i.offer_id,'religion_id',i.religion_id,'name',i.item_name,
     'quantity',i.quantity,'unit',i.unit,'description',i.description,'group_title',i.group_title)
     ORDER BY i.sort_order,i.id),'[]'::jsonb) FROM private.product_inclusions i WHERE i.product_id=p.id)
 )) ORDER BY x.ord),'[]'::jsonb)
 FROM jsonb_array_elements(api.catalog_product_list()) WITH ORDINALITY x(obj,ord)
 JOIN private.products p ON p.id=(x.obj->>'id')::uuid;
$function$;

NOTIFY pgrst,'reload schema';
COMMIT;

