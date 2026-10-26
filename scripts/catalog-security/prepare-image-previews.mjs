// Prepare only currently approved images through the deployed, authorized admin image service.
// Does not edit products, overwrite originals, publish records, or require a local service key.
import {loadEnv} from 'vite';
import {previewBucket,previewWidths,storedPreviewPath} from '../../shared/imageVariants.ts';
const env=loadEnv('development',process.cwd(),'');
const base=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
if(!base || !key)throw new Error('Public catalogue configuration is required');
const headers={apikey:key,...(key.startsWith('eyJ')?{Authorization:`Bearer ${key}`}:{})};
const response=await fetch(base+'/rest/v1/rpc/catalog_product_snapshot',{method:'POST',headers:{...headers,'Content-Type':'application/json','Content-Profile':'api','Accept-Profile':'api'},body:'{}'});
if(!response.ok)throw new Error('Cannot read approved image references');
const records=await response.json();
const sources=[...new Map(records.flatMap(record=>[...(record.images||[]),...(record.primary_image?[record.primary_image]:[])]).map(image=>[`${image.bucket}/${image.path}`,image])).values()];
const jobs=sources.flatMap(image=>previewWidths.map(width=>({image,width})));
let next=0,created=0,existing=0,bytes=0;
await Promise.all(Array.from({length:3},async()=>{
 while(next<jobs.length){
  const {image,width}=jobs[next++];
  const stored=base+'/storage/v1/object/authenticated/'+previewBucket+'/'+storedPreviewPath(image.bucket,image.path,width).split('/').map(encodeURIComponent).join('/');
  const head=await fetch(stored,{method:'HEAD',headers});
  if(head.ok){existing++;continue;}
  const result=await fetch('https://admin-nirvana-hnst.vercel.app/api/catalog-image?'+new URLSearchParams({bucket:image.bucket,path:image.path,width:String(width)}),{headers});
  if(!result.ok || result.headers.get('x-preview-stored')!=='1')throw new Error('Preview was not durably stored; ensure the latest admin deployment has its server storage credentials configured');
  bytes+=(await result.arrayBuffer()).byteLength;created++;
  console.log(JSON.stringify({prepared:created,existing,total:jobs.length,previewBytes:bytes}));
 }
}));
console.log(JSON.stringify({complete:true,sources:sources.length,prepared:created,existing,previewBytes:bytes}));
