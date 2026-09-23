import { useState } from 'react';
import { db } from '../../db/db';
import { deleteBodyweight, saveBodyweight } from '../../db/repo';
import { bodyweightChange, type BodyweightEntry } from '../../domain/bodyweight';
import { formatDate, toLocalString } from '../../domain/dates';
import type { Unit } from '../../domain/types';
import { formatNumber } from '../../domain/units';
import { useBodyweights, useSettings } from '../../hooks/useData';
import { CHART_PRIMARY } from '../../lib/colors';
import { TrendChart } from '../charts';
import { AddIcon, BodyweightIcon, DeleteIcon } from '../icons';
import { Button, Card, Muted, Segmented, TextInput } from '../ui';

const today = () => toLocalString(new Date()).slice(0, 10);

/**
 * Bodyweight belongs to you rather than to any workout, so it lives in settings. It is
 * what lets pull-ups, dips and assisted work report the load actually moved, instead of
 * only the plate hanging off you.
 */
export function ProfileCard() {
  const log = useBodyweights();
  const settings = useSettings();
  const [date, setDate] = useState(today);
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<Unit>(settings.defaultUnit);

  const value = Number(weight);
  const valid = weight.trim() !== '' && Number.isFinite(value) && value > 0;
  const summary = bodyweightChange(log);

  const add = () => {
    if (!valid) return;
    void saveBodyweight(db, { date, weight: value, unit });
    setWeight('');
  };

  const points = log.map((e) => ({ period: e.date, value: e.weight }));
  const recent = [...log].reverse().slice(0, 8);

  return (
    <Card
      icon={<BodyweightIcon />}
      title="Profile"
      subtitle="Your bodyweight over time. Used for pull-ups, dips and assisted lifts, so their charts show the weight you actually moved."
      actions={
        summary && (
          <span className="tabular text-sm text-ink-2">
            Latest {formatNumber(summary.latest.weight)} {summary.latest.unit}
            {summary.change !== 0 && (
              <>
                {' '}
                ({summary.change > 0 ? '+' : ''}
                {formatNumber(summary.change)} since {formatDate(summary.earliest.date)})
              </>
            )}
          </span>
        )
      }
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-ink">
          <span className="mb-1 block text-xs font-medium text-ink-2">Date</span>
          <TextInput
            label="Bodyweight date"
            type="date"
            value={date}
            max={today()}
            onChange={(e) => {
              setDate(e.target.value);
            }}
          />
        </label>
        <label className="text-sm text-ink">
          <span className="mb-1 block text-xs font-medium text-ink-2">Weight</span>
          <TextInput
            label="Bodyweight"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="1"
            value={weight}
            placeholder="180"
            className="w-24"
            onChange={(e) => {
              setWeight(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add();
            }}
          />
        </label>
        <Segmented<Unit>
          label="Bodyweight unit"
          value={unit}
          onChange={setUnit}
          options={[
            { id: 'lb', label: 'lb' },
            { id: 'kg', label: 'kg' },
          ]}
        />
        <Button variant="primary" disabled={!valid} onClick={add}>
          <AddIcon />
          {log.some((e) => e.date === date) ? 'Update' : 'Add'}
        </Button>
      </div>

      {log.length > 1 ? (
        <TrendChart
          series={[
            {
              id: 'bw',
              label: 'Bodyweight',
              color: CHART_PRIMARY,
              points,
            },
          ]}
          bucket="session"
          format={(v) => formatNumber(v, 1)}
          height={200}
        />
      ) : (
        <Muted>
          {log.length
            ? 'Log another day to see a trend.'
            : 'Nothing logged yet. Add today’s weight to get started.'}
        </Muted>
      )}

      {!!recent.length && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-ink">
            Recent entries ({log.length})
          </summary>
          <ul className="mt-2 divide-y divide-border">
            {recent.map((entry: BodyweightEntry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="text-sm text-ink">{formatDate(entry.date)}</span>
                <span className="tabular ml-auto text-sm text-ink-2">
                  {formatNumber(entry.weight)} {entry.unit}
                </span>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (entry.id != null) void deleteBodyweight(db, entry.id);
                  }}
                >
                  <DeleteIcon />
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
