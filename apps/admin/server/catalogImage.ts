import sharp from 'sharp';
import { previewBucket, storedPreviewPath } from '../../../shared/imageVariants.js';
import type { IncomingMessage, ServerResponse } from 'node:http';

type Environment = Record<string, string | undefined>;
type Dependencies = { fetch?: typeof fetch; env?: Environment };
const widths = new Set([160, 480, 960, 1920]);
const buckets = new Set(['catalog-media-private', 'catalog-media-restricted']);
export function createImageHandler(deps: Dependencies = {}) {
  const read = deps.fetch || fetch;
  const cache = new Map<string, { promise: Promise<Buffer>; size: number }>();
  let cacheBytes = 0;
  return async function handler(req: IncomingMessage, res: ServerResponse) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      if (req.method !== 'GET') {
        res.statusCode = 405;
        res.end();
        return;
      }
      const query = new URL(req.url || '', 'https://local.invalid').searchParams;
      const bucket = query.get('bucket') || '',
        path = query.get('path') || '';
      const width = Number(query.get('width'));
      if (
        !buckets.has(bucket) ||
        !widths.has(width) ||
        !path ||
        path.length > 512 ||
        /[\\\x00-\x1f]/.test(path) ||
        path.split('/').some((s) => !s || s === '.' || s === '..')
      ) {
        res.statusCode = 400;
        res.end();
        return;
      }
      const env = deps.env || process.env;
      const base = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
      const key = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;
      let publicKey = key?.startsWith('sb_publishable_') || false;
      if (key?.startsWith('eyJ')) {
        try {
          publicKey =
            JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon';
        } catch {
          publicKey = false;
        }
      }
      if (!base || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(base) || !key || !publicKey) {
        res.statusCode = 503;
        res.end();
        return;
      }
      // Use the caller's identity, never a privileged storage key or signed URL.
      const headers: Record<string, string> = { apikey: key };
      if (req.headers.authorization) headers.Authorization = req.headers.authorization;
      else if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
      const url = `${base}/storage/v1/object/authenticated/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
      // A fresh storage/RLS check precedes EVERY response, including a warm resize cache hit.
      const head = await read(url, {
        method: 'HEAD',
        headers,
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
      });
      if (!head.ok) {
        res.statusCode = 404;
        res.end();
        return;
      }
      if (
        !/^image\/(jpeg|png|webp)(;|$)/.test(head.headers.get('content-type') || '') ||
        Number(head.headers.get('content-length')) > 10485760
      ) {
        res.statusCode = 415;
        res.end();
        return;
      }
      const version = head.headers.get('etag') || head.headers.get('last-modified');
      const id = `${url}:${width}:${version}`;
      let output = version ? cache.get(id)?.promise : undefined;
      if (!output) {
        output = (async () => {
          const response = await read(url, {
            headers,
            cache: 'no-store',
            signal: AbortSignal.timeout(15000),
          });
          if (!response.ok) throw new Error('Image unavailable');
          const input = Buffer.from(await response.arrayBuffer());
          if (input.length > 10485760) throw new Error('Image too large');
          return sharp(input, { limitInputPixels: 50000000 })
            .rotate()
            .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: width >= 1920 ? 88 : 80 })
            .toBuffer();
        })();
        if (version) {
          const entry = { promise: output, size: 0 };
          cache.set(id, entry);
          void output.then(
            (data) => {
              if (cache.get(id) !== entry) return;
              entry.size = data.length;
              cacheBytes += data.length;
              // Bound process memory; authorization decisions and tokens are never cached.
              while (cache.size > 48 || cacheBytes > 16777216) {
                const first = cache.keys().next().value;
                if (!first) break;
                const old = cache.get(first)!;
                cache.delete(first);
                cacheBytes -= old.size;
              }
            },
            () => {
              cache.delete(id);
            },
          );
        }
      }
      const data = await output;
      // The admin deployment may persist this exact derivative after the caller's
      // original-file permission check above. It never changes an original object.
      if (env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const variant = storedPreviewPath(bucket, path, width);
          const stored = await read(
            `${base}/storage/v1/object/${previewBucket}/${variant.split('/').map(encodeURIComponent).join('/')}`,
            {
              method: 'POST',
              headers: {
                apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'image/webp',
                'Cache-Control': 'max-age=0',
                'x-upsert': 'false',
              },
              body: new Uint8Array(data),
              signal: AbortSignal.timeout(12000),
            },
          );
          res.setHeader('X-Preview-Store-Status',String(stored.status));
          if (stored.ok || stored.status === 409 || stored.status === 400) {
            // Storage reports an immutable duplicate as 400 in some API versions.
            const exists =
              stored.ok ||
              (
                await read(
                  `${base}/storage/v1/object/authenticated/${previewBucket}/${variant.split('/').map(encodeURIComponent).join('/')}`,
                  {
                    method: 'HEAD',
                    headers,
                    cache: 'no-store',
                    signal: AbortSignal.timeout(12000),
                  },
                )
              ).ok;
            if (exists) res.setHeader('X-Preview-Stored', '1');
          }
        } catch {
          /* The authorized generated image remains usable if preview storage is temporarily unavailable. */
        }
      }
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Content-Length', data.length);
      res.end(data);
    } catch {
      res.statusCode = 502;
      res.end();
    }
  };
}
export const handler = createImageHandler();
