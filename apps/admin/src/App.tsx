import { useEffect, useState } from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Building2 } from 'lucide-react';
import { AuthProvider, Login, useAuth } from './auth';
import { AdminContext, useAdmin } from './context';
import { supabase, readReferences, errorText, rpc } from './client';
import { emptyReferences, type References, type DictionaryKind, type Row } from './types';
import Products from './Products';
import Editor from './Editor';
import { ReferenceDialog } from './references';

function ReferencePage({ kind }: { kind: DictionaryKind }) {
  const { refs, reload, notify } = useAdmin(),
    { member } = useAuth();
  const [edit, setEdit] = useState<Row | null | undefined>(undefined);
  const title = { series: '园区与系列', religions: '宗教字典', notices: '价格备注设置' }[kind];
  return (
    <>
      <div className="pagehead row between">
        <div>
          <h1>{title}</h1>
          <p>
            {kind === 'series'
              ? '停用系列保留已有产品关联，不自动隐藏产品。'
              : kind === 'religions'
                ? '宗教在产品编辑页单独关联与公开。'
                : '方案专属备注 → 产品专属备注 → 通用备注。'}
          </p>
        </div>
        {member?.role === 'admin' && (
          <button className="primary" onClick={() => setEdit(null)}>
            新增{kind === 'notices' ? '备注' : kind === 'series' ? '系列' : '宗教'}
          </button>
        )}
      </div>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>{kind === 'notices' ? '备注内容' : '名称'}</th>
              <th>代码／类型</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {refs[kind].map((r) => (
              <tr key={r.id}>
                <td>{r.name || r.content}</td>
                <td>{r.code || r.series_type || '通用价格备注'}</td>
                <td>{r.is_active ? '已启用' : '已停用'}</td>
                <td>
                  {member?.role === 'admin' ? (
                    <button onClick={() => setEdit(r)}>编辑</button>
                  ) : (
                    '只读'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit !== undefined && (
        <ReferenceDialog
          kind={kind}
          record={edit || undefined}
          onClose={() => setEdit(undefined)}
          onSaved={() => {
            setEdit(undefined);
            void reload();
            notify('资料已保存。');
          }}
        />
      )}
    </>
  );
}
function Audit() {
  const [data, setData] = useState<{ items: Row[]; total: number }>({ items: [], total: 0 }),
    [page, setPage] = useState(1),
    [error, setError] = useState('');
  useEffect(() => {
    rpc('admin_audit_logs', { p_page: page })
      .then(setData)
      .catch((e) => setError(errorText(e)));
  }, [page]);
  return (
    <>
      <h1>操作记录</h1>
      <p className="help">记录由数据库写入，后台账号不可修改或删除。</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>资料表</th>
              <th>操作</th>
              <th>记录与修改内容</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id}>
                <td>
                  {new Date(r.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Kuching' })}
                </td>
                <td>{r.table_name}</td>
                <td>{r.action}</td>
                <td>
                  <details>
                    <summary>{r.record_id}</summary>
                    <pre className="log">
                      {JSON.stringify({ before: r.old_data, after: r.new_data }, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row footer">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          上一页
        </button>
        <span>
          第 {page} 页 · 共 {data.total} 条
        </span>
        <button disabled={page * 30 >= data.total} onClick={() => setPage((p) => p + 1)}>
          下一页
        </button>
      </div>
    </>
  );
}
function Shell() {
  const { session, member, refresh } = useAuth(),
    navigate = useNavigate(),
    location = useLocation();
  const [refs, setRefs] = useState<References>(emptyReferences),
    [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [menu, setMenu] = useState(false);
  const yunnan = location.pathname.startsWith('/yunnan');
  async function reload() {
    try {
      setRefs(await readReferences());
      setError('');
      setReady(true);
    } catch (e) {
      setError(errorText(e));
    }
  }
  useEffect(() => {
    void reload();
  }, [member?.user_id]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    setMenu(false);
    setToast('');
  }, [location.pathname]);
  useEffect(() => {
    if (!menu) return;
    const previous = document.activeElement as HTMLElement | null;
    const sidebar = document.getElementById('sidebar')!;
    const focusable = () =>
      Array.from(sidebar.querySelectorAll<HTMLElement>('button,a,select')).filter(
        (x) => !x.hasAttribute('disabled'),
      );
    focusable()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(false);
      if (e.key === 'Tab') {
        const list = focusable(),
          first = list[0],
          last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [menu]);
  const links = [
    ['/products', '产品管理'],
    ['/series', '园区与系列'],
    ['/religions', '宗教字典'],
    ['/notices', '价格备注设置'],
    ['/audit', '操作记录'],
    ['/settings', '管理员设置'],
  ];
  return (
    <AdminContext.Provider value={{ refs, reload, notify: setToast }}>
      <div className="shell">
        <aside id="sidebar" className={menu ? 'open' : ''}>
          <button className="mobile-sidebar-close" onClick={() => setMenu(false)}>
            关闭菜单
          </button>
          <div className="brand admin-brand">
            产品管理后台<small>身后事 · 皆可托</small>
          </div>
          <label className="institution-switch">
            选择机构
            <select
              aria-label="选择机构"
              value={yunnan ? 'yunnan' : 'nirvana'}
              onChange={(e) => navigate(e.target.value === 'yunnan' ? '/yunnan' : '/products')}
            >
              <option value="nirvana">富贵山庄</option>
              <option value="yunnan">云南善堂</option>
            </select>
          </label>
          <nav className="nav">
            {yunnan ? (
              <NavLink to="/yunnan">后台管理</NavLink>
            ) : (
              links
                .filter(([path]) => member?.role === 'admin' || path !== '/audit')
                .map(([path, name]) => (
                  <NavLink key={path} to={path}>
                    {name}
                  </NavLink>
                ))
            )}
          </nav>
          <div className="sidebottom">
            {session?.user.email}
            <br />
            {member?.role === 'admin' ? '管理员' : '编辑员'}
          </div>
        </aside>
        {menu && (
          <button className="menu-backdrop" aria-label="关闭侧栏" onClick={() => setMenu(false)} />
        )}
        <main className="main">
          <header>
            <div className="row">
              <button
                className="mobilemenu"
                aria-label="打开管理导航"
                onClick={() => setMenu(true)}
              >
                <Menu size={21} />
              </button>
              <span>{yunnan ? '云南善堂' : '富贵山庄'} · 后台管理</span>
            </div>
            <div className="row">
              <span className="badge">
                {new URL(import.meta.env.VITE_SUPABASE_URL).hostname === '127.0.0.1'
                  ? '本地测试库 · '
                  : ''}
                {member?.role === 'admin' ? '管理员' : '编辑员'}
              </span>
              <button
                onClick={async () => {
                  if (window.confirm('确认退出后台？未保存的编辑将丢失。')) {
                    await supabase!.auth.signOut();
                    await refresh();
                  }
                }}
              >
                退出
              </button>
            </div>
          </header>
          <div className="content">
            {error && (
              <p className="error" role="alert">
                {error} <button onClick={() => void reload()}>重试读取配置</button>
              </p>
            )}
            {!ready ? (
              <p role="status">正在读取后台配置…</p>
            ) : (
              <Routes>
                <Route path="/products" element={<Products />} />
                <Route path="/products/:id" element={<Editor />} />
                <Route path="/series" element={<ReferencePage kind="series" />} />
                <Route path="/religions" element={<ReferencePage kind="religions" />} />
                <Route path="/notices" element={<ReferencePage kind="notices" />} />
                <Route path="/audit" element={<Audit />} />
                <Route
                  path="/settings"
                  element={
                    <>
                      <h1>管理员设置</h1>
                      <section className="panel">
                        <h2>当前登录身份</h2>
                        <p>{session?.user.email}</p>
                        <p>角色：{member?.role === 'admin' ? '管理员' : '编辑员'}</p>
                        <p className="notice">
                          账号增删与角色变更仅经受控维护流程处理。此页面不提供自行提权或切换角色。
                        </p>
                      </section>
                    </>
                  }
                />
                <Route
                  path="/yunnan"
                  element={
                    <section className="institution-placeholder">
                      <div>
                        <Building2 size={64} strokeWidth={1.5} />
                        <h1>云南善堂｜后台管理</h1>
                        <span className="badge">功能规划中</span>
                        <p>云南善堂后台管理功能尚在规划阶段。</p>
                        <p>
                          未来将根据云南善堂的实际服务项目、产品资料及管理需求，逐步建立相应的后台管理功能。
                        </p>
                        <p>目前仅预留后台入口，暂不提供产品新增、编辑或发布功能。</p>
                      </div>
                    </section>
                  }
                />
                <Route path="/" element={<Navigate to="/products" replace />} />
                <Route
                  path="*"
                  element={
                    <>
                      <h1>找不到此页面</h1>
                      <button onClick={() => navigate('/products')}>返回产品管理</button>
                    </>
                  }
                />
              </Routes>
            )}
          </div>
        </main>
      </div>
      <div className={toast ? 'toast' : ''} role="status" aria-live="polite">
        {toast}
      </div>
    </AdminContext.Provider>
  );
}
function Gate() {
  const { session, member, loading } = useAuth();
  return loading ? (
    <main className="login panel" role="status">
      正在验证登录身份…
    </main>
  ) : session && member ? (
    <Shell />
  ) : (
    <Login />
  );
}
export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
