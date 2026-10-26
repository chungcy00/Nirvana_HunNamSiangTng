export const previewBucket = "catalog-media-previews";
export const previewWidths = [160, 480, 960, 1920] as const;
export function storedPreviewPath(bucket: string, path: string, width: number) {
  if (
    !["catalog-media-private", "catalog-media-restricted"].includes(bucket) ||
    !(previewWidths as readonly number[]).includes(width) ||
    !path ||
    path.split("/").some((part) => !part || part === "." || part === "..") ||
    /[\\\x00-\x1f]/.test(path)
  )
    throw new Error("Invalid preview source");
  return `${width}/${bucket}/${path}.webp`;
}
