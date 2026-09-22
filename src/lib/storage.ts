/** localStorage wrappers for per-browser UI preferences; never for workout data. */
export function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`overload:${key}`);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writePref(key: string, value: unknown): void {
  try {
    localStorage.setItem(`overload:${key}`, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode); preference just won't persist.
  }
}
