// Only tiny raster previews returned by the authorized catalogue may be embedded.
export function inlinePreview(value: unknown): string | undefined {
  return typeof value === 'string' && value.length <= 65536 &&
    /^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(value) ? value : undefined;
}
