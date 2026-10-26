import { test } from 'node:test';
import assert from 'node:assert/strict';
import { errorText } from '../src/errors';
test('database image constraint is translated with a useful recovery action', () => {
  const text = errorText({
    code: '23514',
    message:
      'new row for relation "product_images" violates check constraint "product_images_check1"',
  });
  assert(text.includes('设计名称'));
  assert(text.includes('图片管理'));
  assert(!text.includes('product_images'));
});
test('unknown service errors remain Chinese and application guidance is preserved', () => {
  assert(!errorText(new Error('Internal server error')).includes('Internal'));
  assert.equal(errorText(new Error('请填写产品名称。')), '请填写产品名称。');
  assert(errorText(new Error('Failed to fetch')).includes('网络'));
});
