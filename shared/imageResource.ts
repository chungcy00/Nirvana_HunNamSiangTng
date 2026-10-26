import { previewBucket, storedPreviewPath } from "./imageVariants";
// Share active downloads; optional short-lived admin reuse stays in memory only.
type Entry = {
  refs: number;
  controller: AbortController;
  promise: Promise<string>;
  url?: string;
  bytes?: number;
  idleTimer?: ReturnType<typeof setTimeout>;
};
const entries = new Map<string, Entry>();
export function acquireImage(
  key: string,
  load: (signal: AbortSignal) => Promise<Blob>,
  keepAliveMs = 0,
) {
  let entry = entries.get(key);
  if (!entry) {
    const controller = new AbortController();
    const created: Entry = {
      refs: 0,
      controller,
      promise: Promise.resolve(""),
    };
    created.promise = load(controller.signal).then((blob) => {
      if (controller.signal.aborted) throw new Error("Image request cancelled");
      created.bytes = blob.size;
      created.url = URL.createObjectURL(blob);
      return created.url;
    });
    entries.set(key, created);
    entry = created;
  }
  if (entry.idleTimer) {
    clearTimeout(entry.idleTimer);
    entry.idleTimer = undefined;
  }
  entry.refs++;
  let released = false;
  return {
    promise: entry.promise,
    release() {
      if (released) return;
      released = true;
      if (--entry!.refs === 0) {
        const dispose = () => {
          if (entries.get(key) !== entry || entry!.refs > 0) return;
          entries.delete(key);
          entry!.controller.abort();
          if (entry!.url) URL.revokeObjectURL(entry!.url);
        };
        // Admin views have already revalidated membership and product data before
        // rendering. Brief in-memory reuse avoids re-downloading on list/editor return.
        // Public callers retain the default immediate disposal.
        if (keepAliveMs > 0 && entry!.url && (entry!.bytes || 0) <= 4194304) {
          entry!.idleTimer = setTimeout(dispose, keepAliveMs);
          let idleBytes = [...entries.values()]
            .filter((item) => item.refs === 0)
            .reduce((sum, item) => sum + (item.bytes || 0), 0);
          for (const [oldKey, old] of entries) {
            if (entries.size <= 48 && idleBytes <= 4194304) break;
            if (old.refs === 0) {
              entries.delete(oldKey);
              if (old.idleTimer) clearTimeout(old.idleTimer);
              old.controller.abort();
              if (old.url) URL.revokeObjectURL(old.url);
              idleBytes -= old.bytes || 0;
            }
          }
        } else dispose();
      }
    },
  };
}
export function previewImageEndpoint(
  bucket: string,
  path: string,
  width: number,
) {
  return `/api/catalog-image?${new URLSearchParams({ bucket, path, width: String(width) })}`;
}
export async function fetchPreviewImage(
  bucket: string,
  path: string,
  width: number,
  headers: Record<string, string>,
  original: string,
  signal: AbortSignal,
) {
  const options = { headers, signal, cache: "no-store" as const };
  const sourceUrl = new URL(original);
  const storedUrl = `${sourceUrl.origin}/storage/v1/object/authenticated/${previewBucket}/${storedPreviewPath(bucket, path, width).split("/").map(encodeURIComponent).join("/")}`;
  const stored = await fetch(storedUrl, options);
  if (
    stored.ok &&
    /^image\/webp/.test(stored.headers.get("content-type") || "")
  )
    return stored.blob();
  if (signal.aborted) throw new Error("Image request cancelled");
  const response = await fetch(
    previewImageEndpoint(bucket, path, width),
    options,
  );
  if (
    response.ok &&
    /^image\/(png|jpeg|webp)/.test(response.headers.get("content-type") || "")
  )
    return response.blob();
  // Local Vite and older deployments can still read the authorized original.
  if (signal.aborted) throw new Error("Image request cancelled");
  const fallback = await fetch(original, options);
  if (
    !fallback.ok ||
    !/^image\/(png|jpeg|webp)/.test(fallback.headers.get("content-type") || "")
  )
    throw new Error("Image unavailable");
  return fallback.blob();
}
