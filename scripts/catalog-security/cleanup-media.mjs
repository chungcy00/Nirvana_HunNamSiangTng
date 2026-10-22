// Trusted maintenance retry. Default is a local read-only dry run; --apply opts
// into deleting old, unreferenced files. Hosted use also requires --remote config.
import pg from '../../supabase/tests/node_modules/pg/lib/index.js';
import {loadConfig,client} from '../../supabase/tests/support.mjs';
const cfg=loadConfig({remote:process.argv.includes('--remote')}),db=new pg.Client({connectionString:cfg.db,
 ssl:process.argv.includes('--remote')?{rejectUnauthorized:true}:undefined});
try{
 await db.connect();
 const rows=(await db.query(`SELECT bucket_id,name FROM storage.objects o
  WHERE bucket_id IN ('catalog-media-private','catalog-media-restricted')
    AND private.media_product_id(name) IS NOT NULL
    AND created_at < clock_timestamp()-interval '24 hours'
    AND NOT EXISTS(SELECT 1 FROM private.product_images i WHERE i.storage_bucket=o.bucket_id AND i.storage_path=o.name)
  ORDER BY created_at LIMIT 100`)).rows;
 if(!process.argv.includes('--apply'))console.log(JSON.stringify({dry_run:true,candidates:rows}));
 else{
  const c=client(cfg,cfg.service),result=[];
  for(const row of rows){
   // The DB delete guard serializes with new references and rejects a race.
   const {error}=await c.storage.from(row.bucket_id).remove([row.name]);
   result.push({bucket:row.bucket_id,path:row.name,deleted:!error,error:error?.message});
  }
  console.log(JSON.stringify({dry_run:false,result}));
 }
}finally{await db.end();}
