import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from '../../lib/cx';

/**
 * Built on <dialog>, so focus trapping, Esc and the backdrop come from the browser.
 * Clicking outside closes it: the backdrop is part of the dialog element, so a click
 * whose target is the dialog itself landed on the backdrop rather than the panel.
 */
export function Modal({
  open,
  title,
  children,
  onClose,
  className,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cx(
        'm-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface text-ink backdrop:bg-black/50',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="focus-ring -m-1 rounded-full p-1 text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* Contents exist only while open, so a closed modal leaves no stale draft or hidden copy of the page's text behind. */}
      <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto px-5 py-4">{open && children}</div>
    </dialog>
  );
}
