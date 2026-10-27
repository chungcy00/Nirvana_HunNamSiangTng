import { useContext, useState, useEffect, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Image as ImageIcon,
  MapPin,
} from "lucide-react";
import { DesignImagePreview } from "./DesignImagePreview";
import { GeneralProductGallery } from "./GeneralProductGallery";
import CatalogImage from "../catalog/PublicImage";
import {ProductImageScope} from '../../shared/ImageScope';
import { ConsultButton } from "../components/ui";
import { useBoundedPricePanel } from "./useBoundedPricePanel";
import {
  categories,
  capacityLabels,
  funeralMethodLabels,
  funeralDurationLabel,
  formatMoney,
  hasCapacity,
  hasReligion,
  type PrototypeProduct,
  type InclusionGroup,
} from "./model";
import { ProductNavigationContext } from "./navigation";
import { formatSqft, groupPricesByArea, pricePlanLabel } from "../../shared/areaPriceGroups";
import { differentArea, differentText } from "../../shared/offerAttributes";
import { cleanPriceNote } from "../../shared/priceNotes";
import type { PublicImage } from "../catalog/publicRepository";
import "./prototype.css";
export type ImageRenderer = (image: PublicImage) => ReactNode;
function galleryChoices(product: PrototypeProduct) {
  return (product.images || []).map((image, index) => ({
    image,
    label:
      image.id === product.primaryImage?.id
        ? "共通产品图"
        : image.religion_id != null
          ? `${product.religions.find((r) => r.id === String(image.religion_id))?.name || ""} · ${image.design_name || `图片 ${index + 1}`}`
          : `共通产品图 · ${index + 1}`,
  }));
}
export function ProductImage({
  product,
  large = false,
  caption,
  imageRenderer,
}: {
  product: PrototypeProduct;
  large?: boolean;
  caption?: string;
  imageRenderer?: ImageRenderer;
}) {
  const image =
    large && caption
      ? galleryChoices(product).find((i) => i.label === caption)?.image ||
        product.primaryImage
      : product.primaryImage;
  return (
    <div
      className={`fgp-image fgp-image-${product.category}${large ? " fgp-image-large" : ""}`}
      role="img"
      aria-label={
        image
          ? image.alt || product.name
          : product.category === 4
            ? product.name
            : `${product.name}，对应实拍图片待补充`
      }
    >
      <div className="fgp-image-center">
        <ImageIcon size={large ? 38 : 29} strokeWidth={1} aria-hidden="true" />
        <span>{product.category === 4 ? "殡仪服务" : "产品实拍待补充"}</span>
      </div>
      {image &&
        (imageRenderer ? (
          imageRenderer(image)
        ) : (
          <CatalogImage key={image.id} image={image} />
        ))}
      {caption && <span className="fgp-image-caption">{caption}</span>}
      {image?.sale_status === 'sold_out' && <span className="fgp-image-sale fgp-sale-status">已售罄</span>}
    </div>
  );
}
export function ProductTags({ product, desktopServiceVenue = false }: { product: PrototypeProduct; desktopServiceVenue?: boolean }) {
  return (
    <div className="fgp-tags">
      {hasCapacity(product.category) && product.capacity && (
        <span>
          {["four_plus", "family"].includes(product.capacity) &&
          product.capacityCount
            ? `${product.capacityCount}人`
            : capacityLabels[product.capacity]}
        </span>
      )}
      {product.category === 4 && product.funeralMethod && (
        <span className="fgp-funeral-method">{funeralMethodLabels[product.funeralMethod]}</span>
      )}
      {product.religions.map((r) => (
        <span key={r.id}>{r.name}</span>
      ))}
      {desktopServiceVenue && product.category === 4 && product.serviceVenue && (
        <span className="fgp-desktop-service-venue">{product.serviceVenue}</span>
      )}
      {product.category === 3 && product.placement && (
        <span className="fgp-environment">
          {product.placement === "indoor" ? "室内" : "室外"}
        </span>
      )}
    </div>
  );
}
function InclusionList({
  items,
  groups,
  religious = false,
  funeral = false,
  expanded = false,
}: {
  items: string[];
  groups?: InclusionGroup[];
  religious?: boolean;
  funeral?: boolean;
  expanded?: boolean;
}) {
  const { website } = useContext(ProductNavigationContext);
  const list = (rows: string[]) => (
    <ul>
      {rows.map((item, index) => (
        <li key={index}>
          <Check size={16} aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
  if (funeral) {
    // Titles and membership come exclusively from the existing mapped groups.
    const sections = groups?.length ? groups : [{ title: "", items }];
    return (
      <>
        {sections
          .filter((group) => group.items.length)
          .map((group, index) => (
            <details className="fgp-inclusion-section" key={index} open>
              <summary>
                {website && <span className="fgp-inclusion-number" aria-hidden="true">{index + 1}</span>}
                {religious ? (
                  <h5>{group.title || "包含项目"}</h5>
                ) : (
                  <h3>{group.title || "包含项目"}</h3>
                )}
                {website && <span className="fgp-inclusion-count">{group.items.length} 项</span>}
                <ChevronRight size={18} aria-hidden="true" />
              </summary>
              {list(group.items)}
            </details>
          ))}
      </>
    );
  }
  if (!groups?.some((g) => g.title)) return list(items);
  return (
    <>
      {groups.map((group, index) =>
        group.title ? (
          <details className="fgp-inclusion-section" key={index} open={expanded}>
            <summary>
              {religious ? <h5>{group.title}</h5> : <h3>{group.title}</h3>}
              <ChevronRight size={18} aria-hidden="true" />
            </summary>
            {list(group.items)}
          </details>
        ) : (
          <div className="fgp-inclusion-section" key={index}>
            {list(group.items)}
          </div>
        ),
      )}
    </>
  );
}

type DetailProps = {product:PrototypeProduct; imageRenderer?:ImageRenderer; embedded?:boolean};
export function ProductDetailContent(props:DetailProps) {
  return <ProductImageScope key={props.product.id}><ProductDetailBody {...props}/><PreloadProductImages {...props}/></ProductImageScope>;
}
function PreloadProductImages({product,imageRenderer}:DetailProps) {
  const [ready,setReady]=useState(false);
  useEffect(()=>setReady(true),[]);
  const images=[...new Map([...(product.primaryImage?[product.primaryImage]:[]),...(product.images||[])].map(image=>[image.id,image])).values()];
  return ready ? <div hidden aria-hidden="true">{images.map(image=><span key={image.id}>{imageRenderer?imageRenderer(image):<CatalogImage image={image}/>}</span>)}</div> : null;
}
function ProductDetailBody({
  product,
  imageRenderer,
  embedded = false,
}: {
  product: PrototypeProduct;
  imageRenderer?: ImageRenderer;
  embedded?: boolean;
}) {
  const { website } = useContext(ProductNavigationContext);
  const category = categories.find((c) => c.id === product.category)!;
  const funeral = product.category === 4;
  const general = website && !funeral;
  const pricePanelRef = useBoundedPricePanel(funeral);
  const consultAction = product.saleStatus === 'sold_out'
    ? <div className="fgp-service-consult fgp-sold-consult" aria-disabled="true">此产品已售罄</div>
    : <ConsultButton subject={product.name} className="fgp-service-consult">直接咨询</ConsultButton>;
  const [religion, setReligion] = useState("");
  const [design, setDesign] = useState("共通产品图");
  const content = product.religions.filter(
    (r) => !religion || r.id === religion,
  );
  const designs = product.images?.length
    ? galleryChoices(product)
        .filter(
          ({ image }) =>
            image.religion_id == null ||
            !religion ||
            String(image.religion_id) === religion,
        )
        .map((i) => i.label)
    : [
        "共通产品图",
        ...content.flatMap((r) => r.designs.map((d) => r.name + " · " + d)),
      ];
  const selectedDesign = designs.includes(design) ? design : designs[0];
  const specs = [
    ...(!website && funeralDurationLabel(product)
      ? [["服务天数", `${product.durationDays}天${product.durationNights}夜`]]
      : []),
    ...(product.category === 4 && product.serviceVenue
      ? [["服务地点", product.serviceVenue.replace(/\s*\/\s*/g, " / ")]]
      : []),
    ...(hasCapacity(product.category) && product.capacity
      ? [
          [
            "使用人数",
            ["four_plus", "family"].includes(product.capacity) &&
            product.capacityCount
              ? `${product.capacityCount}人`
              : capacityLabels[product.capacity],
          ],
        ]
      : []),
    ...(hasReligion(product.category) && product.religions.length
      ? [["适用宗教", product.religions.map((r) => r.name).join("、")]]
      : []),
    ...(product.category === 4 && product.funeralMethod
      ? [["适用安葬方式", funeralMethodLabels[product.funeralMethod]]]
      : []),
    ...(product.specifications || []).map(({label, value}) => [label, value]),
    ...(product.category === 3 && product.placement
      ? [["安放环境", product.placement === "indoor" ? "室内" : "室外"]]
      : []),
    ...([1, 2, 5, 6, 7].includes(product.category) && product.facing
      ? [["朝向", product.facing]]
      : []),
    ...([1, 2, 6, 7].includes(product.category) && product.area
      ? [["面积", formatSqft(product.area)!]]
      : []),
  ];
  const orderedSpecs = website && funeral
    ? [...specs].sort(([a], [b]) => ["适用宗教", "适用安葬方式", "服务地点"].indexOf(a) - ["适用宗教", "适用安葬方式", "服务地点"].indexOf(b))
    : specs;
  const singleGeneralPrice = !funeral && product.category !== 3 && (product.publicPrices
    ? product.publicPrices.filter(price => price.price_type === 'standard' && Number(price.amount)>0 && (!religion || price.religion_id == null || String(price.religion_id)===religion))
    : product.offers.filter(offer => Number(offer.amount)>0 && (!religion || !offer.religionId || offer.religionId===religion))).length === 1;
  const pricePanel = (
    <section
      ref={pricePanelRef}
      className={`fgp-price-panel${singleGeneralPrice ? " fgp-single-price-panel" : ""}`}
      aria-labelledby="fgp-price-heading"
    >
      <h2 id="fgp-price-heading">
        {product.category === 4
          ? "殡仪服务价格"
          : product.category === 3
            ? "最低起价"
            : "产品售价"}
      </h2>
      <ProductPrices product={product} detailed religion={religion} />
      {product.productPriceNote && <p className="fgp-price-note fgp-product-price-note">{product.productPriceNote}</p>}
      {product.category !== 4 &&
        product.terms &&
        !(website && product.referencePrice) && (
          <p className="fgp-price-terms">{product.terms}</p>
        )}
      {(funeral || website) && !general && (
        <ConsultButton
          subject={product.name}
          className="fgp-service-consult"
        >
          直接咨询
        </ConsultButton>
      )}
    </section>
  );
  const overviewContent = (<>
          <span className="fgp-category-label">{category.name}</span>
          <h1>{product.name}</h1>
        {product.saleStatus === 'sold_out' && <p className="fgp-sold-reference">此产品已售罄，以下资料仅供参考。</p>}
          <ProductTags product={product} />
          {funeral && !website && (
            <div
              className="fgp-service-price-summary"
              aria-label="殡仪服务价格摘要"
            >
              <ProductPrices
                product={product}
                religion={religion}
                showNotes={false}
              />
            </div>
          )}
          {funeralDurationLabel(product) && (
            <p className="fgp-duration">{funeralDurationLabel(product)}</p>
          )}
          {product.subtitle && <p>{product.subtitle}</p>}
          {product.description && <p>{product.description}</p>}
          <dl className="fgp-specs">
            {orderedSpecs.map(([label, value]) => (
              <div key={label} className={website && funeral && label === "服务地点" ? "fgp-service-location" : undefined}>
                {website && funeral && label === "服务地点" && <MapPin size={16} aria-hidden="true"/>}
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
  </>);
  const countInclusionRows = (items: string[], groups?: InclusionGroup[]) =>
    !items.length ? 0 : groups?.some(group => group.title)
      ? groups.reduce((total, group) => total + group.items.length, 0) : items.length;
  const inclusionCount = countInclusionRows(product.inclusions, product.inclusionGroups)
    + content.reduce((total, r) => total + countInclusionRows(r.inclusions, r.inclusionGroups), 0);
  const inclusions = (
        <section className="fgp-inclusions" id="fgp-inclusions">
          <h2>{website && funeral ? "包含项目与服务权益" : "包含项目"}{general && <span className="fgp-general-inclusion-count">{inclusionCount} 项</span>}</h2>
          {product.inclusions.length > 0 ? (
            <InclusionList
              items={product.inclusions}
              groups={product.inclusionGroups}
              funeral={funeral}
              expanded={general}
            />
          ) : !funeral ||
            !product.religions.some((r) => r.inclusions.length) ? (
            <p className="fgp-muted">
              对应产品的包含项目尚待核实，暂不列入未确认的内容。
            </p>
          ) : null}
          {(product.attributeNotes || []).map(note => <section key={note.label} className="fgp-attribute-note"><h3>{note.label}</h3><p style={{whiteSpace:'pre-line'}}>{note.text}</p></section>)}
          {product.religions.some(
            (r) => r.inclusions.length || r.configurationName || r.configurationNotes || (!general && r.designs.length),
          ) && (
            <div className="fgp-religious-content">
              <h3>宗教对应内容</h3>
              {!general && product.religions.length > 1 && (
                <div
                  className="fgp-content-tabs"
                  role="group"
                  aria-label="宗教对应内容选择"
                >
                  <button
                    className={!religion ? "is-selected" : ""}
                    aria-pressed={!religion}
                    onClick={() => {
                      setReligion("");
                      setDesign("共通产品图");
                    }}
                  >
                    全部宗教
                  </button>
                  {product.religions.map((r) => (
                    <button
                      key={r.id}
                      className={religion === r.id ? "is-selected" : ""}
                      aria-pressed={religion === r.id}
                      onClick={() => {
                        setReligion(r.id);
                        setDesign("共通产品图");
                      }}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
              {content.filter(r => !general || r.inclusions.length || r.configurationName || r.configurationNotes).map((r) => (
                <div key={r.id} className="fgp-religious-group">
                  <h4>{r.name}</h4>
                  {r.configurationName && r.configurationName !== r.name && <h5>{r.configurationName}</h5>}
                  {r.configurationNotes && <p style={{whiteSpace:'pre-line'}}>{r.configurationNotes}</p>}
                  {r.inclusions.length > 0 && (
                    <InclusionList
                      items={r.inclusions}
                      groups={r.inclusionGroups}
                      religious
                      funeral={funeral}
                      expanded={general}
                    />
                  )}
                  {!general && r.designs.length > 0 && (
                    <p>
                      对应设计：{r.designs.join("、")}。各设计沿用本产品价格。
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
  );
  const layout = (
    <>
      <div
        className={`fgp-detail-top${product.category === 4 ? " fgp-service-detail" : ""}`}
      >
        {general ? <GeneralProductGallery product={product} religion={religion} imageRenderer={imageRenderer}/> : product.category !== 4 && (
          <section className="fgp-gallery" aria-label="产品图片">
            <ProductImage
              product={product}
              large
              caption={selectedDesign}
              imageRenderer={imageRenderer}
            />
            {designs.length > 1 && (
              <div
                className="fgp-designs"
                role="group"
                aria-label="设计图片选择"
              >
                {designs.map((d) => (
                  <button
                    key={d}
                    className={selectedDesign === d ? "is-selected" : ""}
                    aria-pressed={selectedDesign === d}
                    onClick={() => setDesign(d)}
                  >
                    <ImageIcon size={16} />
                    {d}
                    {galleryChoices(product).find(choice => choice.label === d)?.image.sale_status === 'sold_out' && <span className="fgp-sale-status">已售罄</span>}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
        <section className="fgp-product-overview">
          {website && funeral ? <div className="fgp-funeral-summary">{overviewContent}</div> : overviewContent}
          {website && pricePanel}
          {!funeral && !general && (
            <a
              className="fgp-overview-next"
              href="#fgp-inclusions"
              onClick={
                embedded
                  ? (event) => {
                      event.preventDefault();
                      event.currentTarget.ownerDocument
                        .getElementById("fgp-inclusions")
                        ?.scrollIntoView({ block: "start" });
                    }
                  : undefined
              }
            >
              查看包含项目
              <ArrowRight size={16} />
            </a>
          )}
        </section>
      </div>
      <div
        className={`fgp-detail-bottom${funeral ? " fgp-service-content" : ""}`}
      >
        {inclusions}
        {!website && pricePanel}
      </div>
      {general && <section className="fgp-general-consult">{consultAction}</section>}
    </>
  );
  if (general) {
    const generalSpecs = specs;
    // The public projection already excludes unapproved or restricted images.
    const designImages = [...new Map((product.images || [])
      .filter(image => image.image_type === "design" &&
        (!religion || image.religion_id == null || String(image.religion_id) === religion))
      .map(image => [`${image.religion_id ?? "common"}:${image.design_name?.trim() || image.id || image.path}`, image])).values()];
    return <div className="fgp-general-detail">
      <header className="fgp-general-heading">
        <ProductTags product={product}/>
        <h1>{product.name}</h1>
        {product.saleStatus === 'sold_out' && <p className="fgp-sold-reference">此产品已售罄，以下资料仅供参考。</p>}
        {product.subtitle && <p className="fgp-general-subtitle">{product.subtitle}</p>}
        {product.description && <p className="fgp-general-description">{product.description}</p>}
        {generalSpecs.length > 0 && <dl className="fgp-specs">{generalSpecs.map(([label, value]) =>
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
      </header>
      <div className="fgp-general-body">
        <div className="fgp-general-media">
          <GeneralProductGallery product={product} religion={religion} imageRenderer={imageRenderer}/>
          {designImages.length > 0 && <section className="fgp-design-comparison" aria-label="宗教与设计参考">
            <h2>宗教与设计参考</h2>
            <div className="fgp-design-grid">{designImages.map(image => <article key={image.id}>
              <DesignImagePreview soldOut={image.sale_status === 'sold_out'} label={`${image.design_name?.trim() || image.alt || `${product.name}设计参考`}${image.sale_status === 'sold_out' ? '（已售罄）' : ''}`}>{imageRenderer ? imageRenderer(image) : <CatalogImage image={image}/>}</DesignImagePreview>
              {image.design_name?.trim() && <h3>{image.design_name}</h3>}
              {image.religion_id != null && <footer className="fgp-design-footer"><span className="fgp-design-religion">适用：{product.religions.find(r => r.id === String(image.religion_id))?.name}</span></footer>}
            </article>)}</div>
          </section>}
        </div>
        <div className="fgp-general-purchase">
          {pricePanel}
          <div className="fgp-general-consult">{consultAction}</div>
          {inclusions}
        </div>
      </div>
    </div>;
  }
  return layout;
}

export function ProductPrices({
  product,
  detailed = false,
  religion = "",
  compact = false,
  showCompactNotes = false,
  showNotes: notesVisible = true,
}: {
  product: PrototypeProduct;
  detailed?: boolean;
  religion?: string;
  compact?: boolean;
  showCompactNotes?: boolean;
  showNotes?: boolean;
}) {
  const { website } = useContext(ProductNavigationContext);
  const funeral = product.category === 4;
  const unavailable = website ? "欢迎咨询" : "价格待核实";
  const offerSpecs = (area: unknown, facing: unknown, position: unknown) => [
    ...([1,2,6,7].includes(product.category) && differentArea(area, product.area) ? [`面积：${differentArea(area, product.area)} sqft`] : []),
    ...([1,2,5,6,7].includes(product.category) && differentText(facing, product.facing) ? [`朝向：${differentText(facing, product.facing)}`] : []),
    ...([1,2].includes(product.category) && typeof position === 'string' && position.trim() ? [`位置：${position.trim()}`] : []),
  ];
  let rows: {name: string; kind: string; amount: number; note: string; soldOut?: boolean; specs?: string[]; area?: number | null; position?: string | null; religionId?: string}[] = product.publicPrices
    ? product.publicPrices
        .filter(
          (p) =>
            (!religion ||
              p.religion_id == null ||
              String(p.religion_id) === religion) &&
            (funeral
              ? ["pre_need", "at_need"].includes(p.price_type)
              : p.price_type === "standard"),
        )
        .map((p) => ({
          name: p.offer_name,
          soldOut: product.saleStatus === 'sold_out' || p.sale_status === 'sold_out',
          kind: p.price_type,
          amount: Number(p.amount),
          note: cleanPriceNote(p.price_note),
          specs: offerSpecs(p.area_sqft_override, p.facing_override, p.position_type),
          area: p.area_sqft_override ?? product.area,
          position: p.position_type,
          religionId: p.religion_id == null ? undefined : String(p.religion_id),
        }))
    : funeral
      ? [
          ...(product.preNeed === undefined
            ? []
            : [
                {
                  name: "",
                  kind: "pre_need",
                  amount: product.preNeed,
                  note: cleanPriceNote(product.priceNote),
                },
              ]),
          ...(product.atNeed === undefined
            ? []
            : [
                {
                  name: "",
                  kind: "at_need",
                  amount: product.atNeed,
                  note: cleanPriceNote(product.priceNote),
                },
              ]),
        ]
      : product.offers.map((o) => ({
          name: o.name,
          soldOut: product.saleStatus === 'sold_out' || o.saleStatus === 'sold_out',
          kind: "standard",
          amount: o.amount,
          note: cleanPriceNote(product.priceNote),
          specs: offerSpecs(o.area, o.facing, o.positionType),
          area: o.area ?? product.area,
          position: o.positionType,
          religionId: o.religionId,
        }));
  rows = rows.filter((r) => Number.isFinite(r.amount) && r.amount > 0);
  // Cards quote a purchasable plan rather than a cheaper sold-out reference.
  // Detail views retain every published plan, with its own sales badge.
  if (compact && !funeral && rows.some(row => !row.soldOut)) rows = rows.filter(row => !row.soldOut);
  const startingPrice = product.category === 3 || (!funeral && compact && rows.length > 1);
  if ((product.category === 3 || (!funeral && compact)) && rows.length)
    rows = [
      rows.reduce((best, row) => (row.amount < best.amount ? row : best)),
    ];
  // Funeral notes can share individual lines (e.g. stamp duty) while retaining
  // a separate pre-need condition. Keep every distinct line with its price.
  const common = funeral
    ? rows.some((row) => row.kind === "pre_need") &&
      rows.some((row) => row.kind === "at_need")
      ? rows[0].note
          .split("\n")
          .filter(
            (line) =>
              line && rows.every((row) => row.note.split("\n").includes(line)),
          )
          .join("\n")
      : ""
    : rows.length > 1 && rows.every((r) => r.note && r.note === rows[0].note)
      ? rows[0].note
      : "";
  if (funeral) {
    for (const kind of ["pre_need", "at_need"]) {
      if (!rows.some((row) => row.kind === kind))
        rows.push({ name: "", kind, amount: 0, note: "" });
    }
    rows.sort(
      (a, b) =>
        (a.kind === "pre_need" ? 0 : 1) - (b.kind === "pre_need" ? 0 : 1),
    );
  }
  const showNotes = notesVisible && (detailed || funeral || showCompactNotes);
  const renderNote = (note: string, extraClass = "") => {
    if (!showNotes || !note) return null;
    return <p className={`fgp-price-note${extraClass}`}>{note}</p>;
  };
  const displayedRows = rows.map((row) => ({
    ...row,
    note: funeral
      ? row.note
          .split("\n")
          .filter((line) => !common.split("\n").includes(line))
          .join("\n")
      : row.note === common
        ? ""
        : row.note,
  }));
  const grouped = detailed && !compact && [1,2].includes(product.category) && displayedRows.length > 1 && displayedRows.some(row => formatSqft(row.area));
  if (grouped) return (
    <div className="fgp-prices fgp-prices-detail fgp-grouped-prices">
      <div className="fgp-area-prices">
        {groupPricesByArea(displayedRows).map(group => <section key={group.area ?? 'unknown'} className="fgp-area-price-group" aria-label={formatSqft(group.area) || '面积未填写'}>
          <h3>{formatSqft(group.area) || '面积未填写'}</h3>
          {group.items.map((row,index) => <div className={`fgp-area-price-row${row.soldOut ? ' is-sold-out' : ''}`} key={index}>
            <span>{pricePlanLabel(row.name)}{row.religionId && `（${product.religions.find(religion=>religion.id===row.religionId)?.name || '宗教配置'}）`}{row.soldOut && <span className="fgp-sale-status">已售罄</span>}</span>
            <strong>{row.soldOut ? <del>{formatMoney(row.amount)}</del> : formatMoney(row.amount)}</strong>
            {row.specs?.filter(spec=>!spec.startsWith('面积：') && !spec.startsWith('位置：')).length ? <p className="fgp-price-note">{row.specs.filter(spec=>!spec.startsWith('面积：') && !spec.startsWith('位置：')).join(' · ')}</p> : null}
            {renderNote(row.note)}
          </div>)}
        </section>)}
      </div>
      {renderNote(common, ' fgp-common-price-note')}
    </div>
  );
  return (
    <div
      className={`fgp-prices${funeral ? " fgp-dual-prices" : ""}${detailed ? " fgp-prices-detail" : ""}${compact ? " fgp-prices-compact" : ""}${detailed && !compact && !funeral && product.category !== 3 ? " fgp-price-table" : ""}`}
    >
      {displayedRows.map((row, index) => (
        <div className={`fgp-price-entry${row.soldOut ? ' is-sold-out' : ''}`} key={index}>
          {(funeral || !compact || rows.length > 1) && (
            <span>
              {funeral
                ? row.kind === "pre_need"
                  ? "预购价格"
                  : "即用价格"
                : product.category === 3
                  ? "最低起价"
                  : detailed && rows.length === 1 ? "产品售价"
                  : row.name && !['默认方案','产品售价'].includes(row.name)
                    ? row.name
                    : "产品售价"}
              {row.soldOut && <span className="fgp-sale-status">已售罄</span>}
            </span>
          )}
          <strong>
            {row.amount > 0 ? row.soldOut ? <del>{formatMoney(row.amount)}</del> : formatMoney(row.amount) : unavailable}
            {startingPrice && <em>起</em>}
          </strong>
          {row.soldOut && compact && !funeral && rows.length === 1 && <span className="fgp-sale-status">已售罄</span>}
          {detailed && !compact && row.specs?.length ? <p className="fgp-price-note fgp-offer-attributes">{row.specs.join(' · ')}</p> : null}
          {renderNote(row.note)}
        </div>
      ))}
      {!rows.length && (
        <div>
          <strong>{unavailable}</strong>
        </div>
      )}
      {renderNote(common, " fgp-common-price-note")}
    </div>
  );
}
