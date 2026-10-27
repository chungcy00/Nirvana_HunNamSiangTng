import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowRight, LayoutGrid, Leaf, List, RotateCcw } from "lucide-react";
import { usePublicCatalog, PublicCatalogNotice } from '../catalog/publicContext';
import { PrototypeDetail, WebsiteProductCard } from '../prototype/Prototype';
import { ProductNavigationContext } from '../prototype/navigation';
import { filterProducts, religionsFor, sortProducts } from '../prototype/model';
import { useCatalog } from "../catalog/context";
import { NotFound, ConsultButton } from "../components/ui";
import "../prototype/prototype.css";
import "./NirvanaProducts.css";
import "./Yunnan.css";
import "./NirvanaFuneralDetail.css";

const navigation = {homePath: '/yunnan-siantang', listPath: () => '/yunnan-siantang', detailPath: (id: string) => `/yunnan-siantang/products/item/${encodeURIComponent(id)}`, website: true, institution: 'yunnan' as const};
export function YunnanDetail() {
  return <ProductNavigationContext.Provider value={navigation}><div className="fgp fgp-website"><PrototypeDetail/></div></ProductNavigationContext.Provider>;
}

export default function Yunnan() {
  const catalog = useCatalog();
  const location = useLocation();
  const [params,setParams] = useSearchParams();
  const {products: allProducts,status} = usePublicCatalog();
  const published = allProducts.filter(p => p.institution === 'yunnan' && p.category === 4);
  const religion = params.get('religion') || '';
  const sort = params.get('sort') || 'default';
  const view = params.get('view') === 'list' ? 'list' : 'grid';
  const religions = religionsFor(published,4);
  const products = sortProducts(filterProducts(published,4,'',religion),sort);
  const change = (key:string,value:string) => {const next = new URLSearchParams(params); if(value) next.set(key,value);else next.delete(key);setParams(next);};
  const requestedReturn = location.state?.questionnaireReturn;
  const questionnaireReturn = typeof requestedReturn === 'string' && requestedReturn.startsWith('/contact#needs-product-') ? requestedReturn : null;
  const provider = catalog.getProviderBySlug("yunnan-siantang");
  if (!provider) return <NotFound />;
  return <ProductNavigationContext.Provider value={navigation}><div className="fgp fgp-website yunnan-page">
    <section className="fgp-catalog-hero" aria-label="砂拉越云南善堂殡仪馆">
      <h1 className="fgp-sr">{provider.name}</h1>
      <img src="/images/yunnan-panorama-banner.jpg" alt="砂拉越云南善堂牌楼与殡仪馆外观" width={5504} height={1500} fetchPriority="high" decoding="async"/>
    </section>
    {questionnaireReturn && <div className="fgp-wrap"><Link className="questionnaire-return-link" to={questionnaireReturn}>返回问卷结果</Link></div>}
    <section className="fgp-catalog fgp-wrap yunnan-catalog" aria-label="云南善堂产品目录">
      <div className="fgp-browse-toolbar">
        <div className="fgp-filters"><div className="fgp-filter-row">
          <span className="fgp-filter-label" id="yunnan-religion-label">适用宗教</span>
          <div className="fgp-capacities" role="group" aria-labelledby="yunnan-religion-label">{[{id:'',name:'全部宗教'},...religions].map(r=><button key={r.id} type="button" className={religion===r.id?'is-selected':''} aria-pressed={religion===r.id} onClick={()=>change('religion',r.id)}>{r.name}</button>)}</div>
        </div></div>
        <div className="fgp-display-controls">
          <label className="fgp-sort"><span>排序方式</span><select aria-label="价格排序" disabled={status!=='ready'||!published.length} value={sort} onChange={e=>change('sort',e.target.value==='default'?'':e.target.value)}><option value="default">默认顺序</option><option value="price-asc">价格从低到高</option><option value="price-desc">价格从高到低</option></select></label>
          <div className="fgp-view-toggle" role="group" aria-label="展示模式">
            <button type="button" aria-label="双栏网格" aria-pressed={view==='grid'} disabled={status!=='ready'||!published.length} onClick={()=>change('view','')}><LayoutGrid size={18} aria-hidden="true"/></button>
            <button type="button" aria-label="左图右文列表" aria-pressed={view==='list'} disabled={status!=='ready'||!published.length} onClick={()=>change('view','list')}><List size={18} aria-hidden="true"/></button>
          </div>
        </div>
      </div>
      <div className="fgp-results-heading"><span role="status">{status==='ready'?`共 ${products.length} 项产品`:status==='error'?'暂时无法读取':'正在读取…'}</span>{religion && <button className="fgp-reset" onClick={()=>change('religion','')}><RotateCcw size={14}/>清除筛选</button>}</div>
      {status!=='ready' ? <PublicCatalogNotice/> : products.length ? <div className={`fgp-grid fgp-view-${view}`}>{products.map(product=><WebsiteProductCard key={product.id} product={product} returnTo={location.pathname+location.search} view={view}/>)}</div> : <div className="fgp-empty">
        <Leaf size={32} strokeWidth={1} aria-hidden="true"/>
        <h2>{religion ? '暂无符合条件的配套' : '当前暂无公开配套'}</h2>
        <p>正式配套资料确认后将在此展示，欢迎联系顾问了解相关服务。</p>
        <ConsultButton subject="云南善堂殡仪服务" className="fgp-primary">联系顾问<ArrowRight size={16} aria-hidden="true"/></ConsultButton>
      </div>}
    </section>
  </div></ProductNavigationContext.Provider>;
}
