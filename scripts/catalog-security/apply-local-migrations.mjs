// Explicitly localhost only. Apply approved manifest entries, never scan migrations/.
import fs from 'node:fs/promises';
import pg from '../../supabase/tests/node_modules/pg/lib/index.js';
import {loadConfig,root} from '../../supabase/tests/support.mjs';
const cfg=loadConfig();
if(new URL(cfg.db).hostname!=='127.0.0.1')throw new Error('Local migrations require localhost');
const manifest=JSON.parse(await fs.readFile(new URL('supabase/deployment-manifest.json',root),'utf8'));
const db=new pg.Client({connectionString:cfg.db});
try{
 await db.connect();
 const applied=new Set((await db.query('SELECT version FROM supabase_migrations.schema_migrations')).rows.map(r=>r.version));
 const approved=new Set(manifest.migrations.map(m=>m.local.split('_')[0]));
 if([...applied].some(v=>!approved.has(v)))throw new Error('Local migration history contains unlisted versions; review before continuing');
 for(const entry of manifest.migrations){
  if(!/^\d+_[a-z0-9_]+\.sql$/.test(entry.local))throw new Error('Invalid manifest filename');
  const [version]=entry.local.split('_');if(applied.has(version))continue;
  const sql=await fs.readFile(new URL('supabase/migrations/'+entry.local,root),'utf8');
  await db.query('BEGIN');
  try{
   await db.query(sql);
   await db.query('INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES($1,$2,$3)',[version,entry.local.slice(version.length+1,-4),[sql]]);
   await db.query('COMMIT');console.log('Applied approved local migration '+entry.local);
  }catch(e){await db.query('ROLLBACK');throw e;}
 }
 console.log('Local approved migration history is current; review-only migrations excluded.');
}finally{await db.end();}
