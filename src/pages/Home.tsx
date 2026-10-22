import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  Leaf,
  ListChecks,
} from "lucide-react";
import { principles } from "../data/site";
import { ConsultButton, SectionHeading, Placeholder } from "../components/ui";

const icons = [HeartHandshake, Leaf, ListChecks, CheckCircle2];

const servicePortals = [
  {
    title: "富贵山庄",
    english: "NIRVANA MEMORIAL PARK",
    description: "从福地、骨灰殿到殡仪服务，了解不同的安葬与纪念安排。",
    services: ["福地（土葬／火葬）", "骨灰殿", "殡仪服务", "宠物纪念"],
    to: "/nirvana",
    imagePosition: "left center",
  },
  {
    title: "云南善堂",
    english: "HUN NAM SIANG TNG",
    description: "以殡仪配套涵盖治丧礼仪、灵堂布置及出殡相关安排。",
    services: ["治丧礼仪", "灵堂布置", "出殡安排"],
    to: "/yunnan-siantang",
    imagePosition: "right center",
  },
];

export default function Home() {
  return (
    <div className="home-page">
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
              <ConsultButton>立即咨询</ConsultButton>
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
            <Link className="portal-card" key={portal.title} to={portal.to} aria-label={`进入${portal.title}`}>
              <div className="portal-visual">
                <Placeholder label={portal.title} variant={portal.to === '/nirvana' ? 'landscape' : 'hall'} className={`portal-identity ${portal.to === '/nirvana' ? 'portal-park' : 'portal-hall'}`} />
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
                <span className="portal-link">
                  进入{portal.title} <ArrowRight size={18} aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container needs-guide" aria-labelledby="needs-guide-title">
        <div>
          <h2 id="needs-guide-title">还不确定从哪里开始？</h2>
          <p>可以先了解适合自己的安排，也可以直接联系顾问。</p>
        </div>
        <div className="needs-guide-actions">
          <Link className="button button-outline" to="/contact#needs-questionnaire">
            根据需求了解 <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <ConsultButton className="guide-consult">直接咨询顾问</ConsultButton>
        </div>
      </section>

      <section className="principles-bar">
        <div className="container principles-grid">
          {principles.map((item, i) => {
            const Icon = icons[i];
            return (
              <article className="principle" key={item.title}>
                <Icon strokeWidth={2} aria-hidden="true" />
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
          {[
            ["倾听需要", "了解家庭需求"],
            ["细说选择", "介绍合适服务"],
            ["共同商量", "解答相关疑问"],
            ["随愿安排", "尊重家庭决定"],
          ].map(([step, description], index) => (
            <li key={step}>
              <span className="consultation-node" aria-hidden="true" />
              <small className="consultation-number">0{index + 1}</small>
              <span>{step}</span>
              <p>{description}</p>
            </li>
          ))}
        </ol>
        <Link className="button consultation-start" to="/contact#needs-questionnaire">开始了解 <ArrowRight size={17} aria-hidden="true" /></Link>
      </section>
    </div>
  );
}
