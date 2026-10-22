import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn,execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const work=path.join(root,'work/catalog-security');fs.mkdirSync(work,{recursive:true});
// Stage only deployed migrations. Review-only proposals in the workspace must
// never be picked up by Supabase's automatic first-start migration runner.
const stack=path.join(work,'stack');
const stagedMigrations=path.join(stack,'supabase/migrations');
fs.mkdirSync(stagedMigrations,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'supabase/deployment-manifest.json'),'utf8'));
const approved=manifest.migrations.map(m=>m.local);
for(const filename of fs.readdirSync(stagedMigrations)){
  if(!approved.includes(filename))fs.unlinkSync(path.join(stagedMigrations,filename));
}
for(const filename of approved){
  if(path.basename(filename)!==filename || !filename.endsWith('.sql'))throw new Error('Invalid migration manifest');
  fs.copyFileSync(path.join(root,'supabase/migrations',filename),path.join(stagedMigrations,filename));
}
fs.copyFileSync(path.join(root,'supabase/config.toml'),path.join(stack,'supabase/config.toml'));
const dockerConfig=path.join(work,'docker-config');fs.mkdirSync(dockerConfig,{recursive:true});
fs.writeFileSync(path.join(dockerConfig,'config.json'),'{"auths":{}}\n',{mode:0o600});
const desktopSocket=path.join(os.homedir(),'.docker/run/docker.sock');
const env={...process.env,DOCKER_CONFIG:dockerConfig,
  DOCKER_HOST:process.env.DOCKER_HOST || (fs.existsSync(desktopSocket)?'unix://'+desktopSocket:'unix:///var/run/docker.sock')};
const cli=path.join(root,'supabase/tests/node_modules/.bin/supabase');
if(!fs.existsSync(cli))throw new Error('Run npm ci --prefix supabase/tests first');
execFileSync('docker',['info','--format','{{.ServerVersion}}'],{env,stdio:'ignore'});
try{execFileSync('docker',['network','inspect','nirvana-catalog-test-local'],{env,stdio:'ignore'});}
catch{execFileSync('docker',['network','create','--driver','bridge','--opt','com.docker.network.bridge.host_binding_ipv4=127.0.0.1','nirvana-catalog-test-local'],{env,stdio:'ignore'});}
const log=fs.openSync(path.join(work,'start.log'),'w',0o600);
try{
  await new Promise((resolve,reject)=>{
    const child=spawn(cli,['start','--workdir',stack,'--network-id','nirvana-catalog-test-local','-x','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'],
      {cwd:root,env,stdio:['ignore',log,log]});
    child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Local start failed; see ignored work/catalog-security/start.log')));
  });
}finally{fs.closeSync(log);}
execFileSync(process.execPath,[path.join(root,'scripts/catalog-security/bind-local-only.mjs')],{cwd:root,env,stdio:'inherit'});
const status=execFileSync(cli,['status','--workdir',stack,'-o','json'],{cwd:root,env,stdio:['ignore','pipe','ignore']});
fs.writeFileSync(path.join(work,'local-status.json'),status,{mode:0o600});
fs.chmodSync(path.join(work,'local-status.json'),0o600);
console.log('Local security-test services ready on http://127.0.0.1:56321 (credentials saved only in ignored local work directory).');
