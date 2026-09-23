import { useState, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { buttonClasses, type ButtonVariant } from './buttonClasses';

interface PickerProps {
  accept: string;
  onFile: (file: File) => void;
}

function HiddenInput({ accept, onFile }: PickerProps) {
  return (
    <input
      type="file"
      accept={accept}
      className="sr-only"
      onChange={(e) => {
        const file = e.target.files?.[0];
        // Reset so choosing the same file again still fires onChange.
        e.target.value = '';
        if (file) onFile(file);
      }}
    />
  );
}

/** A button that opens a file chooser. */
export function FileButton({
  children,
  variant,
  ...picker
}: PickerProps & { children: ReactNode; variant?: ButtonVariant }) {
  return (
    <label className={buttonClasses(variant)}>
      {children}
      <HiddenInput {...picker} />
    </label>
  );
}

/** Large drop target that also opens a file chooser on click. */
export function FileDropzone({
  title,
  hint,
  ...picker
}: PickerProps & { title: ReactNode; hint?: ReactNode }) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => {
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) picker.onFile(file);
      }}
      className={cx(
        'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-within:border-accent',
        dragging ? 'border-accent bg-accent/5' : 'border-border hover:bg-surface-2',
      )}
    >
      <span className="text-sm font-medium text-ink">{title}</span>
      {hint && <span className="mt-1 text-xs text-ink-2">{hint}</span>}
      <HiddenInput {...picker} />
    </label>
  );
}
