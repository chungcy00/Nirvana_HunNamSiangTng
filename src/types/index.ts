export interface Profile {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatarUrl: string;
  phone: string;
  whatsapp: string;
  email: string;
  serviceAreas: string;
  businessHours: string;
  philosophy: string;
}

export interface ServiceProvider {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  coverImageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
}

export interface Package {
  id: string;
  providerId: string;
  categoryId: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: number;
  originalPrice?: number;
  priceDisplayType: 'exact' | 'starting_at' | 'contact_us' | 'hidden';
  coverImageUrl: string;
  status: 'draft' | 'published' | 'hidden';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PackageFeature {
  id: string;
  packageId: string;
  text: string;
  sortOrder: number;
}

export interface PackageImage {
  id: string;
  packageId: string;
  imageUrl: string;
  sortOrder: number;
}

export interface Service {
  id: string;
  providerId: string;
  categoryId: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  coverImageUrl: string;
  status: 'draft' | 'published' | 'hidden';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Inquiry {
  id: string;
  name: string;
  phone: string;
  serviceInterest: string;
  message: string;
  createdAt: string;
}
