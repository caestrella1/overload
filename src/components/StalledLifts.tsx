import { formatDate } from '../domain/dates';
import type { StalledLift } from '../domain/stalled';
import type { Unit } from '../domain/types';
import { formatNumber } from '../domain/units';
import { ExerciseLink } from './ExerciseLink';
import { Card, DataTable, Muted } from './ui';

/**
 * Lifts still in the rotation whose best estimated 1RM is a while behind them. Stated as
 * an observation, not a verdict: a plateau through a cut or a deload is expected.
 */
export function StalledLifts({
  lifts,
  unitFor,
  limit = 5,
}: {
  lifts: StalledLift[];
  unitFor: (exercise: string) => Unit;
  limit?: number;
}) {
  return (
    <Card
      title="Not moving lately"
      subtitle="Still being trained, but no new estimated 1RM in over six weeks."
    >
      {lifts.length ? (
        <DataTable
          minWidth={460}
          rows={lifts.slice(0, limit)}
          rowKey={(l) => l.exercise}
          columns={[
            {
              key: 'exercise',
              label: 'Exercise',
              render: (l) => <ExerciseLink name={l.exercise} />,
            },
            {
              key: 'best',
              label: 'Best e1RM',
              align: 'right',
              render: (l) => `${formatNumber(l.best)} ${unitFor(l.exercise)}`,
            },
            {
              key: 'when',
              label: 'Set on',
              align: 'right',
              className: 'text-ink-2',
              render: (l) => formatDate(l.bestDate),
            },
            {
              key: 'since',
              label: 'Since then',
              align: 'right',
              className: 'text-ink-2',
              render: (l) =>
                `${formatNumber(l.daysSince, 0)} days · ${formatNumber(l.sessionsSince, 0)} sessions`,
            },
          ]}
        />
      ) : (
        <Muted>Nothing has been stuck for long. Every lift has a recent best.</Muted>
      )}
    </Card>
  );
}
