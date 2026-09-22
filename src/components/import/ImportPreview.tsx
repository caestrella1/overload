import { useState } from 'react';
import { formatDate } from '../../domain/dates';
import { formatNumber } from '../../domain/units';
import type { PreviewState } from '../../hooks/useImportFlow';
import { MuscleChips, MuscleSourceBadge } from '../MuscleChips';
import { Button, Callout, Card, Checkbox, StatGrid, StatTile } from '../ui';

export function ImportPreview({
  state,
  onCommit,
  onCancel,
}: {
  state: PreviewState;
  onCommit: (updateChanged: boolean) => void;
  onCancel: () => void;
}) {
  const [updateChanged, setUpdateChanged] = useState(true);
  const { parsed, preview, fileName } = state;
  const { plan } = preview;
  const changed = plan.toUpdate.length;
  const incoming = plan.toAdd.length + (updateChanged ? changed : 0);
  const range = preview.dateRange
    ? ` · ${formatDate(preview.dateRange[0])} to ${formatDate(preview.dateRange[1])}`
    : '';

  return (
    <Card
      className="mb-6"
      title={`Preview: ${fileName}`}
      subtitle={`${formatNumber(parsed.rowCount, 0)} rows${range}`}
    >
      <div className="space-y-3">
        {preview.sameFile && (
          <Callout tone="warning" title="You've imported this exact file before">
            {`"${preview.sameFile.fileName}" was imported on ${new Date(preview.sameFile.importedAt).toLocaleString()}. `}
            Sets already stored will be skipped.
          </Callout>
        )}
        {!incoming && (
          <Callout tone="info" title="Nothing new to import">
            Every set in this file is already stored.
          </Callout>
        )}
        {parsed.warnings.map((w) => (
          <Callout key={w} tone="warning" title={w} />
        ))}
      </div>

      <StatGrid className="my-5">
        <StatTile compact label="New sets" value={formatNumber(plan.toAdd.length, 0)} />
        <StatTile compact label="Already stored" value={formatNumber(plan.duplicates, 0)} />
        <StatTile compact label="Edited since last import" value={formatNumber(changed, 0)} />
        <StatTile compact label="New workouts" value={formatNumber(preview.newWorkouts, 0)} />
      </StatGrid>

      {changed > 0 && (
        <div className="mb-5">
          <Checkbox checked={updateChanged} onChange={setUpdateChanged}>
            Replace {changed} stored set(s) with this file&apos;s edited values
          </Checkbox>
        </div>
      )}

      {preview.newExercises.length > 0 && (
        <details className="mb-5" open={preview.newExercises.length <= 12}>
          <summary className="cursor-pointer text-sm font-medium text-ink">
            {preview.newExercises.length} new exercise(s) and their muscle groups
          </summary>
          <p className="mt-2 text-xs text-ink-2">
            Suggestions come from exercise names. Adjust them any time on the exercise page.
          </p>
          <ul className="mt-2 divide-y divide-border">
            {preview.newExercises.map((e) => (
              <li key={e.name} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                <span className="text-sm text-ink">{e.name}</span>
                <span className="flex items-center gap-2">
                  {e.muscles && <MuscleChips muscles={e.muscles} />}
                  <MuscleSourceBadge
                    source={e.fromSource ? 'source' : e.muscles ? 'suggested' : 'unassigned'}
                  />
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex gap-2">
        <Button
          variant="primary"
          disabled={!incoming}
          onClick={() => {
            onCommit(updateChanged);
          }}
        >
          Import {formatNumber(incoming, 0)} sets
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}
