import { useCallback, useState } from 'react';
import { readPref, writePref } from '../lib/storage';

export type ThemePref = 'system' | 'light' | 'dark';

/**
 * Stamps data-theme on <html> for an explicit choice. For "system" it only removes a stamp
 * this app set, so a host page's own theme stamp (e.g. an embedding viewer) is left alone.
 */
function apply(theme: ThemePref) {
  const root = document.documentElement;
  if (theme === 'system') {
    if (root.dataset.themeSource === 'app') {
      delete root.dataset.theme;
      delete root.dataset.themeSource;
    }
    return;
  }
  root.dataset.theme = theme;
  root.dataset.themeSource = 'app';
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
