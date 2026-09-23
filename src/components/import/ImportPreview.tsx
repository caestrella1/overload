import { useState } from 'react';
import { formatDate } from '../../domain/dates';
import { formatNumber } from '../../domain/units';
import type { PreviewState } from '../../hooks/useImportFlow';
import { MuscleChips, MuscleSourceBadge } from '../MuscleChips';
import { Button, Callout, Card, Checkbox, StatGrid, StatTile } from '../ui';
import { SyncSection } from './SyncSection';

/** Names exactly what the button will do, so removals are never a surprise. */
function commitLabel(incoming: number, removing: number): string {
  const sets = (n: number) => `${formatNumber(n, 0)} set${n === 1 ? '' : 's'}`;
  if (incoming && removing) return `Import ${sets(incoming)}, remove ${formatNumber(removing, 0)}`;
  if (removing) return `Remove ${sets(removing)}`;
  return `Import ${sets(incoming)}`;
}

export function ImportPreview({
  state,
  onCommit,
  onCancel,
}: {
  state: PreviewState;
  onCommit: (options: { updateChanged: boolean; sync: boolean }) => void;
  onCancel: () => void;
}) {
  const [updateChanged, setUpdateChanged] = useState(true);
  // Off by default: removing data is never the automatic choice.
  const [sync, setSync] = useState(false);
  const { parsed, preview, fileName } = state;
  const { plan } = preview;
  const changed = plan.toUpdate.length;
  const removable = preview.sync.toRemove.length;
  const removing = sync ? removable : 0;
  const mapped = state.mappedWith ? ` \u00b7 mapped as ${state.mappedWith}` : '';
  const incoming = plan.toAdd.length + (updateChanged ? changed : 0);
  const nothingToDo = !incoming && !removing;
  const range = preview.dateRange
    ? ` · ${formatDate(preview.dateRange[0])} to ${formatDate(preview.dateRange[1])}`
    : '';

  return (
    <Card
      className="mb-6"
      title={`Preview: ${fileName}`}
      subtitle={`${formatNumber(parsed.rowCount, 0)} rows${range}${mapped}`}
    >
      <div className="space-y-3">
        {preview.sameFile && (
          <Callout tone="warning" title="You've imported this exact file before">
            {`"${preview.sameFile.fileName}" was imported on ${new Date(preview.sameFile.importedAt).toLocaleString()}. `}
            Sets already stored will be skipped.
          </Callout>
        )}
        {!incoming && !removable && (
          <Callout tone="info" title="Nothing new to import">
            Every set in this file is already stored.
          </Callout>
        )}
        {!incoming && removable > 0 && (
          <Callout tone="info" title="No new sets in this export">
            It differs from what&apos;s stored only by {formatNumber(removable, 0)} set(s) deleted
            in the source app.
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
        <StatTile
          compact
          label="Deleted in the app"
          value={formatNumber(preview.sync.toRemove.length, 0)}
        />
      </StatGrid>

      {changed > 0 && (
        <div className="mb-5">
          <Checkbox checked={updateChanged} onChange={setUpdateChanged}>
            Replace {changed} stored set(s) with this file&apos;s edited values
          </Checkbox>
        </div>
      )}

      <SyncSection sync={preview.sync} enabled={sync} onChange={setSync} />

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
          disabled={nothingToDo}
          onClick={() => {
            onCommit({ updateChanged, sync });
          }}
        >
          {commitLabel(incoming, removing)}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}
