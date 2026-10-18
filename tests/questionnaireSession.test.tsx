import { createCatalog, productPath } from '../src/catalog/repository';
import { catalogData } from '../src/data/catalog';
import { questionnaireCatalogProductId } from '../src/data/questionnaireCatalog';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { WebsiteRoutes } from '../src/App';
import { parseQuestionnaireSession } from '../src/data/questionnaireSession';
import { emptyAnswers, questionKeys, questionnaireProducts } from '../src/data/questionnaire';
test('return state retains answers, selected products and other-choices mode',()=>{
 const data={answers:{...emptyAnswers,category:'骨灰位',religion:'佛教',capacity:'单人',budget:'any'},selected:['kindness'],browsing:true};
 assert.deepEqual(parseQuestionnaireSession(JSON.stringify(data)),data);
});
test('damaged and obsolete browser state never creates invalid branches or products',()=>{
 assert.deepEqual(parseQuestionnaireSession('{broken').answers,emptyAnswers);
 const data=parseQuestionnaireSession(JSON.stringify({answers:{...emptyAnswers,category:'宠物纪念',religion:'佛教',capacity:'双人',method:'火化后骨灰安葬',size:'大型',budget:'bad'},selected:['unknown','kindness','pet-urn','pet-urn']}));
 assert.equal(data.answers.religion,''); assert.equal(data.answers.capacity,''); assert.equal(data.answers.size,''); assert.equal(data.answers.budget,''); assert.deepEqual(data.selected,['pet-urn']);
});
test('questionnaire links resolve to published existing catalogue products',()=>{
 const repo = createCatalog(catalogData);
 for(const p of questionnaireProducts){
   const id = questionnaireCatalogProductId(p);
   if(id) {
     const product=repo.getProduct(id)!; assert.ok(product);
     const provider=repo.getProvider(product.providerId)!;
     const html=renderToStaticMarkup(<MemoryRouter initialEntries={[productPath(provider.slug,product.slug)]}><WebsiteRoutes/></MemoryRouter>);
     assert.ok(html.includes(product.name));
   } else assert.ok(['yunnan','pet-urn'].includes(p.id));
 }
});
test('sequential question order follows the applicable branch',()=>{
 assert.deepEqual(questionKeys(emptyAnswers),['category']);
 assert.deepEqual(questionKeys({...emptyAnswers,category:'骨灰位'}),['category','religion','capacity','budget']);
 assert.deepEqual(questionKeys({...emptyAnswers,category:'殡仪服务'}),['category','religion','situation','budget']);
 assert.deepEqual(questionKeys({...emptyAnswers,category:'宠物纪念',method:'宠物土葬'}),['category','method','size','budget']);
 assert.deepEqual(questionKeys({...emptyAnswers,category:'宠物纪念',method:'火化后骨灰安葬'}),['category','method','budget']);
});

test('first question is active while the second question is already visible and disabled',()=>{
 const html=renderToStaticMarkup(<MemoryRouter initialEntries={['/contact']}><WebsiteRoutes/></MemoryRouter>);
 assert.match(html,/is-current[^>]*id="needs-question-category"/);
 assert.match(html,/is-pending[^>]*id="needs-question-religion"[^>]*disabled/);
 assert.ok(html.includes('您的宗教信仰是？'));
});
