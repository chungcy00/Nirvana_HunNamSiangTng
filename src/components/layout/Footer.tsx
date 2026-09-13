import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { advisor, navigation } from "../../data/site";
import { Brand } from "./Navbar";
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Brand />
            <p>
              以关怀承托每一段生命旅程。
              <br />
              尊重每一种信仰，让爱与记忆继续延伸。
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
            <span className="footer-note">
              {advisor.phone || "联系电话 · 待补充"}
            </span>
          </div>
        </div>
        <div className="footer-disclaimer">
          本网站为个人顾问服务网站框架，并非富贵山庄或云南善堂官方网站。代理身份与服务资料待补充确认。产品价格、规格及供应情况以咨询时确认为准。
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} 身后规划服务</span>
          <span>用心规划 · 让爱延续</span>
        </div>
      </div>
    </footer>
  );
}
