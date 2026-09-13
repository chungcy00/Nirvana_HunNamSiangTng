import { Link } from "react-router-dom";
import {
  ArrowRight,
  Heart,
  HeartHandshake,
  MessagesSquare,
  Sprout,
  MapPin,
} from "lucide-react";
import { advisor, principles } from "../data/site";
import { featuredProducts } from "../data/catalog";
import {
  Placeholder,
  ConsultButton,
  SectionHeading,
  ProductCard,
  ContactCTA,
} from "../components/ui";
const icons = [MessagesSquare, Sprout, HeartHandshake, Heart];
export default function Home() {
  return (
    <>
      <section className="home-hero">
        <div className="container home-hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="gold-dash" /> A LITTLE PLANNING, A LOT OF LOVE
            </p>
            <p className="advisor-line">
              {advisor.name || "顾问姓名待补充"} <span>｜ {advisor.title}</span>
            </p>
            <h1>
              用心规划，
              <br />
              让家人多一份<span className="accent-word">安心</span>。
            </h1>
            <p className="hero-description">
              协助家庭了解古晋富贵山庄与云南善堂相关服务。
              <br className="desktop-only" />
              从不同信仰、预算与需要出发，陪您看清每一个选择。
            </p>
            <div className="button-row">
              <ConsultButton />
              <Link className="button button-outline" to="/nirvana">
                查看服务 <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-note">
              <MapPin size={15} />
              {advisor.serviceArea}
              <span />
              尊重信仰 · 真诚相伴
            </div>
          </div>
          <div className="hero-portrait">
            <Placeholder portrait label="顾问个人照片预留" />
            <div className="portrait-caption">
              <span className="caption-rule" />
              <div>
                让安排更清晰，让心更安定。
                <small>HERE FOR YOU & YOUR FAMILY</small>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="principles-bar">
        <div className="container principles-grid">
          {principles.map((item, i) => {
            const Icon = icons[i];
            return (
              <div className="principle" key={item.title}>
                <Icon strokeWidth={1.3} />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="container section">
        <SectionHeading
          eyebrow="HOW I CAN HELP"
          title="我可以协助您了解"
          text="不急着做决定，先从您关心的事情开始。"
        />
        <div className="grid-three">
          {[
            {
              title: "富贵山庄",
              english: "NIRVANA KUCHING",
              text: "福地、骨灰位、殡仪服务与生前规划，清楚了解六大类产品与选择。",
              to: "/nirvana",
              label: "园区照片预留",
            },
            {
              title: "云南善堂",
              english: "HUN NAM SIANG TNG",
              text: "了解殡葬咨询、流程说明与家属协助，让需要帮助的时候有方向。",
              to: "/yunnan-siantang",
              label: "云南善堂照片预留",
            },
            {
              title: "宠物纪念",
              english: "PET MEMORIAL",
              text: "宠物也是家人。让陪伴过我们的生命，拥有温柔而有尊严的告别。",
              to: "/nirvana/pet-memorial",
              label: "宠物纪念照片预留",
            },
          ].map((item, i) => (
            <Link className="card service-card" to={item.to} key={item.title}>
              <Placeholder label={item.label} />
              <div className="card-body">
                <span className="service-number">0{i + 1}</span>
                <p className="eyebrow">{item.english}</p>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className="text-link">
                  了解更多 <ArrowRight size={17} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="soft-section">
        <div className="container section">
          <SectionHeading
            eyebrow="EXPLORE YOUR OPTIONS"
            title="从这些配套开始了解"
            text="先认识不同类型，再寻找适合家人的安排。"
          >
            <Link className="text-link" to="/nirvana">
              查看全部类别 <ArrowRight size={17} />
            </Link>
          </SectionHeading>
          <div className="grid-three">
            {featuredProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      </section>
      <section className="container section journey">
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
    </>
  );
}
