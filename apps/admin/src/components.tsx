import { mapAdminPreviewProduct } from './previewModel';
import { DetailPreviewFrame } from './DetailPreviewFrame';
import { groupInclusions } from '../../../shared/inclusionGroups';
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
  className = '',
  title,
  children,
  onClose,
}: {
  className?: string;
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
      className={className}
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
export function Photo({
  image,
  className = 'thumb',
  showPlaceholder = true,
}: {
  image?: Row;
  className?: string;
  showPlaceholder?: boolean;
}) {
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
  ) : !showPlaceholder ? null : (
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
    [mode, setMode] = useState('public'),
    [width, setWidth] = useState('desktop');
  const product = mapAdminPreviewProduct(bundle, refs, { religion, offer, mode });
  return (
    <Modal className="product-preview-modal" title="预览产品" onClose={onClose}>
      <p className="help">
        预览使用当前尚未保存的表单资料，不会自动保存或发布；内容复用正式前台详情组件。
      </p>
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
              (r: Row) =>
                [
                  String(r.religion_id),
                  refs.religions.find((d) => d.id === r.religion_id)?.name || '未命名宗教',
                ] as [string, string],
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
        <Field
          label="预览宽度"
          value={width}
          onChange={setWidth}
          options={[
            ['desktop', '桌面'],
            ['mobile', '手机'],
          ]}
        />
      </div>
      <DetailPreviewFrame
        key={`${mode}:${religion}:${offer}`}
        product={product}
        mobile={width === 'mobile'}
        imageRenderer={(image) => (
          <Photo
            key={image.id}
            className="fgp-real-image"
            showPlaceholder={false}
            image={{
              id: image.id,
              storage_bucket: image.bucket,
              storage_path: image.path,
              alt_text: image.alt,
            }}
          />
        )}
      />
    </Modal>
  );
}
