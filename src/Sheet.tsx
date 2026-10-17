import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// A bottom sheet for phones: slides up from the bottom, closes on the backdrop, ✕ or Esc.
export default function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('sheet-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('sheet-open');
      before?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="backdrop bottom" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bsheet" role="dialog" aria-modal="true" aria-label={title} ref={box} tabIndex={-1}>
        <div className="grip" aria-hidden="true" />
        <header className="bsheet-head">
          <h2>{title}</h2>
          <button className="icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>
        <div className="bsheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
