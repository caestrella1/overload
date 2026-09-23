import type { Confidence, MuscleAssignment, MuscleSource } from '../domain/types';
import { Badge, type Tone } from './ui';

const SOURCE_BADGES: Record<MuscleSource, { tone: Tone; label: string }> = {
  user: { tone: 'good', label: 'Set by you' },
  source: { tone: 'accent', label: 'From import' },
  suggested: { tone: 'warning', label: 'Suggested' },
  unassigned: { tone: 'critical', label: 'Unassigned' },
};

/** The tone says how much to trust the guess; the word "Suggested" says nobody has accepted it. */
const CONFIDENCE_BADGES: Record<Confidence, { tone: Tone; label: string }> = {
  high: { tone: 'good', label: 'Suggested · confident' },
  medium: { tone: 'warning', label: 'Suggested · likely' },
  low: { tone: 'critical', label: 'Suggested · unsure' },
};

/**
 * A suggestion's badge reflects how much to trust it; anything else names where the
 * assignment came from.
 */
export function MuscleSourceBadge({
  source,
  confidence,
}: {
  source: MuscleSource;
  confidence?: Confidence | null;
}) {
  const b =
    source === 'suggested' && confidence ? CONFIDENCE_BADGES[confidence] : SOURCE_BADGES[source];
  return <Badge tone={b.tone}>{b.label}</Badge>;
}

/** Primary muscles filled, secondary outlined. */
export function MuscleChips({ muscles }: { muscles: MuscleAssignment }) {
  const { primary, secondary } = muscles;
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
