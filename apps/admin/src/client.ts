import { createClient } from '@supabase/supabase-js';
import type { Bundle, References, Row } from './types';
import { preservePendingRecovery } from './auth-flow';
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = !!url && !!key;
const authStorageKey = url ? `sb-${new URL(url).hostname.split('.')[0]}-auth-token` : '';
export const supabase = configured
  ? createClient(url, key, {
      db: { schema: 'api' },
      auth: {
        storageKey: authStorageKey,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;
export async function rpc<T = any>(name: string, args: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
  if (!supabase) throw new Error('尚未配置后台服务连接。');
  const request = supabase.rpc(name, args);
  if (signal) request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return data;
}
export async function readProduct(id: string) {
  const bundle = await rpc<Bundle>('admin_product', { p_id: id });
  if (bundle)
    for (const table of ['product_offers', 'product_inclusions', 'product_images'])
      bundle[table].sort(
        (a: Row, b: Row) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.id).localeCompare(String(b.id)),
      );
  return bundle;
}
export const readReferences = () => rpc<References>('admin_reference_data');
export { errorText } from './errors';
export async function removeUnreferenced(images: Row[]) {
  if (!supabase || !images.length) return;
  const { data } = await supabase.auth.getSession();
  const response = await fetch('/api/media-cleanup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token}`,
    },
    body: JSON.stringify({
      images: images.map(({ storage_bucket, storage_path }) => ({ storage_bucket, storage_path })),
    }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || '文件清理失败，请稍后重试。');
}
export async function copyProduct(id: string, version: string) {
  const { data } = await supabase!.auth.getSession();
  const response = await fetch('/api/copy-product', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token}`,
    },
    body: JSON.stringify({ id, version }),
  });
  const body = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(body.message || '复制失败'), { status: response.status });
  return body as Bundle;
}

export function sendPasswordRecovery(email: string) {
  if (!supabase) throw new Error('尚未配置后台服务连接。');
  return preservePendingRecovery(window.localStorage, authStorageKey + '-code-verifier', () =>
    supabase!.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    }),
  );
}
