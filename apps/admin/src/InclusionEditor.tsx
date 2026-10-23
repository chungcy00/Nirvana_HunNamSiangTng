import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { groupInclusions } from '../../../shared/inclusionGroups';
import { Field } from './components';
import { uuid } from './model';
import type { Row } from './types';

export function InclusionEditor({
  rows,
  productId,
  onChange,
  religions,
  offers,
  religious,
}: {
  rows: Row[];
  productId: string;
  onChange: (rows: Row[]) => void;
  religions: [string, string][];
  offers: [string, string][];
  religious: boolean;
}) {
  const groups = groupInclusions(rows, (r) => r.group_title);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const save = (next: Row[]) => onChange(next.map((r, i) => ({ ...r, sort_order: i })));
  const add = (title: string) =>
    save([
      ...rows,
      {
        id: uuid(),
        product_id: productId,
        group_title: title || null,
        item_name: '',
        quantity: null,
        unit: '',
        description: '',
        religion_id: null,
        offer_id: null,
      },
    ]);
  const update = (id: string, field: string, value: unknown) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  const newGroup = () => {
    let title = '新子标题',
      n = 2;
    while (groups.some((g) => g.title === title)) title = `新子标题 ${n++}`;
    add(title);
  };
  const moveGroup = (index: number, to: number) => {
    const next = [...groups];
    next.splice(to, 0, next.splice(index, 1)[0]);
    save(next.flatMap((g) => g.items));
  };
  const moveItem = (items: Row[], from: number, to: number) => {
    const next = [...items];
    next.splice(to, 0, next.splice(from, 1)[0]);
    let at = 0;
    const ids = new Set(items.map((r) => r.id));
    save(rows.map((r) => (ids.has(r.id) ? next[at++] : r)));
  };
  return (
    <section className="panel">
      <div className="row between">
        <h2>包含项目</h2>
        <div className="row">
          <button onClick={newGroup}>添加子标题</button>
          <button onClick={() => add('')}>添加未分组明细</button>
        </div>
      </div>
      <p className="help">
        “包含项目”总标题保持不变。展开子标题可编辑所属明细；未分组的旧项目仍正常展示。移动子标题会同时移动该组明细。
      </p>
      {groups.map((group, gi) => (
        <details
          className="inclusion-editor-group"
          key={group.items[0].id}
          open={group.items.some((r) => expanded.has(r.id))}
          onToggle={(event) => {
            const open = event.currentTarget.open;
            setExpanded((previous) => {
              const next = new Set(previous);
              group.items.forEach((r) => (open ? next.add(r.id) : next.delete(r.id)));
              return next;
            });
          }}
        >
          <summary>
            {group.title || '未分组项目'}（{group.items.length}项）
          </summary>
          <div className="row between">
            <div className="row">
              <button
                aria-label={`子标题${gi + 1}上移`}
                disabled={gi === 0}
                onClick={() => moveGroup(gi, gi - 1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                aria-label={`子标题${gi + 1}下移`}
                disabled={gi === groups.length - 1}
                onClick={() => moveGroup(gi, gi + 1)}
              >
                <ArrowDown size={16} />
              </button>
            </div>
            <button onClick={() => add(group.title)}>添加本组明细</button>
          </div>
          <Field
            label="子标题（留空则不分组）"
            value={group.items[0].group_title || ''}
            onChange={(value) => {
              const ids = new Set(group.items.map((r) => r.id));
              onChange(rows.map((r) => (ids.has(r.id) ? { ...r, group_title: value || null } : r)));
            }}
          />
          {group.items.map((r, i) => (
            <div className="entry" key={r.id}>
              <div className="row between">
                <strong>明细 {i + 1}</strong>
                <div className="row">
                  <button
                    aria-label={`明细${i + 1}上移`}
                    disabled={i === 0}
                    onClick={() => moveItem(group.items, i, i - 1)}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    aria-label={`明细${i + 1}下移`}
                    disabled={i === group.items.length - 1}
                    onClick={() => moveItem(group.items, i, i + 1)}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button onClick={() => save(rows.filter((x) => x.id !== r.id))}>删除明细</button>
                </div>
              </div>
              <div className="fields">
                <Field
                  label="项目名称"
                  value={r.item_name}
                  onChange={(v) => update(r.id, 'item_name', v)}
                />
                <Field
                  label="数量"
                  value={r.quantity}
                  type="number"
                  onChange={(v) => update(r.id, 'quantity', v)}
                />
                <Field label="单位" value={r.unit} onChange={(v) => update(r.id, 'unit', v)} />
                <Field
                  label="说明"
                  value={r.description}
                  type="textarea"
                  onChange={(v) => update(r.id, 'description', v)}
                />
                {religious && (
                  <Field
                    label="适用宗教"
                    value={r.religion_id}
                    options={religions}
                    onChange={(v) => update(r.id, 'religion_id', v === '' ? null : Number(v))}
                  />
                )}
                <Field
                  label="适用方案"
                  value={r.offer_id}
                  options={offers}
                  onChange={(v) => update(r.id, 'offer_id', v || null)}
                />
              </div>
            </div>
          ))}
        </details>
      ))}
    </section>
  );
}
