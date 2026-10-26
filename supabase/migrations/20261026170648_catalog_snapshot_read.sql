-- Return one complete, RLS-filtered catalogue in a single database statement.
-- Uses the existing restricted reader role and the same public projection fields.
CREATE FUNCTION api.catalog_product_snapshot()
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
     'alt',i.alt_text,'image_type',i.image_type,'design_name',i.design_name,'sort_order',i.sort_order)
     ORDER BY i.sort_order,i.id),'[]'::jsonb) FROM private.product_images i WHERE i.product_id=p.id),
   'inclusions',(SELECT coalesce(jsonb_agg(jsonb_build_object(
     'id',i.id,'offer_id',i.offer_id,'religion_id',i.religion_id,'name',i.item_name,
     'quantity',i.quantity,'unit',i.unit,'description',i.description,'group_title',i.group_title)
     ORDER BY i.sort_order,i.id),'[]'::jsonb) FROM private.product_inclusions i WHERE i.product_id=p.id)
 )) ORDER BY x.ord),'[]'::jsonb)
 FROM jsonb_array_elements(api.catalog_product_list()) WITH ORDINALITY x(obj,ord)
 JOIN private.products p ON p.id=(x.obj->>'id')::uuid;
$function$;
GRANT CREATE ON SCHEMA api TO fg_catalog_reader;
ALTER FUNCTION api.catalog_product_snapshot() OWNER TO fg_catalog_reader;
REVOKE CREATE ON SCHEMA api FROM fg_catalog_reader;
REVOKE ALL ON FUNCTION api.catalog_product_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.catalog_product_snapshot() TO anon,authenticated;
NOTIFY pgrst,'reload schema';
