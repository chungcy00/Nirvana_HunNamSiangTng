import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNext, parseAuthReturn, preservePendingRecovery } from '../src/auth-flow';
test('Auth return rejects external, protocol-relative, encoded and backslash destinations', () => {
  for (const value of [
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/%2f%2fevil.test',
    '/products?next=https://evil.test',
    '/products\n',
    'javascript:alert(1)',
    '/series\n',
  ])
    assert.equal(safeNext(value), '/products');
  assert.equal(safeNext('/series'), '/series');
  assert.equal(
    safeNext('/products/12345678-1234-1234-1234-123456789abc'),
    '/products/12345678-1234-1234-1234-123456789abc',
  );
});
test('PKCE recovery and legacy invitation return are explicit, secrets excluded from clean path', () => {
  const code = parseAuthReturn('http://127.0.0.1:3002/reset-password?code=test&next=//evil.test');
  assert(code.recovery);
  assert.equal(code.code, 'test');
  assert.equal(code.cleanPath, '/reset-password');
  assert.equal(code.next, '/products');
  const invite = parseAuthReturn(
    'http://127.0.0.1:3002/auth/callback#access_token=test&refresh_token=test-refresh&type=invite',
  );
  assert(invite.recovery);
  assert(invite.tokens);
  assert.equal(invite.cleanPath, '/auth/callback');
  assert.equal(
    parseAuthReturn(
      'http://127.0.0.1:3002/auth/callback#access_token=test&refresh_token=test-refresh&type=unknown',
    ).tokens,
    null,
  );
  assert.equal(
    parseAuthReturn('http://127.0.0.1:3002/auth/callback#error=access_denied').error,
    true,
  );
});

test('PKCE flow identifier survives URL cleanup for exact verifier selection', () => {
  const flow = parseAuthReturn(
    'http://127.0.0.1:3002/reset-password?code=test&sb_flow_id=flow-123',
  );
  assert.equal(flow.flowId, 'flow-123');
  assert.equal(flow.cleanPath, '/reset-password');
});

test('Failed recovery resend preserves an earlier usable verifier; successful resend uses new verifier', async () => {
  let value = 'earlier';
  const storage = {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
  const failed = await preservePendingRecovery(storage, 'test', async () => {
    value = 'removed';
    return { error: { status: 429 } };
  });
  assert(failed.error);
  assert.equal(value, 'earlier');
  await preservePendingRecovery(storage, 'test', async () => {
    value = 'new-valid';
    return { error: null };
  });
  assert.equal(value, 'new-valid');
});

test('Pasted recovery links accept only this project and recovery type, never redirect', async () => {
  const { recoveryTokenHash } = await import('../src/auth-flow');
  const origin = 'https://example.supabase.co';
  const token = 'pkce_' + 'a'.repeat(64);
  const link = origin + '/auth/v1/verify?type=recovery&token=' + token;
  assert.equal(recoveryTokenHash(link + '&redirect_to=https://evil.test', origin), token);
  for (const invalid of [
    link.replace(origin, 'https://evil.test'),
    link.replace('recovery', 'invite'),
    link + '&token=' + token,
    link.replace('/verify', '/other'),
    link + '#access_token=bad',
  ]) {
    assert.throws(() => recoveryTokenHash(invalid, origin));
  }
});
