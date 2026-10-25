-- Deployed with explicit user approval on 2026-10-25; remote version 20261025151520.
-- Preserve global settings and all product/price data; return only each price row
-- note here. Product-specific notes are returned by catalog_product_detail.
CREATE OR REPLACE FUNCTION api.catalog_product_prices(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'offer_id',o.id,'offer_name',o.name,'religion_id',o.religion_id,
    'price_type',pr.price_type,'amount',pr.price_amount,'currency',pr.currency,
    'label',CASE WHEN p.category_id=3 THEN '最低价格' WHEN pr.price_type='pre_need' THEN '预购价格'
                WHEN pr.price_type='at_need' THEN '即用价格' ELSE '总价格' END,
    'starting_from',p.category_id=3,
    'price_note',nullif(btrim(pr.price_note),'')
    ) ORDER BY o.sort_order,o.id,pr.price_type),'[]'::jsonb)
  FROM private.products p JOIN private.product_offers o ON o.product_id=p.id
  JOIN private.offer_prices pr ON pr.offer_id=o.id WHERE p.id=p_id
$$;
