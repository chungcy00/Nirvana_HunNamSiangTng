// Auth destinations are fixed application routes. Never navigate to a supplied origin.
export function safeNext(value: string | null) {
  if (
    !value ||
    Array.from(value).some((ch) => ch.charCodeAt(0) <= 32) ||
    !value.startsWith('/') ||
    value.startsWith('//')
  )
    return '/products';
  if (
    !/^\/(?:products(?:\/[a-f0-9-]{36})?|series|religions|notices|audit|settings|yunnan)$/.test(
      value,
    )
  )
    return '/products';
  return value;
}
export function parseAuthReturn(href: string) {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.slice(1));
  const error = url.searchParams.get('error') || hash.get('error');
  const code = url.searchParams.get('code');
  const type = hash.get('type');
  const access = hash.get('access_token');
  const refresh = hash.get('refresh_token');
  return {
    error: !!error,
    code,
    flowId: url.searchParams.get('sb_flow_id'),
    tokens:
      access && refresh && ['invite', 'recovery'].includes(type || '')
        ? { access_token: access, refresh_token: refresh }
        : null,
    recovery: url.pathname === '/reset-password' || type === 'invite' || type === 'recovery',
    next: safeNext(url.searchParams.get('next')),
    cleanPath: url.pathname === '/reset-password' ? '/reset-password' : '/auth/callback',
  };
}

// A failed resend must not remove the verifier for an earlier pending email.
export async function preservePendingRecovery<T extends { error: unknown }>(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  key: string,
  send: () => Promise<T>,
) {
  const previous = storage.getItem(key);
  try {
    const result = await send();
    if (result.error && previous !== null) storage.setItem(key, previous);
    return result;
  } catch (error) {
    if (previous !== null) storage.setItem(key, previous);
    throw error;
  }
}
