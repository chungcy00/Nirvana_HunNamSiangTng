-- Public projection only: no table/data/permission changes. CREATE OR REPLACE
-- preserves the fg_catalog_reader owner, grants, RLS and publication boundary.
-- Verified locally; deployed 2026-10-26 as remote version 20261026135518.
CREATE OR REPLACE FUNCTION api.catalog_product_prices(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'offer_id',o.id,'offer_name',o.name,'religion_id',o.religion_id,
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
      'path',i.storage_path,'alt',i.alt_text,'image_type',i.image_type,'design_name',i.design_name,'sort_order',i.sort_order)
      ORDER BY i.sort_order,i.id),'[]'::jsonb) FROM private.product_images i WHERE i.product_id=p.id),
    'inclusions',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'offer_id',i.offer_id,'religion_id',i.religion_id,
      'name',i.item_name,'quantity',i.quantity,'unit',i.unit,'description',i.description,'group_title',i.group_title) ORDER BY i.sort_order,i.id),'[]'::jsonb)
      FROM private.product_inclusions i WHERE i.product_id=p.id)));
END $function$
;

NOTIFY pgrst, 'reload schema';
