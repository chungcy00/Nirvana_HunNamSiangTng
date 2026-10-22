import { PublicFixture, fixtureQuestionnaireProducts } from "./publicFixtures";
import { questionnaireProductPath } from '../src/data/questionnaireCatalog';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { WebsiteRoutes } from '../src/App';
import { parseQuestionnaireSession } from '../src/data/questionnaireSession';
import { emptyAnswers, questionKeys } from '../src/data/questionnaire';
test('return state retains answers, selected products and other-choices mode',()=>{
 const data={answers:{...emptyAnswers,category:'骨灰位',religion:'佛教',capacity:'单人',budget:'any'},selected:['loving-kindness-2-single'],browsing:true};
 assert.deepEqual(parseQuestionnaireSession(JSON.stringify(data),fixtureQuestionnaireProducts),data);
});
test('damaged and obsolete browser state never creates invalid branches or products',()=>{
 assert.deepEqual(parseQuestionnaireSession('{broken').answers,emptyAnswers);
 const data=parseQuestionnaireSession(JSON.stringify({answers:{...emptyAnswers,category:'宠物纪念',religion:'佛教',capacity:'双人',method:'火化后骨灰安葬',size:'大型',budget:'bad'},selected:['unknown','kindness','pet-urn','pet-urn']}),fixtureQuestionnaireProducts);
 assert.equal(data.answers.religion,''); assert.equal(data.answers.capacity,''); assert.equal(data.answers.size,''); assert.equal(data.answers.budget,''); assert.deepEqual(data.selected,['pet-urn']);
});
test('questionnaire links resolve to published existing catalogue products',()=>{
 for(const p of fixtureQuestionnaireProducts){
   const html=renderToStaticMarkup(<PublicFixture><MemoryRouter initialEntries={[questionnaireProductPath(p)]}><WebsiteRoutes/></MemoryRouter></PublicFixture>);
   assert.ok(html.includes(p.provider === '云南善堂' ? '云南善堂' : p.name));
   assert.ok(!html.includes('PAGE NOT FOUND'));
   if (p.provider === '富贵山庄') assert.ok(questionnaireProductPath(p).startsWith('/nirvana/products/item/'));
 }
});
test('sequential question order follows the applicable branch',()=>{
 assert.deepEqual(questionKeys(emptyAnswers),['category']);
 assert.deepEqual(questionKeys({...emptyAnswers,category:'骨灰位'}),['category','religion','capacity','budget']);
 assert.deepEqual(questionKeys({...emptyAnswers,category:'殡仪服务'}),['category','religion','situation','budget']);
 assert.deepEqual(questionKeys({...emptyAnswers,category:'宠物纪念',method:'宠物土葬'}),['category','method','size','budget']);
 assert.deepEqual(questionKeys({...emptyAnswers,category:'宠物纪念',method:'火化后骨灰安葬'}),['category','method','budget']);
});

test('new product detail returns to the originating questionnaire result',()=>{
 const html=renderToStaticMarkup(<PublicFixture><MemoryRouter initialEntries={[{
   pathname:'/nirvana/products/item/loving-kindness-2-single',
   state:{questionnaireReturn:'/contact#needs-product-loving-kindness-2-single'},
 }]}><WebsiteRoutes/></MemoryRouter></PublicFixture>);
 assert.match(html,/href="\/contact#needs-product-loving-kindness-2-single"/);
 assert.match(html,/返回问卷结果/);
});

test('first question is active while the second question is already visible and disabled',()=>{
 const html=renderToStaticMarkup(<PublicFixture><MemoryRouter initialEntries={['/contact']}><WebsiteRoutes/></MemoryRouter></PublicFixture>);
 assert.match(html,/is-current[^>]*id="needs-question-category"/);
 assert.match(html,/is-pending[^>]*id="needs-question-religion"[^>]*disabled/);
 assert.ok(html.includes('您的宗教信仰是？'));
});
