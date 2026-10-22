// Hosted preflight is read-only. It never applies migrations, creates users, or uploads.
import fs from 'node:fs/promises';
import pg from 'pg';
import {loadConfig,client} from './support.mjs';
const config=loadConfig({remote:process.argv.includes('--remote')});
const conn=new pg.Client({connectionString:config.db,
  ssl:new URL(config.url).hostname==='127.0.0.1'?undefined:{rejectUnauthorized:true},
  connectionTimeoutMillis:10000});
const report={host:new URL(config.url).hostname,read_only:true};
try{
  await conn.connect();
  report.database=(await conn.query('SELECT current_database() AS database,current_user AS migration_user,version() AS version')).rows[0];
  report.tables=(await conn.query("SELECT schemaname,tablename FROM pg_tables WHERE schemaname='private' ORDER BY tablename")).rows;
  report.storage_rls=(await conn.query("SELECT relrowsecurity FROM pg_class WHERE oid='storage.objects'::regclass")).rows[0];
  report.deployment_state=report.tables.length===0?'empty-catalog':report.tables.length===18?'existing-catalog-requires-version-check':'unrelated-private-schema-do-not-apply';
  const response=await client(config).rpc('catalog_product_list');
  report.catalog_rpc=response.error?{code:response.error.code,available:false}:{available:true,count:response.data.length};
  await fs.writeFile(new URL('preflight-result.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log('Read-only preflight completed: '+report.deployment_state);
}catch(e){console.error('Preflight failed: '+(e.code||e.name));process.exitCode=1;}
finally{await conn.end();}
