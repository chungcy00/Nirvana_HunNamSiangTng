import { categories, emptyAnswers, budgetOptions, type ServiceProduct, type Answers } from './questionnaire';
export const questionnaireSessionKey = 'service-needs-v1';
export const questionnaireReturnKey = 'service-needs-return';
export type QuestionnaireSession = { answers: Answers; selected: string[]; browsing: boolean };
const fresh = (): QuestionnaireSession => ({ answers: {...emptyAnswers}, selected: [], browsing: false });
export function parseQuestionnaireSession(raw: string | null, products?: readonly ServiceProduct[]): QuestionnaireSession {
  if (!raw) return fresh();
  try {
    const data = JSON.parse(raw);
    const a = data.answers;
    if (!a || !categories.includes(a.category)) return fresh();
    const pick = (value: unknown, allowed: string[]) => typeof value==='string' && allowed.includes(value) ? value : '';
    const answers: Answers = {
      category:a.category,
      religion:a.category==='宠物纪念'?'':pick(a.religion,['佛教','基督教','其他']),
      capacity:['骨灰位','火化土葬','传统土葬'].includes(a.category)?pick(a.capacity,['单人','双人','或以上']):'',
      situation:a.category==='殡仪服务'?pick(a.situation,['提前规划','目前需要安排','先了解，尚未确定']):'',
      method:a.category==='宠物纪念'?pick(a.method,['宠物土葬','火化后骨灰安葬','尚未确定，先比较']):'',
      size:a.category==='宠物纪念' && a.method==='宠物土葬'?pick(a.size,['小型','中型','大型','不确定']):'',
      budget:pick(a.budget,budgetOptions(a.category).map(x=>x.value)),
    };
    return {answers, selected:Array.isArray(data.selected)?[...new Set<string>(data.selected.filter((id: unknown)=>typeof id==='string' && id.length>0 && id.length<=256 && !/[\u0000-\u001f]/.test(id) && (!products || products.some(p=>p.id===id && p.category===answers.category))))]:[],browsing:data.browsing===true};
  } catch { return fresh(); }
}
export function loadQuestionnaireSession(): QuestionnaireSession {
  try { return parseQuestionnaireSession(sessionStorage.getItem(questionnaireSessionKey)); } catch { return fresh(); }
}
export function saveQuestionnaireSession(snapshot: QuestionnaireSession) {
  try { sessionStorage.setItem(questionnaireSessionKey,JSON.stringify(snapshot)); } catch { /* The questionnaire still works when browser storage is unavailable. */ }
}
