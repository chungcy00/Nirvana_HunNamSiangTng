import { useEffect, useRef, type ReactNode } from 'react';
import { SoldOutBadge } from './SoldOutBadge';
import { X } from 'lucide-react';

export function DesignImagePreview({ label, children, soldOut = false }: { label: string; children: ReactNode; soldOut?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousOverflow = useRef<string | undefined>(undefined);
  const restoreScroll = () => {
    if (dialog.current && previousOverflow.current !== undefined) {
      dialog.current.ownerDocument.body.style.overflow = previousOverflow.current;
      previousOverflow.current = undefined;
    }
  };
  useEffect(() => {
    const body = dialog.current?.ownerDocument.body;
    return () => {
      if (body && previousOverflow.current !== undefined) body.style.overflow = previousOverflow.current;
    };
  }, []);
  return <>
    <button type="button" className="fgp-design-photo fgp-general-image-trigger" aria-label={`查看设计大图：${label}`} aria-haspopup="dialog" onClick={() => {
      const modal = dialog.current;
      if (!modal || modal.open) return;
      previousOverflow.current = modal.ownerDocument.body.style.overflow;
      modal.showModal();
      modal.ownerDocument.body.style.overflow = 'hidden';
    }}>{children}{soldOut && <SoldOutBadge className="fgp-design-sold-badge"/>}</button>
    <dialog ref={dialog} className="fgp-gallery-dialog" aria-label={`${label}大图预览`} onClose={restoreScroll} onClick={event => {
      if (!(event.target as Element).closest('.fgp-gallery-dialog-image img')) dialog.current?.close();
    }}>
      <button type="button" className="fgp-gallery-close" aria-label="关闭大图预览" onClick={() => dialog.current?.close()}><X size={22} aria-hidden="true"/></button>
      <div className="fgp-gallery-dialog-image">{children}</div>
    </dialog>
  </>;
}
