import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';
export const root=new URL('../../',import.meta.url);
export function loadConfig({remote=false}={}){
  if(remote){
    const env=fileURLToPath(new URL('.env.local',import.meta.url));
    if(fs.existsSync(env))process.loadEnvFile(env);
    for(const k of ['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','DATABASE_URL'])
      if(!process.env[k])throw new Error('Missing '+k+' in supabase/tests/.env.local (do not send credentials in chat)');
    if(new URL(process.env.SUPABASE_URL).hostname!=='iapdtipxubhulsxqnriv.supabase.co')throw new Error('Unexpected hosted test project');
    return {url:process.env.SUPABASE_URL,anon:process.env.SUPABASE_ANON_KEY,service:process.env.SUPABASE_SERVICE_ROLE_KEY,db:process.env.DATABASE_URL};
  }
  const s=JSON.parse(fs.readFileSync(new URL('work/catalog-security/local-status.json',root),'utf8'));
  if(new URL(s.API_URL).hostname!=='127.0.0.1' || new URL(s.DB_URL).hostname!=='127.0.0.1')throw new Error('Integration tests require localhost');
  return {url:s.API_URL,anon:s.ANON_KEY,service:s.SERVICE_ROLE_KEY,db:s.DB_URL};
}
export function client(c,secret=c.anon){return createClient(c.url,secret,{
  db:{schema:'api'},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
});}
export async function rpc(c,name,args={}){
  const r=await c.rpc(name,args);if(r.error){const e=new Error(r.error.message);Object.assign(e,r.error);throw e;}return r.data;
}
export async function mustReject(fn,pattern){
  try{await fn();}catch(e){if(pattern&&!pattern.test(e.code+' '+e.message))throw e;return e;}
  throw new Error('Expected access/validation rejection');
}
export async function storageOK(promise){const r=await promise;if(r.error)throw r.error;return r.data;}
