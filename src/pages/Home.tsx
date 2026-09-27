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

  return (
    <div className="home-page" ref={page}>
      <section className="home-hero">
        <div className="container home-hero-shell">
          <div className="home-hero-heading" data-reveal>
            <p className="eyebrow">
              <span className="gold-dash" /> LIFE · MEMORY · PEACE
            </p>
            <h1>
              归于土，化于风，
              <br />
              <strong>安于心</strong>
            </h1>
            <p className="hero-subtitle">身后之事，皆有所依</p>
          </div>

          <div className="hero-image-frame" data-reveal>
            <img
              src="/images/nirvana-yunnan-hero.png"
              alt="富贵山庄与云南善堂的环境展示"
              width="1672"
              height="941"
            />
            <div className="hero-image-shade" aria-hidden="true" />
            <div className="hero-image-labels">
              <span>富贵山庄</span>
              <span>云南善堂</span>
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
          title="循心而往，找到合适的安排"
          text="将指针移到卡片上，或轻触卡片查看服务。"
        />
        <div className="portal-grid">
          {servicePortals.map((portal, index) => (
            <details className="portal-card" key={portal.title} data-reveal>
              <summary>
                <img
                  src="/images/nirvana-yunnan-hero.png"
                  alt=""
                  style={{ objectPosition: portal.imagePosition }}
                />
                <span className="portal-shade" aria-hidden="true" />
                <span className="portal-summary-copy">
                  <small>0{index + 1} · {portal.english}</small>
                  <strong>{portal.title}</strong>
                  <span>轻触查看服务</span>
                </span>
              </summary>
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
            </details>
          ))}
        </div>
      </section>

      <section className="container section journey" data-reveal>
        <SectionHeading
          eyebrow="ONE STEP AT A TIME"
          title="每一步，都可以慢慢来"
        />
        <ol className="steps">
          {[
            ["倾听您的需要", "了解家庭、信仰与预算。"],
            ["说明不同选择", "比较产品、服务与安排。"],
            ["一起确认细节", "厘清费用、流程与时间。"],
            ["安排下一步", "按您的意愿继续咨询。"],
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
