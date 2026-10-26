import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GripVertical } from 'lucide-react';
import { useAdmin } from './context';
import { useAuth } from './auth';
import { rpc, errorText, copyProduct, removeUnreferenced } from './client';
import { Modal, Photo, Preview, Field } from './components';
import { priceLines } from './model';
import { type Bundle, type Row, categories, capacities, statuses, money } from './types';
export function ProductSort({
  category,
  onClose,
  onSaved,
}: {
  category: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [cat, setCat] = useState(category || 1),
    [rows, setRows] = useState<Row[]>([]),
    [baseline, setBaseline] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const changed = JSON.stringify(rows.map((x) => x.id)) !== baseline;
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    rpc<Row[]>('admin_category_order', { p_category: cat })
      .then((data) => {
        if (active) {
          setRows(data);
          setBaseline(JSON.stringify(data.map((x) => x.id)));
        }
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cat]);
  const close = () => {
    if (!busy && (!changed || window.confirm('排序尚未保存，是否放弃本次调整？'))) onClose();
  };
  function move(from: number, to: number) {
    if (busy || from < 0 || to < 0 || to >= rows.length) return;
    const next = [...rows];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setRows(next);
  }
  return (
    <Modal title="调整展示顺序" onClose={close}>
      <p className="help">
        各类别分别保存，显示该类别全部产品，包含草稿及隐藏产品，不受列表筛选影响。
      </p>
      <Field
        label="产品大类"
        value={cat}
        onChange={(v) => {
          if (!changed || window.confirm('当前类别排序未保存，是否放弃并切换？')) setCat(Number(v));
        }}
        options={categories.slice(1).map((n, i) => [String(i + 1), n])}
        disabled={busy}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">正在载入类别顺序…</p>
      ) : (
        <ol className="product-sort-list">
          {rows.map((r, i) => (
            <li
              className="product-sort-row"
              key={r.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                move(
                  rows.findIndex((x) => x.id === e.dataTransfer.getData('text/plain')),
                  i,
                );
              }}
            >
              <button
                className="sort-handle"
                draggable={!busy}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', r.id)}
                aria-label={`拖拽排序：${r.name || '未命名草稿'}`}
              >
                <GripVertical size={20} />
              </button>
              <span className="sort-position">{i + 1}</span>
              <div className="sort-product-name">
                <strong>{r.name || '未命名草稿'}</strong>
                <small>{statuses[r.publication_status]}</small>
              </div>
              <div className="row sort-move-buttons">
                <button disabled={!i || busy} onClick={() => move(i, i - 1)}>
                  上移
                </button>
                <button disabled={i === rows.length - 1 || busy} onClick={() => move(i, i + 1)}>
                  下移
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="row between sort-dialog-actions">
        <small>
          {changed ? '顺序有未保存调整' : '当前为已保存顺序'} · 共 {rows.length} 件
        </small>
        <div className="row">
          <button onClick={close} disabled={busy}>
            取消
          </button>
          <button
            className="primary"
            disabled={busy || loading || !rows.length || !changed}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                await rpc('admin_reorder_products', {
                  p_category: cat,
                  p_order: rows.map(({ id, updated_at }) => ({ id, updated_at })),
                });
                onSaved();
              } catch (e) {
                setError(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? '正在保存…' : '保存顺序'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
export default function Products() {
  const { refs, notify } = useAdmin(),
    { member } = useAuth(),
    navigate = useNavigate();
  const [category, setCategory] = useState(0),
    [query, setQuery] = useState(''),
    [series, setSeries] = useState(''),
    [status, setStatus] = useState(''),
    [page, setPage] = useState(1),
    [data, setData] = useState<{ items: Bundle[]; total: number }>({ items: [], total: 0 }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0),
    [newProduct, setNewProduct] = useState(false),
    [guide, setGuide] = useState(false),
    [newCategory, setNewCategory] = useState(1),
    [sort, setSort] = useState(false),
    [preview, setPreview] = useState<Bundle | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      rpc('admin_product_list', {
        p_query: query,
        p_category: category || null,
        p_series: series || null,
        p_status: status || null,
        p_page: page,
      })
        .then((result) => {
          if (active) {
            setData(result);
            setError('');
          }
        })
        .catch((e) => {
          if (active) setError(errorText(e));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, category, series, status, page, revision]);
  function filter(fn: () => void) {
    fn();
    setPage(1);
  }
  async function action(row: Bundle, type: string) {
    if (busy) return;
    if (type === 'preview') {
      setPreview(row);
      return;
    }
    if (
      !window.confirm(
        type === 'copy'
          ? '复制此产品为独立新草稿？图片将创建新的私有副本。'
          : type === 'delete'
            ? '确认永久删除从未发布的草稿？此操作无法撤销。'
            : type === 'hidden'
              ? '确认隐藏此产品？网站将无法读取。'
              : '确认发布此产品？数据库会验证全部发布条件。',
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      if (type === 'copy') {
        const result = await copyProduct(row.product.id, row.product.updated_at);
        notify('产品已复制为新草稿，所有公开开关已关闭。');
        navigate(`/products/${result.product.id}`);
        return;
      }
      if (type === 'delete') {
        await rpc('delete_draft', {
          p_id: row.product.id,
          p_expected_updated_at: row.product.updated_at,
        });
        try {
          await removeUnreferenced(row.product_images);
        } catch {
          notify('草稿已删除，无引用文件等待维护清理。');
        }
      } else
        await rpc('save_product', {
          p_id: row.product.id,
          p_expected_updated_at: row.product.updated_at,
          p_product: { publication_status: type },
        });
      setRevision((x) => x + 1);
      notify('操作已完成。');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="pagehead row between">
        <div>
          <h1>产品管理</h1>
          <p>管理独立产品、价格与公开内容。</p>
        </div>
        <div className="row">
          <button onClick={() => setGuide(true)}>添加与修改指引</button>
          {member?.role === 'admin' && <button onClick={() => setSort(true)}>调整展示顺序</button>}
          <button className="primary" onClick={() => setNewProduct(true)} disabled={busy}>
            新增产品
          </button>
        </div>
      </div>
      {guide && (
        <Modal title="添加与修改指引" onClose={() => setGuide(false)}>
          <ol>
            <li>
              添加产品：点击「新增产品」，选择类别后建立草稿，再依次填写资料、包含项目、价格和图片。
            </li>
            <li>修改产品：搜索名称或筛选类别，点击该产品右侧的「编辑」。</li>
            <li>
              核对并保存：在编辑页点击「预览」，再保存草稿；资料齐全后由管理员「保存并发布」。
            </li>
          </ol>
          <p className="help">编辑员只可修改草稿；已发布产品须由管理员修改。</p>
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              setGuide(false);
              setNewProduct(true);
            }}
          >
            开始新增产品
          </button>
        </Modal>
      )}
      <nav className="tabs" aria-label="产品类别">
        {categories.map((name, i) => (
          <button
            key={name}
            className={category === i ? 'active' : ''}
            aria-current={category === i ? 'page' : undefined}
            onClick={() => filter(() => setCategory(i))}
          >
            {name}
          </button>
        ))}
      </nav>
      <div className="filters">
        <label className="sr" htmlFor="productSearch">
          搜索名称或内部编号
        </label>
        <input
          id="productSearch"
          value={query}
          onChange={(e) => filter(() => setQuery(e.target.value))}
          placeholder="搜索名称或内部编号"
        />
        <select
          aria-label="按园区系列筛选"
          value={series}
          onChange={(e) => filter(() => setSeries(e.target.value))}
        >
          <option value="">全部园区／系列</option>
          {refs.series.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          aria-label="按发布状态筛选"
          value={status}
          onChange={(e) => filter(() => setStatus(e.target.value))}
        >
          <option value="">全部发布状态</option>
          {Object.entries(statuses).map(([v, n]) => (
            <option key={v} value={v}>
              {n}
            </option>
          ))}
        </select>
        <button
          onClick={() =>
            filter(() => {
              setQuery('');
              setSeries('');
              setStatus('');
            })
          }
        >
          重置筛选
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error} <button onClick={() => setRevision((x) => x + 1)}>重新读取</button>
        </p>
      )}
      <div aria-busy={loading} className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>主图</th>
              <th>产品</th>
              <th>类别／系列</th>
              <th>人数／宗教</th>
              <th>价格</th>
              <th>发布状态</th>
              <th>最后修改</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="empty" role="status">
                  正在读取产品…
                </td>
              </tr>
            ) : data.items.length ? (
              data.items.map((row) => (
                <tr key={row.product.id}>
                  <td>
                    <Photo image={row.product_images.find((r: Row) => r.is_primary)} />
                  </td>
                  <td className="name">
                    <div>
                      <strong>{row.product.name || '未命名草稿'}</strong>
                      <small>{row.product.product_code || '未填写内部编号'}</small>
                    </div>
                  </td>
                  <td>
                    {categories[row.product.category_id]}
                    <small>
                      {refs.series.find((x) => x.id === row.product.series_id)?.name || '—'}
                    </small>
                  </td>
                  <td>
                    {capacities[row.product.capacity_group || ''] || '—'}
                    <small>
                      {row.product_religions
                        .map((r: Row) => refs.religions.find((x) => x.id === r.religion_id)?.name)
                        .filter(Boolean)
                        .join('、') || '—'}
                    </small>
                  </td>
                  <td className="number">
                    {priceLines(row).length
                      ? priceLines(row).map((r: Row) => (
                          <div key={r.id}>
                            <small>{r.label}</small>
                            {money(r.price_amount)}
                            {row.product.category_id === 3 ? ' 起' : ''}
                          </div>
                        ))
                      : '待填写'}
                  </td>
                  <td>
                    <span className={`badge ${row.product.publication_status}`}>
                      {statuses[row.product.publication_status]}
                    </span>
                  </td>
                  <td>
                    <small>
                      {new Date(row.product.updated_at).toLocaleString('zh-CN', {
                        timeZone: 'Asia/Kuching',
                      })}
                    </small>
                  </td>
                  <td className="actions">
                    <button onClick={() => navigate(`/products/${row.product.id}`)}>
                      {member?.role === 'admin' || row.product.publication_status === 'draft'
                        ? '编辑'
                        : '查看'}
                    </button>
                    <button onClick={() => void action(row, 'preview')}>预览</button>
                    <button disabled={busy} onClick={() => void action(row, 'copy')}>
                      复制
                    </button>
                    {member?.role === 'admin' && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void action(
                            row,
                            row.product.publication_status === 'published' ? 'hidden' : 'published',
                          )
                        }
                      >
                        {row.product.publication_status === 'published' ? '隐藏' : '发布'}
                      </button>
                    )}
                    {row.product.publication_status === 'draft' && (
                      <button disabled={busy} onClick={() => void action(row, 'delete')}>
                        删除草稿
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="empty">
                  暂无符合条件的产品，可以调整筛选或新增草稿。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="footer row between">
        <span role="status">
          共 {data.total} 件产品 · 第 {page} 页
        </span>
        <div className="row">
          <button disabled={page === 1 || loading} onClick={() => setPage((p) => p - 1)}>
            上一页
          </button>
          <button
            disabled={page * 20 >= data.total || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      </div>
      {newProduct && (
        <Modal
          title="新增产品"
          onClose={() => {
            if (!busy) setNewProduct(false);
          }}
        >
          <p className="help">
            选择类别后建立真实草稿，系统自动生成唯一产品网址。名称、价格及图片可稍后填写。
          </p>
          <Field
            label="产品类别"
            value={newCategory}
            onChange={(v) => setNewCategory(Number(v))}
            options={categories.slice(1).map((n, i) => [String(i + 1), n])}
          />
          <div className="row">
            <button disabled={busy} onClick={() => setNewProduct(false)}>
              取消
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await rpc('save_product', {
                    p_product: { category_id: newCategory },
                  });
                  setNewProduct(false);
                  navigate(`/products/${result.id}`);
                } catch (e) {
                  setError(errorText(e));
                  setNewProduct(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? '正在建立…' : '建立草稿'}
            </button>
          </div>
        </Modal>
      )}
      {sort && (
        <ProductSort
          category={category}
          onClose={() => setSort(false)}
          onSaved={() => {
            setSort(false);
            setRevision((x) => x + 1);
            notify('此类别的展示顺序已保存。');
          }}
        />
      )}
      {preview && <Preview bundle={preview} refs={refs} onClose={() => setPreview(null)} />}
    </>
  );
}
