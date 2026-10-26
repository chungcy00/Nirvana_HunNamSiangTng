import { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import type { PublicImage } from '../catalog/publicRepository';
import CatalogImage from '../catalog/PublicImage';
import type { PrototypeProduct } from './model';
import type { ImageRenderer } from './ProductPresentation';

export function GeneralProductGallery({ product, religion, imageRenderer }: {
  product: PrototypeProduct; religion: string; imageRenderer?: ImageRenderer;
}) {
  const [selected, setSelected] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const images = [...new Map([...(product.primaryImage ? [product.primaryImage] : []), ...(product.images || [])]
    .filter(image => image.image_type !== 'design' && (image.religion_id == null || !religion || String(image.religion_id) === religion))
    .map(image => [image.id, image])).values()];
  const active = images.find(image => String(image.id) === String(selected)) || images[0];
  const renderImage = (image: PublicImage) => imageRenderer ? imageRenderer(image) : <CatalogImage image={image}/>;
  useEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    const doc = modal.ownerDocument;
    let previousOverflow: string | undefined;
    const restore = () => {
      if (previousOverflow !== undefined) doc.body.style.overflow = previousOverflow;
      previousOverflow = undefined;
    };
    const lock = () => { if (modal.open && previousOverflow === undefined) { previousOverflow = doc.body.style.overflow; doc.body.style.overflow = 'hidden'; } };
    const observer = new MutationObserver(lock);
    observer.observe(modal, { attributes: true, attributeFilter: ['open'] });
    modal.addEventListener('close', restore);
    return () => { observer.disconnect(); modal.removeEventListener('close', restore); restore(); };
  }, [Boolean(active)]);
  return <section className="fgp-gallery" aria-label="产品图片">
    <div className="fgp-general-main-image">
      <div className="fgp-general-image-empty"><ImageIcon size={38} aria-hidden="true"/><span>{active ? '图片加载中或暂不可用' : '产品实拍待补充'}</span></div>
      {active && <button type="button" className="fgp-general-image-trigger" aria-label="查看产品大图" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>{renderImage(active)}</button>}
    </div>
    {images.length > 1 && <div className="fgp-gallery-thumbnails" role="group" aria-label="产品图片选择">
      {images.map((image, index) => <button type="button" key={image.id} aria-pressed={active.id === image.id} aria-label={`查看图片 ${index + 1}：${image.alt || product.name}`} onClick={() => setSelected(image.id)}>{renderImage(image)}</button>)}
    </div>}
    {active && <dialog ref={dialog} className="fgp-gallery-dialog" aria-label={`${product.name}大图预览`} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <button type="button" className="fgp-gallery-close" aria-label="关闭大图预览" onClick={() => dialog.current?.close()}><X size={22} aria-hidden="true"/></button>
      <div className="fgp-gallery-dialog-image">{renderImage(active)}</div>
    </dialog>}
  </section>;
}
