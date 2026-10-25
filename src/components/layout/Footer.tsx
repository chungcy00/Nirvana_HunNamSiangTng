import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { advisor, navigation } from "../../data/site";
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link to="/" className="brand footer-brand-name" aria-label="身后事 · 皆可托，返回首页">身后事 · 皆可托</Link>
            <p className="footer-brand-tagline">LIFE · MEMORY · PEACE</p>
            <p>
              以温柔相送，让身后事 · 皆可托
              <br />
              尊重每一种信仰，让爱与记忆继续延伸
            </p>
          </div>
          <div>
            <h3>探索服务</h3>
            {navigation.slice(1).map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </div>
          <div>
            <h3>保持联系</h3>
            <p>{advisor.serviceArea}</p>
            <Link to="/contact">
              联络资料与咨询 <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
        <div className="footer-disclaimer">
          本网站为富贵山庄与云南善堂相关服务的独立资讯与咨询平台，并非相关机构官方网站。各项服务资料、服务详情及供应情况，均以最终咨询确认为准。
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} 身后事 · 皆可托</span>
          <span>用心规划 · 让爱延续</span>
        </div>
      </div>
    </footer>
  );
}
