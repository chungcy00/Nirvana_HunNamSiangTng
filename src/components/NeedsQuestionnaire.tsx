import { useEffect, useState } from 'react';
import { useCatalog } from '../catalog/context';
import { productPath } from '../catalog/repository';
import { questionnaireCatalogProductId } from '../data/questionnaireCatalog';
import { Link } from 'react-router-dom';
import { loadQuestionnaireSession, saveQuestionnaireSession, questionnaireReturnKey } from '../data/questionnaireSession';
import { Check, Phone } from 'lucide-react';
import { advisor, whatsappUrl } from '../data/site';
import { categories, questionKeys, budgetOptions, referencePrices, questionnaireProducts, productStatus, applicableVariants, withinBudget, complete, inquirySummary, updateAnswers, supplyNotice, money, type Answers, type ServiceProduct } from '../data/questionnaire';

const categoryNotes = ['火化后的骨灰安置空间','火化后，将骨灰安葬于福地','以棺木安葬的福地与配套','丧礼仪式、治丧流程与相关安排','宠物土葬或火化后的骨灰安葬'];
export default function NeedsQuestionnaire() {
  const catalog = useCatalog();
  const [initial] = useState(loadQuestionnaireSession);
  const [answers,setAnswers] = useState<Answers>(initial.answers);
  const [selected,setSelected] = useState<string[]>(initial.selected);
  const [browsing,setBrowsing] = useState(initial.browsing);
  useEffect(() => { saveQuestionnaireSession({answers,selected,browsing}); }, [answers,selected,browsing]);
  function rememberResult(id: string) {
    saveQuestionnaireSession({answers,selected,browsing});
    try { sessionStorage.setItem(questionnaireReturnKey, `needs-product-${id}`); } catch { /* Optional return position. */ }
  }
  const [notice,setNotice] = useState('');
  const [scrollTarget,setScrollTarget] = useState<string | null>(null);
  const currentQuestion = questionKeys(answers).find(key=>!answers[key]);
  useEffect(() => {
    if (!scrollTarget) return;
    const target = document.getElementById(scrollTarget);
    target?.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    target?.focus({preventScroll:true});
    setScrollTarget(null);
  }, [scrollTarget]);
  const ready = complete(answers);
  const currentProducts = questionnaireProducts.filter(p=>p.category===answers.category);
  const matches = currentProducts.filter(p=>productStatus(p,answers)==='match');
  const uncertain = currentProducts.filter(p=>productStatus(p,answers)==='confirm');
  function change(key: keyof Answers,value: string) {
    const next = updateAnswers(answers,key,value);
    const keep = key==='category' ? [] : key==='size' ? selected : selected.filter(id=>{
      const p = questionnaireProducts.find(p=>p.id===id)!;
      return complete(next) && productStatus(p,next)!=='exclude' && productStatus(p,next)===productStatus(p,answers);
    });
    setNotice(key!=='category' && keep.length < selected.length ? '部分已选服务因条件变化已取消，请重新确认' : '');
    setSelected(keep); setAnswers(next);
    const nextQuestion = questionKeys(next).find(key=>!next[key]);
    setScrollTarget(nextQuestion?`needs-question-${nextQuestion}`:'needs-results');
    if(key!=='size') setBrowsing(false);
  }
  let number = 0;
  let precedingAnswered = true;
  function question(title: string,key: keyof Answers, options: (string|{value:string;label:string;note?:string})[], children?: React.ReactNode) {
    number++;
    const enabled = precedingAnswered;
    precedingAnswered = precedingAnswered && Boolean(answers[key]);
    return <fieldset className={`needs-question ${enabled?'is-enabled':'is-pending'} ${currentQuestion===key?'is-current':''}`} id={`needs-question-${key}`} tabIndex={-1} key={key} disabled={!enabled}>
      <legend><span className="needs-number">{String(number).padStart(2,'0')}</span>{title}</legend>
      {children}
      <div className="needs-options">{options.map(option=>{
        const o = typeof option==='string'?{value:option,label:option}:option;
        return <label className={`needs-option ${answers[key]===o.value?'is-selected':''}`} key={o.value}>
          <input type="radio" name={`needs-${key}`} value={o.value} checked={answers[key]===o.value} onChange={()=>change(key,o.value)}/>
          <span><strong>{o.label}</strong>{o.note && <small>{o.note}</small>}</span>
        </label>;
      })}</div>
    </fieldset>;
  }
  const summary = inquirySummary(answers,selected,browsing);
  function card(p: ServiceProduct) {
    const productId = questionnaireCatalogProductId(p);
    const product = productId ? catalog.getProduct(productId) : undefined;
    const provider = product ? catalog.getProvider(product.providerId) : undefined;
    const detailPath = product && provider ? productPath(provider.slug, product.slug) : p.provider==='云南善堂' ? '/yunnan-siantang' : '/nirvana/pet-memorial';
    const returnState = { questionnaireReturn: `/contact#needs-product-${p.id}` };
    const status = productStatus(p,answers);
    const prices = applicableVariants(p,answers);
    const priced = browsing ? prices : prices.filter(v=>withinBudget(v.price,answers));
    return <article className="needs-product" key={p.id} id={`needs-product-${p.id}`}>
      <div className="needs-product-heading"><div><p className="needs-meta">{p.provider} · {p.category}</p><h4><Link to={detailPath} state={returnState} onClick={()=>rememberResult(p.id)}>{p.name}</Link></h4></div>
        <span className="needs-status">{status==='exclude'?'可能不符合当前条件':status==='confirm'?'需咨询确认':'符合所选条件'}</span></div>
      {p.restriction.startsWith('仅限火化') && <p className="needs-limit">仅限火化</p>}
      <p>{p.method || (p.capacity ? `${p.capacity === '或以上' ? '三人及以上或家庭' : p.capacity}安置空间，具体款式与位置请进一步了解。` : '了解仪式、治丧流程及相关服务安排。')}</p>
      <div className="needs-prices">{priced.length ? priced.map((v,i)=><p key={`${v.label}-${i}`}><span>{v.label}</span><strong>{money(v.price)}</strong>{!withinBudget(v.price,answers) && <small>不符合所选预算</small>}</p>):<p>参考价格需咨询确认</p>}</div>
      {prices.length>priced.length && <p className="small muted">仅列出符合本次预算的款式及价格，其他款式价格不同。</p>}
      {status==='confirm' && <p className="needs-confirm">{answers.religion==='其他'?'宗教及仪式适用情况需咨询确认。':'宗教、容量或价格资料不足，尚不能确认为匹配或预算内产品。'}</p>}
      <p><strong>包含内容：</strong>{p.includes}</p>
      <p className="needs-product-restriction"><strong>适用说明：</strong>{p.restriction}</p>
      <Link className="needs-detail-link" to={detailPath} state={returnState} onClick={()=>rememberResult(p.id)}>查看详情</Link>
      <p className="needs-supply">{supplyNotice}</p>
      <button type="button" className={`button ${selected.includes(p.id)?'':'button-outline'}`} aria-pressed={selected.includes(p.id)} onClick={()=>{setSelected(selected.includes(p.id)?selected.filter(id=>id!==p.id):[...selected,p.id]);}}>
        {selected.includes(p.id)?<><Check size={17}/>已加入咨询 · 点击取消</>:'加入咨询'}
      </button>
    </article>;
  }
  return <section className="container needs-questionnaire section" id="needs-questionnaire" aria-labelledby="needs-title">
    <header className="needs-intro"><h2 id="needs-title">了解您的需求</h2><p>简单选择，了解相关服务与参考价格，再与顾问进一步沟通。</p><p className="small muted">独立了解服务与参考价格，无需先填写上方咨询表单；选好需求后可直接带入 WhatsApp 咨询。</p></header>
    <div className="needs-layout"><div className="needs-questions">
      {question('您想了解哪一类服务？','category',categories.map((c,i)=>({value:c,label:c,note:categoryNotes[i]})))}
      {!answers.category && question('您的宗教信仰是？','religion',['佛教','基督教','其他'],<p className="needs-help">选择服务类别后，本题将显示对应问题；宠物纪念将改为询问纪念方式。</p>)}
      {answers.category && <>
        {answers.category!=='宠物纪念' && question('您的宗教信仰是？','religion',['佛教','基督教','其他'])}
        {['骨灰位','火化土葬','传统土葬'].includes(answers.category) && question('您希望了解几人使用的安置空间？','capacity',['单人','双人','或以上'],<p className="needs-help">「或以上」指三人及以上或家庭空间，不代表包含对应人数的全部火化、安葬或殡仪费用。</p>)}
        {answers.category==='殡仪服务' && question('您目前属于哪种情况？','situation',['提前规划','目前需要安排','先了解，尚未确定'],answers.situation==='目前需要安排'?<div className="needs-urgent"><p>如需即时协助，可以直接联系顾问，也可继续填写。</p><a href={`tel:${advisor.whatsapp.replace(/[^\d+]/g,'')}`}><Phone size={17}/>拨打 {advisor.whatsapp}</a></div>:undefined)}
        {answers.category==='宠物纪念' && question('您希望了解哪种纪念方式？','method',['宠物土葬','火化后骨灰安葬','尚未确定，先比较'])}
        {answers.category==='宠物纪念' && answers.method==='宠物土葬' && question('您的宠物体型大约是？','size',['小型','中型','大型','不确定'],<p className="needs-help">体型仅供顾问了解，不用于自动决定墓地大小。实际适用情况请咨询确认。</p>)}
        {question('您希望考虑的预算范围？','budget',budgetOptions(answers.category),<>
          <p className="needs-help">请选择本次所选服务的预算，不是全部丧葬费用。预算未定也可以继续了解。</p>
          <details className="needs-reference" key={answers.category}><summary>查看参考价格</summary><strong>{referencePrices[answers.category]}</strong><p>以上为现有资料中的参考区间。不同产品包含内容不同，地段与完整配套、预购与即时价格亦有区别，实际费用请咨询确认。</p><p>不代表市场全部产品或实时售价，也不保证每个预算档都有产品。</p></details>
        </>)}
      </>}
    </div></div>
    <div className="needs-results" id="needs-results" tabIndex={-1} aria-labelledby="needs-results-title">
      <h3 id="needs-results-title">相关服务{ready && <span> · {browsing?currentProducts.length:matches.length+uncertain.length} 项参考资料</span>}</h3>
      <p role="status" className="needs-selection-notice">{notice}</p>
      {!ready ? <p className="needs-empty">完成以上选择，即可查看相关服务</p> : <>
        {!matches.length && !browsing && <div className="needs-empty"><p>目前没有找到符合全部条件的资料，您可以放宽预算、查看其他选择，或直接与顾问沟通。</p><div className="button-row"><button className="button button-outline" type="button" onClick={()=>change('budget','any')}>放宽预算</button><button className="button button-outline" type="button" onClick={()=>{setBrowsing(true);}}>查看其他选择</button><a className="button" href={whatsappUrl(summary) || '/contact'} target="_blank" rel="noopener noreferrer">联系顾问</a></div></div>}
        {browsing && <p className="needs-confirm">以下为当前类别全部相关产品，可能不符合当前条件。修改答案后恢复筛选。</p>}
        {(answers.category==='殡仪服务'?['富贵山庄','云南善堂']:['富贵山庄']).map(provider=>{
          const confirmed = (browsing?currentProducts:matches).filter(p=>p.provider===provider);
          const pending = browsing?[]:uncertain.filter(p=>p.provider===provider);
          return <section className="needs-provider" key={provider}><h4>{provider}</h4>
            {confirmed.length>0 && <div className="needs-products">{confirmed.map(card)}</div>}
            {!confirmed.length && <p className="muted">当前条件下暂无已确认匹配的资料。</p>}
            {pending.length>0 && <><h5>需咨询确认</h5><p className="needs-help">以下项目资料尚不足以确认完全匹配，不能视为预算内推荐。</p><div className="needs-products">{pending.map(card)}</div></>}
          </section>;
        })}
      </>}
    </div>
    <div className="needs-inquiry-action">
      <a className="button" href={whatsappUrl(summary) || '/contact'} target="_blank" rel="noopener noreferrer">带上问卷需求，前往 WhatsApp 咨询</a>
      <p className="small muted">已选需求及产品将带入对话框，无需重复填写，由您确认后发送。</p>
    </div>
  </section>;
}
