-- Six non-funeral categories retain sold-out references. Publication, religion,
-- approval and niche placement remain the public access boundary.
BEGIN;
CREATE OR REPLACE FUNCTION private.public_product(p_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT EXISTS (SELECT 1 FROM private.products p JOIN private.product_categories c ON c.id=p.category_id
    WHERE p.id=p_id AND p.publication_status='published' AND c.is_active
      AND (p.category_id<>4 OR p.sale_status='available')
      AND (p.category_id<>3 OR EXISTS (SELECT 1 FROM private.niche_details d
        WHERE d.product_id=p.id AND d.placement_type IN ('indoor','outdoor'))))
$function$;
NOTIFY pgrst,'reload schema';
COMMIT;
