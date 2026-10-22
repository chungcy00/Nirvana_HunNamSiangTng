import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { configured, supabase, rpc, errorText } from './client';
import type { Member } from './types';
const AuthContext = createContext<{
  session: Session | null;
  member: Member | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}>({ session: null, member: null, loading: true, error: '', refresh: async () => {} });
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [member, setMember] = useState<Member | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  async function refresh() {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error: authError } = await supabase.auth.getSession();
    setSession(data.session);
    if (authError || !data.session) {
      setMember(null);
      setLoading(false);
      return;
    }
    try {
      const m = await rpc<Member>('current_catalog_member');
      setMember(m);
      setError('');
    } catch (e) {
      setMember(null);
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    void refresh();
    const listener = supabase?.auth.onAuthStateChange(() => {
      queueMicrotask(() => {
        if (active) void refresh();
      });
    });
    const focus = () => void refresh();
    window.addEventListener('focus', focus);
    return () => {
      active = false;
      listener?.data.subscription.unsubscribe();
      window.removeEventListener('focus', focus);
    };
  }, []);
  return (
    <AuthContext.Provider value={{ session, member, loading, error, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
export function Login() {
  const { session, error: memberError, refresh } = useAuth();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  if (!configured)
    return (
      <main className="login panel">
        <h1>富贵山庄后台</h1>
        <p className="notice">
          尚未配置 Supabase 连接。请在后台应用环境中配置项目地址与公开密钥后重新构建。
        </p>
      </main>
    );
  return (
    <main className="login panel">
      <h1>后台登录</h1>
      <p className="help">使用已获授权的账号管理富贵山庄产品。</p>
      {(error || memberError) && (
        <p className="error" role="alert">
          {error || memberError}
        </p>
      )}
      {session ? (
        <>
          <p>当前登录账号：{session.user.email}</p>
          <button
            onClick={async () => {
              await supabase!.auth.signOut();
              await refresh();
            }}
          >
            退出当前账号
          </button>
        </>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              const r = await supabase!.auth.signInWithPassword({ email, password });
              if (r.error) throw r.error;
              setPassword('');
              await refresh();
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            邮箱
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            密码
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy} type="submit">
            {busy ? '正在登录…' : '登录后台'}
          </button>
        </form>
      )}
    </main>
  );
}
