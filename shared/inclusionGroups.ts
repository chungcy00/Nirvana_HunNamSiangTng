// Keep section order by first occurrence and item order within each section.
// An absent title remains an ordinary list for existing products.
export function groupInclusions<T>(
  items: readonly T[],
  title: (item: T) => unknown,
) {
  const groups: { title: string; items: T[] }[] = [];
  for (const item of items) {
    const value = title(item);
    const name = typeof value === "string" ? value.trim() : "";
    let group = groups.find((g) => g.title === name);
    if (!group) {
      group = { title: name, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}
