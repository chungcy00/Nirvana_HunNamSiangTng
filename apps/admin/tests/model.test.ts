import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changesFor, reclassify, validate } from '../src/model';
const base: any = {
  product: {
    id: 'a',
    category_id: 2,
    updated_at: '2026-01-01',
    publication_status: 'draft',
    name: null,
  },
  product_offers: [{ id: 'o', product_id: 'a', offer_code: 'default', is_active: true }],
  offer_prices: [
    {
      id: 'price',
      offer_id: 'o',
      price_type: 'standard',
      price_amount: 10,
      is_published: false,
      updated_at: 'server',
    },
  ],
  product_inclusions: [],
  product_images: [],
  product_religions: [],
  burial_details: [],
  niche_details: [],
  funeral_details: [],
  tablet_details: [],
  fengshui_details: [],
  pet_details: [],
};
test('serializer sends only changed fields, preserves omitted counterpart prices', () => {
  const b = structuredClone(base);
  b.product.name = '新名称';
  b.offer_prices[0].price_amount = 20;
  const payload = changesFor(base, b, 'draft');
  assert.deepEqual(payload.p_product, { name: '新名称', publication_status: 'draft' });
  assert.equal((payload.p_changes.offer_prices.upsert![0] as any).updated_at, undefined);
  assert.equal(payload.p_expected_updated_at, base.product.updated_at);
  assert(!('sort_order' in payload.p_product));
});
test('deleted offers cascade prices without duplicate child deletion', () => {
  const b = structuredClone(base);
  b.product_offers = [];
  b.offer_prices = [];
  const payload = changesFor(base, b, 'draft');
  assert.deepEqual(payload.p_changes.product_offers.delete, ['o']);
  assert.equal(payload.p_changes.offer_prices, undefined);
});
test('placement proposal and client authority never enter write payload', () => {
  const b = structuredClone(base);
  b.product.updated_by = 'forged';
  b.product.sort_order = 20;
  b.niche_details = [{ product_id: 'a', theme_name: '主题', placement_type: 'indoor' }];
  const payload = changesFor(base, b, 'draft');
  assert(!('updated_by' in payload.p_product));
  assert(!('sort_order' in payload.p_product));
  assert(!('placement_type' in payload.p_changes.niche_details.upsert![0]));
});
test('draft may lack publication data while zero prices are refused', () => {
  assert.deepEqual(validate(base, false), []);
  assert(validate(base, true).length >= 3);
  const b = structuredClone(base);
  b.offer_prices[0].price_amount = 0;
  assert(validate(b, false).some((x) => x.includes('大于零')));
});
test('reclassification clears incompatible attributes and funeral prices', () => {
  const b = structuredClone(base);
  b.burial_details = [{ product_id: 'a', area_sqft: 100 }];
  b.product_inclusions = [{ id: 'i', offer_id: 'o' }];
  const next = reclassify(b, 4);
  assert.deepEqual(next.burial_details, []);
  assert.deepEqual(next.offer_prices, []);
  assert.deepEqual(next.product_inclusions, []);
  assert.equal(next.product.product_form, 'other');
  assert.equal(next.product.capacity_group, null);
});
