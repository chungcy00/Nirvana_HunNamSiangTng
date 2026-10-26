import { previewBucket, storedPreviewPath } from "./imageVariants";
// Share a download only while its mounted consumers remain alive. No persistent image cache.
type Entry = {
  refs: number;
  controller: AbortController;
  promise: Promise<string>;
  url?: string;
};
const entries = new Map<string, Entry>();
export function acquireImage(
  key: string,
  load: (signal: AbortSignal) => Promise<Blob>,
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
      created.url = URL.createObjectURL(blob);
      return created.url;
    });
    entries.set(key, created);
    entry = created;
  }
  entry.refs++;
  let released = false;
  return {
    promise: entry.promise,
    release() {
      if (released) return;
      released = true;
      if (--entry!.refs === 0) {
        entries.delete(key);
        entry!.controller.abort();
        if (entry!.url) URL.revokeObjectURL(entry!.url);
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
