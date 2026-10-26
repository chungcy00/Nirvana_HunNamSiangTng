import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftKey, readDraft, writeDraft } from '../src/draftStorage';

test('unfinished product inputs and uploaded file references survive reload without publication validation', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const original: any = {
    product: { id: 'product', updated_at: 'original-version', publication_status: 'draft' },
    product_images: [],
  };
  const bundle: any = {
    ...original,
    product: { ...original.product, name: '尚未完成的产品', description: '未发布说明' },
    offer_prices: [{ price_amount: 0 }],
    product_images: [
      { id: 'photo', storage_path: 'product/file.jpg', design_name: '', is_published: true },
    ],
  };
  const key = draftKey('admin', 'product');
  writeDraft(storage, key, original, bundle, bundle.product_images);
  const recovered = readDraft(storage, key)!;
  assert.deepEqual(recovered.bundle, bundle);
  assert.deepEqual(recovered.staged, bundle.product_images);
  assert.equal(recovered.original.product.updated_at, 'original-version');
  assert.equal(readDraft(storage, draftKey('another-user', 'product')), null);
  assert.equal(readDraft(storage, draftKey('admin', 'another-product')), null);
});
test('storage failures are not reported as successful autosaves', () => {
  assert.throws(() =>
    writeDraft(
      {
        setItem() {
          throw new Error('QuotaExceeded');
        },
      },
      'key',
      {} as any,
      {} as any,
      [],
    ),
  );
  assert.throws(() => readDraft({ getItem: () => '{broken' }, 'key'));
});
