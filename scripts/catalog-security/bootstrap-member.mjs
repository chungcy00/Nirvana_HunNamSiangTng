// Trusted maintenance operation only. No web endpoint can self-assign this role.
import pg from '../../supabase/tests/node_modules/pg/lib/index.js';
import {loadConfig} from '../../supabase/tests/support.mjs';
const args=process.argv.slice(2),uid=args[args.indexOf('--user-id')+1],role=args[args.indexOf('--role')+1];
if(!args.includes('--user-id')||!args.includes('--role')||!/^[-a-f0-9]{36}$/i.test(uid)||!['admin','editor'].includes(role))
  throw new Error('Usage: node scripts/catalog-security/bootstrap-member.mjs --user-id AUTH_USER_UUID --role admin|editor [--disable] [--remote]');
const c=loadConfig({remote:args.includes('--remote')});
const db=new pg.Client({connectionString:c.db,ssl:args.includes('--remote')?{rejectUnauthorized:true}:undefined});
try{
  await db.connect();
  const exists=await db.query('SELECT id FROM auth.users WHERE id=$1',[uid]);
  if(!exists.rowCount)throw new Error('Auth user does not exist; no role was assigned');
  await db.query('INSERT INTO private.admin_members(user_id,role,is_active) VALUES ($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET role=EXCLUDED.role,is_active=EXCLUDED.is_active',
    [uid,role,!args.includes('--disable')]);
  console.log('Specified backend member updated. No password or user credential was changed.');
}finally{await db.end();}
