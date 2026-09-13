export type CategoryId =
  | "burial-plots"
  | "columbaria"
  | "funeral-services"
  | "pedestal-tablets"
  | "sheng-ji"
  | "pet-memorial";
export interface Category {
  id: CategoryId;
  name: string;
  english: string;
  description: string;
  filters: string[];
}
export interface Product {
  slug: string;
  categoryId: CategoryId;
  name: string;
  english: string;
  description: string;
  tags: string[];
  sourceUrl: string;
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
