import { catalogMuscles, isStrongMatch, matchCatalog, type CatalogMatch } from './catalog/match';
import { suggestMuscles } from './muscles';
import type { Confidence, MuscleAssignment, MuscleGroup } from './types';

/**
 * Confidence bands, defined in domain/types.ts:
 * - high: the catalogue and our own name rules independently agree
 * - medium: only one of them had anything to say, and it looked solid
 * - low: they disagree, or the match was weak — worth a human glance
 */

export interface Suggestion {
  muscles: MuscleAssignment;
  confidence: Confidence;
  /** Catalogue entry the muscles came from, when one was used. */
  catalogId: string | null;
  /** Human-readable account of how this was decided. */
  reason: string;
  /** The other candidate, when the two methods disagreed. */
  alternative: MuscleAssignment | null;
}

function samePrimary(a: MuscleAssignment, b: MuscleAssignment): boolean {
  const key = (m: MuscleGroup[]) => [...m].sort().join('+');
  return key(a.primary) === key(b.primary);
}

/**
 * Merges the two suggestions: primary muscles from the catalogue, secondary muscles
 * from both, since our rules are thin on secondaries and the catalogue is not.
 */
function combine(catalog: MuscleAssignment, rules: MuscleAssignment): MuscleAssignment {
  const primary = catalog.primary;
  const secondary = [...new Set([...catalog.secondary, ...rules.secondary])].filter(
    (m) => !primary.includes(m),
  );
  return { primary, secondary };
}

function describe(match: CatalogMatch): string {
  return `matched “${match.entry.name}” in the exercise catalogue`;
}

/**
 * Suggests muscle groups for an exercise name, from the bundled catalogue and our own
 * keyword rules. Two independent methods agreeing is much better evidence than either
 * alone, so the confidence reflects whether they did.
 */
export function suggestForName(name: string): Suggestion | null {
  const match = matchCatalog(name);
  const rules = suggestMuscles(name);
  const catalog = match ? catalogMuscles(match.entry) : null;

  if (match && catalog) {
    const solid = isStrongMatch(match);

    if (rules && samePrimary(catalog, rules)) {
      return {
        muscles: combine(catalog, rules),
        confidence: 'high',
        catalogId: match.entry.id,
        reason: `${describe(match)}, and the name rules agree`,
        alternative: null,
      };
    }
    if (rules) {
      // A disagreement is the signal that caught every bad match during testing.
      return {
        muscles: solid ? catalog : rules,
        confidence: 'low',
        catalogId: solid ? match.entry.id : null,
        reason: `${describe(match)}, but the name rules suggest ${rules.primary.join(', ') || 'something else'}`,
        alternative: solid ? rules : catalog,
      };
    }
    return {
      muscles: catalog,
      confidence: solid ? 'medium' : 'low',
      catalogId: match.entry.id,
      reason: solid ? describe(match) : `${describe(match)}, but only loosely`,
      alternative: null,
    };
  }

  if (rules) {
    return {
      muscles: rules,
      confidence: 'medium',
      catalogId: null,
      reason: 'recognised from the exercise name',
      alternative: null,
    };
  }
  return null;
}
