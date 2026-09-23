import type { WorkoutSet } from '../domain/types';
import type { ParsedSet } from './types';

export interface ExistingSetRef {
  id: number;
  contentHash: string;
}

export interface ImportPlan {
  toAdd: ParsedSet[];
  /** Sets whose identity exists but whose values changed (edited in the source app). */
  toUpdate: { id: number; set: ParsedSet }[];
  duplicates: number;
}

/** Classifies incoming sets against what's stored, by identity key and content hash. */
export function planImport(
  incoming: ParsedSet[],
  existing: Map<string, ExistingSetRef>,
): ImportPlan {
  const plan: ImportPlan = { toAdd: [], toUpdate: [], duplicates: 0 };
  for (const set of incoming) {
    const found = existing.get(set.key);
    if (!found) plan.toAdd.push(set);
    else if (found.contentHash === set.contentHash) plan.duplicates++;
    else plan.toUpdate.push({ id: found.id, set });
  }
  return plan;
}

export interface SyncScope {
  /** Earliest date the incoming file covers; it is not authoritative before this. */
  from: string;
  /** Imports from the same source. Sets from other sources are never removed. */
  importIds: ReadonlySet<number>;
}

/**
 * Stored sets the incoming file speaks for: same source, and logged at or after the
 * file's first set. Anything older, or from another source, stays out of sync's reach.
 */
export function syncCandidates(stored: WorkoutSet[], scope: SyncScope): WorkoutSet[] {
  return stored.filter((s) => s.date >= scope.from && scope.importIds.has(s.importId));
}

/** Candidates the incoming file no longer contains — deleted in the source app. */
export function planSync(
  candidates: WorkoutSet[],
  incomingKeys: ReadonlySet<string>,
): WorkoutSet[] {
  return candidates.filter((s) => !incomingKeys.has(s.key));
}
