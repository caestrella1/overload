import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';
import { db } from '../db/db';
import { listProfiles } from '../db/repo';
import { IMPORTERS } from '../importers';
import { mappedSource } from '../importers/mapping';

/**
 * Turns a stored source id into something readable: "strong" is a built-in importer,
 * "custom:ab12cd34" is a saved column mapping the user named themselves.
 */
export function useSourceLabels(): (source: string) => string {
  const profiles = useLiveQuery(() => listProfiles(db), [], []);
  return useCallback(
    (source: string) => {
      const builtIn = IMPORTERS.find((i) => i.id === source);
      if (builtIn) return builtIn.label;
      const profile = profiles.find((p) => mappedSource(p.signature) === source);
      return profile?.name ?? (source === 'unknown' ? 'Unknown source' : source);
    },
    [profiles],
  );
}
