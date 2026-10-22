import { useParams, useLocation, Link } from "react-router-dom";
import { Check, Plus } from "lucide-react";
import { useCatalog } from "../catalog/context";
import { categoryPath } from "../catalog/repository";
import { placementLabel } from "../catalog/nichePlacement";
import { Breadcrumb, ProductCard, money } from "../components/catalog/ui";
import { Placeholder } from "../components/Placeholder";
import { ConsultButton, NotFound, SectionHeading } from "../components/ui";
export default function PackageDetail() {
  const location = useLocation();
  const requestedReturn = location.state?.questionnaireReturn;
  const questionnaireReturn = typeof requestedReturn==='string' && requestedReturn.startsWith('/contact#needs-product-') ? requestedReturn : null;
  const { slug, providerSlug } = useParams();
  const catalog = useCatalog();
  const provider = catalog.getProviderBySlug(providerSlug || "");
  const product = provider
    ? catalog.getProductBySlug(provider.id, slug || "")
    : undefined;
  const category = product
    ? catalog.getCategory(product.categoryId)
    : undefined;
  if (!product || !provider || !category)
    return (
      <NotFound
        title="找不到该配套"
        to={provider ? `/${provider.slug}` : "/"}
        label="返回产品类别"
      />
    );
  const related = catalog
    .getProducts(category.id)
    .filter((item) => item.id !== product.id)
    .slice(0, 3);
  return (
    <div className="container detail-page">
      {questionnaireReturn && <Link className="questionnaire-return-link" to={questionnaireReturn}>返回问卷结果</Link>}
      <Breadcrumb
        items={[
          { label: provider.name, to: `/${provider.slug}` },
          {
            label: category.name,
            to: categoryPath(provider.slug, category.slug),
          },
          { label: product.name },
        ]}
      />
      <div className="detail-layout">
        <div>
          <Placeholder
            className="detail-cover"
            label={`${product.name} · 主图预留`}
          />
          <div className="gallery-slots">
            {["环境照片", "产品细节", "位置示意"].map((label) => (
              <Placeholder key={label} label={`${label}预留`} />
            ))}
          </div>
          <section className="detail-section">
            <p className="eyebrow">ABOUT THIS OPTION</p>
            <h2>配套简介</h2>
            <p>{product.description}</p>
            <dl className="specifications">
              {[
                ["产品类别", category.name],
                ["安放环境", placementLabel(product.nicheDetails?.placementType)],
                ["区域", product.zone],
                ["面积", product.area],
                ["方向", product.direction],
                ["服务天数", product.duration],
                ["服务地点", product.venue],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          </section>
          <section className="detail-section">
            <h2>服务与包含内容</h2>
            {product.features ? (
              <ul className="feature-list">
                {product.features.map((feature) => (
                  <li key={feature}>
                    <Check size={18} />
                    {feature}
                  </li>
                ))}
              </ul>
            ) : product.groups ? (
              <>
                <p className="muted">按服务阶段了解，点击展开各阶段摘要。</p>
                <div className="accordion-list">
                  {product.groups.map((group, i) => (
                    <details key={group.title}>
                      <summary>
                        <span className="step-number">0{i + 1}</span>
                        {group.title}
                        <Plus size={17} />
                      </summary>
                      <p>{group.text}</p>
                    </details>
                  ))}
                </div>
                <details className="detail-full">
                  <summary>
                    完整项目说明 <Plus size={16} />
                  </summary>
                  <p>
                    此处预留完整服务清单。当前先展示分类摘要，具体项目与数量请咨询确认。
                  </p>
                </details>
              </>
            ) : (
              <div className="content-slot">
                <p>详细服务内容预留</p>
                <span>包含项目、适合对象与注意事项，将在资料确认后补充。</span>
              </div>
            )}
          </section>
          <section className="detail-section">
            <h2>咨询前，可以先想一想</h2>
            <p>
              您的信仰或仪式偏好、希望了解的安置方式、预算与时间安排，都可以作为讨论的起点。
            </p>
          </section>
        </div>
        <aside className="detail-sidebar">
          <div className="detail-info">
            <span className="pill">{category.name}</span>
            {placementLabel(product.nicheDetails?.placementType) && <span className="pill placement-tag">{placementLabel(product.nicheDetails?.placementType)}</span>}
            <h1>{product.name}</h1>
            <p className="english">{product.english}</p>
            <div className="detail-prices">
              {product.preNeedPrice != null || product.asNeedPrice != null ? (
                <>
                  <div>
                    <span>生前规划价（Pre-Need）</span>
                    <strong>
                      {product.preNeedPrice != null
                        ? money(product.preNeedPrice)
                        : "待确认"}
                    </strong>
                  </div>
                  <div>
                    <span>即时需求价（As-Need）</span>
                    <strong>
                      {product.asNeedPrice != null
                        ? money(product.asNeedPrice)
                        : "待确认"}
                    </strong>
                  </div>
                </>
              ) : (
                <div>
                  <span>{product.nicheDetails ? "最低起价" : "参考售价"}</span>
                  <strong>
                    {product.price != null ? `${money(product.price)}${product.nicheDetails ? " 起" : ""}` : "欢迎咨询"}
                  </strong>
                </div>
              )}
            </div>
            {(product.depositPercent != null ||
              product.installmentMonths != null) && (
              <div className="installment">
                <span>生前规划付款参考（Pre-Need）</span>
                <p>
                  {[
                    product.depositPercent != null
                      ? `${product.depositPercent}% 首期`
                      : null,
                    product.installmentMonths != null
                      ? `${product.installmentMonths} 个月分期`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            )}
            <p className="small muted">
              价格、规格与供应情况可能调整。实际安排与费用，请以咨询时的确认为准。
            </p>
            <ConsultButton subject={product.name}>咨询此配套</ConsultButton>
            <Link
              className="text-link"
              to={categoryPath(provider.slug, category.slug)}
            >
              返回{category.name}选择
            </Link>
          </div>
        </aside>
      </div>
      {!!related.length && (
        <section className="section">
          <SectionHeading eyebrow="MORE TO EXPLORE" title="同类选择" />
          <div className="grid-three">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
