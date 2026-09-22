import type { Exercise } from '../domain/types';
import { Badge } from './ui';

export function MuscleSourceBadge({ source }: { source: Exercise['muscleSource'] }) {
  if (source === 'user') return <Badge tone="good">Set by you</Badge>;
  if (source === 'source') return <Badge tone="accent">From import</Badge>;
  if (source === 'suggested') return <Badge tone="warning">Suggested</Badge>;
  return <Badge tone="critical">Unassigned</Badge>;
}

export function MuscleChips({ exercise }: { exercise: Exercise }) {
  const { primary, secondary } = exercise.muscles;
  if (!primary.length && !secondary.length) return <span className="text-sm text-ink-3">–</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {primary.map((m) => (
        <span key={m} className="rounded bg-accent/15 px-1.5 py-0.5 text-xs font-medium text-ink">
          {m}
        </span>
      ))}
      {secondary.map((m) => (
        <span
          key={m}
          className="rounded border border-border px-1.5 py-0.5 text-xs text-ink-2"
          title="Secondary"
        >
          {m}
        </span>
      ))}
    </span>
  );
}
