// Supabase CLI 2.78 binds published ports to all interfaces even on a loopback-only
// Docker network. Recreate ONLY this task's DB/gateway with identical configuration,
// preserved volumes, and 127.0.0.1 port bindings. Never inspect or modify other stacks.
import http from 'node:http';
const socket=process.env.DOCKER_HOST?.replace('unix://','') || '/Users/caiying/.docker/run/docker.sock';
const project='nirvana-catalog-security-test';
const request=(method,path,body)=>new Promise((resolve,reject)=>{
  const data=body?JSON.stringify(body):null;
  const req=http.request({socketPath:socket,path,method,headers:data?{'Content-Type':'application/json'}:{}},res=>{
    let text='';res.on('data',x=>text+=x);res.on('end',()=>{
      if(res.statusCode>=400)return reject(new Error('Docker operation failed: '+res.statusCode));
      resolve(text?JSON.parse(text):null);
    });
  });req.on('error',reject);if(data)req.write(data);req.end();
});
for(const prefix of ['supabase_db_','supabase_kong_']){
  const name=prefix+project;
  const c=await request('GET','/containers/'+name+'/json');
  const bindings=c.HostConfig.PortBindings;
  if(Object.values(bindings).flat().every(x=>x.HostIp==='127.0.0.1'))continue;
  const ports=Object.fromEntries(Object.entries(bindings).map(([k,v])=>[k,v.map(x=>({...x,HostIp:'127.0.0.1'}))]));
  const networks=Object.fromEntries(Object.entries(c.NetworkSettings.Networks).map(([k,v])=>[k,{Aliases:v.Aliases?.filter(x=>x!==c.Id.slice(0,12))}]));
  await request('POST','/containers/'+name+'/stop?t=10');
  await request('POST','/containers/'+name+'/rename?name='+name+'_before_loopback');
  let created;
  try{
    created=await request('POST','/containers/create?name='+name,{
      ...c.Config,HostConfig:{...c.HostConfig,PortBindings:ports},NetworkingConfig:{EndpointsConfig:networks}
    });
    await request('POST','/containers/'+created.Id+'/start');
  }catch(e){
    if(created)await request('DELETE','/containers/'+created.Id+'?force=true');
    await request('POST','/containers/'+c.Id+'/rename?name='+name);
    await request('POST','/containers/'+c.Id+'/start');throw e;
  }
  await request('DELETE','/containers/'+c.Id); // preserve volumes; never pass v=true
  console.log(name+': localhost only');
}
