import { useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { MuscleChips } from '../components/MuscleChips';
import {
  Badge,
  Button,
  Callout,
  Card,
  Checkbox,
  ConfirmDialog,
  PageHeader,
} from '../components/ui';
import { cx } from '../lib/cx';
import { requestPersistence } from '../lib/persistence';
import { db } from '../db/db';
import { commitImport, previewImport, undoImport, type ImportPreview } from '../db/repo';
import { formatDate } from '../domain/dates';
import type { Exercise, ImportRecord } from '../domain/types';
import { formatNumber } from '../domain/units';
import { IMPORTERS, parseFile, type ParseResult } from '../importers';
import { sha256 } from '../lib/hash';
import { useImports } from '../hooks/useData';

type State =
  | { step: 'idle' }
  | { step: 'working'; message: string }
  | { step: 'error'; message: string }
  | {
      step: 'preview';
      fileName: string;
      fileHash: string;
      parsed: ParseResult;
      preview: ImportPreview;
    }
  | { step: 'done'; record: ImportRecord };

export default function ImportPage() {
  const [state, setState] = useState<State>({ step: 'idle' });
  const [updateChanged, setUpdateChanged] = useState(true);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    setState({ step: 'working', message: `Reading ${file.name}…` });
    try {
      const text = await file.text();
      const fileHash = await sha256(text);
      const parsed = parseFile(text);
      const preview = await previewImport(db, parsed, fileHash);
      setState({ step: 'preview', fileName: file.name, fileHash, parsed, preview });
    } catch (e) {
      setState({ step: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const commit = async () => {
    if (state.step !== 'preview') return;
    const { parsed, fileName, fileHash } = state;
    setState({ step: 'working', message: 'Saving…' });
    try {
      const record = await commitImport(db, parsed, { fileName, fileHash, updateChanged });
      // Ask the browser not to evict our data under storage pressure.
      void requestPersistence();
      setState({ step: 'done', record });
    } catch (e) {
      setState({ step: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  return (
    <>
      <PageHeader
        title="Import"
        subtitle={`Supported: ${IMPORTERS.map((i) => i.label).join(', ')} CSV export. Files are processed in your browser and never uploaded.`}
      />

      <Card className="mb-6">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => {
            setDragging(false);
          }}
          onDrop={onDrop}
          className={cx(
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
            dragging ? 'border-accent bg-accent/5' : 'border-border hover:bg-surface-2',
          )}
        >
          <span className="text-sm font-medium text-ink">Drop a CSV here, or click to choose</span>
          <span className="mt-1 text-xs text-ink-2">
            In Strong: Settings → Export Strong Data. Re-importing a newer export only adds
            what&apos;s new.
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void handleFile(file);
            }}
          />
        </label>
      </Card>

      {state.step === 'working' && <p className="mb-6 text-sm text-ink-2">{state.message}</p>}
      {state.step === 'error' && (
        <div className="mb-6">
          <Callout tone="critical" title="Couldn't import this file">
            {state.message}
          </Callout>
        </div>
      )}
      {state.step === 'done' && (
        <div className="mb-6">
          <Callout tone="good" title="Import complete">
            Added {formatNumber(state.record.added, 0)} sets
            {state.record.updated ? `, updated ${formatNumber(state.record.updated, 0)}` : ''}
            {state.record.duplicates
              ? `, skipped ${formatNumber(state.record.duplicates, 0)} already stored`
              : ''}
            .{' '}
            <Link to="/" className="font-medium text-accent hover:underline">
              Go to dashboard
            </Link>
          </Callout>
        </div>
      )}
      {state.step === 'preview' && (
        <PreviewPanel
          state={state}
          updateChanged={updateChanged}
          onUpdateChanged={setUpdateChanged}
          onCommit={() => void commit()}
          onCancel={() => {
            setState({ step: 'idle' });
          }}
        />
      )}

      <ImportHistory />
    </>
  );
}

function PreviewPanel({
  state,
  updateChanged,
  onUpdateChanged,
  onCommit,
  onCancel,
}: {
  state: Extract<State, { step: 'preview' }>;
  updateChanged: boolean;
  onUpdateChanged: (v: boolean) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const { parsed, preview, fileName } = state;
  const { plan } = preview;
  const changed = plan.toUpdate.length;
  const nothingNew = !plan.toAdd.length && (!changed || !updateChanged);

  return (
    <Card
      className="mb-6"
      title={`Preview: ${fileName}`}
      subtitle={`${parsed.source === 'strong' ? 'Strong' : parsed.source} export · ${formatNumber(parsed.rowCount, 0)} rows${
        preview.dateRange
          ? ` · ${formatDate(preview.dateRange[0])} to ${formatDate(preview.dateRange[1])}`
          : ''
      }`}
    >
      <div className="space-y-3">
        {preview.sameFile && (
          <Callout tone="warning" title="You've imported this exact file before">
            {`"${preview.sameFile.fileName}" was imported on ${new Date(preview.sameFile.importedAt).toLocaleString()}. `}
            Sets already stored will be skipped.
          </Callout>
        )}
        {nothingNew && (
          <Callout tone="info" title="Nothing new to import">
            Every set in this file is already stored.
          </Callout>
        )}
        {parsed.warnings.map((w) => (
          <Callout key={w} tone="warning" title={w} />
        ))}
      </div>

      <dl className="tabular my-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['New sets', plan.toAdd.length],
          ['Already stored', plan.duplicates],
          ['Edited since last import', changed],
          ['New workouts', preview.newWorkouts],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-surface-2 p-3">
            <dt className="text-xs text-ink-2">{label}</dt>
            <dd className="text-xl font-semibold text-ink">{formatNumber(value as number, 0)}</dd>
          </div>
        ))}
      </dl>

      {changed > 0 && (
        <div className="mb-5">
          <Checkbox checked={updateChanged} onChange={onUpdateChanged}>
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
                  {e.muscles ? <MuscleChips exercise={{ muscles: e.muscles } as Exercise} /> : null}
                  {e.fromSource ? (
                    <Badge tone="accent">From import</Badge>
                  ) : e.muscles ? (
                    <Badge tone="warning">Suggested</Badge>
                  ) : (
                    <Badge tone="critical">Unassigned</Badge>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex gap-2">
        <Button variant="primary" disabled={nothingNew} onClick={onCommit}>
          Import {formatNumber(plan.toAdd.length + (updateChanged ? changed : 0), 0)} sets
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
}

function ImportHistory() {
  const imports = useImports();
  const [undoing, setUndoing] = useState<ImportRecord | null>(null);
  if (!imports?.length) return null;

  return (
    <Card title="Import history" subtitle="Undo removes the sets an import added or updated.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-ink-2">
              <th className="px-2 py-2 font-medium">File</th>
              <th className="px-2 py-2 font-medium">Imported</th>
              <th className="px-2 py-2 text-right font-medium">Added</th>
              <th className="px-2 py-2 text-right font-medium">Updated</th>
              <th className="px-2 py-2 text-right font-medium">Skipped</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="tabular">
            {imports.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0">
                <td className="px-2 py-2 text-ink">{r.fileName}</td>
                <td className="px-2 py-2 text-ink-2">{new Date(r.importedAt).toLocaleString()}</td>
                <td className="px-2 py-2 text-right text-ink">{formatNumber(r.added, 0)}</td>
                <td className="px-2 py-2 text-right text-ink">{formatNumber(r.updated, 0)}</td>
                <td className="px-2 py-2 text-right text-ink-2">{formatNumber(r.duplicates, 0)}</td>
                <td className="px-2 py-2 text-right">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setUndoing(r);
                    }}
                  >
                    Undo
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog
        open={!!undoing}
        title="Undo this import?"
        confirmLabel="Undo import"
        danger
        onCancel={() => {
          setUndoing(null);
        }}
        onConfirm={() => {
          if (undoing?.id != null) void undoImport(db, undoing.id);
          setUndoing(null);
        }}
      >
        {undoing &&
          `Removes the sets that "${undoing.fileName}" added or last updated. Updated sets are removed, not reverted to their earlier values.`}
      </ConfirmDialog>
    </Card>
  );
}
