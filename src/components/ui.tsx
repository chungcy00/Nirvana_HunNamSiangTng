import type { ReactNode } from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { whatsappUrl } from "../data/site";

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
