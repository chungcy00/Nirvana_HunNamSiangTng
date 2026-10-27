// RPC objects mirror the existing 18-table schema. Dynamic row fields are
// restricted by the serializer and database column allowlists, never arbitrary SQL.
export type Row = { id: string; [key: string]: any };
export type Product = Row & {
  category_id: number;
  name: string | null;
  slug: string;
  publication_status: 'draft' | 'published' | 'hidden';
  sale_status?: 'available' | 'sold_out';
  updated_at: string;
  sort_order: number;
  series_id: string | null;
  capacity_group: string | null;
  product_form: string | null;
};
export type Bundle = { product: Product; [table: string]: any };
export type References = { categories: Row[]; series: Row[]; religions: Row[]; notices: Row[] };
export type Member = { user_id: string; role: 'admin' | 'editor' };
export type DictionaryKind = 'series' | 'religions' | 'notices';
export const categories = [
  '全部产品',
  '火化土葬',
  '传统土葬',
  '骨灰位',
  '殡仪服务',
  '祖先牌位',
  '生基风水',
  '宠物安葬',
];
export const capacities: Record<string, string> = {
  single: '单人',
  double: '双人',
  triple: '三人',
  four_plus: '四人及以上',
  family: '家庭',
};
export const statuses: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  hidden: '已隐藏',
};
export const sections = [
  '基本资料',
  '类别专属属性',
  '宗教与设计',
  '包含项目',
  '价格',
  '图片管理',
  '发布管理',
];
export const detailTables = [
  'burial_details',
  'niche_details',
  'funeral_details',
  'tablet_details',
  'fengshui_details',
  'pet_details',
];
export const tableFor = (c: number) => (c <= 2 ? 'burial_details' : detailTables[c - 2]);
export const money = (n: unknown) =>
  Number(n) > 0
    ? `RM ${Number(n).toLocaleString('en-MY', { maximumFractionDigits: 2 })}`
    : '待填写';
export const emptyReferences: References = {
  categories: [],
  series: [],
  religions: [],
  notices: [],
};
