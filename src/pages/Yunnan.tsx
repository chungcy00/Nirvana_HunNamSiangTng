import { Plus } from "lucide-react";
import { assistance } from "../data/site";
import {
  PageHero,
  SectionHeading,
  ConsultButton,
  ContactCTA,
} from "../components/ui";
export default function Yunnan() {
  return (
    <>
      <PageHero
        eyebrow="SARAWAK HUN NAM SIANG TNG"
        title="砂拉越云南善堂"
        text="需要帮助的时候，先把下一步了解清楚。这里为您整理云南善堂相关资讯，以及可进一步咨询的协助事项。"
        imageLabel="云南善堂建筑照片预留"
      >
        <ConsultButton subject="云南善堂相关协助" />
      </PageHero>
      <section className="container section intro-split">
        <SectionHeading
          eyebrow="UNDERSTANDING THE SUPPORT"
          title="从了解开始，多一份从容"
        />
        <div>
          <p>
            云南善堂与富贵山庄分属不同服务板块。您可以先说明家庭目前的情况，再了解适用的协助与办理安排。
          </p>
          <div className="content-slot">
            <p>机构简介预留</p>
            <span>正式介绍、服务范围与申请条件待确认后补充。</span>
          </div>
        </div>
      </section>
      <section className="soft-section">
        <div className="container section">
          <SectionHeading
            eyebrow="WAYS TO HELP"
            title="可以进一步咨询的事项"
            text="以下为服务介绍框架；实际可协助范围以确认后的资料为准。"
          />
          <div className="grid-two">
            {assistance.map((item, i) => (
              <article className="card assistance-card" key={item.slug}>
                <span className="service-number">0{i + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <details>
                  <summary>
                    了解这项协助 <Plus size={16} />
                  </summary>
                  <p>适合对象、办理步骤、所需文件与费用说明预留。</p>
                  <ConsultButton subject={`云南善堂 · ${item.title}`}>
                    咨询相关事项
                  </ConsultButton>
                </details>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="container section">
        <SectionHeading eyebrow="A CLEARER NEXT STEP" title="怎样开始了解？" />
        <ol className="steps">
          <li>
            <span>01</span>
            <h3>说明当前情况</h3>
            <p>告诉顾问您想了解或需要协助的事。</p>
          </li>
          <li>
            <span>02</span>
            <h3>确认协助范围</h3>
            <p>了解适用条件与可提供的帮助。</p>
          </li>
          <li>
            <span>03</span>
            <h3>准备相关资料</h3>
            <p>按确认后的要求整理资料。</p>
          </li>
          <li>
            <span>04</span>
            <h3>了解后续安排</h3>
            <p>确认联络窗口与下一步流程。</p>
          </li>
        </ol>
      </section>
      <ContactCTA />
    </>
  );
}
