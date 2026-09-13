import type { ReactNode } from "react";
import { ArrowRight, Image, MessageCircle, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { whatsappUrl } from "../data/site";
import { categories } from "../data/catalog";
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
  const category = categories.find((item) => item.id === product.categoryId)!;
  return (
    <article className="card product-card">
      <Link
        to={`/nirvana/packages/${product.slug}`}
        aria-label={`查看${product.name}详情`}
        tabIndex={-1}
      >
        <Placeholder label={`${category.name} · 产品图片预留`} />
      </Link>
      <div className="card-body">
        <div className="card-meta">
          <span>{category.name}</span>
          <span>{product.zone || product.tags[0]}</span>
        </div>
        <h3>
          <Link to={`/nirvana/packages/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className="english">{product.english}</p>
        <p className="card-description">{product.description}</p>
        <p className="price">
          {product.preNeedPrice
            ? money(product.preNeedPrice)
            : product.price
              ? money(product.price)
              : "欢迎咨询"}
          <small>
            {product.preNeedPrice
              ? "预购参考价"
              : product.price
                ? "参考售价"
                : "了解价格与选择"}
          </small>
        </p>
        <div className="card-actions">
          <Link className="text-link" to={`/nirvana/packages/${product.slug}`}>
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
export function ContactCTA() {
  return (
    <section className="container cta">
      <div>
        <p className="eyebrow">HERE, WITH YOU</p>
        <h2>
          不确定从哪里开始？
          <br className="mobile-only" />
          我们可以一起慢慢了解。
        </h2>
        <p>说说您的需要，让下一步更清晰。</p>
      </div>
      <ConsultButton>与我聊一聊</ConsultButton>
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
