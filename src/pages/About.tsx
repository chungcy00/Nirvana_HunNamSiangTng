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
        <Placeholder portrait label="顾问正式照片预留" />
        <div>
          <p className="eyebrow">YOUR GUIDE, WITH CARE</p>
          <h1>
            用心服务，
            <br />
            让安排更安心。
          </h1>
          <p className="advisor-name">{advisor.name || "顾问姓名待补充"}</p>
          <p>{advisor.title}</p>
          <p className="hero-description">
            每个家庭都有自己的故事。我的角色，是倾听您的需要，协助您理清资讯，一起找到更适合家人的选择。
          </p>
          <ConsultButton />
        </div>
      </section>
      <section className="soft-section">
        <div className="container section intro-split">
          <SectionHeading
            eyebrow="A LITTLE ABOUT ME"
            title="先认识彼此，再开始规划"
          />
          <div>
            <dl className="specifications">
              {[
                ["代理身份 / 编号", advisor.agentNumber || "待补充与确认"],
                ["服务地区", advisor.serviceArea],
                ["服务经验", advisor.experience || "待补充"],
                ["沟通语言", advisor.languages || "待补充"],
                ["联系时间", advisor.businessHours || "待补充"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="content-slot">
              <p>个人经历与服务故事预留</p>
              <span>在这里介绍顾问的真实经历、可协助事项与服务方式。</span>
            </div>
          </div>
        </div>
      </section>
      <section className="container section">
        <SectionHeading
          eyebrow="WHAT I BELIEVE IN"
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
