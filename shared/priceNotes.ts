export const stampDutyNote = "以上价格未包含印花税";
export function cleanPriceNote(value: unknown): string {
  if (typeof value !== "string") return "";
  return [
    ...new Set(
      value
        .split(/\r?\n/)
        .map((line) => {
          const text = line.trim();
          return /^以上价格未包含印花税[。.]?$/.test(text)
            ? stampDutyNote
            : text;
        })
        .filter(Boolean),
    ),
  ].join("\n");
}
// Same precedence as api.catalog_product_prices: price > product > active notices.
export function resolvePriceNote(
  price: unknown,
  product: unknown,
  notices: readonly string[],
) {
  return (
    cleanPriceNote(price) ||
    cleanPriceNote(product) ||
    cleanPriceNote(notices.join("\n"))
  );
}
