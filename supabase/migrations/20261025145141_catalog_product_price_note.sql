-- Deployed with explicit user approval on 2026-10-25; remote version 20261025151509.
-- Return the existing product-specific note independently of resolved price notes.
-- Existing publication guards, permissions, price resolution and data are unchanged.
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
    'images',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'religion_id',i.religion_id,'bucket',i.storage_bucket,
      'path',i.storage_path,'alt',i.alt_text,'image_type',i.image_type,'design_name',i.design_name,'sort_order',i.sort_order)
      ORDER BY i.sort_order,i.id),'[]'::jsonb) FROM private.product_images i WHERE i.product_id=p.id),
    'inclusions',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'offer_id',i.offer_id,'religion_id',i.religion_id,
      'name',i.item_name,'quantity',i.quantity,'unit',i.unit,'description',i.description,'group_title',i.group_title) ORDER BY i.sort_order,i.id),'[]'::jsonb)
      FROM private.product_inclusions i WHERE i.product_id=p.id)));
END $function$
;
