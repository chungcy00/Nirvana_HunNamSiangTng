import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {ServiceVenueField} from '../apps/admin/src/ServiceVenueField';
import {serviceVenues} from '../shared/serviceVenues';
test('venue selector has exactly three selectable choices and restores each saved value',()=>{
 for(const value of [null,...serviceVenues]){
  const html=renderToStaticMarkup(<ServiceVenueField value={value} onChange={()=>{throw Error('render must not mutate');}}/>);
  assert.doesNotMatch(html,/<input|multiple=/);
  assert.equal((html.match(/<option/g)||[]).length,4);
  for(const venue of serviceVenues)assert(html.includes(`>${venue}</option>`));
  if(value)assert(html.includes(`value="${value}" selected=""`));
 }
});
test('legacy venue remains visible but disabled and is never silently replaced',()=>{
 const html=renderToStaticMarkup(<ServiceVenueField value="旧地点" onChange={()=>{throw Error('must preserve');}}/>);
 assert.match(html,/<option value="旧地点" disabled="" selected="">旧地点（旧资料，暂保留）<\/option>/);
});
