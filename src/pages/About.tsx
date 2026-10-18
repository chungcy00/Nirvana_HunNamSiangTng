import { Phone } from "lucide-react";
import "./About.css";

const identity = "富贵山庄 025组织｜云南善堂蓝十组主任";

export default function About() {
  return (
    <div className="advisor-profile">
      <section className="container advisor-introduction" aria-labelledby="advisor-name">
        <div className="advisor-photo">
          <img
            src="/images/advisor-zhong-yongxin.png"
            alt="钟永新顾问半身照"
            width={1161}
            height={1354}
            fetchPriority="high"
          />
        </div>
        <div className="advisor-biography">
          <h1 id="advisor-name">钟永新</h1>
          <p className="advisor-identity">{identity}</p>
          <div className="advisor-story">
            <p>在富贵山庄 025组织服务26年，深耕殡葬行业，累计为约500位客户提供咨询与协助，在殡葬规划、安葬安排及殡仪服务方面积累了丰富的实务经验。</p>
            <p>同时，自2026年起，担任云南善堂蓝十组主任，参与殡仪服务的协调与安排。面对不同信仰与需求的家庭，始终以倾听为先，提供合适的建议与周到的协助，让每一个家庭在告别与后续安排中，都能感到安心与尊重。</p>
          </div>
          <dl className="advisor-experience">
            <div><dt>富贵山庄服务经验</dt><dd>26<span>年</span></dd></div>
            <div><dt>累计服务客户</dt><dd><span>约</span>500<span>位</span></dd></div>
          </dl>
        </div>
      </section>

      <section className="advisor-beliefs" aria-labelledby="advisor-beliefs-title">
        <div className="container advisor-beliefs-inner">
          <h2 id="advisor-beliefs-title">服务理念与个人信念</h2>
          <div>
            <p>深信殡葬服务不只是流程安排，更是在重要时刻给家人一份支持与陪伴。</p>
            <p>从生前规划到身后安排，以真诚与细心陪伴每一个家庭。</p>
          </div>
        </div>
      </section>

      <div className="advisor-motto">
        <p className="container">用心服务 · 周全安排 · 一路相伴</p>
      </div>

      <section className="container advisor-consultation" aria-labelledby="advisor-consultation-title">
        <div className="advisor-invitation">
          <h2 id="advisor-consultation-title">欢迎咨询</h2>
          <p>如需了解殡葬规划、安葬安排或殡仪服务，欢迎联系咨询。</p>
        </div>
        <div className="advisor-contact-details">
          <h3>钟永新</h3>
          <p className="advisor-contact-identity">{identity}</p>
          <div className="advisor-telephone-links">
            <a href="tel:+60198186134"><Phone size={20} strokeWidth={1.5} aria-hidden="true" /><span>019-818 6134</span></a>
            <a href="tel:+60167760560"><Phone size={20} strokeWidth={1.5} aria-hidden="true" /><span>016-776 0560</span></a>
          </div>
        </div>
      </section>
    </div>
  );
}
