import { useCallback, useState } from 'react';
import { readPref, writePref } from '../lib/storage';

export const ACCENTS = ['blue', 'green', 'red', 'pink', 'orange', 'yellow', 'purple'] as const;
export type Accent = (typeof ACCENTS)[number];

const DEFAULT: Accent = 'blue';

function isAccent(v: unknown): v is Accent {
  return ACCENTS.includes(v as Accent);
}

/**
 * Stamps data-accent on <html>. Blue is what :root already carries, so it clears the
 * stamp rather than setting one.
 */
function apply(accent: Accent) {
  const root = document.documentElement;
  if (accent === DEFAULT) delete root.dataset.accent;
  else root.dataset.accent = accent;
}

export function applyStoredAccent() {
  const stored = readPref<unknown>('accent', DEFAULT);
  apply(isAccent(stored) ? stored : DEFAULT);
}

export function useAccent(): [Accent, (a: Accent) => void] {
  const [accent, setAccent] = useState<Accent>(() => {
    const stored = readPref<unknown>('accent', DEFAULT);
    return isAccent(stored) ? stored : DEFAULT;
  });
  const update = useCallback((a: Accent) => {
    setAccent(a);
    writePref('accent', a);
    apply(a);
  }, []);
  return [accent, update];
}
