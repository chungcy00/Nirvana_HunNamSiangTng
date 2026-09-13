import { useParams, useSearchParams, Link } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { categories, products, sourceCheckedAt } from "../data/catalog";
import {
  Breadcrumb,
  ProductCard,
  ConsultButton,
  NotFound,
  money,
} from "../components/ui";
import type { Product } from "../types";
function Comparison({ items }: { items: Product[] }) {
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
          <caption>殡仪配套预购与即用价格比较</caption>
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
              <th scope="row">预购参考价</th>
              {items.map((p) => (
                <td key={p.slug}>
                  {p.preNeedPrice ? money(p.preNeedPrice) : "待确认"}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">即用参考价</th>
              {items.map((p) => (
                <td key={p.slug}>
                  {p.asNeedPrice ? money(p.asNeedPrice) : "待确认"}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">仪式说明</th>
              {items.map((p) => (
                <td key={p.slug}>
                  {p.slug.includes("freedom") ? "仅限火化" : "具体安排请咨询"}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">进一步了解</th>
              {items.map((p) => (
                <td key={p.slug}>
                  <Link
                    className="text-link"
                    to={`/nirvana/packages/${p.slug}`}
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
        资料核对：{sourceCheckedAt}
        。价格与服务内容可能调整，请以咨询时的确认为准。
      </p>
    </section>
  );
}
export default function Category() {
  const { categoryId } = useParams();
  const [params, setParams] = useSearchParams();
  const category = categories.find((c) => c.id === categoryId);
  if (!category)
    return (
      <NotFound title="找不到这个产品类别" to="/nirvana" label="返回六大类别" />
    );
  const filter = category.filters.includes(params.get("filter") || "")
    ? params.get("filter")!
    : category.filters[0];
  const query = params.get("q") || "";
  const all = products.filter((p) => p.categoryId === category.id);
  const filtered = all.filter(
    (p) =>
      (filter === "全部" || p.tags.includes(filter)) &&
      `${p.name} ${p.english} ${p.zone || ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
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
            { label: "富贵山庄", to: "/nirvana" },
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
              {category.id === "funeral-services"
                ? "选择信仰 / 仪式需求"
                : "选择类型"}
            </p>
            <div className="filter-chips" role="group" aria-label="类别筛选">
              {category.filters.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={filter === item ? "selected" : ""}
                  aria-pressed={filter === item}
                  onClick={() => setParam("filter", item)}
                >
                  {item}
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
        {filter === "其他 / 咨询" ? (
          <div className="empty-state card">
            <h2>每个家庭，都有自己的纪念方式</h2>
            <p>其他信仰与仪式需求，欢迎先咨询确认适合的安排。</p>
            <ConsultButton subject="其他信仰 / 仪式需求" />
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
            {category.id === "funeral-services" && (
              <Comparison items={all.filter((p) => p.tags.includes(filter))} />
            )}
          </>
        )}
        <div className="catalog-help">
          <p>还不确定哪一种适合您？</p>
          <ConsultButton subject={category.name}>咨询这个类别</ConsultButton>
          <Link to="/nirvana" className="text-link">
            返回全部类别 <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
