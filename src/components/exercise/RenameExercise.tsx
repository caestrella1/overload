import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/db';
import { renameExercise } from '../../db/repo';
import type { Exercise } from '../../domain/types';
import { exercisePath, formatNumber } from '../../domain/units';
import { AliasIcon, EditIcon } from '../icons';
import { Button, ConfirmDialog, FieldRow, TextInput } from '../ui';

/**
 * Renaming to a name that already exists merges the two histories. Long logs collect
 * near-duplicates ("Bench Press" and "Bench Press (Barbell)") that split one lift in two.
 */
export function RenameExercise({
  exercise,
  names,
  setCount,
}: {
  exercise: Exercise;
  names: string[];
  setCount: number;
}) {
  const navigate = useNavigate();
  const [value, setValue] = useState(exercise.name);
  const [confirming, setConfirming] = useState(false);

  const target = value.trim();
  const changed = target !== '' && target !== exercise.name;
  const merging = names.includes(target) && target !== exercise.name;
  const listId = 'exercise-names';

  const apply = () => {
    setConfirming(false);
    void renameExercise(db, exercise.name, target).then(() => {
      void navigate(exercisePath(target), { replace: true });
    });
  };

  return (
    <>
      <FieldRow
        label="Name"
        hint="Renaming to an existing exercise merges the two, history and all."
      >
        <span className="flex flex-wrap items-center gap-2">
          <TextInput
            label="Exercise name"
            value={value}
            list={listId}
            className="w-56"
            onChange={(e) => {
              setValue(e.target.value);
            }}
          />
          <datalist id={listId}>
            {names.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <Button
            disabled={!changed}
            onClick={() => {
              setConfirming(true);
            }}
          >
            {merging ? <AliasIcon /> : <EditIcon />}
            {merging ? 'Merge' : 'Rename'}
          </Button>
        </span>
      </FieldRow>
      <ConfirmDialog
        open={confirming}
        title={merging ? `Merge into ${target}?` : `Rename to ${target}?`}
        confirmLabel={merging ? 'Merge' : 'Rename'}
        danger={merging}
        onCancel={() => {
          setConfirming(false);
        }}
        onConfirm={apply}
      >
        <p>
          {merging
            ? `${formatNumber(setCount, 0)} set(s) move onto "${target}" and the two histories become one. This can't be undone, though you can merge or rename again afterwards.`
            : `${formatNumber(setCount, 0)} set(s) move to the new name.`}
        </p>
        <p className="mt-2">
          Future imports that still use &quot;{exercise.name}&quot; will follow the change.
        </p>
      </ConfirmDialog>
    </>
  );
}
