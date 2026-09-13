import { useParams, Link } from "react-router-dom";
import { Check, ArrowUpRight, Plus } from "lucide-react";
import { categories, products, sourceCheckedAt } from "../data/catalog";
import {
  Breadcrumb,
  Placeholder,
  ConsultButton,
  NotFound,
  ProductCard,
  SectionHeading,
  money,
} from "../components/ui";
export default function PackageDetail() {
  const { slug } = useParams();
  const product = products.find((p) => p.slug === slug);
  if (!product)
    return <NotFound title="找不到该配套" to="/nirvana" label="返回产品类别" />;
  const category = categories.find((c) => c.id === product.categoryId)!;
  const related = products
    .filter((p) => p.categoryId === product.categoryId && p.slug !== slug)
    .slice(0, 3);
  return (
    <div className="container detail-page">
      <Breadcrumb
        items={[
          { label: "富贵山庄", to: "/nirvana" },
          { label: category.name, to: `/nirvana/${category.id}` },
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
                <p className="muted">按六个阶段了解，点击展开各阶段摘要。</p>
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
                    此处预留完整服务清单。当前先展示分类摘要，具体项目与数量请查阅参考资料并咨询确认。
                  </p>
                  <a
                    className="text-link"
                    href={product.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    查看参考站完整资料 <ArrowUpRight size={16} />
                  </a>
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
            <p className="source-note">
              产品参考：
              <a
                href={product.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Nirvana Kuching 025 Agency <ArrowUpRight size={12} />
              </a>{" "}
              · 核对日期 {sourceCheckedAt}
            </p>
          </section>
        </div>
        <aside className="detail-sidebar">
          <div className="detail-info">
            <span className="pill">{category.name}</span>
            <h1>{product.name}</h1>
            <p className="english">{product.english}</p>
            <div className="detail-prices">
              {product.preNeedPrice ? (
                <>
                  <div>
                    <span>预购参考价</span>
                    <strong>{money(product.preNeedPrice)}</strong>
                  </div>
                  <div>
                    <span>即用参考价</span>
                    <strong>
                      {product.asNeedPrice
                        ? money(product.asNeedPrice)
                        : "待确认"}
                    </strong>
                  </div>
                </>
              ) : (
                <div>
                  <span>参考售价</span>
                  <strong>
                    {product.price ? money(product.price) : "欢迎咨询"}
                  </strong>
                </div>
              )}
            </div>
            {(product.depositPercent || product.installmentMonths) && (
              <div className="installment">
                <span>预购付款参考</span>
                <p>
                  {product.depositPercent}% 首期 · {product.installmentMonths}{" "}
                  个月分期
                </p>
              </div>
            )}
            <p className="small muted">
              价格、规格与供应情况可能调整。实际安排与费用，请以咨询时的确认为准。
            </p>
            <ConsultButton subject={product.name}>咨询此配套</ConsultButton>
            <Link className="text-link" to={`/nirvana/${category.id}`}>
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
