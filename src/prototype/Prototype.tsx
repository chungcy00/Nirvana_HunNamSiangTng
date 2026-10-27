import { useContext, useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Image as ImageIcon, Leaf, RotateCcw, X, LayoutGrid, List } from "lucide-react";
import { usePublicCatalog, PublicCatalogNotice } from "../catalog/publicContext";
import CatalogImage from "../catalog/PublicImage";
import { categories, funeralDurationLabel, funeralMethodLabels, capacitiesFor, capacityLabels, detailPath as prototypeDetailPath, filterProducts, formatMoney, hasCapacity, hasReligion, listPath as prototypeListPath, religionsFor, lowestPrice, sortProducts, visibleProducts, type PrototypeProduct, type InclusionGroup } from "./model";
import "./prototype.css";
import { SoldOutBadge } from "./SoldOutBadge";
import { useCategoryHover } from "./useCategoryHover";

export { ProductNavigationContext } from './navigation';
import { ProductNavigationContext } from './navigation';
import { ProductImage, ProductTags, ProductPrices as PrototypePrices, ProductDetailContent } from './ProductPresentation';
export { ProductPrices as PrototypePrices } from './ProductPresentation';

function FilterSegments({ enabled, selectedKey, children, ...props }: ComponentPropsWithoutRef<"div"> & { enabled: boolean; selectedKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const hoverRef = useCategoryHover(ref, enabled, selectedKey, '[aria-pressed="true"]');
  return <div {...props} ref={ref} className="fgp-capacities">{children}{enabled && <span ref={hoverRef} className="fgp-category-hover" aria-hidden="true"/>}</div>;
}

function ProductCard({ product, returnTo }: { product: PrototypeProduct; returnTo: string }) {
  const { detailPath } = useContext(ProductNavigationContext);
  return <article className="fgp-card">
    {product.category !== 4 && <Link to={detailPath(product.id)} state={{ returnTo }} className="fgp-card-image-link" tabIndex={-1} aria-label={`查看${product.name}`}><ProductImage product={product}/></Link>}
    <div className="fgp-card-body"><ProductTags product={product}/>
      <h3><Link to={detailPath(product.id)} state={{ returnTo }}>{product.name}</Link></h3>
      <PrototypePrices product={product}/>
      <p className="fgp-card-note">{product.priceNote}</p>
      <Link className="fgp-card-link" to={detailPath(product.id)} state={{ returnTo }} aria-label={`查看${product.name}详情`}>查看详情<ArrowRight size={18} aria-hidden="true"/></Link>
    </div>
  </article>;
}

function WebsiteProductCard({ product, returnTo, view }: { product: PrototypeProduct; returnTo: string; view: string }) {
  const { detailPath } = useContext(ProductNavigationContext);
  const soldOut = product.saleStatus === 'sold_out';
  const content = <>
      {product.category !== 4 && <div className="fgp-product-visual"><ProductImage product={product}/></div>}
      <div className="fgp-card-body">
        <p className="fgp-card-category">{categories.find(c => c.id === product.category)?.name}</p>
        <h3>{product.name}</h3>
        <ProductTags product={product} desktopServiceVenue/>
        {product.category === 4 && <div className="fgp-card-service-meta">
          {funeralDurationLabel(product) && <span>{product.durationDays}天{product.durationNights}夜</span>}
          {product.serviceVenue && <span>{product.serviceVenue}</span>}
        </div>}
        <div className="fgp-card-pricing"><PrototypePrices product={product} compact showCompactNotes/></div>
        {product.productPriceNote && <p className="fgp-catalog-product-note">{product.productPriceNote}</p>}
        <span className="fgp-card-action">{soldOut ? '已售罄' : '查看详情'}{!soldOut && <ArrowRight size={15} aria-hidden="true"/>}</span>
      </div>
  </>;
  return <article className={`fgp-card fgp-catalog-card${product.category === 4 ? " fgp-card-funeral" : ""}${soldOut ? ' is-sold-out' : ''}`}>
    {soldOut ? <div className="fgp-product-link" aria-disabled="true" aria-label={`${product.name}，已售罄`}>{content}</div>
      : <Link className="fgp-product-link" to={detailPath(product.id)} state={{returnTo}} aria-label={`${product.name}，查看详情`}>{content}</Link>}
    {soldOut && <div className="fgp-card-sold-overlay"><SoldOutBadge className="fgp-card-sold-badge"/></div>}
  </article>;
}

export function PrototypeCatalog({ home = false }: { home?: boolean }) {
  const {products:prototypeProducts,status:publicStatus,refreshingEmpty}=usePublicCatalog();
  // Preserve a previously validated empty view, never a previous product list.
  const status = publicStatus === "loading" && refreshingEmpty && prototypeProducts.length === 0 ? "ready" : publicStatus;
  const { homePath, listPath, website } = useContext(ProductNavigationContext);
  const [params, setParams] = useSearchParams();
  const latestParams = useRef(params);
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => { latestParams.current = params; }, [location.search, params]);
  const category = categories.find(c => home ? c.id === Number(params.get("category") || 1) : c.slug === categorySlug);
  const navRef = useRef<HTMLDivElement>(null);
  const hoverRef = useCategoryHover(navRef, website, category?.id);
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && active) nav.scrollTo({ left: Math.max(0, active.offsetLeft - nav.offsetLeft - 10), behavior: "auto" });
  }, [category?.id]);
  if (!category) return <PrototypeNotFound/>;
  const capacity = hasCapacity(category.id) ? params.get("capacity") || "" : "";
  const religion = hasReligion(category.id) ? params.get("religion") || "" : "";
  const capacities = capacitiesFor(prototypeProducts, category.id);
  const religions = religionsFor(prototypeProducts, category.id);
  const view = website && params.get('view') === 'list' ? 'list' : 'grid';
  const sort = website && ['price-asc', 'price-desc'].includes(params.get('sort') || '') ? params.get('sort')! : 'default';
  const products = sortProducts(filterProducts(prototypeProducts, category.id, capacity, religion), sort);
  const filtered = !!(capacity || religion);
  function switchCategory(id: number) {
    const next = new URLSearchParams();
    if (website && view !== 'grid') next.set('view', view);
    if (website && sort !== 'default') next.set('sort', sort);
    if (home) { next.set('category', String(id)); latestParams.current = next; setParams(next); }
    else navigate(listPath(id) + (next.size ? '?' + next : ''));
  }
  function changeFilter(key: string, value: string) {
    const next = new URLSearchParams(latestParams.current);
    if (value) next.set(key,value); else next.delete(key);
    latestParams.current = next;
    setParams(next);
  }
  const reset = () => {
    const next = new URLSearchParams(latestParams.current);
    next.delete('capacity'); next.delete('religion');
    latestParams.current = next;
    setParams(next);
  };
  const returnTo = location.pathname + location.search;
  const listParams = new URLSearchParams(params); listParams.delete("category");
  return <>
    <div className={home && website ? undefined : "fgp-wrap"}>
      {!home && <nav className="fgp-crumb" aria-label="当前位置"><Link to={homePath}>产品首页</Link><ChevronRight size={14}/><span>{category.name}</span></nav>}
      {home && website ? <section className="fgp-catalog-hero" aria-label="富贵山庄园区全景">
        <h1 className="fgp-sr">富贵山庄</h1>
        <img src="/images/nirvana-catalog-panorama.jpg" alt="富贵山庄园区全景" width={1920} height={1080} fetchPriority="high" decoding="async"/>
      </section> : <section className={home ? "fgp-intro" : "fgp-list-intro"}>
        <div><h1>{home ? <>每一份纪念，<br/>都有合适的安排。</> : category.name}</h1><p>{home ? "从产品类别开始，按人数与宗教了解适合的选择。" : category.description}</p></div>
        {home ? <div className="fgp-intro-note"><Leaf size={24} strokeWidth={1.2}/><p>资料清楚，选择从容。<br/><span>按实际适用的条件浏览，无需逐项填写。</span></p></div> : <Link className="fgp-text-link" to={homePath}>查看全部类别<ArrowRight size={16}/></Link>}
      </section>}

    </div>
    <section className="fgp-catalog fgp-wrap" aria-label="产品目录">
      <div className="fgp-category-nav" ref={navRef} role="navigation" aria-label="产品类别">
        {categories.map(c => <button type="button" key={c.id} onClick={() => switchCategory(c.id)} aria-current={category.id === c.id ? "page" : undefined} className={category.id===c.id ? "is-active" : ""}>{c.name}</button>)}
        {website && <span ref={hoverRef} className="fgp-category-hover" aria-hidden="true"/>}
      </div>
      <div className="fgp-browse-toolbar"><div className="fgp-filters">
        {hasCapacity(category.id) && <div className="fgp-filter-row"><span className="fgp-filter-label">使用人数</span><FilterSegments enabled={website} selectedKey={`${category.id}-${capacity}`} role="group" aria-label="使用人数筛选">
          {[{id:"",name:"全部"}, ...capacities.map(c=>({id:c,name:capacityLabels[c]}))].map(c=><button type="button" key={c.id} aria-pressed={capacity===c.id} className={capacity===c.id ? "is-selected" : ""} onClick={()=>changeFilter("capacity",c.id)}>{c.name}</button>)}
        </FilterSegments></div>}
        {hasReligion(category.id) && <div className="fgp-filter-row"><span className="fgp-filter-label" id="fgp-religion-label">适用宗教</span><FilterSegments enabled={website} selectedKey={`${category.id}-${religion}`} role="group" aria-labelledby="fgp-religion-label">
          {[{id:"",name:"全部宗教"}, ...religions].map(r=><button type="button" key={r.id} aria-pressed={religion===r.id} className={religion===r.id ? "is-selected" : ""} onClick={()=>changeFilter("religion",r.id)}>{r.name}</button>)}
        </FilterSegments></div>}
      </div>
      {website && <div className="fgp-display-controls">
        <label className="fgp-sort"><span>排序方式</span><select aria-label="价格排序" value={sort} onChange={e=>changeFilter('sort', e.target.value === 'default' ? '' : e.target.value)}><option value="default">默认顺序</option><option value="price-asc">价格从低到高</option><option value="price-desc">价格从高到低</option></select></label>
        <div className="fgp-view-toggle" role="group" aria-label="展示模式">{[
          {id:'grid', label:'双栏网格', icon:LayoutGrid}, {id:'list', label:'左图右文列表', icon:List},
        ].map(({id,label,icon:Icon})=><button type="button" key={id} aria-label={label} title={label} aria-pressed={view===id} disabled={status !== "ready" || products.length === 0} onClick={()=>changeFilter('view',id==='grid'?'':id)}><Icon size={18} aria-hidden="true"/></button>)}</div>
      </div>}
      </div>
      <div className="fgp-results-heading"><div><h2>{category.name}</h2><span role={status === "ready" ? "status" : undefined} aria-live={status === "ready" ? "polite" : undefined}>{status === "loading" ? "正在读取…" : status === "error" ? "暂时无法读取" : `共 ${products.length} 项产品`}</span></div>
        {filtered ? <button className="fgp-reset" onClick={reset}><RotateCcw size={14}/>清除筛选</button> : home && !website && <Link className="fgp-text-link" to={listPath(category.id)+(listParams.size ? '?'+listParams : '')}>查看完整列表<ArrowRight size={16}/></Link>}
      </div>
      {filtered && <div className="fgp-applied" aria-label="已选择条件">{capacity && <button onClick={()=>changeFilter("capacity","")}>{capacityLabels[capacity as keyof typeof capacityLabels] || capacity}<X size={13}/><span className="fgp-sr">清除人数筛选</span></button>}{religion && <button onClick={()=>changeFilter("religion","")}>{religions.find(r=>r.id===religion)?.name || religion}<X size={13}/><span className="fgp-sr">清除宗教筛选</span></button>}</div>}
      {status!=="ready" ? <PublicCatalogNotice/> : products.length ? <div className={website ? `fgp-grid fgp-view-${view}` : "fgp-grid"}>{products.map(p=>website ? <WebsiteProductCard key={p.id} product={p} returnTo={returnTo} view={view}/> : <ProductCard key={p.id} product={p} returnTo={returnTo}/>)}</div> : <div className="fgp-empty"><Leaf size={32} strokeWidth={1}/><h3>{website && !filtered ? "当前分类暂无产品" : "暂时没有符合条件的产品"}</h3><p>{website && !filtered ? "目前暂无可供浏览的产品资料，欢迎联系顾问了解。" : "您可以调整人数或宗教，继续浏览其他选择。"}</p>{website && !filtered ? <Link className="fgp-primary" to="/contact">联系代理<ArrowRight size={16}/></Link> : <button className="fgp-primary" onClick={reset}>清除筛选<ArrowRight size={16}/></button>}</div>}
      {!website && <p className="fgp-source-note">价格按已提供产品资料展示；聚仙楼为待核实宣传参考起价。产品实拍将在资料确认后补充。</p>}
    </section>
  </>;
}

export function PrototypeDetail() {
  const {products:prototypeProducts,status}=usePublicCatalog();
  const { homePath, listPath, website } = useContext(ProductNavigationContext);
  const { productId } = useParams();
  const location = useLocation();
  const product = visibleProducts(prototypeProducts).find(p=>p.id===productId);
  useEffect(()=>{if(website && product)document.title=`${product.name}｜身后事 · 皆可托`;},[product?.name,website]);
  if(status!=="ready")return <PublicCatalogNotice/>;
  if (!product) return <PrototypeNotFound/>;
  const category = categories.find(c=>c.id===product.category)!;
  const requestedReturn = location.state?.returnTo;
  const returnTo = typeof requestedReturn==='string' && (website
    ? requestedReturn.split('?')[0] === homePath || categories.some(c => requestedReturn.split('?')[0] === listPath(c.id))
    : /^\/prototype(?:\?|\/list\/|$)/.test(requestedReturn)) ? requestedReturn : listPath(category.id);
  const questionnaireReturn = location.state?.questionnaireReturn;
  const validQuestionnaireReturn = website && typeof questionnaireReturn === 'string' && /^\/contact#needs-product-(?:[a-zA-Z0-9_-]|%[a-fA-F0-9]{2})+$/.test(questionnaireReturn) ? questionnaireReturn : null;
  return <div className="fgp-wrap fgp-detail" key={product.id}>
    <nav className="fgp-crumb" aria-label="当前位置"><Link to={homePath}>产品首页</Link><ChevronRight size={14}/><Link to={listPath(category.id)}>{category.name}</Link><ChevronRight size={14}/><span>产品详情</span></nav>
    <Link className="fgp-back" to={validQuestionnaireReturn || returnTo}><ArrowLeft size={15}/>{validQuestionnaireReturn ? "返回问卷结果" : "返回产品列表"}</Link>
    <ProductDetailContent key={product.id} product={product}/>
  </div>;
}
export function PrototypeNotFound(){const { homePath } = useContext(ProductNavigationContext); return <div className="fgp-wrap fgp-empty"><h1>没有找到这个产品页面</h1><p>请返回产品目录，查看当前提供的产品。</p><Link className="fgp-primary" to={homePath}>返回产品首页<ArrowRight size={16}/></Link></div>;}
