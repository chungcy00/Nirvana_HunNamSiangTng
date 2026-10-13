import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  Leaf,
  ListChecks,
} from "lucide-react";
import { principles } from "../data/site";
import { ConsultButton, SectionHeading } from "../components/ui";

const icons = [HeartHandshake, Leaf, ListChecks, CheckCircle2];

const servicePortals = [
  {
    title: "富贵山庄",
    english: "NIRVANA MEMORIAL PARK",
    description: "想了解福地、骨灰殿及殡仪安排，可以由此开始",
    services: ["福地（土葬/火葬）", "骨灰殿", "殡仪服务", "宠物纪念"],
    to: "/nirvana",
    imagePosition: "left center",
  },
  {
    title: "云南善堂",
    english: "HUN NAM SIANG TNG",
    description: "想了解从治丧到出殡的全程安排，可以由此开始",
    services: ["治丧礼仪", "灵堂布置", "出殡安排", "殡仪配套"],
    to: "/yunnan-siantang",
    imagePosition: "right center",
  },
];

export default function Home() {
  const page = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = page.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="home-page" ref={page}>
      <section className="home-hero">
        <div className="container home-hero-shell">
          <div className="hero-image-frame">
            <picture>
              <source
                media="(orientation: portrait) and (max-width: 1024px)"
                srcSet="/images/home-hero-mobile.webp"
              />
              <source
                media="(orientation: landscape) and (min-width: 768px) and (max-width: 1366px) and (min-height: 561px) and (any-pointer: coarse)"
                srcSet="/images/home-hero-tablet.webp"
              />
              <source
                media="(orientation: landscape) and (min-width: 768px) and (max-width: 1024px) and (min-height: 561px)"
                srcSet="/images/home-hero-tablet.webp"
              />
              <img
                src="/images/home-hero.webp"
                alt="富贵山庄与云南善堂的环境展示"
                width="1672"
                height="941"
                fetchPriority="high"
              />
            </picture>
            <div className="hero-image-shade" aria-hidden="true" />
            <div className="home-hero-heading">
              <h1>归于土，化于风，安于心</h1>
              <p className="hero-subtitle">身后之事，皆有所依</p>
              <p className="hero-service-line">
                从生前规划到即时安排，为您梳理全流程服务
              </p>
            </div>
            <div className="hero-image-actions">
              <ConsultButton />
              <a className="button button-light" href="#services">
                了解服务 <ArrowRight size={17} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="container section service-portals" id="services">
        <SectionHeading
          eyebrow="TWO PLACES, ONE THOUGHT"
          title="两处安排，皆可安心"
        />
        <div className="portal-grid">
          {servicePortals.map((portal) => (
            <article
              className="portal-card"
              key={portal.title}
              data-reveal
            >
              <div className="portal-visual">
                <img
                  src="/images/home-hero.webp"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={{ objectPosition: portal.imagePosition }}
                />
                <span className="portal-shade" aria-hidden="true" />
                <span className="portal-summary-copy">
                  <small>{portal.english}</small>
                  <h3>{portal.title}</h3>
                </span>
              </div>
              <div className="portal-details">
                <p>{portal.description}</p>
                <ul aria-label={`${portal.title}服务`}>
                  {portal.services.map((service) => (
                    <li key={service}>{service}</li>
                  ))}
                </ul>
                <Link className="portal-link" to={portal.to}>
                  进入{portal.title} <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="principles-bar" data-reveal>
        <div className="container principles-grid">
          {principles.map((item, i) => {
            const Icon = icons[i];
            return (
              <article className="principle" key={item.title}>
                <Icon strokeWidth={1.35} aria-hidden="true" />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="container consultation-flow" aria-labelledby="consultation-flow-title">
        <h2 id="consultation-flow-title">每一步，皆有安心的托付</h2>
        <ol className="consultation-timeline" aria-label="服务流程">
          {["倾听需要", "细说选择", "共商细节", "随愿安排"].map((step) => (
            <li key={step}>
              <span className="consultation-node" aria-hidden="true" />
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="consultation-reassurance">此刻，您不是一个人在做决定</p>
        <ConsultButton className="consultation-start">开始咨询</ConsultButton>
      </section>
    </div>
  );
}
