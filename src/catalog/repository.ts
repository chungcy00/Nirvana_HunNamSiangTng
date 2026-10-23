import type {
  CatalogSnapshot,
  CatalogFilter,
  Category,
  OrderedRecord,
  Product,
} from "../types";

// Order within the supplied sibling list, never by creation time or array position.
export function sortRecords<T extends OrderedRecord>(
  records: readonly T[],
): T[] {
  return [...records].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
}
export function nextSortOrder(
  records: readonly { sortOrder: number }[],
): number {
  return Math.max(0, ...records.map((record) => record.sortOrder)) + 1;
}
// Pure draft operation for a future editor. Persistence must save the whole list atomically.
export function reorderRecords<T extends OrderedRecord>(
  siblings: readonly T[],
  ids: readonly string[],
): T[] {
  if (
    ids.length !== siblings.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !siblings.some((item) => item.id === id))
  ) {
    throw new Error("排序必须包含当前同级列表的全部项目，且不能重复。");
  }
  return ids.map((id, index) => ({
    ...siblings.find((item) => item.id === id)!,
    sortOrder: index + 1,
  }));
}
function indexById<T extends { id: string }>(
  items: readonly T[],
): Map<string, T> {
  const map = new Map(items.map((item) => [item.id, item]));
  if (map.size !== items.length) throw new Error("目录资料存在重复 ID。");
  return map;
}

// Read boundary for the public website. This is presentation filtering, not database security.
// Future remote adapters must return only data the visitor is authorized to receive.
export function createCatalog(snapshot: CatalogSnapshot) {
  function unique(values: string[]) {
    if (new Set(values).size !== values.length)
      throw new Error("目录资料存在重复网址。");
  }
  unique(snapshot.providers.map((item) => item.slug));
  unique(snapshot.categories.map((item) => `${item.providerId}/${item.slug}`));
  unique(snapshot.products.map((item) => `${item.providerId}/${item.slug}`));
  const providers = indexById(snapshot.providers);
  const categories = indexById(snapshot.categories);
  const products = indexById(snapshot.products);
  const getProvider = (id: string) => {
    const provider = providers.get(id);
    return provider?.status === "published" ? provider : undefined;
  };
  function getCategory(id: string): Category | undefined {
    const category = categories.get(id);
    if (!category || !getProvider(category.providerId)) return undefined;
    const visited = new Set<string>();
    let current: Category | undefined = category;
    while (current) {
      if (
        visited.has(current.id) ||
        current.status !== "published" ||
        current.providerId !== category.providerId
      )
        return undefined;
      visited.add(current.id);
      if (current.parentId === null) return category;
      current = categories.get(current.parentId);
    }
    return undefined;
  }
  function isWithin(id: string, ancestorId: string): boolean {
    let current = getCategory(id);
    while (current) {
      if (current.id === ancestorId) return true;
      current = current.parentId ? getCategory(current.parentId) : undefined;
    }
    return false;
  }
  function getProduct(id: string): Product | undefined {
    const product = products.get(id);
    if (
      !product ||
      product.status !== "published" ||
      !getProvider(product.providerId)
    )
      return undefined;
    const primary = getCategory(product.categoryId);
    if (!primary || primary.providerId !== product.providerId) return undefined;
    return product;
  }
  function getChildren(parentId: string) {
    return sortRecords(
      snapshot.categories.filter(
        (category) =>
          category.parentId === parentId && !!getCategory(category.id),
      ),
    );
  }
  function getProducts(
    categoryId: string,
    filterId?: string,
    query = "",
  ): Product[] {
    if (
      !getCategory(categoryId) ||
      (filterId && !isWithin(filterId, categoryId))
    )
      return [];
    const target = filterId || categoryId;
    const eligible = new Map<
      string,
      { product: Product; rank: number; direct: boolean }
    >();
    for (const link of snapshot.productCategories) {
      const product = getProduct(link.productId);
      const category = getCategory(link.categoryId);
      if (
        !product ||
        !category ||
        category.providerId !== product.providerId ||
        !isWithin(link.categoryId, target)
      )
        continue;
      const direct = link.categoryId === target;
      const previous = eligible.get(product.id);
      if (
        !previous ||
        (direct && !previous.direct) ||
        (direct === previous.direct && link.sortOrder < previous.rank)
      ) {
        eligible.set(product.id, { product, rank: link.sortOrder, direct });
      }
    }
    const term = query.trim().toLocaleLowerCase();
    return [...eligible.values()]
      .filter(({ product }) =>
        `${product.name} ${product.english} ${product.zone || ""}`
          .toLocaleLowerCase()
          .includes(term),
      )
      .sort(
        (a, b) => a.rank - b.rank || a.product.id.localeCompare(b.product.id),
      )
      .map(({ product }) => product);
  }
  function getFilters(categoryId: string): CatalogFilter[] {
    const category = getCategory(categoryId);
    if (!category) return [];
    const children = getChildren(categoryId);
    const result: CatalogFilter[] = [];
    if (category.includeAll !== false || !children.length)
      result.push({ id: "all", label: "全部", kind: "all", aliases: ["全部"] });
    result.push(
      ...children.map((child) => ({
        id: child.id,
        label: child.name,
        kind: "category" as const,
        aliases: child.legacyFilterValues || [],
      })),
    );
    if (category.inquiryOption) {
      const option = category.inquiryOption;
      result.push({
        id: option.id,
        label: option.label,
        kind: "inquiry",
        aliases: [option.label],
      });
    }
    return result;
  }
  function resolveFilter(
    categoryId: string,
    requested: string | null,
  ): CatalogFilter | undefined {
    const options = getFilters(categoryId);
    return (
      options.find(
        (option) =>
          option.id === requested || option.aliases.includes(requested || ""),
      ) ||
      options.find(
        (option) => option.id === getCategory(categoryId)?.defaultFilterId,
      ) ||
      options[0]
    );
  }
  return {
    checkedAt: snapshot.checkedAt,
    getProvider,
    getProviders: () =>
      sortRecords(
        snapshot.providers.filter((provider) => !!getProvider(provider.id)),
      ),
    getProviderBySlug: (slug: string) =>
      snapshot.providers.find(
        (provider) => provider.slug === slug && !!getProvider(provider.id),
      ),
    getCategory,
    getCategoryBySlug: (providerId: string, slug: string) =>
      snapshot.categories.find(
        (category) =>
          category.providerId === providerId &&
          category.slug === slug &&
          !!getCategory(category.id),
      ),
    getCatalogCategories: (providerId: string) =>
      sortRecords(
        snapshot.categories.filter(
          (category) =>
            category.providerId === providerId &&
            category.parentId === null &&
            category.showInCatalog &&
            !!getCategory(category.id),
        ),
      ),
    getChildren,
    getFilters,
    resolveFilter,
    getProduct,
    getProductBySlug: (providerId: string, slug: string) =>
      snapshot.products.find(
        (product) =>
          product.providerId === providerId &&
          product.slug === slug &&
          !!getProduct(product.id),
      ),
    getProducts,
    getFeaturedProducts: () =>
      snapshot.products
        .filter((product) => product.isFeatured && !!getProduct(product.id))
        .sort(
          (a, b) =>
            a.featuredOrder - b.featuredOrder || a.id.localeCompare(b.id),
        ),
    getProductLabels: (productId: string) => {
      const product = getProduct(productId);
      if (!product) return [];
      return sortRecords(
        snapshot.categories.filter(
          (category) =>
            category.id !== product.categoryId &&
            category.providerId === product.providerId &&
            !!getCategory(category.id) &&
            snapshot.productCategories.some(
              (link) =>
                link.productId === productId && link.categoryId === category.id,
            ),
        ),
      ).map((category) => category.name);
    },
  };
}
export function categoryPath(providerSlug: string, categorySlug: string) {
  return `/${encodeURIComponent(providerSlug)}/${encodeURIComponent(categorySlug)}`;
}
export function productPath(providerSlug: string, productSlug: string) {
  return `/${encodeURIComponent(providerSlug)}/packages/${encodeURIComponent(productSlug)}`;
}
