import { projectProductRecord, type PublicRecord } from '../../../src/catalog/publicRepository';
import { resolvePriceNote } from '../../../shared/priceNotes';
import type { Bundle, References, Row } from './types';

export function mapAdminPreviewProduct(
  bundle: Bundle,
  refs: References,
  { mode = 'public', religion = '', offer = '' } = {},
) {
  const all = mode === 'all',
    p = bundle.product;
  const religions = bundle.product_religions.filter(
    (r: Row) =>
      (all ||
        (r.is_published && refs.religions.some((d) => d.id === r.religion_id && d.is_active))) &&
      (!religion || String(r.religion_id) === religion),
  );
  const allowed = new Set(religions.map((r: Row) => r.religion_id));
  const religious = (id: unknown) => id == null || allowed.has(id);
  const offers = bundle.product_offers
    .filter(
      (o: Row) => (all || o.is_active) && religious(o.religion_id) && (!offer || o.id === offer),
    )
    .sort(
      (a: Row, b: Row) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id.localeCompare(b.id),
    );
  const offered = new Set(offers.map((o: Row) => o.id));
  const visible = (r: Row) =>
    (all || r.is_published !== false) &&
    religious(r.religion_id) &&
    (!r.offer_id || offered.has(r.offer_id));
  const notices = [...refs.notices]
    .filter((n) => n.is_active)
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        String(a.content).localeCompare(String(b.content)),
    )
    .map((n) => n.content);
  const images = bundle.product_images
    .filter(visible)
    .sort((a: Row, b: Row) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
    .map((i: Row) => ({
      id: i.id,
      bucket: i.storage_bucket,
      path: i.storage_path,
      alt: i.alt_text,
      religion_id: i.religion_id,
      image_type: i.image_type,
      design_name: i.design_name,
    }));
  const raw: PublicRecord = {
    id: p.id,
    slug: p.slug || p.id,
    name: p.name || '未命名草稿',
    category_id: p.category_id,
    capacity_group: p.capacity_group as PublicRecord['capacity_group'],
    capacity_count: p.capacity_count,
    subtitle: p.subtitle,
    description: p.description,
    attributes:
      bundle[
        [
          'burial_details',
          'burial_details',
          'niche_details',
          'funeral_details',
          'tablet_details',
          'fengshui_details',
          'pet_details',
        ][p.category_id - 1]
      ]?.[0] || {},
    religions: religions.map((r: Row) => ({
      id: r.religion_id,
      name: refs.religions.find((d) => d.id === r.religion_id)?.name || `宗教 ${r.religion_id}`,
    })),
    prices: bundle.offer_prices
      .filter((price: Row) => (all || price.is_published) && offered.has(price.offer_id))
      .sort(
        (a: Row, b: Row) =>
          offers.findIndex((o: Row) => o.id === a.offer_id) -
            offers.findIndex((o: Row) => o.id === b.offer_id) ||
          a.price_type.localeCompare(b.price_type),
      )
      .map((price: Row) => ({
        offer_id: price.offer_id,
        offer_name: offers.find((o: Row) => o.id === price.offer_id)?.name || '默认方案',
        religion_id: offers.find((o: Row) => o.id === price.offer_id)?.religion_id,
        price_type: price.price_type,
        amount: price.price_amount,
        price_note: resolvePriceNote(price.price_note, p.price_note_override, notices),
      })),
    inclusions: bundle.product_inclusions
      .filter(visible)
      .sort((a: Row, b: Row) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
      .map((i: Row) => ({
        name: i.item_name,
        group_title: i.group_title,
        quantity: i.quantity,
        unit: i.unit,
        description: i.description,
        religion_id: i.religion_id,
        offer_id: i.offer_id,
      })),
    images,
    primary_image: images.find(
      (i: (typeof images)[number]) =>
        bundle.product_images.find((r: Row) => r.id === i.id)?.is_primary && i.religion_id == null,
    ),
  };
  // Does not save, publish or change the bundle; completeness checks remain in save/DB.
  return projectProductRecord(raw);
}
