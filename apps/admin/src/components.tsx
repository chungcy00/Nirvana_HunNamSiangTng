import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { supabase } from './client';
import { type Row, type Bundle, type References, money, tableFor, capacities } from './types';
import { priceLines } from './model';
export function Field({
  label,
  value,
  onChange,
  type = 'text',
  hint,
  options,
  wide = false,
  disabled = false,
}: {
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: string;
  hint?: string;
  options?: [string, string][];
  wide?: boolean;
  disabled?: boolean;
}) {
  const input = options ? (
    <select
      aria-label={label}
      disabled={disabled}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map(([v, n]) => (
        <option key={v} value={v}>
          {n}
        </option>
      ))}
    </select>
  ) : type === 'textarea' ? (
    <textarea
      aria-label={label}
      disabled={disabled}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  ) : (
    <input
      aria-label={label}
      disabled={disabled}
      type={type}
      step={type === 'number' ? 'any' : undefined}
      value={value ?? ''}
      onChange={(e) =>
        onChange(
          type === 'number'
            ? e.target.value === ''
              ? null
              : Number(e.target.value)
            : e.target.value,
        )
      }
    />
  );
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      {input}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Check({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="check">
      <input
        disabled={disabled}
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="dialoghead row between">
        <h2>{title}</h2>
        <button aria-label="关闭窗口" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="dialogbody">{children}</div>
    </dialog>
  );
}
export function Photo({ image, className = 'thumb' }: { image?: Row; className?: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let active = true,
      url = '';
    setSrc('');
    if (image && supabase)
      supabase.storage
        .from(image.storage_bucket)
        .download(image.storage_path)
        .then(({ data }) => {
          if (data && active) {
            url = URL.createObjectURL(data);
            setSrc(url);
          }
        });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [image?.storage_bucket, image?.storage_path]);
  return src ? (
    <img className={className} src={src} alt={image?.alt_text || '产品图片'} />
  ) : (
    <div
      className={`${className} photo-empty`}
      role="img"
      aria-label={image ? '图片暂不可读取' : '暂无产品图片'}
    >
      <ImageIcon size={22} />
    </div>
  );
}
export function Preview({
  bundle,
  refs,
  onClose,
}: {
  bundle: Bundle;
  refs: References;
  onClose: () => void;
}) {
  const [religion, setReligion] = useState(''),
    [offer, setOffer] = useState(''),
    [mode, setMode] = useState('public');
  const p = bundle.product;
  const religious = (id: number | null) =>
    !id ||
    (bundle.product_religions.some(
      (x: Row) => x.religion_id === id && (mode === 'all' || x.is_published),
    ) &&
      (!religion || String(id) === religion));
  const visible = (r: Row) => {
    const offer = r.offer_id ? bundle.product_offers.find((x: Row) => x.id === r.offer_id) : null;
    return (
      (mode === 'all' || r.is_published !== false) &&
      religious(r.religion_id) &&
      (!r.offer_id ||
        (offer && (mode === 'all' || offer.is_active) && religious(offer.religion_id)))
    );
  };
  const attributes = bundle[tableFor(p.category_id)]?.[0] || {};
  const attrLabels: Record<string, string> = {
    facing: '朝向',
    area_sqft: '面积（sqft）',
    theme_name: '产品主题',
    niche_style: '款式',
    placement_type: '安放环境',
    duration_days: '服务天数',
    duration_nights: '服务夜数',
    service_venue: '服务地点',
    terms_summary: '适用条件',
    tablet_type: '牌位类型',
    fengshui_type: '生基类型',
    pet_size_class: '宠物规格',
  };
  const lines = priceLines(bundle)
    .filter(visible)
    .filter((r: Row) => !offer || r.offer_id === offer);
  const images = bundle.product_images
    .filter(visible)
    .filter((r: Row) => r.storage_bucket !== 'catalog-media-restricted');
  const inclusions = bundle.product_inclusions.filter(
    (r: Row) => visible(r) && (!offer || !r.offer_id || r.offer_id === offer),
  );
  const primary = images.find((r: Row) => r.is_primary);
  const name = (r: Row) => refs.religions.find((x) => x.id === r.religion_id)?.name;
  return (
    <Modal title="预览产品" onClose={onClose}>
      <p className="help">预览使用当前表单资料，不会自动保存或发布。</p>
      <div className="row preview-filters">
        <Field
          label="预览范围"
          value={mode}
          onChange={setMode}
          options={[
            ['public', '拟公开内容'],
            ['all', '后台全部配置'],
          ]}
        />
        <Field
          label="宗教"
          value={religion}
          onChange={setReligion}
          options={[
            ['', '全部适用宗教'],
            ...bundle.product_religions.map(
              (r: Row) => [String(r.religion_id), name(r)] as [string, string],
            ),
          ]}
        />
        <Field
          label="方案"
          value={offer}
          onChange={setOffer}
          options={[
            ['', '全部方案'],
            ...bundle.product_offers.map(
              (o: Row) => [o.id, o.name || '默认方案'] as [string, string],
            ),
          ]}
        />
      </div>
      <div className="previewgrid">
        <div className="previewcard">
          {p.category_id !== 4 && <Photo image={primary} className="preview-photo" />}
          <article>
            <h2>{p.name || '未命名草稿'}</h2>
            <p>{p.subtitle}</p>
            <div className="row">
              {p.capacity_group && <span className="badge">{capacities[p.capacity_group]}</span>}
              {bundle.product_religions.filter(visible).map((r: Row) => (
                <span className="badge" key={r.id}>
                  {name(r)}
                </span>
              ))}
            </div>
            {lines.length ? (
              lines.map((r: Row) => (
                <p className="price" key={r.id}>
                  <small>{r.label}</small>
                  <br />
                  {money(r.price_amount)}
                  {p.category_id === 3 ? ' 起' : ''}
                </p>
              ))
            ) : (
              <p className="notice">暂无符合当前预览条件的公开价格。</p>
            )}
          </article>
        </div>
        <section className="previewdetail">
          <h2>{p.name || '未命名草稿'}</h2>
          <p>{p.description}</p>
          <dl className="preview-attributes">
            {Object.entries(attrLabels)
              .filter(
                ([key]) =>
                  attributes[key] !== null &&
                  attributes[key] !== undefined &&
                  attributes[key] !== '',
              )
              .map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>
                    {key === 'placement_type'
                      ? ({ indoor: '室内', outdoor: '室外' } as Record<string, string>)[
                          attributes[key]
                        ]
                      : attributes[key]}
                  </dd>
                </div>
              ))}
          </dl>
          <h3>包含项目</h3>
          {inclusions.length ? (
            <ul>
              {inclusions.map((r: Row) => (
                <li key={r.id}>
                  {r.item_name}
                  {r.quantity ? ` × ${r.quantity}${r.unit || ''}` : ''}
                  {r.religion_id ? `（${name(r)}）` : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p className="help">暂无符合当前预览条件的包含项目。</p>
          )}
          {p.category_id !== 4 && <>
          <h3>产品与设计图片</h3>
          {images.length ? (
            <div className="preview-images">
              {images.map((r: Row) => (
                <figure key={r.id}>
                  <Photo image={r} className="preview-photo" />
                  <figcaption>{r.design_name || r.alt_text}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className="help">暂无符合当前预览条件的产品与设计图片。</p>
          )}
          </>}
          <p className="help">
            {p.price_note_override ||
              refs.notices
                .filter((x) => x.is_active)
                .map((x) => x.content)
                .join(' ')}
          </p>
        </section>
      </div>
    </Modal>
  );
}
