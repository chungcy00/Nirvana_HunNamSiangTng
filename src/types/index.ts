export type PublicationStatus = "draft" | "published" | "hidden";
export type PlacementType = "indoor" | "outdoor";
export interface OrderedRecord {
  id: string;
  sortOrder: number;
}
export interface Provider extends OrderedRecord {
  slug: string;
  name: string;
  english: string;
  description: string;
  coverLabel: string;
  status: PublicationStatus;
  resources?: { title: string; description: string }[];
}
export interface Category extends OrderedRecord {
  providerId: string;
  parentId: string | null;
  slug: string;
  name: string;
  english: string;
  description: string;
  status: PublicationStatus;
  showInCatalog: boolean;
  displayMode?: "cards" | "comparison";
  includeAll?: boolean;
  defaultFilterId?: string;
  filterLabel?: string;
  legacyFilterValues?: string[];
  inquiryOption?: {
    id: string;
    label: string;
    subject: string;
    description: string;
  };
}
export interface Product {
  id: string;
  providerId: string;
  categoryId: string;
  slug: string;
  name: string;
  english: string;
  description: string;
  status: PublicationStatus;
  isFeatured: boolean;
  featuredOrder: number;
  ritualNote?: string;
  // Supplied explicitly by niche data; never inferred from a name or series.
  nicheDetails?: { placementType: PlacementType | null };
  zone?: string;
  area?: string;
  direction?: string;
  price?: number;
  preNeedPrice?: number;
  asNeedPrice?: number;
  depositPercent?: number;
  installmentMonths?: number;
  duration?: string;
  venue?: string;
  features?: string[];
  groups?: { title: string; text: string }[];
}
export interface ProductCategory {
  productId: string;
  categoryId: string;
  sortOrder: number;
}
export interface CatalogSnapshot {
  checkedAt: string;
  providers: Provider[];
  categories: Category[];
  products: Product[];
  productCategories: ProductCategory[];
}
export interface CatalogFilter {
  id: string;
  label: string;
  kind: "all" | "category" | "inquiry";
  aliases: string[];
}
