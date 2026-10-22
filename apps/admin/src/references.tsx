import { useState } from 'react';
import { Field, Check, Modal } from './components';
import { rpc, errorText } from './client';
import { type Row, type DictionaryKind } from './types';
export function ReferenceDialog({
  kind,
  record,
  onClose,
  onSaved,
}: {
  kind: DictionaryKind;
  record?: Row;
  onClose: () => void;
  onSaved: (r: Row) => void;
}) {
  const [form, setForm] = useState<any>(
    record
      ? { ...record }
      : kind === 'series'
        ? {
            name: '',
            code: '',
            series_type: 'park',
            description: '',
            sort_order: 0,
            is_active: true,
          }
        : kind === 'religions'
          ? { name: '', code: '', is_active: true }
          : { content: '', sort_order: 0, is_active: true },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const update = (k: string, v: any) => setForm({ ...form, [k]: v });
  const title = { series: '园区／系列', religions: '宗教', notices: '通用价格备注' }[kind];
  const changed =
    JSON.stringify(form) !==
    JSON.stringify(
      record ||
        (kind === 'series'
          ? {
              name: '',
              code: '',
              series_type: 'park',
              description: '',
              sort_order: 0,
              is_active: true,
            }
          : kind === 'religions'
            ? { name: '', code: '', is_active: true }
            : { content: '', sort_order: 0, is_active: true }),
    );
  const close = () => {
    if (!busy && (!changed || window.confirm('填写内容尚未保存，是否放弃？'))) onClose();
  };
  return (
    <Modal title={`${record ? '编辑' : '新增'}${title}`} onClose={close}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            const keys =
              kind === 'series'
                ? ['name', 'code', 'series_type', 'description', 'sort_order', 'is_active']
                : kind === 'religions'
                  ? ['name', 'code', 'is_active']
                  : ['content', 'sort_order', 'is_active'];
            const values = Object.fromEntries(
              keys.map((k) => [k, typeof form[k] === 'string' ? form[k].trim() || null : form[k]]),
            );
            if (
              kind === 'notices'
                ? !values.content
                : !values.name || (kind === 'religions' && !values.code)
            )
              throw new Error('请填写全部必填资料。');
            if (kind !== 'religions' && !Number.isInteger(values.sort_order))
              throw new Error('排列顺序必须为整数。');
            const r = await rpc<Row>('admin_save_reference', {
              p_kind: kind,
              p_values: values,
              p_id: record ? String(record.id) : null,
              p_expected: record || null,
            });
            onSaved(r);
          } catch (e) {
            setError(errorText(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <fieldset disabled={busy}>
          <div className="fields">
            {kind !== 'notices' ? (
              <>
                <Field label="名称 · 必填" value={form.name} onChange={(v) => update('name', v)} />
                <Field
                  label={kind === 'religions' ? '宗教代码 · 必填' : '内部代码'}
                  value={form.code}
                  onChange={(v) => update('code', v)}
                  hint={
                    kind === 'religions'
                      ? '英文代码，例如 buddhism；保存后产品需单独关联。'
                      : undefined
                  }
                />
              </>
            ) : (
              <Field
                label="备注内容 · 必填"
                value={form.content}
                onChange={(v) => update('content', v)}
                type="textarea"
                wide
              />
            )}
            {kind === 'series' && (
              <>
                <Field
                  label="系列类型"
                  value={form.series_type}
                  onChange={(v) => update('series_type', v)}
                  options={[
                    ['park', '园区'],
                    ['hall', '殿堂'],
                    ['cemetery', '墓园'],
                    ['series', '系列'],
                  ]}
                />
                <Field
                  label="简介"
                  value={form.description}
                  onChange={(v) => update('description', v)}
                  type="textarea"
                  wide
                />
              </>
            )}
            {kind !== 'religions' && (
              <Field
                label="排列顺序"
                value={form.sort_order}
                onChange={(v) => update('sort_order', v)}
                type="number"
              />
            )}
            <Check label="启用" value={form.is_active} onChange={(v) => update('is_active', v)} />
          </div>
        </fieldset>
        <p className="help">
          {kind === 'series'
            ? '停用仅禁止新关联，已有产品不会自动隐藏。'
            : kind === 'religions'
              ? '新增后不会自动关联产品或公开；停用须满足已发布产品的完整性。'
              : '专属价格备注优先于通用备注，备注不参与金额计算。'}
        </p>
        <div className="row">
          <button type="button" onClick={close} disabled={busy}>
            取消
          </button>
          <button className="primary" disabled={busy}>
            {busy ? '正在保存…' : '保存' + title}
          </button>
        </div>
      </form>
    </Modal>
  );
}
