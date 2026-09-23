import type { Exercise, MuscleAssignment } from '../types';
import { CATALOG, catalogMuscles, isStrongMatch, matchCatalog, type CatalogEntry } from './match';

const BY_ID = new Map(CATALOG.entries.map((e) => [e.id, e]));

export function catalogEntry(id: string | null | undefined): CatalogEntry | null {
  return id ? (BY_ID.get(id) ?? null) : null;
}

export interface CatalogReference {
  entry: CatalogEntry;
  /**
   * True when the exercise carries this entry's id — a suggestion recorded the link.
   * False when nothing was recorded and this is only the closest name in the catalogue,
   * which is worth showing but not worth trusting the same way.
   */
  linked: boolean;
  /** Whether the muscles the app is using match the catalogue's for this entry. */
  agrees: boolean;
}

const sameMuscles = (a: MuscleAssignment, b: MuscleAssignment) => {
  const key = (m: MuscleAssignment) =>
    `${[...m.primary].sort().join('+')}|${[...m.secondary].sort().join('+')}`;
  return key(a) === key(b);
};

/**
 * The catalogue entry to show for an exercise. A recorded link wins; otherwise a strong
 * name match stands in, so an exercise whose muscles came from the import or from the user
 * still gets its reference card.
 */
export function catalogReferenceFor(exercise: Exercise): CatalogReference | null {
  const linkedEntry = catalogEntry(exercise.catalogId);
  const entry = linkedEntry ?? pickByName(exercise.name);
  if (!entry) return null;
  return {
    entry,
    linked: linkedEntry !== null,
    agrees: sameMuscles(exercise.muscles, catalogMuscles(entry)),
  };
}

function pickByName(name: string): CatalogEntry | null {
  const match = matchCatalog(name);
  return match && isStrongMatch(match) ? match.entry : null;
}
