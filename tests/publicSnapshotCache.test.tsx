import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPublicSnapshot, writePublicSnapshot, clearPublicSnapshot } from '../src/catalog/publicSnapshotCache';
import { prototypeProducts } from '../src/prototype/products';

test('tab snapshot expires after 30 seconds, stays backend scoped and clears on invalidation', t => {
  const values = new Map<string,string>();
  const original=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
  t.after(()=>{if(original)Object.defineProperty(globalThis,'sessionStorage',original);else Reflect.deleteProperty(globalThis,'sessionStorage');});
  Object.defineProperty(globalThis, 'sessionStorage', {configurable:true,value:{getItem:(k:string)=>values.get(k) ?? null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)}});
  let clock=1000;t.mock.method(Date,'now',()=>clock);
  const config={url:'https://example.supabase.co',key:'sb_publishable_test'};
  const products=[{...prototypeProducts[0],visible:true}];
  writePublicSnapshot(config,products);
  assert.deepEqual(readPublicSnapshot(config),products);
  assert.equal(readPublicSnapshot({...config,url:'https://other.supabase.co'}),undefined);
  assert.equal(readPublicSnapshot({...config,key:'sb_publishable_other'}),undefined);
  clock=30999;assert.deepEqual(readPublicSnapshot(config),products);
  clock=31000;assert.equal(readPublicSnapshot(config),undefined);
  clock=1000;clearPublicSnapshot();assert.equal(readPublicSnapshot(config),undefined);
  values.set('public-catalog-snapshot-v1','broken JSON');assert.equal(readPublicSnapshot(config),undefined);
});
