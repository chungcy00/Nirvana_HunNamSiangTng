import { createClient } from '@supabase/supabase-js';
import type { Bundle, References, Row } from './types';
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured = !!url && !!key;
export const supabase = configured
  ? createClient(url, key, {
      db: { schema: 'api' },
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;
export async function rpc<T = any>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error('尚未配置 Supabase 连接。');
  const { data, error } = await supabase.rpc(name, args);
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
export function errorText(error: any) {
  if (error?.code === 'PT409' || error?.status === 409)
    return '资料已被其他操作修改，本次未覆盖。请保留当前修改并重新载入核对。';
  if (error?.code === '42501') return '当前账号无权执行此操作。请确认账号仍为有效后台成员。';
  if (error?.code === '23505') return '名称、编号或关联已经存在，请检查重复资料。';
  if (error?.code === '23503')
    return '仍有关联资料，或关联对象无效。请先调整对应图片、方案或宗教。';
  return error?.message || '操作失败，修改仍保留，请检查网络后重试。';
}
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
