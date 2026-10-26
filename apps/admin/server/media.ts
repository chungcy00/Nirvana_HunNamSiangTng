import { previewBucket, previewWidths, storedPreviewPath } from '../../../shared/imageVariants.js';
import { storeImagePreviews } from './preparePreviews.js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
type Env = {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  [key: string]: string | undefined;
};
type Client = SupabaseClient<any, any, any>;
type Media = { storage_bucket: string; storage_path: string };
function fail(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}
export async function authorize(token: string, env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY || !env.SUPABASE_SERVICE_ROLE_KEY)
    throw fail('服务端文件功能尚未配置，请联系维护人员。', 503);
  const user = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    db: { schema: 'api' },
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const identity = await user.auth.getUser(token);
  if (identity.error || !identity.data.user) throw fail('请重新登录。', 401);
  const member = await user.rpc('current_catalog_member');
  if (member.error) throw fail('当前账号无有效后台权限。', 403);
  const storage = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { user, storage };
}
export async function cleanup(user: Client, storage: Client, images: Media[]) {
  const pending: Media[] = [];
  for (const bucket of ['catalog-media-private', 'catalog-media-restricted']) {
    const paths = images.filter((x) => x.storage_bucket === bucket).map((x) => x.storage_path);
    if (!paths.length) continue;
    const candidates = await user.rpc('admin_cleanup_candidates', {
      p_bucket: bucket,
      p_paths: paths,
    });
    if (candidates.error) {
      pending.push(...images.filter((x) => x.storage_bucket === bucket));
      continue;
    }
    const permitted: string[] = candidates.data;
    // A fresh permission check precedes every privileged operation. The caller
    // cannot use the service key or select a different bucket/server URL.
    const current = await user.rpc('current_catalog_member');
    if (current.error) {
      pending.push(...images.filter((x) => x.storage_bucket === bucket));
      continue;
    }
    if (permitted.length) {
      const result = await storage.storage.from(bucket).remove(permitted);
      if (!result.error) {
        for (const path of permitted) {
          const cached = await storage.schema('api').rpc('cache_image_placeholder', {
            p_bucket: bucket, p_path: path, p_data: null,
          });
          if (cached.error) pending.push({storage_bucket:bucket,storage_path:path});
        }
        const previews = await storage.storage
          .from(previewBucket)
          .remove(
            permitted.flatMap((path) =>
              previewWidths.map((width) => storedPreviewPath(bucket, path, width)),
            ),
          );
        if (previews.error)
          pending.push(
            ...images.filter(
              (x) => x.storage_bucket === bucket && permitted.includes(x.storage_path),
            ),
          );
      }
      if (result.error)
        pending.push(
          ...permitted.map((storage_path) => ({ storage_bucket: bucket, storage_path })),
        );
    }
  }
  return pending;
}
export async function duplicate(user: Client, storage: Client, id: string, version: string) {
  const source = await user.rpc('admin_product', { p_id: id });
  if (source.error) throw fail(source.error.message, 403);
  if (!source.data) throw fail('源产品不存在。', 404);
  if (source.data.product.updated_at !== version) throw fail('源产品已修改，请重新载入。', 409);
  const target = randomUUID(),
    files: Media[] = [],
    mapping: any[] = [];
  try {
    for (const image of source.data.product_images) {
      if (!['catalog-media-private', 'catalog-media-restricted'].includes(image.storage_bucket))
        throw fail('源图片储存空间不在允许复制的范围。', 422);
      const current = await user.rpc('current_catalog_member');
      if (current.error) throw fail('后台权限已失效。', 403);
      const read = await user.storage.from(image.storage_bucket).download(image.storage_path);
      if (read.error || !read.data) throw fail('无法读取源图片，未建立新产品。', 422);
      const ext = image.storage_path.split('.').at(-1);
      if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) throw fail('源图片格式不受支持。', 422);
      const path = `${target}/${randomUUID()}.${ext}`;
      const result = await storage.storage
        .from(image.storage_bucket)
        .upload(path, read.data, { contentType: read.data.type, upsert: false, cacheControl: '0' });
      if (result.error) throw fail('图片副本上传失败，未建立新产品。', 502);
      files.push({ storage_bucket: image.storage_bucket, storage_path: path });
      await storeImagePreviews(
        Buffer.from(await read.data.arrayBuffer()),
        image.storage_bucket,
        path,
        async (name, data) => {
          const preview = await storage.storage
            .from(previewBucket)
            .upload(name, data, { contentType: 'image/webp', upsert: false, cacheControl: '0' });
          if (preview.error) throw fail('图片预览副本未完成，请重试。', 422);
          if (name.startsWith('160/')) {
            const cached = await storage.schema('api').rpc('cache_image_placeholder', {
              p_bucket:image.storage_bucket,p_path:path,p_data:`data:image/webp;base64,${data.toString('base64')}`,
            });
            if (cached.error) throw fail('图片预览副本未完成，请重试。',422);
          }
        },
      );
      mapping.push({ source_id: image.id, bucket: image.storage_bucket, path });
    }
    const copy = await user.rpc('admin_copy_product', {
      p_source: id,
      p_expected_updated_at: version,
      p_target: target,
      p_images: mapping,
    });
    if (copy.error) throw fail(copy.error.message, copy.error.code === 'PT409' ? 409 : 422);
    return copy.data;
  } catch (error) {
    // A lost success response is ambiguous: candidate RPC protects any files that
    // were committed and are now referenced. Never blindly delete prepared files.
    const pending = await cleanup(user, storage, files);
    throw Object.assign(error instanceof Error ? error : new Error('复制失败。'), {
      cleanupPending: pending,
    });
  }
}
export async function handler(
  req: IncomingMessage & { body?: any },
  res: ServerResponse,
  env: Env = process.env,
) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'POST') throw fail('仅接受 POST。', 405);
    // No permissive CORS: these endpoints are for the same-origin admin only.
    const origin = req.headers.origin;
    if (origin && new URL(origin).host !== req.headers.host) throw fail('请求来源不允许。', 403);
    const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) throw fail('请先登录。', 401);
    let body = req.body;
    if (body === undefined) {
      let data = '';
      for await (const chunk of req) {
        data += chunk.toString();
        if (Buffer.byteLength(data) > 131072) throw fail('请求过大。', 413);
      }
      try {
        body = JSON.parse(data);
      } catch {
        throw fail('请求格式无效。', 400);
      }
    } else if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        throw fail('请求格式无效。', 400);
      }
    }
    const { user, storage } = await authorize(token, env);
    if (req.url?.split('?')[0] === '/api/media-cleanup') {
      if (
        !Array.isArray(body.images) ||
        body.images.length > 1000 ||
        body.images.some(
          (x: any) =>
            typeof x?.storage_bucket !== 'string' ||
            typeof x?.storage_path !== 'string' ||
            !['catalog-media-private', 'catalog-media-restricted'].includes(x.storage_bucket),
        )
      )
        throw fail('无效文件清理范围。', 400);
      const pending = await cleanup(user, storage, body.images);
      res.statusCode = pending.length ? 502 : 200;
      res.end(
        JSON.stringify({
          pending,
          message: pending.length ? '部分无引用文件清理失败，请重试。' : '清理完成。',
        }),
      );
    } else {
      if (
        !/^[a-f0-9-]{36}$/i.test(body.id) ||
        typeof body.version !== 'string' ||
        !Number.isFinite(Date.parse(body.version))
      )
        throw fail('无效产品或版本。', 400);
      const data = await duplicate(user, storage, body.id, body.version);
      res.statusCode = 200;
      res.end(JSON.stringify(data));
    }
  } catch (e: any) {
    res.statusCode = e.status || 500;
    res.end(
      JSON.stringify({
        message: e.status ? e.message : '文件操作失败，请重试。',
        cleanupPending: e.cleanupPending || [],
      }),
    );
  }
}
