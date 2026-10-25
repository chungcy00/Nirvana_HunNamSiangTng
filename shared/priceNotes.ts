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
// A price note belongs only to that price. Product notes are returned separately;
// the global settings remain stored but never fill an empty price note.
export function resolvePriceNote(price: unknown) {
  return cleanPriceNote(price);
}
