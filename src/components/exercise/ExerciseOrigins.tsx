import { formatDate } from '../../domain/dates';
import type { SourceRef } from '../../domain/types';
import { useSourceLabels } from '../../hooks/useSourceLabels';
import { Muted } from '../ui';

/**
 * Where this exercise's data came from. A merged exercise lists every name it answers
 * to, so linking two sources never hides what the original app actually called them.
 */
export function ExerciseOrigins({ origins, current }: { origins: SourceRef[]; current: string }) {
  const label = useSourceLabels();
  if (!origins.length) return <Muted>No import history recorded.</Muted>;

  return (
    <ul className="space-y-1 text-sm">
      {origins.map((o) => (
        <li key={`${o.source}|${o.name}`} className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-ink">{label(o.source)}</span>
          <span className="text-ink-2">{o.name === current ? 'same name' : `as “${o.name}”`}</span>
          {o.firstSeen && (
            <span className="ml-auto text-xs text-ink-3">
              first seen {formatDate(o.firstSeen.slice(0, 19))}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
