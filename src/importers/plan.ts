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
