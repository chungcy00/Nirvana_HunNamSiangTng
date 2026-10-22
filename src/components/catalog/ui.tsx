import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useCatalog } from "../../catalog/context";
import { productPath } from "../../catalog/repository";
import type { Product } from "../../types";
import { placementLabel } from "../../catalog/nichePlacement";
import { Placeholder } from "../Placeholder";
import { ConsultButton } from "../ui";

export function Breadcrumb({
  items,
}: {
  items: { label: string; to?: string }[];
}) {
  return (
    <nav aria-label="面包屑" className="breadcrumbs">
      <Link to="/">首页</Link>
      {items.map((item, index) => (
        <span key={index}>
          <span aria-hidden="true">/</span>
          {item.to ? (
            <Link to={item.to}>{item.label}</Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
export function money(value: number) {
  return `RM ${value.toLocaleString("en-MY")}`;
}
export function ProductCard({ product }: { product: Product }) {
  const catalog = useCatalog();
  const category = catalog.getCategory(product.categoryId);
  const provider = catalog.getProvider(product.providerId);
  if (!category || !provider || !catalog.getProduct(product.id)) return null;
  const path = productPath(provider.slug, product.slug);
  return (
    <article className="card product-card">
      <Link to={path} aria-label={`查看${product.name}详情`} tabIndex={-1}>
        <Placeholder label={`${category.name} · 产品图片预留`} />
      </Link>
      <div className="card-body">
        <div className="card-meta">
          <span>{category.name}</span>
          <span>{product.zone || catalog.getProductLabels(product.id)[0]}</span>
        </div>
        <h3>
          <Link to={path}>{product.name}</Link>
        </h3>
        <p className="english">{product.english}</p>
        <p className="card-description">{product.description}</p>
        {placementLabel(product.nicheDetails?.placementType) && <span className="pill placement-tag">{placementLabel(product.nicheDetails?.placementType)}</span>}
        <p className="price">
          {product.preNeedPrice != null
            ? money(product.preNeedPrice)
            : product.asNeedPrice != null
              ? money(product.asNeedPrice)
              : product.price != null
                ? `${money(product.price)}${product.nicheDetails ? " 起" : ""}`
                : "欢迎咨询"}
          <small>
            {product.preNeedPrice != null
              ? "生前规划价（Pre-Need）"
              : product.asNeedPrice != null
                ? "即时需求价（As-Need）"
                : product.price != null
                  ? product.nicheDetails ? "最低起价" : "参考售价"
                  : "了解价格与选择"}
          </small>
        </p>
        <div className="card-actions">
          <Link className="text-link" to={path}>
            查看详情 <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <ConsultButton subject={product.name} className="button-small">
            咨询
          </ConsultButton>
        </div>
      </div>
    </article>
  );
}
