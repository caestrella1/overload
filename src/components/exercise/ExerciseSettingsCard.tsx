import { db } from '../../db/db';
import { updateExercise } from '../../db/repo';
import type { Exercise, Unit } from '../../domain/types';
import { MuscleEditor } from '../MuscleEditor';
import { Card, Checkbox, FieldRow, Select } from '../ui';

export function ExerciseSettingsCard({
  exercise,
  defaultUnit,
}: {
  exercise: Exercise;
  defaultUnit: Unit;
}) {
  const update = (patch: Partial<Exercise>) => void updateExercise(db, exercise.name, patch);
  return (
    <Card title="Exercise settings">
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
      <FieldRow label="Assisted" hint="Weight is assistance, so lower is better.">
        <Checkbox
          checked={exercise.assisted}
          onChange={(assisted) => {
            update({ assisted });
          }}
        >
          Assisted
        </Checkbox>
      </FieldRow>
      <h3 className="mt-4 mb-2 text-sm font-semibold text-ink">Muscle groups</h3>
      <MuscleEditor
        key={exercise.name}
        exercise={exercise}
        onSave={(muscles) => {
          update({ muscles, muscleSource: 'user' });
        }}
      />
    </Card>
  );
}
