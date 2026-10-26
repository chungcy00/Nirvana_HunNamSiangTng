import { useContext, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Image as ImageIcon,
  MapPin,
} from "lucide-react";
import { GeneralProductGallery } from "./GeneralProductGallery";
import CatalogImage from "../catalog/PublicImage";
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
    </div>
  );
}
export function ProductTags({ product, desktopServiceVenue = false }: { product: PrototypeProduct; desktopServiceVenue?: boolean }) {
  return (
    <div className="fgp-tags">
      {hasCapacity(product.category) && product.capacity && (
        <span>
          {product.category === 3 &&
          product.capacity === "four_plus" &&
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
                {religious ? (
                  <h5>{group.title || "包含项目"}</h5>
                ) : (
                  <h3>{group.title || "包含项目"}</h3>
                )}
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

export function ProductDetailContent({
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
            product.category === 3 &&
            product.capacity === "four_plus" &&
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
    ...(product.category === 3 && product.placement
      ? [["安放环境", product.placement === "indoor" ? "室内" : "室外"]]
      : []),
    ...([1, 2, 5, 6, 7].includes(product.category) && product.facing
      ? [["朝向", product.facing]]
      : []),
    ...([1, 2, 6, 7].includes(product.category) && product.area
      ? [["面积", `${product.area} sqft`]]
      : []),
  ];
  const pricePanel = (
    <section
      ref={pricePanelRef}
      className="fgp-price-panel"
      aria-labelledby="fgp-price-heading"
    >
      <h2 id="fgp-price-heading">
        {product.category === 4
          ? "殡仪服务价格"
          : product.category === 3
            ? "最低起价"
            : "产品价格"}
      </h2>
      <ProductPrices product={product} detailed religion={religion} />
      {product.productPriceNote && <p className="fgp-price-note fgp-product-price-note">{product.productPriceNote}</p>}
      {[1, 2, 6, 7].includes(product.category) && product.offers.length > 1 && product.offers.some((o) => o.area) && (
        <dl className="fgp-offer-specs">
          {product.offers
            .filter((o) => o.area)
            .map((o) => (
              <div key={o.name}>
                <dt>{o.name}</dt>
                <dd>{o.area} sqft</dd>
              </div>
            ))}
        </dl>
      )}
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
            {specs.map(([label, value]) => (
              <div key={label} className={website && funeral && label === "服务地点" ? "fgp-service-location" : undefined}>
                {website && funeral && label === "服务地点" && <MapPin size={16} aria-hidden="true"/>}
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
  </>);
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
        <section className="fgp-inclusions" id="fgp-inclusions">
          <h2>包含项目</h2>
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
          {product.religions.some(
            (r) => r.inclusions.length || r.designs.length,
          ) && (
            <div className="fgp-religious-content">
              <h3>宗教对应内容</h3>
              {product.religions.length > 1 && (
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
              {content.map((r) => (
                <div key={r.id} className="fgp-religious-group">
                  <h4>{r.name}</h4>
                  {r.inclusions.length > 0 && (
                    <InclusionList
                      items={r.inclusions}
                      groups={r.inclusionGroups}
                      religious
                      funeral={funeral}
                      expanded={general}
                    />
                  )}
                  {r.designs.length > 0 && (
                    <p>
                      对应设计：{r.designs.join("、")}。各设计沿用本产品价格。
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
        {!website && pricePanel}
      </div>
      {general && <section className="fgp-general-consult"><ConsultButton subject={product.name} className="fgp-service-consult">直接咨询</ConsultButton></section>}
    </>
  );
  return general ? <div className="fgp-general-detail">{layout}</div> : layout;
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
  let rows = product.publicPrices
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
          kind: p.price_type,
          amount: Number(p.amount),
          note: cleanPriceNote(p.price_note),
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
          kind: "standard",
          amount: o.amount,
          note: cleanPriceNote(product.priceNote),
        }));
  rows = rows.filter((r) => Number.isFinite(r.amount) && r.amount > 0);
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
  return (
    <div
      className={`fgp-prices${funeral ? " fgp-dual-prices" : ""}${detailed ? " fgp-prices-detail" : ""}${compact ? " fgp-prices-compact" : ""}`}
    >
      {displayedRows.map((row, index) => (
        <div className="fgp-price-entry" key={index}>
          {(funeral || !compact || rows.length > 1) && (
            <span>
              {funeral
                ? row.kind === "pre_need"
                  ? "预购价格"
                  : "即用价格"
                : product.category === 3
                  ? "最低起价"
                  : rows.length > 1
                    ? row.name
                    : "产品售价"}
            </span>
          )}
          <strong>
            {row.amount > 0 ? formatMoney(row.amount) : unavailable}
            {startingPrice && <em>起</em>}
          </strong>
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
