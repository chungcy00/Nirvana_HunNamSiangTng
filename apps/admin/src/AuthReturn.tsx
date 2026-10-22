import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, errorText } from './client';
import { useAuth } from './auth';
import { parseAuthReturn } from './auth-flow';

export default function AuthReturn() {
  const { refresh } = useAuth(),
    navigate = useNavigate();
  const started = useRef(false);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState('');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const flow = parseAuthReturn(window.location.href);
    // Remove tokens/codes from address bar before subsequent requests or navigation.
    window.history.replaceState(null, '', flow.cleanPath);
    void (async () => {
      if (!supabase) throw new Error('尚未配置 Supabase 连接。');
      if (flow.error) throw new Error('登录或恢复链接无效、已使用或已过期，请重新申请。');
      if (flow.code) {
        const r = await supabase.auth.exchangeCodeForSession(
          flow.code,
          flow.flowId ? { flowId: flow.flowId } : undefined,
        );
        if (r.error) throw r.error;
      } else if (flow.tokens) {
        const r = await supabase.auth.setSession(flow.tokens);
        if (r.error) throw r.error;
      } else throw new Error('此页面需要有效的邀请或密码恢复链接。请从邮箱打开最新链接。');
      const identity = await supabase.auth.getUser();
      if (identity.error || !identity.data.user) throw new Error('无法验证此登录会话。');
      const member = await supabase.rpc('current_catalog_member');
      if (member.error) throw new Error('当前账号尚无有效后台权限，请联系管理员。');
      await refresh();
      if (flow.recovery) setReady(true);
      else navigate(flow.next, { replace: true });
    })().catch((e) =>
      setError(
        /code verifier|flow_state|otp_expired|expired|invalid grant/i.test(
          String(e.message || e.code),
        )
          ? '此链接无法在当前浏览器验证，可能已过期或浏览器不一致。请在发起恢复的同一浏览器重新申请。'
          : errorText(e),
      ),
    );
  }, []);
  return (
    <main className="login panel">
      <h1>{ready ? '设置后台密码' : '验证登录链接'}</h1>
      {!ready && !error && (
        <p className="help" role="status">
          正在验证 Supabase 登录链接…
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {ready && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            if (password !== confirm) {
              setError('两次输入的密码不一致。');
              return;
            }
            setBusy(true);
            try {
              const r = await supabase!.auth.updateUser({ password });
              if (r.error) throw r.error;
              setPassword('');
              setConfirm('');
              const out = await supabase!.auth.signOut();
              if (out.error) throw out.error;
              await refresh();
              navigate('/login?password=updated', { replace: true });
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="help">
            请设置至少 12 位的密码，包含大小写字母、数字和符号。设置后重新登录。
          </p>
          <label className="field">
            新密码
            <input
              type="password"
              name="new-password"
              autoComplete="new-password"
              minLength={12}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{12,}"
            />
          </label>
          <label className="field">
            确认新密码
            <input
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              minLength={12}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? '正在设置…' : '设置密码并重新登录'}
          </button>
        </form>
      )}
      <p className="help">
        <a href="/login">返回登录</a>
      </p>
    </main>
  );
}
