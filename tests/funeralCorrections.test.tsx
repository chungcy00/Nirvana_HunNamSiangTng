import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductNavigationContext } from "../src/prototype/navigation";
import {
  ProductDetailContent,
  ProductPrices,
} from "../src/prototype/ProductPresentation";
import {
  mapPublicProduct,
  type PublicRecord,
} from "../src/catalog/publicRepository";
import { funeralDurationLabel } from "../src/prototype/model";
import { mapAdminPreviewProduct } from "../apps/admin/src/previewModel";
import { changesFor } from "../apps/admin/src/model";
import { resolvePriceNote, cleanPriceNote } from "../shared/priceNotes";
const record: PublicRecord = {
  id: "p",
  slug: "funeral",
  name: "原产品名称",
  category_id: 4,
  religions: [{ id: 1, name: "佛教" }],
  attributes: { duration_days: 3, duration_nights: 2, funeral_method: "both" },
  prices: [
    {
      offer_id: "o",
      offer_name: "默认方案",
      price_type: "pre_need",
      amount: 23888,
      price_note: "预购须至少提前3天购买。",
    },
    {
      offer_id: "o",
      offer_name: "默认方案",
      price_type: "at_need",
      amount: 26888,
      price_note: "适用于即时安排的服务。",
    },
  ],
  inclusions: [{ name: "临终礼仪咨询", group_title: "服务安排" }],
};
const nav = {
  website: true,
  homePath: "/nirvana",
  listPath: () => "/nirvana",
  detailPath: () => "",
};
const details = (p = mapPublicProduct(record)) =>
  renderToStaticMarkup(
    <ProductNavigationContext.Provider value={nav}>
      <ProductDetailContent product={p} />
    </ProductNavigationContext.Provider>,
  );
const price = (raw: PublicRecord, compact = false) =>
  renderToStaticMarkup(
    <ProductNavigationContext.Provider value={nav}>
      <ProductPrices
        product={mapPublicProduct(raw)}
        detailed={!compact}
        compact={compact}
      />
    </ProductNavigationContext.Provider>,
  );
const bundle: any = {
  product: {
    id: "p",
    slug: "funeral",
    name: "原产品名称",
    category_id: 4,
    updated_at: "v1",
    source_reference: "保留来源",
    internal_notes: "保留内部备注",
  },
  funeral_details: [{ product_id: "p", ...record.attributes }],
  product_religions: [
    {
      id: "r",
      religion_id: 1,
      is_published: true,
      configuration_name: "保留旧名称",
      configuration_notes: "保留旧说明",
    },
  ],
  product_offers: [
    { id: "o", name: "默认方案", is_active: true, sort_order: 0 },
  ],
  offer_prices: record.prices.map((p, i) => ({
    id: `price${i}`,
    offer_id: "o",
    price_type: p.price_type,
    price_amount: p.amount,
    price_note: p.price_note,
    is_published: true,
  })),
  product_images: [],
  product_inclusions: [
    {
      id: "i",
      product_id: "p",
      item_name: "临终礼仪咨询",
      group_title: "服务安排",
      sort_order: 0,
    },
  ],
  burial_details: [],
  niche_details: [],
  tablet_details: [],
  fengshui_details: [],
  pet_details: [],
};
const refs: any = {
  categories: [],
  series: [],
  religions: [{ id: 1, name: "佛教", is_active: true }],
  notices: [
    {
      id: "n",
      content: "以上价格未包含印花税。",
      is_active: true,
      sort_order: 0,
    },
  ],
};
test("duration reads both existing attributes and never changes the name or generates incomplete labels", () => {
  assert.match(details(), /3天2夜殡仪服务配套/);
  assert.match(details(), /<h1>原产品名称<\/h1>/);
  for (const attributes of [
    { duration_days: 3 },
    { duration_nights: 2 },
    { duration_days: null, duration_nights: null },
    { duration_days: 0, duration_nights: 2 },
    { duration_days: 3, duration_nights: -1 },
  ])
    assert.equal(
      funeralDurationLabel(mapPublicProduct({ ...record, attributes })),
      undefined,
    );
  assert.equal(
    funeralDurationLabel(
      mapPublicProduct({
        ...record,
        attributes: { duration_days: 1, duration_nights: 0 },
      }),
    ),
    "1天0夜殡仪服务配套",
  );
  assert.equal(
    funeralDurationLabel(mapPublicProduct({ ...record, category_id: 1 })),
    undefined,
  );
});
test("funeral prices and notes remain attached to their own types in both compact and full rendering", () => {
  for (const compact of [false, true]) {
    const html = price(record, compact);
    assert.match(
      html,
      /预购价格<\/span><strong>RM 23,888<\/strong><p[^>]*>预购须至少提前3天购买。/,
    );
    assert.match(
      html,
      /即用价格<\/span><strong>RM 26,888<\/strong><p[^>]*>适用于即时安排的服务。/,
    );
    assert.doesNotMatch(html, /总价格|<em>起|50,776/);
  }
});
test("only niche prices use starting from; standard products show actual offers with their own notes", () => {
  for (const category_id of [1, 2, 3, 5, 6, 7]) {
    const raw = {
      ...record,
      category_id,
      prices: [
        {
          offer_id: "o",
          offer_name: "方案甲",
          price_type: "standard",
          amount: 21888,
          price_note: "甲的备注",
        },
        {
          offer_id: "b",
          offer_name: "方案乙",
          price_type: "standard",
          amount: 25888,
          price_note: "乙的备注",
        },
      ],
    };
    const html = price(raw);
    if (category_id === 3) {
      assert.match(html, /<em>起<\/em>/);
      assert.doesNotMatch(html, /25,888|乙的备注/);
    } else {
      assert.doesNotMatch(html, /<em>起/);
      assert.match(html, /25,888/);
      assert.match(html, /甲的备注/);
      assert.match(html, /乙的备注/);
    }
  }
});
test("note fallback matches existing SQL precedence, avoids blanks and repeats, normalizes tax wording", () => {
  assert.equal(
    resolvePriceNote("独立备注", "产品备注", ["系统备注"]),
    "独立备注",
  );
  assert.equal(resolvePriceNote(" ", "产品备注", ["系统备注"]), "产品备注");
  assert.equal(
    resolvePriceNote(null, "", ["以上价格未包含印花税。"]),
    "以上价格未包含印花税",
  );
  const html = price({
    ...record,
    prices: record.prices.map((p) => ({
      ...p,
      price_note: "以上价格未包含印花税。",
    })),
  });
  assert.equal((html.match(/以上价格未包含印花税/g) || []).length, 1);
  assert.equal(cleanPriceNote("a\na\n"), "a");
  assert.doesNotMatch(
    price({
      ...record,
      prices: record.prices.map((p) => ({ ...p, price_note: "" })),
    }),
    /fgp-price-note/,
  );
});
test("unsaved preview and public projection produce identical detail markup, without mutating or saving the bundle", () => {
  const before = JSON.stringify(bundle),
    preview = mapAdminPreviewProduct(bundle, refs);
  assert.equal(details(preview), details());
  assert.equal(JSON.stringify(bundle), before);
  const edited = structuredClone(bundle);
  edited.funeral_details[0].duration_days = 5;
  edited.offer_prices[0].price_amount = 30000;
  edited.product_inclusions[0].item_name = "未保存的新明细";
  const html = details(mapAdminPreviewProduct(edited, refs));
  assert.match(html, /5天2夜/);
  assert.match(html, /RM 30,000/);
  assert.match(html, /未保存的新明细/);
  assert.doesNotMatch(html, /fgp-gallery/);
});
test("preview public scope respects religion/offer/publication; all mode is explicitly wider", () => {
  const edited = structuredClone(bundle);
  edited.product_religions.push({
    id: "hidden",
    religion_id: 2,
    is_published: false,
  });
  edited.product_inclusions.push({
    id: "secret",
    item_name: "未公开明细",
    group_title: "未公开组",
    religion_id: 2,
    sort_order: 1,
  });
  edited.offer_prices[0].is_published = false;
  const pub = mapAdminPreviewProduct(edited, refs);
  assert.equal(pub.preNeed, undefined);
  assert.doesNotMatch(details(pub), /未公开明细|未公开组/);
  assert.match(
    details(
      mapAdminPreviewProduct(
        edited,
        {
          ...refs,
          religions: [
            ...refs.religions,
            { id: 2, name: "基督教", is_active: true },
          ],
        },
        { mode: "all" },
      ),
    ),
    /未公开明细/,
  );
});
test("editing duration or independent price note preserves hidden legacy fields and counterpart note", () => {
  const edited = structuredClone(bundle);
  edited.funeral_details[0].duration_days = 4;
  edited.offer_prices[0].price_note = "新的预购备注";
  const payload = changesFor(bundle, edited, "draft");
  assert.equal(
    payload.p_changes.offer_prices.upsert?.[0].price_note,
    "新的预购备注",
  );
  assert.equal(
    edited.offer_prices[1].price_note,
    bundle.offer_prices[1].price_note,
  );
  assert(!("source_reference" in payload.p_product));
  assert.equal(edited.product.source_reference, "保留来源");
  assert.equal(edited.product.internal_notes, "保留内部备注");
  assert(!payload.p_changes.product_religions);
});

test('funeral venue is mapped identically from public records and unsaved form state, without appearing on other categories', () => {
  for (const venue of ['丧府', '殡仪礼堂', '丧府/殡仪礼堂']) {
    const raw = { ...record, attributes: { ...record.attributes, service_venue: venue } };
    const edited = structuredClone(bundle);
    edited.funeral_details[0].service_venue = venue;
    const original = JSON.stringify(edited);
    const product = mapPublicProduct(raw);
    const html = details(product);
    assert.equal(product.serviceVenue, venue);
    assert.match(html, new RegExp(`<dt>服务地点</dt><dd>${venue.replace(/\s*\/\s*/g, " / ")}</dd>`));
    assert.equal(html, details(mapAdminPreviewProduct(edited, refs)));
    assert.equal(JSON.stringify(edited), original);
    assert.equal(changesFor(bundle, edited, 'draft').p_changes.funeral_details.upsert![0].service_venue, venue);
    for (const category_id of [1, 2, 3, 5, 6, 7]) {
      const other = mapPublicProduct({ ...raw, category_id });
      assert.equal(other.serviceVenue, undefined);
      assert.doesNotMatch(details(other), /<dt>服务地点<\/dt>/);
    }
  }
  for (const service_venue of [null, undefined, '', '   ']) {
    assert.doesNotMatch(details(mapPublicProduct({ ...record, attributes: {service_venue} })), /<dt>服务地点<\/dt>/);
  }
  assert.match(details(mapPublicProduct({ ...record, attributes: {service_venue:'旧地点原文'} })), /旧地点原文/);
});

test('funeral detail defaults groups open and keeps ungrouped items and quantities without inferred categories', () => {
  const product = mapPublicProduct({...record, inclusions:[
    {name:'保留原名', quantity:2, unit:'套', group_title:'后台分组'},
    {name:'未分组项目'},
  ]});
  const html = details(product);
  assert.equal((html.match(/<details class="fgp-inclusion-section" open="">/g)||[]).length,2);
  assert.match(html,/保留原名 × 2套/);
  assert.match(html,/<h3>包含项目<\/h3>/);
  assert.doesNotMatch(html,/全部展开|全部收起/);
});

test('partial shared note lines appear once; independent conditions stay attached to their prices', () => {
  const html = price({...record, prices:record.prices.map((row,index)=>({...row,
    price_note:(index === 0 ? '预购须至少提前3天购买。\n' : '')+'以上价格未包含印花税。',
  }))});
  assert.equal((html.match(/以上价格未包含印花税/g)||[]).length,1);
  assert.match(html,/预购价格<\/span><strong>RM 23,888<\/strong><p[^>]*>预购须至少提前3天购买。/);
  assert.doesNotMatch(html,/即用价格<\/span><strong>RM 26,888<\/strong><p/);
});

test('missing one or both prices retain truthful labels without zero money; summary omits notes', () => {
  for (const prices of [[],record.prices.slice(0,1),record.prices.slice(1)]) {
    const html = price({...record, prices});
    assert.match(html,/预购价格/);
    assert.match(html,/即用价格/);
    assert.match(html,/欢迎咨询/);
    assert.doesNotMatch(html,/RM 0|NaN|undefined/);
  }
  const html = renderToStaticMarkup(<ProductPrices product={mapPublicProduct(record)} showNotes={false}/>);
  assert.match(html,/RM 23,888/);
  assert.match(html,/RM 26,888/);
  assert.doesNotMatch(html,/fgp-price-note|预购须/);
});


test("website detail price panel shows each backend note below its matching price", () => {
  const html = details();
  const panel = html.match(/<section[^>]*class="fgp-price-panel"[\s\S]*?<\/section>/)?.[0];
  assert(panel, "detail must contain a price panel");
  assert.match(panel, /预购价格<\/span><strong>RM 23,888<\/strong><p class="fgp-price-note">预购须至少提前3天购买。<\/p>/);
  assert.match(panel, /即用价格<\/span><strong>RM 26,888<\/strong><p class="fgp-price-note">适用于即时安排的服务。<\/p>/);
  assert.equal((panel.match(/预购须至少提前3天购买。/g) || []).length, 1);
  assert.equal((panel.match(/适用于即时安排的服务。/g) || []).length, 1);
  const noNotes = details(mapPublicProduct({ ...record, prices: record.prices.map(row => ({ ...row, price_note: "" })) }));
  assert.doesNotMatch(noNotes, /class="fgp-price-note"/);
});
