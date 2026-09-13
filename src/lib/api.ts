import { supabase } from './supabase';
import type { Profile, Package, Service, PackageFeature } from '../types';

// Mock Data
export const mockProfile: Profile = {
  id: '1',
  name: '张先生',
  title: '资深身后规划顾问',
  bio: '拥有超过10年的殡葬服务与身后规划经验，致力于为家属提供专业、安心、温暖的协助。',
  avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400',
  phone: '+60 12-345 6789',
  whatsapp: '60123456789',
  email: 'contact@example.com',
  serviceAreas: '吉隆坡、雪兰莪',
  businessHours: '24小时服务',
  philosophy: '理解不同家庭拥有不同宗教、文化及纪念方式，并以中立、尊重和包容的态度提供合适的资讯与选择。'
};

export const mockPackages: Package[] = [
  {
    id: 'pkg1',
    providerId: 'nirvana',
    categoryId: 'buddhist',
    name: '富贵圆满佛教配套',
    slug: 'nirvana-buddhist-premium',
    shortDescription: '尊贵体面的佛教殡仪服务，包办所有基本及进阶仪式。',
    description: '富贵圆满佛教配套为您提供最全面的服务，确保每一环节都圆满庄严。包含专业咨询、诵经仪式、火化及安葬等全方位服务。',
    price: 18800,
    priceDisplayType: 'starting_at',
    coverImageUrl: 'https://images.unsplash.com/photo-1622397148017-d2e8b2b9dc31?auto=format&fit=crop&q=80&w=800',
    status: 'published',
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pkg2',
    providerId: 'nirvana',
    categoryId: 'christian',
    name: '富贵安息基督教配套',
    slug: 'nirvana-christian-standard',
    shortDescription: '宁静祥和的基督教殡仪服务，以最纯洁的方式告别。',
    description: '专业的基督教仪式安排，包括祈祷、追思会及安葬协助，让家属在悲痛中感受主的安慰。',
    price: 15800,
    priceDisplayType: 'exact',
    coverImageUrl: 'https://images.unsplash.com/photo-1548502396-8ebdc9c05423?auto=format&fit=crop&q=80&w=800',
    status: 'published',
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pkg3',
    providerId: 'nirvana',
    categoryId: 'pet',
    name: '宠物专属纪念配套',
    slug: 'pet-memorial-package',
    shortDescription: '让陪伴过我们的生命，获得温柔而有尊严的告别。',
    description: '专为毛小孩设计的告别仪式，包含专属火化、纪念品制作及骨灰安置，感谢它们一生的陪伴。',
    price: 2500,
    priceDisplayType: 'starting_at',
    coverImageUrl: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=800',
    status: 'published',
    sortOrder: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const mockFeatures: Record<string, PackageFeature[]> = {
  'pkg1': [
    { id: 'f1', packageId: 'pkg1', text: '专业殡仪咨询', sortOrder: 1 },
    { id: 'f2', packageId: 'pkg1', text: '3天2夜追思布置', sortOrder: 2 },
    { id: 'f3', packageId: 'pkg1', text: '诵经法事安排', sortOrder: 3 },
    { id: 'f4', packageId: 'pkg1', text: '火化及骨灰处理', sortOrder: 4 }
  ],
  'pkg2': [
    { id: 'f5', packageId: 'pkg2', text: '基督教追思会布置', sortOrder: 1 },
    { id: 'f6', packageId: 'pkg2', text: '牧师祈祷安排', sortOrder: 2 },
    { id: 'f7', packageId: 'pkg2', text: '专属棺木及鲜花', sortOrder: 3 }
  ],
  'pkg3': [
    { id: 'f8', packageId: 'pkg3', text: '宠物遗体接送', sortOrder: 1 },
    { id: 'f9', packageId: 'pkg3', text: '独立火化服务', sortOrder: 2 },
    { id: 'f10', packageId: 'pkg3', text: '专属纪念盒', sortOrder: 3 }
  ]
};

export const mockServices: Service[] = [
  {
    id: 'srv1',
    providerId: 'yunnan',
    categoryId: 'consulting',
    name: '专业殡葬咨询',
    slug: 'funeral-consulting',
    shortDescription: '24小时一对一专业解答，提供全面客观的建议。',
    description: '无论您遇到任何突发状况，我们提供全天候的专业咨询服务，协助家属稳定情绪，清晰了解下一步该怎么做。',
    coverImageUrl: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=800',
    status: 'published',
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'srv2',
    providerId: 'yunnan',
    categoryId: 'assistance',
    name: '家属全程协助',
    slug: 'family-assistance',
    shortDescription: '从医院到火化场，全程陪伴，让您安心无忧。',
    description: '办理相关文件、接送、仪式指引，都有专人全程协助，减轻家属在悲伤时刻的负担。',
    coverImageUrl: 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?auto=format&fit=crop&q=80&w=800',
    status: 'published',
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function getProfile(): Promise<Profile> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('profiles').select('*').single();
      if (!error && data) return data as Profile;
    } catch (e) {
      console.warn("Supabase fetch failed, using mock data");
    }
  }
  return mockProfile;
}

export async function getPackages(providerId?: string): Promise<Package[]> {
  if (supabase) {
    try {
      let query = supabase.from('packages').select('*').eq('status', 'published').order('sortOrder');
      if (providerId) {
        query = query.eq('providerId', providerId);
      }
      const { data, error } = await query;
      if (!error && data) return data as Package[];
    } catch (e) {
      console.warn("Supabase fetch failed, using mock data");
    }
  }
  return providerId 
    ? mockPackages.filter(p => p.providerId === providerId)
    : mockPackages;
}

export async function getPackageBySlug(slug: string): Promise<{ pkg: Package, features: PackageFeature[] } | null> {
  if (supabase) {
    try {
      const { data: pkgData, error: pkgError } = await supabase.from('packages').select('*').eq('slug', slug).single();
      if (!pkgError && pkgData) {
        const { data: featData, error: featError } = await supabase.from('package_features').select('*').eq('packageId', pkgData.id).order('sortOrder');
        return { pkg: pkgData as Package, features: (featData || []) as PackageFeature[] };
      }
    } catch (e) {
      console.warn("Supabase fetch failed, using mock data");
    }
  }
  
  const pkg = mockPackages.find(p => p.slug === slug);
  if (pkg) {
    return { pkg, features: mockFeatures[pkg.id] || [] };
  }
  return null;
}

export async function getServices(providerId?: string): Promise<Service[]> {
  if (supabase) {
    try {
      let query = supabase.from('services').select('*').eq('status', 'published').order('sortOrder');
      if (providerId) {
        query = query.eq('providerId', providerId);
      }
      const { data, error } = await query;
      if (!error && data) return data as Service[];
    } catch (e) {
      console.warn("Supabase fetch failed, using mock data");
    }
  }
  return providerId 
    ? mockServices.filter(s => s.providerId === providerId)
    : mockServices;
}

export async function submitInquiry(data: Partial<Inquiry>): Promise<boolean> {
  if (supabase) {
    try {
      const { error } = await supabase.from('inquiries').insert([data]);
      if (!error) return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
  console.log("Mock inquiry submitted:", data);
  return true;
}
