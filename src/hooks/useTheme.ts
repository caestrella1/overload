import { useCallback, useState } from 'react';
import { readPref, writePref } from '../lib/storage';

export type ThemePref = 'system' | 'light' | 'dark';

function apply(theme: ThemePref) {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export function applyStoredTheme() {
  apply(readPref<ThemePref>('theme', 'system'));
}

export function useTheme(): [ThemePref, (t: ThemePref) => void] {
  const [theme, setTheme] = useState<ThemePref>(() => readPref<ThemePref>('theme', 'system'));
  const update = useCallback((t: ThemePref) => {
    setTheme(t);
    writePref('theme', t);
    apply(t);
  }, []);
  return [theme, update];
}
