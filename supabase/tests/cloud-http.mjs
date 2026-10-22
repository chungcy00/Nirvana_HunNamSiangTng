// Hosted boundary tests use a public key only. No privileged key, user or write fixture.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const project='iapdtipxubhulsxqnriv';
const config=process.argv[2]?JSON.parse(await fs.readFile(process.argv[2],'utf8')):{
  url:process.env.SUPABASE_URL,key:process.env.SUPABASE_PUBLISHABLE_KEY
};
assert.equal(new URL(config.url).hostname,project+'.supabase.co');
assert(config.key,'A publishable/anon API key is required');
const checks=[];
for(const [name,path,profile,token,expected] of [
  ['public_catalog','rpc/catalog_product_list','api',null,200],
  ['anonymous_admin','rpc/current_catalog_member','api',null,401],
  ['private_schema','products?select=*','private',null,406],
  ['fake_jwt','rpc/catalog_product_list','api','not-a-valid-jwt',401]
]){
  const post=path.startsWith('rpc/');
  const response=await fetch(config.url+'/rest/v1/'+path,{
    method:post?'POST':'GET',signal:AbortSignal.timeout(15000),
    headers:{apikey:config.key,'Content-Type':'application/json',
      [post?'Content-Profile':'Accept-Profile']:profile,
      ...(token?{Authorization:'Bearer '+token}:{})},
    ...(post?{body:'{}'}:{})
  });
  const body=await response.json();
  assert.equal(response.status,expected,name);
  if(name==='public_catalog')assert(Array.isArray(body));
  checks.push({name,status:response.status,response:body});
}
await fs.writeFile(new URL('cloud-http-result.json',import.meta.url),JSON.stringify({
  environment:'hosted-supabase',project_ref:project,finished_at:new Date().toISOString(),
  public_key_only:true,passed:checks.length,failed:0,checks
},null,2)+'\n');
console.log('Hosted HTTP boundary: '+checks.length+' passed, 0 failed');
