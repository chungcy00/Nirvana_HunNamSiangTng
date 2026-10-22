import { type Bundle, type Row, tableFor } from './types';
const productFields = [
  'name',
  'slug',
  'category_id',
  'series_id',
  'product_code',
  'product_form',
  'capacity_group',
  'capacity_count',
  'subtitle',
  'description',
  'price_note_override',
  'internal_notes',
  'source_reference',
  'publication_status',
];
const childFields: Record<string, string[]> = {
  burial_details: [
    'product_id',
    'facing',
    'area_sqft',
    'length_ft',
    'width_ft',
    'urn_capacity',
    'cremation_count',
    'burial_notes',
  ],
  niche_details: ['product_id', 'theme_name', 'niche_style', 'niche_notes', 'placement_type'],
  funeral_details: [
    'product_id',
    'duration_days',
    'duration_nights',
    'funeral_method',
    'service_venue',
    'terms_summary',
  ],
  tablet_details: ['product_id', 'tablet_type', 'tablet_capacity', 'facing', 'tablet_notes'],
  fengshui_details: ['product_id', 'fengshui_type', 'facing', 'area_sqft', 'configuration_notes'],
  pet_details: [
    'product_id',
    'pet_burial_method',
    'pet_size_class',
    'length_ft',
    'width_ft',
    'area_sqft',
    'facing',
    'pet_notes',
  ],
  product_religions: [
    'id',
    'product_id',
    'religion_id',
    'configuration_name',
    'configuration_notes',
    'is_published',
  ],
  product_offers: [
    'id',
    'product_id',
    'offer_code',
    'name',
    'religion_id',
    'position_type',
    'facing_override',
    'area_sqft_override',
    'sort_order',
    'is_active',
  ],
  offer_prices: [
    'id',
    'offer_id',
    'price_type',
    'price_amount',
    'currency',
    'price_note',
    'is_published',
  ],
  product_inclusions: [
    'id',
    'product_id',
    'offer_id',
    'religion_id',
    'item_name',
    'quantity',
    'unit',
    'description',
    'sort_order',
  ],
  product_images: [
    'id',
    'product_id',
    'religion_id',
    'storage_bucket',
    'storage_path',
    'image_type',
    'alt_text',
    'design_name',
    'sort_order',
    'is_primary',
    'is_published',
  ],
};
export const uuid = () => crypto.randomUUID();
function pick(row: Row, fields: string[]) {
  return Object.fromEntries(fields.filter((k) => row[k] !== undefined).map((k) => [k, row[k]]));
}
export function changesFor(before: Bundle, current: Bundle, status: string) {
  const changes: Record<string, { upsert?: Row[]; delete?: string[] }> = {};
  for (const [table, fields] of Object.entries(childFields)) {
    const old: Row[] = before[table] || [],
      now: Row[] = current[table] || [],
      key = table.endsWith('_details') ? 'product_id' : 'id';
    const removed = old
      .filter((r) => !now.some((x) => x[key] === r[key]))
      .filter(
        (r) =>
          table !== 'offer_prices' || current.product_offers.some((o: Row) => o.id === r.offer_id),
      )
      .map((r) => r[key]);
    const changed = now.filter((r) => {
      const prev = old.find((x) => x[key] === r[key]);
      return !prev || JSON.stringify(pick(prev, fields)) !== JSON.stringify(pick(r, fields));
    });
    if (changed.length || removed.length)
      changes[table] = {
        ...(changed.length ? { upsert: changed.map((r) => pick(r, fields) as Row) } : {}),
        ...(removed.length ? { delete: removed } : {}),
      };
  }
  const product = Object.fromEntries(
    productFields
      .filter((k) => k === 'publication_status' || current.product[k] !== before.product[k])
      .map((k) => [k, k === 'publication_status' ? status : current.product[k]]),
  );
  return {
    p_id: current.product.id,
    p_expected_updated_at: before.product.updated_at,
    p_product: product,
    p_changes: changes,
  };
}
export function validate(bundle: Bundle, publishing: boolean) {
  const p = bundle.product,
    errors: string[] = [];
  if (!p.category_id) errors.push('请选择产品类别。');
  for (const price of bundle.offer_prices || [])
    if (!Number.isFinite(Number(price.price_amount)) || Number(price.price_amount) <= 0)
      errors.push('已填写的价格必须大于零；未有报价时请移除该价格行。');
  const placement = bundle.niche_details?.[0]?.placement_type;
  if (p.category_id === 3 && placement != null && !['indoor', 'outdoor'].includes(placement))
    errors.push('安放环境仅可选择室内或室外。');
  if (!publishing) return errors;
  if (p.category_id === 3 && !['indoor', 'outdoor'].includes(placement))
    errors.push('发布骨灰位前请选择安放环境。');
  if (!p.name?.trim()) errors.push('发布前请填写产品名称。');
  if (p.category_id <= 3 && !p.capacity_group) errors.push('发布前请选择使用人数。');
  if (p.category_id <= 2 && !p.product_form) errors.push('发布前请选择地段、配套或其他产品类型。');
  if (p.category_id <= 4 && !bundle.product_religions.some((r: Row) => r.is_published))
    errors.push('发布前至少公开一项适用宗教配置。');
  if (
    bundle.product_images.filter((r: Row) => r.is_primary && r.is_published && !r.religion_id)
      .length !== 1
  )
    errors.push('发布前须有一张已上传并批准公开的共通主图。');
  const offers = bundle.product_offers.filter((r: Row) => r.is_active);
  if (!offers.length) errors.push('请启用至少一个价格方案。');
  for (const offer of offers) {
    const types = p.category_id === 4 ? ['pre_need', 'at_need'] : ['standard'];
    for (const type of types)
      if (
        !bundle.offer_prices.some(
          (r: Row) =>
            r.offer_id === offer.id &&
            r.price_type === type &&
            r.is_published &&
            Number(r.price_amount) > 0,
        )
      )
        errors.push(
          p.category_id === 4
            ? `请填写并公开${type === 'pre_need' ? '预购价格' : '即用价格'}。`
            : '请填写并公开方案售价。',
        );
  }
  return [...new Set(errors)];
}
export function reclassify(b: Bundle, category: number) {
  const next = structuredClone(b);
  const old = next.product.category_id;
  for (const t of [
    'burial_details',
    'niche_details',
    'funeral_details',
    'tablet_details',
    'fengshui_details',
    'pet_details',
  ])
    if (t !== tableFor(category)) next[t] = [];
  next.product.category_id = category;
  if (category > 3) {
    next.product.capacity_group = null;
    next.product.capacity_count = null;
  } else if (old !== category) {
    next.product.capacity_group = null;
    next.product.capacity_count = null;
  }
  next.product.product_form = category <= 2 ? null : 'other';
  if (category === 4 || old === 4 || category === 3) {
    next.offer_prices = [];
    next.product_inclusions = next.product_inclusions.filter((x: Row) => !x.offer_id);
    next.product_offers = [
      {
        id: uuid(),
        product_id: next.product.id,
        offer_code: 'default',
        name: '默认方案',
        is_active: true,
        religion_id: null,
        sort_order: 0,
      },
    ];
  }
  return next;
}
export function priceLines(b: Bundle) {
  return b.offer_prices
    .filter((x: Row) => b.product_offers.some((o: Row) => o.id === x.offer_id && o.is_active))
    .map((x: Row) => ({
      ...x,
      label:
        b.product.category_id === 4
          ? x.price_type === 'pre_need'
            ? '预购价格'
            : '即用价格'
          : b.product.category_id === 3
            ? '最低价格'
            : b.product_offers.find((o: Row) => o.id === x.offer_id)?.name || '实际售价',
    }));
}
