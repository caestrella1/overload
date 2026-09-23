import { useMemo } from 'react';
import { parseMapped } from '../../importers';
import type { DateOrder } from '../../importers/dates';
import { MAPPED_FIELDS, mappedSource, missingRequired } from '../../importers/mapping';
import type { MappingState } from '../../hooks/useImportFlow';
import type { Unit } from '../../domain/types';
import { formatDate } from '../../domain/dates';
import { formatNumber } from '../../domain/units';
import { Button, Callout, Card, DataTable, Muted, Segmented, Select, TextInput } from '../ui';

const UNMAPPED = '';
const PREVIEW_ROWS = 5;

const DATE_ORDERS: { id: DateOrder; label: string }[] = [
  { id: 'ymd', label: 'Y-M-D' },
  { id: 'mdy', label: 'M/D/Y' },
  { id: 'dmy', label: 'D/M/Y' },
];

/**
 * Column mapping for a CSV the app has no built-in importer for. Everything is shown
 * against real rows from the file, so a wrong guess is visible before anything is stored.
 */
export function MappingStep({
  state,
  onChange,
  onApply,
  onCancel,
}: {
  state: MappingState;
  onChange: (patch: Partial<MappingState['draft']>) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const { file, draft } = state;
  const missing = missingRequired(draft.map);

  // Parse a slice of the file so the preview reacts to every change immediately.
  const sample = useMemo(
    () =>
      parseMapped(file.rows.slice(0, 200), {
        map: draft.map,
        unit: draft.unit,
        dateOrder: draft.dateOrder,
        source: mappedSource(file.signature),
      }),
    [file, draft],
  );
  const rows = sample.sets.slice(0, PREVIEW_ROWS);
  const columnOptions = [
    { id: UNMAPPED, label: '— not in this file —' },
    ...file.headers.map((h) => ({ id: h, label: h })),
  ];

  return (
    <Card
      className="mb-6"
      title={`Map the columns in ${state.fileName}`}
      subtitle={`${formatNumber(file.rows.length, 0)} rows, ${file.headers.length} columns. This layout isn't one the app knows, so tell it what each column holds — it only has to be done once per app.`}
    >
      {file.wide && (
        <Callout className="mb-4" tone="critical" title="This file has one row per workout">
          Its sets live in numbered columns like &quot;Set 1 Weight&quot;. Only files with one row
          per set can be mapped.
        </Callout>
      )}
      {!!file.errors.length && (
        <Callout className="mb-4" tone="warning" title="The file has some malformed rows">
          {file.errors.join(' ')}
        </Callout>
      )}
      {state.ambiguousDate && (
        <Callout className="mb-4" tone="warning" title="Check the date order">
          Every date in this file reads either way (day first or month first). Check the preview
          below and switch the order if the dates look wrong.
        </Callout>
      )}

      <div className="mb-5 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {MAPPED_FIELDS.map((field) => (
          <div
            key={field.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2"
          >
            <div className="min-w-0 flex-1 basis-40">
              <div className="text-sm font-medium text-ink">
                {field.label}
                {field.required && <span className="ml-1 text-critical">*</span>}
              </div>
              <div className="text-xs text-ink-2">{field.hint}</div>
            </div>
            <Select
              label={`Column for ${field.label}`}
              value={draft.map[field.id] ?? UNMAPPED}
              onChange={(column) => {
                onChange({
                  map: { ...draft.map, [field.id]: column === UNMAPPED ? undefined : column },
                });
              }}
              options={columnOptions}
            />
          </div>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <label className="text-sm text-ink">
          <span className="mb-1 block font-medium">Name this format</span>
          <TextInput
            label="Mapping name"
            value={draft.name}
            placeholder="e.g. Hevy"
            onChange={(e) => {
              onChange({ name: e.target.value });
            }}
          />
        </label>
        <div>
          <span className="mb-1 block text-sm font-medium text-ink">Weights are in</span>
          <Segmented<Unit>
            label="Weight unit"
            value={draft.unit}
            onChange={(unit) => {
              onChange({ unit });
            }}
            options={[
              { id: 'lb', label: 'lb' },
              { id: 'kg', label: 'kg' },
            ]}
          />
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-ink">Date order</span>
          <Segmented
            label="Date order"
            value={draft.dateOrder}
            onChange={(dateOrder) => {
              onChange({ dateOrder });
            }}
            options={DATE_ORDERS}
          />
        </div>
      </div>

      <h3 className="mb-2 text-sm font-semibold text-ink">
        Preview {rows.length ? `— first ${rows.length} set(s) as the app will read them` : ''}
      </h3>
      {rows.length ? (
        <DataTable
          minWidth={560}
          rows={rows}
          rowKey={(r) => r.key}
          columns={[
            { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
            { key: 'workout', label: 'Workout', render: (r) => r.workoutKey.split('|')[1] },
            { key: 'exercise', label: 'Exercise', render: (r) => r.exercise },
            { key: 'set', label: 'Set', align: 'right', render: (r) => r.setLabel },
            {
              key: 'weight',
              label: 'Weight',
              align: 'right',
              render: (r) => (r.weight == null ? '–' : `${formatNumber(r.weight)} ${draft.unit}`),
            },
            {
              key: 'reps',
              label: 'Reps',
              align: 'right',
              render: (r) => (r.reps == null ? '–' : formatNumber(r.reps, 0)),
            },
          ]}
        />
      ) : (
        <Muted>Nothing could be read yet. Map at least the date and exercise columns.</Muted>
      )}

      {!!sample.warnings.length && (
        <div className="mt-3 space-y-2">
          {sample.warnings.map((w) => (
            <Callout key={w} tone="warning" title={w} />
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button variant="primary" disabled={!!missing.length || !rows.length} onClick={onApply}>
          Save mapping and continue
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
        {!!missing.length && (
          <span className="text-sm text-ink-2">
            Still needed:{' '}
            {missing.map((m) => MAPPED_FIELDS.find((f) => f.id === m)?.label).join(', ')}
          </span>
        )}
      </div>
    </Card>
  );
}
