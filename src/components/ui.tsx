import type { ReactNode } from "react";
import { ArrowRight, Image, MessageCircle, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { whatsappUrl } from "../data/site";
import { useCatalog } from "../catalog/context";
import { productPath } from "../catalog/repository";
import type { Product } from "../types";

export function Placeholder({
  label = "图片预留",
  portrait = false,
  className = "",
}: {
  label?: string;
  portrait?: boolean;
  className?: string;
}) {
  const Icon = portrait ? UserRound : Image;
  return (
    <div
      className={`placeholder ${portrait ? "portrait" : ""} ${className}`}
      role="img"
      aria-label={label}
    >
      <span className="placeholder-corner">
        {portrait ? "PORTRAIT" : "IMAGE SPACE"}
      </span>
      <div className="placeholder-center">
        <Icon size={portrait ? 42 : 30} strokeWidth={1} aria-hidden="true" />
        <span>{label}</span>
      </div>
      <span className="placeholder-line" aria-hidden="true" />
    </div>
  );
}
export function ConsultButton({
  subject = "",
  children,
  className = "",
}: {
  subject?: string;
  children?: ReactNode;
  className?: string;
}) {
  const message = subject
    ? `您好，我想了解「${subject}」，请问可以提供更多资料吗？`
    : "您好，我想了解身后规划与相关服务。";
  const url = whatsappUrl(message);
  const content = (
    <>
      <MessageCircle size={17} aria-hidden="true" />
      {children || "WhatsApp 咨询"}
    </>
  );
  return url ? (
    <a
      className={`button ${className}`}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {content}
    </a>
  ) : (
    <Link
      className={`button ${className}`}
      to={`/contact${subject ? `?service=${encodeURIComponent(subject)}` : ""}`}
    >
      {content}
    </Link>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {text && <p className="muted">{text}</p>}
      </div>
      {children}
    </div>
  );
}
export function PageHero({
  eyebrow,
  title,
  text,
  children,
  imageLabel,
}: {
  eyebrow: string;
  title: string;
  text: string;
  children?: ReactNode;
  imageLabel?: string;
}) {
  return (
    <section className={`page-hero ${imageLabel ? "with-media" : ""}`}>
      <div className="container page-hero-inner">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="hero-description">{text}</p>
          {children}
        </div>
        {imageLabel && <Placeholder label={imageLabel} />}
      </div>
    </section>
  );
}
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
        <p className="price">
          {product.preNeedPrice != null
            ? money(product.preNeedPrice)
            : product.asNeedPrice != null
              ? money(product.asNeedPrice)
              : product.price != null
                ? money(product.price)
                : "欢迎咨询"}
          <small>
            {product.preNeedPrice != null
              ? "生前规划价（Pre-Need）"
              : product.asNeedPrice != null
                ? "即时需求价（As-Need）"
                : product.price != null
                  ? "参考售价"
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
export function ContactCTA({
  text = "您的每一个需求，我都会为您仔细考量与安排",
}: {
  text?: string;
} = {}) {
  return (
    <section className="container cta">
      <div>
        <p className="eyebrow">HERE, WITH YOU</p>
        <h2>此刻，您不是一个人在做决定</h2>
        <p>{text}</p>
      </div>
      <ConsultButton>开始咨询</ConsultButton>
    </section>
  );
}
export function NotFound({
  title = "这个页面暂时找不到",
  to = "/",
  label = "返回首页",
}: {
  title?: string;
  to?: string;
  label?: string;
}) {
  return (
    <section className="container empty-state">
      <p className="eyebrow">PAGE NOT FOUND</p>
      <h1>{title}</h1>
      <p>请检查网址，或返回继续浏览。</p>
      <Link className="button" to={to}>
        {label}
        <ArrowRight size={18} />
      </Link>
    </section>
  );
}
