import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { advisor, principles } from "../data/site";
import {
  Placeholder,
  ConsultButton,
  SectionHeading,
  ContactCTA,
} from "../components/ui";
export default function About() {
  return (
    <>
      <section className="container section about-hero">
        <Placeholder label="服务环境图片预留" />
        <div>
          <p className="eyebrow">CLARITY, WITH CARE</p>
          <h1>
            把需要了解的事，
            <br />
            安静地说清楚。
          </h1>
          <p className="hero-description">
            每个家庭都有自己的信仰、文化与想法。这里整理富贵山庄与云南善堂的服务资讯，帮助您按自己的步调认识不同选择。
          </p>
          <ConsultButton />
        </div>
      </section>
      <section className="soft-section">
        <div className="container section intro-split">
          <SectionHeading
            eyebrow="ABOUT THE SERVICE"
            title="先了解需要，再慢慢规划"
          />
          <div>
            <dl className="specifications">
              {[
                ["服务地区", advisor.serviceArea],
                ["服务方向", "富贵山庄与云南善堂"],
                ["规划类型", "生前规划与即时需求"],
                ["沟通方式", "页面咨询与 WhatsApp"],
                ["联系时间", advisor.businessHours || "待补充"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="content-slot">
              <p>服务说明内容预留</p>
              <span>未来可从后台补充服务方式、咨询流程与经确认的联系资料。</span>
            </div>
          </div>
        </div>
      </section>
      <section className="container section">
        <SectionHeading
          eyebrow="WHAT GUIDES THE SERVICE"
          title="尊重每个家庭，认真对待每一份托付"
        />
        <div className="grid-four values">
          {principles.map((p, i) => (
            <article key={p.title}>
              <span className="service-number">0{i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.description}</p>
            </article>
          ))}
        </div>
        <blockquote>
          理解不同家庭的宗教、文化与纪念方式，
          <br />
          以尊重和包容的态度，提供清楚的资讯与选择。
        </blockquote>
        <div className="about-links">
          <Link className="text-link" to="/nirvana">
            了解富贵山庄 <ArrowRight size={16} />
          </Link>
          <Link className="text-link" to="/yunnan-siantang">
            了解云南善堂 <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <ContactCTA />
    </>
  );
}
