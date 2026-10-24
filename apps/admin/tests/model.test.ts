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
test('renaming preserves the system-managed URL identifier in every save status', () => {
  const before = structuredClone(base);
  before.product.slug = 'existing-public-link';
  const current = structuredClone(before);
  current.product.name = '修改后的产品名称';
  // Even a stale form or accidental local change must not write a different URL.
  current.product.slug = 'do-not-save-this';
  for (const status of ['draft', 'published', 'hidden']) {
    const payload = changesFor(before, current, status);
    assert.equal(payload.p_product.name, '修改后的产品名称');
    assert(!('slug' in payload.p_product));
    assert.equal(before.product.slug, 'existing-public-link');
  }
});
test('deleted offers cascade prices without duplicate child deletion', () => {
  const b = structuredClone(base);
  b.product_offers = [];
  b.offer_prices = [];
  const payload = changesFor(base, b, 'draft');
  assert.deepEqual(payload.p_changes.product_offers.delete, ['o']);
  assert.equal(payload.p_changes.offer_prices, undefined);
});
test('approved placement enters payload while client authority remains excluded', () => {
  const b = structuredClone(base);
  b.product.updated_by = 'forged';
  b.product.sort_order = 20;
  b.niche_details = [{ product_id: 'a', theme_name: '主题', placement_type: 'indoor' }];
  const payload = changesFor(base, b, 'draft');
  assert(!('updated_by' in payload.p_product));
  assert(!('sort_order' in payload.p_product));
  assert.equal(payload.p_changes.niche_details.upsert![0].placement_type, 'indoor');
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

test('niche placement is optional in drafts and required to publish without inference', () => {
  const b = structuredClone(base);
  b.product.category_id = 3;
  b.niche_details = [{ product_id: 'a', theme_name: '聚仙楼', placement_type: null }];
  assert(!validate(b, false).some((x) => x.includes('安放环境')));
  assert(validate(b, true).some((x) => x.includes('安放环境')));
  for (const value of ['indoor', 'outdoor']) {
    b.niche_details[0].placement_type = value;
    assert(!validate(b, true).some((x) => x.includes('安放环境')));
  }
  b.niche_details[0].placement_type = 'both';
  assert(validate(b, false).some((x) => x.includes('安放环境')));
});

test('funeral photos are optional while other categories retain the primary image requirement', () => {
  const b = structuredClone(base);
  b.product.category_id = 4;
  b.product.name = '测试殡仪';
  b.product_religions = [{ religion_id: 1, is_published: true }];
  b.offer_prices = ['pre_need', 'at_need'].map((price_type) => ({
    offer_id: 'o',
    price_type,
    price_amount: 10,
    is_published: true,
  }));
  assert.deepEqual(validate(b, true), []);
  for (const category of [1, 2, 3, 5, 6, 7]) {
    b.product.category_id = category;
    assert(validate(b, true).some((x) => x.includes('主图')));
  }
  b.product.category_id = 4;
  b.offer_prices.pop();
  assert(validate(b, true).some((x) => x.includes('价格')));
});

test('funeral rejects photo references in drafts as well as publication', () => {
  const b = structuredClone(base);
  b.product.category_id = 4;
  b.product_images = [{ id: 'unexpected', is_primary: false, is_published: false }];
  assert(validate(b, false).some((x) => x.includes('殡仪服务不使用照片')));
  assert(validate(b, true).some((x) => x.includes('殡仪服务不使用照片')));
});

test('funeral method can be created, edited and cleared in the save payload', () => {
  const before = structuredClone(base);
  before.product.category_id = 4;
  let current = structuredClone(before);
  for (const method of ['cremation', 'burial', 'both', null]) {
    current.funeral_details = [{ product_id: 'a', funeral_method: method }];
    const payload = changesFor(before, current, 'draft');
    assert.equal(payload.p_changes.funeral_details.upsert![0].funeral_method, method);
    Object.assign(before, structuredClone(current));
  }
});

test('inclusion section title is saved, renamed, cleared and validated without losing scope/order', () => {
  const before = structuredClone(base),
    current = structuredClone(base);
  for (const title of ['遗体护理', ' 临终咨询 ', '']) {
    current.product_inclusions = [
      {
        id: 'i',
        product_id: 'a',
        item_name: '明细',
        group_title: title,
        sort_order: 3,
        religion_id: 1,
        offer_id: 'o',
      },
    ];
    const row = changesFor(before, current, 'draft').p_changes.product_inclusions.upsert![0];
    assert.equal(row.group_title, title.trim() || null);
    assert.equal(row.sort_order, 3);
    assert.equal(row.religion_id, 1);
    assert.equal(row.offer_id, 'o');
    Object.assign(before, structuredClone(current));
  }
  current.product_inclusions[0].group_title = '长'.repeat(121);
  assert(validate(current, false).some((x) => x.includes('120')));
});
