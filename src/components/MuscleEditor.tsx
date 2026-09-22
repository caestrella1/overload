import { useState } from 'react';
import { MUSCLE_GROUPS, suggestMuscles } from '../domain/muscles';
import type { Exercise, MuscleAssignment, MuscleGroup } from '../domain/types';
import { MuscleSourceBadge } from './MuscleChips';
import { cx } from '../lib/cx';
import { Button } from './ui';

type Role = 'none' | 'primary' | 'secondary';

function roleOf(a: MuscleAssignment, m: MuscleGroup): Role {
  if (a.primary.includes(m)) return 'primary';
  if (a.secondary.includes(m)) return 'secondary';
  return 'none';
}

const NEXT: Record<Role, Role> = { none: 'primary', primary: 'secondary', secondary: 'none' };

/** Click a muscle to cycle: none → primary → secondary → none. */
export function MuscleEditor({
  exercise,
  onSave,
}: {
  exercise: Exercise;
  onSave: (muscles: MuscleAssignment) => void;
}) {
  const [draft, setDraft] = useState<MuscleAssignment>(exercise.muscles);
  const dirty = JSON.stringify(draft) !== JSON.stringify(exercise.muscles);
  const suggestion = suggestMuscles(exercise.name);

  const cycle = (m: MuscleGroup) => {
    const next = NEXT[roleOf(draft, m)];
    const primary = draft.primary.filter((x) => x !== m);
    const secondary = draft.secondary.filter((x) => x !== m);
    if (next === 'primary') primary.push(m);
    if (next === 'secondary') secondary.push(m);
    setDraft({ primary, secondary });
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-ink-2">
        <MuscleSourceBadge source={exercise.muscleSource} />
        <span>Click to cycle: primary → secondary → off.</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MUSCLE_GROUPS.map((m) => {
          const role = roleOf(draft, m);
          return (
            <button
              key={m}
              type="button"
              onClick={() => {
                cycle(m);
              }}
              aria-label={`${m}: ${role}`}
              className={cx(
                'rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                role === 'primary' && 'border-accent bg-accent text-accent-ink',
                role === 'secondary' && 'border-accent bg-accent/10 text-ink',
                role === 'none' && 'border-border text-ink-2 hover:bg-surface-2',
              )}
            >
              {m}
              {role === 'secondary' && <span className="ml-1 opacity-70">(2°)</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={!dirty && exercise.muscleSource === 'user'}
          onClick={() => {
            onSave(draft);
          }}
        >
          {dirty || exercise.muscleSource === 'user' ? 'Save muscles' : 'Confirm muscles'}
        </Button>
        {suggestion && (
          <Button
            variant="ghost"
            onClick={() => {
              setDraft(suggestion);
            }}
          >
            Use suggestion
          </Button>
        )}
        {dirty && (
          <Button
            variant="ghost"
            onClick={() => {
              setDraft(exercise.muscles);
            }}
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
