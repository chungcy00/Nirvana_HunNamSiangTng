// Explicit phase-2 acceptance mode: authenticates against the hosted project,
// reads actual admin RPCs, and exposes no product mutation controls.
import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { supabase, rpc, errorText } from './client';
export default function AuthVerification() {
  const { member, refresh } = useAuth();
  const [status, setStatus] = useState('正在核验真实登录…'),
    [identity, setIdentity] = useState(''),
    [total, setTotal] = useState<number | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void (async () => {
      const u = await supabase!.auth.getUser();
      if (u.error || !u.data.user) throw new Error('真实登录验证失败，请重新登录。');
      const data = await rpc('admin_product_list');
      await rpc('admin_reference_data');
      if (active) {
        setIdentity(u.data.user.id);
        setTotal(data.total);
        setStatus('云端管理员登录验证通过');
      }
    })().catch((e) => {
      if (active) setError(errorText(e));
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <main className="login panel">
      <h1>云端登录验证</h1>
      <p className="notice" role="status">
        {status}
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <dl>
        <dt>账户 ID</dt>
        <dd>{identity || '核验中'}</dd>
        <dt>数据库角色</dt>
        <dd>{member?.role}</dd>
        <dt>实际读取的产品数量</dt>
        <dd>{total ?? '核验中'}</dd>
      </dl>
      <p className="help">此模式只读取身份与资料，没有产品新增、修改或发布入口。</p>
      <button
        onClick={async () => {
          const r = await supabase!.auth.signOut();
          if (r.error) {
            setError(errorText(r.error));
            return;
          }
          await refresh();
        }}
      >
        退出登录
      </button>
    </main>
  );
}
