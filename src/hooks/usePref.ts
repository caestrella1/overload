import { useCallback, useState } from 'react';
import { readPref, writePref } from '../lib/storage';

/** useState that remembers its value in localStorage under `key`. */
export function usePref<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => readPref(key, initial));
  const update = useCallback(
    (v: T) => {
      setValue(v);
      writePref(key, v);
    },
    [key],
  );
  return [value, update];
}
