import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Image as ImageIcon, Leaf, RotateCcw, X, LayoutGrid, List } from "lucide-react";
import { usePublicCatalog, PublicCatalogNotice } from "../catalog/publicContext";
import CatalogImage from "../catalog/PublicImage";
import { categories, capacitiesFor, capacityLabels, detailPath as prototypeDetailPath, filterProducts, formatMoney, hasCapacity, hasReligion, listPath as prototypeListPath, religionsFor, lowestPrice, sortProducts, visibleProducts, type PrototypeProduct } from "./model";
import "./prototype.css";

// The accepted prototype and the website share presentation and filter behavior.
// Navigation is supplied by the host so public browsing never leaves the website.
export const ProductNavigationContext = createContext({
  homePath: "/prototype",
  listPath: prototypeListPath,
  detailPath: prototypeDetailPath,
  website: false,
});

function galleryChoices(product: PrototypeProduct) {
  return (product.images || []).map((image,index)=>({image,label:image.id===product.primaryImage?.id ? '共通产品图' : image.religion_id != null ? `${product.religions.find(r=>r.id===String(image.religion_id))?.name || ''} · ${image.design_name || `图片 ${index+1}`}` : `共通产品图 · ${index+1}`}));
}
function ProductImage({ product, large = false, caption }: { product: PrototypeProduct; large?: boolean; caption?: string }) {
  const image=large && caption ? galleryChoices(product).find(i=>i.label===caption)?.image || product.primaryImage : product.primaryImage;
  return <div className={`fgp-image fgp-image-${product.category}${large ? " fgp-image-large" : ""}`} role="img" aria-label={image ? image.alt || product.name : (product.category === 4 ? product.name : `${product.name}，对应实拍图片待补充`)}>
    <div className="fgp-image-center"><ImageIcon size={large ? 38 : 29} strokeWidth={1} aria-hidden="true"/><span>{product.category === 4 ? "殡仪服务" : "产品实拍待补充"}</span></div>
    {image && <CatalogImage key={image.id} image={image}/>}
    {caption && <span className="fgp-image-caption">{caption}</span>}
  </div>;
}
function ProductTags({ product }: { product: PrototypeProduct }) {
  return <div className="fgp-tags">
    {hasCapacity(product.category) && product.capacity && <span>{product.category === 3 && product.capacity === "four_plus" && product.capacityCount ? `${product.capacityCount}人` : capacityLabels[product.capacity]}</span>}
    {product.religions.map(r => <span key={r.id}>{r.name}</span>)}
    {product.category === 3 && product.placement && <span className="fgp-environment">{product.placement === "indoor" ? "室内" : "室外"}</span>}
  </div>;
}
export function PrototypePrices({ product, detailed = false, religion = "" }: { product: PrototypeProduct; detailed?: boolean; religion?: string }) {
  const { website } = useContext(ProductNavigationContext);
  const unavailablePrice = website ? "欢迎咨询" : "价格待核实";
  const funeral = product.category === 4;
  const publicPrices=product.publicPrices?.filter(p=>!religion || p.religion_id==null || String(p.religion_id)===religion);
  return <div className={`fgp-prices${funeral ? " fgp-dual-prices" : ""}${detailed ? " fgp-prices-detail" : ""}`}>
    {detailed && publicPrices?.length && funeral ? publicPrices.map((price,index)=><div key={index}><span>{price.offer_name} · {price.price_type==='pre_need' ? '预购价格' : '即用价格'}</span><strong>{formatMoney(Number(price.amount))}</strong></div>) : funeral ? <>
      <div><span>预购价格</span><strong>{product.preNeed !== undefined ? formatMoney(product.preNeed) : unavailablePrice}</strong></div>
      <div><span>即用价格</span><strong>{product.atNeed !== undefined ? formatMoney(product.atNeed) : unavailablePrice}</strong></div>
    </> : product.category === 3 ? <div><span>{!website && product.referencePrice ? "宣传参考起价 · 待核实" : "最低起价"}</span><strong>{product.offers.length ? <>{formatMoney(Math.min(...product.offers.map(o => o.amount)))}<em>起</em></> : unavailablePrice}</strong></div>
      : product.offers.length ? product.offers.map(o => <div key={o.name}><span>{product.offers.length > 1 ? o.name : "产品售价"}</span><strong>{formatMoney(o.amount)}</strong></div>)
      : <div><span>产品售价</span><strong>{unavailablePrice}</strong></div>}
  </div>;
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
  const price = lowestPrice(product);
  return <article className={`fgp-card fgp-catalog-card${product.category === 4 ? " fgp-card-funeral" : ""}`}>
    <Link className="fgp-product-link" to={detailPath(product.id)} state={{ returnTo }} aria-label={`${product.name}，查看详情`}>
      {product.category !== 4 && <div className="fgp-product-visual"><ProductImage product={product}/></div>}
      <div className="fgp-card-body"><ProductTags product={product}/><h3>{product.name}</h3>
        {view !== 'grid' && product.category === 4 ? <PrototypePrices product={product}/> : <div className="fgp-card-price">{price === undefined ? <strong>欢迎咨询</strong> : <strong>{formatMoney(price)}<em>起</em></strong>}</div>}
        <ArrowRight className="fgp-card-arrow" size={16} aria-hidden="true"/>
      </div>
    </Link>
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
  const [navEdges, setNavEdges] = useState({ before: false, after: false });
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => setNavEdges({
      before: nav.scrollLeft > 2,
      after: nav.scrollWidth - nav.clientWidth - nav.scrollLeft > 2,
    });
    measure();
    nav.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    window.addEventListener("resize", measure);
    return () => {
      nav.removeEventListener("scroll", measure);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [category?.id]);
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
    <div className="fgp-wrap">
      {!home && <nav className="fgp-crumb" aria-label="当前位置"><Link to={homePath}>产品首页</Link><ChevronRight size={14}/><span>{category.name}</span></nav>}
      <section className={home ? "fgp-intro" : "fgp-list-intro"}>
        <div><h1>{home ? website ? "富贵山庄" : <>每一份纪念，<br/>都有合适的安排。</> : category.name}</h1>{!(website && home) && <p>{home ? "从产品类别开始，按人数与宗教了解适合的选择。" : category.description}</p>}</div>
        {home ? !website && <div className="fgp-intro-note"><Leaf size={24} strokeWidth={1.2}/><p>资料清楚，选择从容。<br/><span>按实际适用的条件浏览，无需逐项填写。</span></p></div> : <Link className="fgp-text-link" to={homePath}>查看全部类别<ArrowRight size={16}/></Link>}
      </section>
    </div>
    <section className="fgp-catalog fgp-wrap" aria-label="产品目录">
      <div className="fgp-category-nav" ref={navRef} role="navigation" aria-label="产品类别" aria-describedby={website && (navEdges.before || navEdges.after) ? "fgp-category-scroll-hint" : undefined}>
        {categories.map(c => <button type="button" key={c.id} onClick={() => switchCategory(c.id)} aria-current={category.id === c.id ? "page" : undefined} className={category.id===c.id ? "is-active" : ""}>{c.name}</button>)}
      </div>
      {website && (navEdges.before || navEdges.after) && <p className="fgp-scroll-hint" id="fgp-category-scroll-hint">
        {navEdges.before && <ArrowLeft size={14} aria-hidden="true"/>}
        <span>左右滑动查看更多分类</span>
        {navEdges.after && <ArrowRight size={14} aria-hidden="true"/>}
      </p>}
      <div className="fgp-browse-toolbar"><div className="fgp-filters">
        {hasCapacity(category.id) && <div className="fgp-filter-row"><span className="fgp-filter-label">使用人数</span><div className="fgp-capacities" role="group" aria-label="使用人数筛选">
          {[{id:"",name:"全部"}, ...capacities.map(c=>({id:c,name:capacityLabels[c]}))].map(c=><button type="button" key={c.id} aria-pressed={capacity===c.id} className={capacity===c.id ? "is-selected" : ""} onClick={()=>changeFilter("capacity",c.id)}>{c.name}</button>)}
        </div></div>}
        {hasReligion(category.id) && <div className="fgp-filter-row"><span className="fgp-filter-label" id="fgp-religion-label">适用宗教</span><div className="fgp-capacities" role="group" aria-labelledby="fgp-religion-label">
          {[{id:"",name:"全部宗教"}, ...religions].map(r=><button type="button" key={r.id} aria-pressed={religion===r.id} className={religion===r.id ? "is-selected" : ""} onClick={()=>changeFilter("religion",r.id)}>{r.name}</button>)}
        </div></div>}
      </div>
      {website && <div className="fgp-display-controls">
        <label className="fgp-sort" title={sort === "price-asc" ? "价格从低到高" : sort === "price-desc" ? "价格从高到低" : "价格排序"}><img className={`fgp-sort-icon${sort === 'default' ? ' fgp-sort-icon-default' : ''}`} src={`/images/sort-${sort === 'price-asc' ? 'ascending' : sort === 'price-desc' ? 'descending' : 'default'}.png`} alt="" aria-hidden="true" width="28" height="28"/><span className="fgp-sr">价格排序</span><select aria-label="价格排序" value={sort} onChange={e=>changeFilter('sort', e.target.value === 'default' ? '' : e.target.value)}><option value="default">默认顺序</option><option value="price-asc">价格从低到高</option><option value="price-desc">价格从高到低</option></select></label>
        <div className="fgp-view-toggle" role="group" aria-label="展示模式">{[
          {id:'grid', label:'双栏网格', icon:LayoutGrid}, {id:'list', label:'左图右文列表', icon:List},
        ].map(({id,label,icon:Icon})=><button type="button" key={id} aria-label={label} title={label} aria-pressed={view===id} onClick={()=>changeFilter('view',id==='grid'?'':id)}><Icon size={18} aria-hidden="true"/></button>)}</div>
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
  const [religion,setReligion] = useState("");
  const [design,setDesign] = useState("共通产品图");
  useEffect(()=>{setReligion("");setDesign("共通产品图");},[productId]);
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
  const content = product.religions.filter(r=>!religion || r.id===religion);
  const designs = product.images?.length ? galleryChoices(product).filter(({image})=>image.religion_id==null || !religion || String(image.religion_id)===religion).map(i=>i.label) : ["共通产品图",...content.flatMap(r=>r.designs.map(d=>r.name+' · '+d))];
  const selectedDesign = designs.includes(design) ? design : designs[0];
  const specs = [
    ...(hasCapacity(product.category) && product.capacity ? [["使用人数",product.category===3 && product.capacity==='four_plus' && product.capacityCount ? `${product.capacityCount}人` : capacityLabels[product.capacity]]] : []),
    ...(hasReligion(product.category) && product.religions.length ? [["适用宗教",product.religions.map(r=>r.name).join("、")]] : []),
    ...(product.category===3 && product.placement ? [["安放环境",product.placement==='indoor' ? "室内" : "室外"]] : []),
    ...([1,2,5,6,7].includes(product.category) && product.facing ? [["朝向",product.facing]] : []),
    ...([1,2,6,7].includes(product.category) && product.area ? [["面积",`${product.area} sqft`]] : []),
  ];
  return <div className="fgp-wrap fgp-detail" key={product.id}>
    <nav className="fgp-crumb" aria-label="当前位置"><Link to={homePath}>产品首页</Link><ChevronRight size={14}/><Link to={listPath(category.id)}>{category.name}</Link><ChevronRight size={14}/><span>产品详情</span></nav>
    <Link className="fgp-back" to={validQuestionnaireReturn || returnTo}><ArrowLeft size={15}/>{validQuestionnaireReturn ? "返回问卷结果" : "返回产品列表"}</Link>
    <div className={`fgp-detail-top${product.category === 4 ? " fgp-service-detail" : ""}`}>{product.category !== 4 && <section className="fgp-gallery" aria-label="产品图片"><ProductImage product={product} large caption={selectedDesign}/>
      {designs.length>1 && <div className="fgp-designs" role="group" aria-label="设计图片选择">{designs.map(d=><button key={d} className={selectedDesign===d ? "is-selected" : ""} aria-pressed={selectedDesign===d} onClick={()=>setDesign(d)}><ImageIcon size={16}/>{d}</button>)}</div>}
    </section>}<section className="fgp-product-overview"><span className="fgp-category-label">{category.name}</span><h1>{product.name}</h1><ProductTags product={product}/>{product.subtitle && <p>{product.subtitle}</p>}{product.description && <p>{product.description}</p>}
      <dl className="fgp-specs">{specs.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <a className="fgp-overview-next" href="#fgp-inclusions">查看包含项目<ArrowRight size={16}/></a>
    </section></div>
    <div className="fgp-detail-bottom"><section className="fgp-inclusions" id="fgp-inclusions"><h2>包含项目</h2>
      {product.inclusions.length>0 ? <ul>{product.inclusions.map((item,index)=><li key={index}><Check size={16} aria-hidden="true"/>{item}</li>)}</ul> : <p className="fgp-muted">对应产品的包含项目尚待核实，暂不列入未确认的内容。</p>}
      {product.religions.some(r=>r.inclusions.length || r.designs.length) && <div className="fgp-religious-content"><h3>宗教对应内容</h3>{product.religions.length>1 && <div className="fgp-content-tabs" role="group" aria-label="宗教对应内容选择"><button className={!religion ? "is-selected" : ""} aria-pressed={!religion} onClick={()=>{setReligion("");setDesign("共通产品图");}}>全部宗教</button>{product.religions.map(r=><button key={r.id} className={religion===r.id ? "is-selected" : ""} aria-pressed={religion===r.id} onClick={()=>{setReligion(r.id);setDesign("共通产品图");}}>{r.name}</button>)}</div>}
        {content.map(r=><div key={r.id} className="fgp-religious-group"><h4>{r.name}</h4>{r.inclusions.length>0 && <ul>{r.inclusions.map((item,i)=><li key={i}><Check size={16}/>{item}</li>)}</ul>}{r.designs.length>0 && <p>对应设计：{r.designs.join("、")}。各设计沿用本产品价格。</p>}</div>)}
      </div>}
    </section><section className="fgp-price-panel" aria-labelledby="fgp-price-heading"><h2 id="fgp-price-heading">{product.category===4 ? "殡仪服务价格" : product.category===3 ? "最低起价" : "产品价格"}</h2><PrototypePrices product={product} detailed religion={religion}/>
      {product.offers.length>1 && product.offers.some(o=>o.area) && <dl className="fgp-offer-specs">{product.offers.filter(o=>o.area).map(o=><div key={o.name}><dt>{o.name}</dt><dd>{o.area} sqft</dd></div>)}</dl>}
      {product.priceNote && <p className="fgp-price-note">{product.priceNote}</p>}{product.terms && !(website && product.referencePrice) && <p className="fgp-price-terms">{product.terms}</p>}
    </section></div>
  </div>;
}
export function PrototypeNotFound(){const { homePath } = useContext(ProductNavigationContext); return <div className="fgp-wrap fgp-empty"><h1>没有找到这个产品页面</h1><p>请返回产品目录，查看当前提供的产品。</p><Link className="fgp-primary" to={homePath}>返回产品首页<ArrowRight size={16}/></Link></div>;}
