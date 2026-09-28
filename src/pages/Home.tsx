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
import { ConsultButton, ContactCTA, SectionHeading } from "../components/ui";

const icons = [HeartHandshake, Leaf, ListChecks, CheckCircle2];

const servicePortals = [
  {
    title: "富贵山庄",
    english: "NIRVANA MEMORIAL PARK",
    description: "从生前规划到即时需求，了解安葬、安置与告别服务。",
    services: ["福地", "骨灰殿", "殡仪服务", "宠物纪念"],
    to: "/nirvana",
    imagePosition: "left center",
  },
  {
    title: "云南善堂",
    english: "HUN NAM SIANG TNG",
    description: "按家庭当下的需要，了解流程、仪式与相关协助。",
    services: ["殡葬咨询", "流程说明", "家属协助", "后续安排"],
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

    root.classList.add("motion-enhanced");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = page.current;
    if (!root || !("IntersectionObserver" in window)) return;

    const touchPointer = window.matchMedia("(hover: none), (pointer: coarse)");
    const cards = Array.from(root.querySelectorAll<HTMLElement>(".portal-card"));
    let observer: IntersectionObserver | undefined;

    const observeCards = () => {
      observer?.disconnect();
      cards.forEach((card) => {
        card.classList.remove("is-in-view");
      });
      if (!touchPointer.matches) return;

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            entry.target.classList.toggle("is-in-view", entry.isIntersecting);
          });
        },
        { rootMargin: "-18% 0px -18% 0px", threshold: 0.25 },
      );
      cards.forEach((card) => observer?.observe(card));
    };

    observeCards();
    touchPointer.addEventListener("change", observeCards);
    return () => {
      observer?.disconnect();
      touchPointer.removeEventListener("change", observeCards);
    };
  }, []);

  return (
    <div className="home-page" ref={page}>
      <section className="home-hero">
        <div className="container home-hero-shell">
          <div className="hero-image-frame" data-reveal>
            <picture>
              <source
                media="(orientation: portrait) and (max-width: 1024px)"
                srcSet="/images/home-hero-mobile.png"
              />
              <source
                media="(orientation: landscape) and (min-width: 768px) and (max-width: 1366px) and (min-height: 561px) and (pointer: coarse)"
                srcSet="/images/home-hero-tablet.png"
              />
              <source
                media="(orientation: landscape) and (min-width: 768px) and (max-width: 1024px) and (min-height: 561px)"
                srcSet="/images/home-hero-tablet.png"
              />
              <img
                src="/images/home-hero.png"
                alt="富贵山庄与云南善堂的环境展示"
                width="1672"
                height="941"
                fetchPriority="high"
              />
            </picture>
            <div className="hero-image-shade" aria-hidden="true" />
            <div className="home-hero-heading">
              <p className="eyebrow">
                <span className="gold-dash" /> LIFE · MEMORY · PEACE
              </p>
              <h1>归于土，化于风，安于心</h1>
              <p className="hero-subtitle">身后之事，皆有所依</p>
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

      <section className="container section service-portals" id="services">
        <SectionHeading
          eyebrow="TWO PLACES, ONE THOUGHT"
          title="循心而往，我们陪您做选择"
        />
        <div className="portal-grid">
          {servicePortals.map((portal, index) => (
            <article
              className="portal-card"
              key={portal.title}
              aria-label={`${portal.title}服务`}
              tabIndex={0}
              data-reveal
            >
              <div className="portal-visual">
                <img
                  src="/images/home-hero.png"
                  alt=""
                  style={{ objectPosition: portal.imagePosition }}
                />
                <span className="portal-shade" aria-hidden="true" />
                <span className="portal-summary-copy">
                  <small>0{index + 1} · {portal.english}</small>
                  <strong>{portal.title}</strong>
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

      <section className="container section journey" data-reveal>
        <SectionHeading
          eyebrow="STEP BY STEP, WITH CARE"
          title="每一步，皆有安心的托付"
        />
        <ol className="steps">
          {[
            ["倾听您的需要", "了解您的家庭、信仰与预算"],
            ["为您细说选择", "对比各项服务、安排与差异"],
            ["与您共商细节", "共同厘清费用、流程与时间"],
            ["随您所愿安排", "按您的意愿，随时联系我"],
          ].map(([title, text], i) => (
            <li key={title}>
              <span>0{i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>
      <ContactCTA />
    </div>
  );
}
