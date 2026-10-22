import { useParams, useSearchParams, Link } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { useCatalog } from "../catalog/context";
import { categoryPath, productPath } from "../catalog/repository";
import { Breadcrumb, ProductCard, money } from "../components/catalog/ui";
import { ConsultButton, NotFound } from "../components/ui";
import type { Product } from "../types";
function Comparison({
  items,
  providerSlug,
}: {
  items: Product[];
  providerSlug: string;
}) {
  const catalog = useCatalog();
  return (
    <section className="comparison">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SIDE BY SIDE</p>
          <h2>配套一览，清楚比较</h2>
        </div>
        <span className="muted">价格为公开参考资料</span>
      </div>
      <div
        className="table-scroll"
        role="region"
        aria-label="殡仪配套比较表，可横向滚动"
        tabIndex={0}
      >
        <table>
          <caption>
            殡仪配套生前规划价（Pre-Need）与即时需求价（As-Need）比较
          </caption>
          <thead>
            <tr>
              <th scope="col">比较项目</th>
              {items.map((p) => (
                <th scope="col" key={p.slug}>
                  {p.name.split("（")[0]}
                  <small>{p.english.split(" · ")[0]}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">生前规划价（Pre-Need）</th>
              {items.map((p) => (
                <td key={p.slug}>
                  {p.preNeedPrice != null ? money(p.preNeedPrice) : "待确认"}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">即时需求价（As-Need）</th>
              {items.map((p) => (
                <td key={p.slug}>
                  {p.asNeedPrice != null ? money(p.asNeedPrice) : "待确认"}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">仪式说明</th>
              {items.map((p) => (
                <td key={p.slug}>{p.ritualNote || "具体安排请咨询"}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">进一步了解</th>
              {items.map((p) => (
                <td key={p.slug}>
                  <Link
                    className="text-link"
                    to={productPath(providerSlug, p.slug)}
                  >
                    查看详情 <ArrowRight size={14} />
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="source-note">
        资料核对：{catalog.checkedAt}
        。价格与服务内容可能调整，请以咨询时的确认为准。
      </p>
    </section>
  );
}
export default function Category() {
  const { providerSlug, categorySlug } = useParams();
  const catalog = useCatalog();
  const [params, setParams] = useSearchParams();
  const provider = catalog.getProviderBySlug(providerSlug || "");
  const category = provider
    ? catalog.getCategoryBySlug(provider.id, categorySlug || "")
    : undefined;
  if (!provider || !category)
    return (
      <NotFound
        title="找不到这个产品类别"
        to={provider ? `/${provider.slug}` : "/"}
        label="返回产品类别"
      />
    );
  const options = catalog.getFilters(category.id);
  const filter = catalog.resolveFilter(category.id, params.get("filter"));
  const query = params.get("q") || "";
  const filtered = catalog.getProducts(
    category.id,
    filter?.kind === "category" ? filter.id : undefined,
    query,
  );
  const ancestors = [];
  let parent = category.parentId
    ? catalog.getCategory(category.parentId)
    : undefined;
  while (parent) {
    ancestors.unshift({
      label: parent.name,
      to: categoryPath(provider.slug, parent.slug),
    });
    parent = parent.parentId ? catalog.getCategory(parent.parentId) : undefined;
  }
  const setParam = (key: string, value: string) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  return (
    <>
      <div className="container">
        <Breadcrumb
          items={[
            { label: provider.name, to: `/${provider.slug}` },
            ...ancestors,
            { label: category.name },
          ]}
        />
      </div>
      <section className="category-heading container">
        <p className="eyebrow">{category.english}</p>
        <h1>{category.name}</h1>
        <p className="hero-description">{category.description}</p>
      </section>
      <section className="container catalog-section">
        <div className="filter-toolbar">
          <div>
            <p className="field-heading">
              {category.filterLabel || "选择类型"}
            </p>
            <div className="filter-chips" role="group" aria-label="类别筛选">
              {options.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={filter?.id === item.id ? "selected" : ""}
                  aria-pressed={filter?.id === item.id}
                  onClick={() => setParam("filter", item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              aria-label="搜索配套名称或区域"
              placeholder="搜索名称 / 区域"
              value={query}
              onChange={(event) => setParam("q", event.target.value)}
            />
          </label>
        </div>
        {filter?.kind === "inquiry" ? (
          <div className="empty-state card">
            <h2>每个家庭，都有自己的纪念方式</h2>
            <p>{category.inquiryOption?.description}</p>
            <ConsultButton
              subject={category.inquiryOption?.subject || category.name}
            />
          </div>
        ) : (
          <>
            <p className="results-count" role="status">
              共 {filtered.length} 项选择
            </p>
            {filtered.length ? (
              <div className="grid-three">
                {filtered.map((product) => (
                  <ProductCard key={product.slug} product={product} />
                ))}
              </div>
            ) : (
              <div className="empty-state card">
                <h2>暂时没有符合的配套</h2>
                <p>试试其他关键词或类型。</p>
                <button
                  className="button button-outline"
                  onClick={() => setParams({})}
                >
                  清除筛选
                </button>
              </div>
            )}
            {category.displayMode === "comparison" && filtered.length > 0 && (
              <Comparison items={filtered} providerSlug={provider.slug} />
            )}
          </>
        )}
        <div className="catalog-help">
          <p>还不确定哪一种适合您？</p>
          <ConsultButton subject={category.name}>咨询这个类别</ConsultButton>
          <Link to={`/${provider.slug}`} className="text-link">
            返回全部类别 <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
