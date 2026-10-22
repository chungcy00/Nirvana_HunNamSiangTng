import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { configured, supabase, rpc, errorText, sendPasswordRecovery } from './client';
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
  const revision = useRef(0);
  async function refresh() {
    const ticket = ++revision.current;
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error: authError } = await supabase.auth.getSession();
    if (ticket !== revision.current) return;
    setSession(data.session);
    if (authError || !data.session) {
      setMember(null);
      setLoading(false);
      return;
    }
    try {
      const m = await rpc<Member>('current_catalog_member');
      if (ticket !== revision.current) return;
      setMember(m);
      setError('');
    } catch (e) {
      if (ticket !== revision.current) return;
      setMember(null);
      setError(errorText(e));
    } finally {
      if (ticket === revision.current) setLoading(false);
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
    [error, setError] = useState(''),
    [recover, setRecover] = useState(false),
    [sent, setSent] = useState(false),
    [recoverLimited, setRecoverLimited] = useState(false);
  const recoveryUnavailable =
    recoverLimited || /email rate limit exceeded|邮件发送已达到平台限额/.test(error);
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
      <h1>{recover ? '恢复后台密码' : '后台登录'}</h1>
      {sent && (
        <p className="notice" role="status">
          如果此邮箱属于可恢复的账号，将收到恢复邮件。请在当前浏览器打开最新邮件链接。
        </p>
      )}
      {window.location.search === '?password=updated' && (
        <p className="notice" role="status">
          密码已设置，请重新登录。
        </p>
      )}
      <p className="help">使用已获授权的账号管理富贵山庄产品。</p>
      {recover && ['127.0.0.1', 'localhost'].includes(window.location.hostname) && (
        <p className="help">请在这台电脑的同一个浏览器申请并打开邮件链接，不要使用手机。</p>
      )}
      {(error || memberError) && (
        <p className="error" role="alert">
          {errorText({ message: error || memberError })}
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
              if (recover) {
                const r = await sendPasswordRecovery(email);
                if (r.error) {
                  if (r.error.status === 429 || r.error.code === 'over_email_send_rate_limit')
                    setRecoverLimited(true);
                  throw r.error;
                }
                setSent(true);
                return;
              }
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
          {!recover && (
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
          )}
          <button
            className="primary"
            disabled={busy || (recover && recoveryUnavailable)}
            type="submit"
          >
            {busy
              ? '正在处理…'
              : recoveryUnavailable && recover
                ? '邮件额度暂不可用'
                : recover
                  ? '发送恢复邮件'
                  : '登录后台'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setRecover(!recover);
              setError('');
              setSent(false);
              setPassword('');
            }}
          >
            {recover ? '返回密码登录' : '忘记密码／激活邀请'}
          </button>
        </form>
      )}
    </main>
  );
}
