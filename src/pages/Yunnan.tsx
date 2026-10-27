import { Link, useLocation } from "react-router-dom";
import { ArrowRight, LayoutGrid, Leaf, List } from "lucide-react";
import { useCatalog } from "../catalog/context";
import { NotFound, ConsultButton } from "../components/ui";
import "../prototype/prototype.css";
import "./NirvanaProducts.css";
import "./Yunnan.css";

export default function Yunnan() {
  const catalog = useCatalog();
  const location = useLocation();
  const requestedReturn = location.state?.questionnaireReturn;
  const questionnaireReturn = typeof requestedReturn === 'string' && requestedReturn.startsWith('/contact#needs-product-') ? requestedReturn : null;
  const provider = catalog.getProviderBySlug("yunnan-siantang");
  if (!provider) return <NotFound />;
  // Formal Yunnan packages have not been supplied. Do not reuse Nirvana products
  // or the old illustrative assistance framework as published packages.
  return <div className="fgp fgp-website yunnan-page">
    <section className="fgp-catalog-hero" aria-label="砂拉越云南善堂殡仪馆">
      <h1 className="fgp-sr">{provider.name}</h1>
      <img src="/images/yunnan-funeral-parlour-banner.jpg" alt="砂拉越云南善堂殡仪馆建筑外观与招牌" width={2048} height={915} fetchPriority="high" decoding="async"/>
    </section>
    {questionnaireReturn && <div className="fgp-wrap"><Link className="questionnaire-return-link" to={questionnaireReturn}>返回问卷结果</Link></div>}
    <section className="fgp-catalog fgp-wrap yunnan-catalog" aria-label="云南善堂产品目录">
      <div className="fgp-browse-toolbar">
        <div className="fgp-filters"><div className="fgp-filter-row">
          <span className="fgp-filter-label" id="yunnan-religion-label">适用宗教</span>
          <div className="fgp-capacities" role="group" aria-labelledby="yunnan-religion-label"><button type="button" className="is-selected" aria-pressed="true">全部宗教</button></div>
        </div></div>
        <div className="fgp-display-controls">
          <label className="fgp-sort"><span>排序方式</span><select aria-label="价格排序" disabled defaultValue="default"><option value="default">默认顺序</option></select></label>
          <div className="fgp-view-toggle" role="group" aria-label="展示模式">
            <button type="button" aria-label="双栏网格" aria-pressed="true" disabled><LayoutGrid size={18} aria-hidden="true"/></button>
            <button type="button" aria-label="左图右文列表" aria-pressed="false" disabled><List size={18} aria-hidden="true"/></button>
          </div>
        </div>
      </div>
      <div className="fgp-results-heading"><span role="status">共 0 项产品</span></div>
      <div className="fgp-empty">
        <Leaf size={32} strokeWidth={1} aria-hidden="true"/>
        <h2>当前暂无公开配套</h2>
        <p>正式配套资料确认后将在此展示，欢迎联系顾问了解相关服务。</p>
        <ConsultButton subject="云南善堂殡仪服务" className="fgp-primary">联系顾问<ArrowRight size={16} aria-hidden="true"/></ConsultButton>
      </div>
    </section>
  </div>;
}
