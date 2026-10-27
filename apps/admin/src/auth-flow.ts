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
    !/^\/(?:products(?:\/[a-f0-9-]{36})?|series|religions|notices|audit|settings|yunnan(?:\/[a-f0-9-]{36})?)$/.test(
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

// Extract only the bearer token from this project's official recovery URL.
// Never visit a pasted address or use its redirect target.
export function recoveryTokenHash(value: string, projectUrl: string) {
  try {
    const link = new URL(value.trim());
    const project = new URL(projectUrl);
    const token = link.searchParams.get('token');
    if (
      link.origin !== project.origin ||
      link.username ||
      link.password ||
      link.hash ||
      link.pathname !== '/auth/v1/verify' ||
      link.searchParams.getAll('token').length !== 1 ||
      link.searchParams.getAll('type').length !== 1 ||
      link.searchParams.get('type') !== 'recovery' ||
      !token ||
      !/^(?:pkce_)?[a-f0-9]{40,128}$/.test(token)
    )
      throw new Error();
    return token;
  } catch {
    throw new Error('请粘贴本项目最新恢复邮件中按钮的完整链接地址。');
  }
}
