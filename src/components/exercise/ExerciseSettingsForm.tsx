import { db } from '../../db/db';
import { updateExercise } from '../../db/repo';
import type { Exercise, Unit } from '../../domain/types';
import { MuscleEditor } from '../MuscleEditor';
import { ExerciseOrigins } from './ExerciseOrigins';
import { RenameExercise } from './RenameExercise';
import { Checkbox, FieldRow, Select, TextInput } from '../ui';

export function ExerciseSettingsForm({
  exercise,
  defaultUnit,
  hasBodyweightLog,
  names,
  setCount,
}: {
  exercise: Exercise;
  defaultUnit: Unit;
  /** Bodyweight options only do something once some bodyweight is logged. */
  hasBodyweightLog: boolean;
  /** Every exercise name, for the rename field's suggestions. */
  names: string[];
  setCount: number;
}) {
  const update = (patch: Partial<Exercise>) => void updateExercise(db, exercise.name, patch);
  return (
    <div>
      <RenameExercise exercise={exercise} names={names} setCount={setCount} />
      <FieldRow label="Weights logged in" hint="Charts for this exercise use this unit.">
        <Select<'default' | Unit>
          label="Weight unit"
          value={exercise.unit ?? 'default'}
          onChange={(v) => {
            update({ unit: v === 'default' ? null : v });
          }}
          options={[
            { id: 'default', label: `Default (${defaultUnit})` },
            { id: 'lb', label: 'lb' },
            { id: 'kg', label: 'kg' },
          ]}
        />
      </FieldRow>
      <FieldRow label="Assisted" hint="Logged weight is assistance taken off, not load added.">
        <Checkbox
          checked={exercise.assisted}
          onChange={(assisted) => {
            update({ assisted });
          }}
        >
          Assisted
        </Checkbox>
      </FieldRow>
      <FieldRow
        label="Carries bodyweight"
        hint={
          hasBodyweightLog
            ? 'Adds your logged bodyweight to this lift, or subtracts the assistance.'
            : 'Log your bodyweight on the dashboard for this to affect the charts.'
        }
      >
        <Checkbox
          checked={exercise.bodyweight}
          onChange={(bodyweight) => {
            update({ bodyweight });
          }}
        >
          Bodyweight lift
        </Checkbox>
      </FieldRow>
      {exercise.bodyweight && (
        <FieldRow
          label="Share of bodyweight moved"
          hint="A pull-up is all of it; a push-up is roughly two thirds. Your call."
        >
          <span className="flex items-center gap-1">
            <TextInput
              label="Bodyweight percentage"
              type="number"
              inputMode="numeric"
              min="1"
              max="100"
              step="1"
              className="w-20"
              value={String(Math.round(exercise.bodyweightFactor * 100))}
              onChange={(e) => {
                const percent = Number(e.target.value);
                if (percent > 0 && percent <= 100) update({ bodyweightFactor: percent / 100 });
              }}
            />
            <span className="text-sm text-ink-2">%</span>
          </span>
        </FieldRow>
      )}
      <h3 className="mt-4 mb-2 text-sm font-semibold text-ink">Imported from</h3>
      <ExerciseOrigins origins={exercise.origins} current={exercise.name} />

      <h3 className="mt-4 mb-2 text-sm font-semibold text-ink">Muscle groups</h3>
      <MuscleEditor
        key={exercise.name}
        exercise={exercise}
        onSave={(muscles) => {
          update({ muscles, muscleSource: 'user' });
        }}
      />
    </div>
  );
}
