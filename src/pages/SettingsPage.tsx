import { useEffect, useState } from 'react';
import {
  Button,
  Callout,
  Card,
  Checkbox,
  ConfirmDialog,
  PageHeader,
  Segmented,
} from '../components/ui';
import { db } from '../db/db';
import {
  clearAllData,
  deleteSets,
  exportBackup,
  findDuplicateSets,
  isBackup,
  restoreBackup,
  saveSettings,
  type Backup,
  type DuplicateGroup,
} from '../db/repo';
import { formatDate } from '../domain/dates';
import type { E1rmFormula, Unit } from '../domain/types';
import { formatNumber } from '../domain/units';
import { useSettings } from '../hooks/useData';
import { useTheme, type ThemePref } from '../hooks/useTheme';
import { requestPersistence, storageInfo } from '../lib/persistence';

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink">{label}</div>
        {hint && <div className="text-xs text-ink-2">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const settings = useSettings();
  const [theme, setTheme] = useTheme();

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Preferences and data are stored only in this browser."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Preferences">
          <Row
            label="Default weight unit"
            hint="Used for exercises without their own unit, and for totals across exercises."
          >
            <Segmented<Unit>
              label="Default unit"
              value={settings.defaultUnit}
              onChange={(defaultUnit) => void saveSettings(db, { defaultUnit })}
              options={[
                { id: 'lb', label: 'lb' },
                { id: 'kg', label: 'kg' },
              ]}
            />
          </Row>
          <Row
            label="1RM formula"
            hint="Epley suits most rep ranges; Brzycki reads lower at high reps."
          >
            <Segmented<E1rmFormula>
              label="1RM formula"
              value={settings.e1rmFormula}
              onChange={(e1rmFormula) => void saveSettings(db, { e1rmFormula })}
              options={[
                { id: 'epley', label: 'Epley' },
                { id: 'brzycki', label: 'Brzycki' },
              ]}
            />
          </Row>
          <Row
            label="Secondary muscle credit"
            hint="How much a set counts toward secondary muscles."
          >
            <Segmented
              label="Secondary muscle credit"
              value={String(settings.secondaryWeight)}
              onChange={(v) => void saveSettings(db, { secondaryWeight: Number(v) })}
              options={[
                { id: '0', label: '0' },
                { id: '0.5', label: '½' },
                { id: '1', label: '1' },
              ]}
            />
          </Row>
          <Row label="Warm-up sets" hint="Excluded from volume, set counts and PRs by default.">
            <Checkbox
              checked={settings.includeWarmups}
              onChange={(includeWarmups) => void saveSettings(db, { includeWarmups })}
            >
              Include
            </Checkbox>
          </Row>
          <Row label="Theme">
            <Segmented<ThemePref>
              label="Theme"
              value={theme}
              onChange={setTheme}
              options={[
                { id: 'system', label: 'System' },
                { id: 'light', label: 'Light' },
                { id: 'dark', label: 'Dark' },
              ]}
            />
          </Row>
        </Card>

        <div className="space-y-6">
          <StorageCard />
          <DuplicatesCard />
          <BackupCard />
          <ClearCard />
        </div>
      </div>
    </>
  );
}

function StorageCard() {
  const [info, setInfo] = useState<{ usage: number; persisted: boolean } | null>(null);
  const refresh = () => storageInfo().then(setInfo);
  useEffect(() => {
    let alive = true;
    void storageInfo().then((i) => {
      if (alive) setInfo(i);
    });
    return () => {
      alive = false;
    };
  }, []);
  if (!info) return null;
  return (
    <Card title="Storage">
      <p className="text-sm text-ink-2">
        Using about {formatNumber(info.usage / 1024 / 1024, 1)} MB.{' '}
        {info.persisted
          ? 'Storage is persistent: the browser won’t clear it to free space.'
          : 'The browser may clear this data under storage pressure. Keep a backup, or ask for persistent storage.'}
      </p>
      {!info.persisted && (
        <Button
          className="mt-3"
          onClick={() => {
            void requestPersistence().then(refresh);
          }}
        >
          Request persistent storage
        </Button>
      )}
    </Card>
  );
}

function DuplicatesCard() {
  const [groups, setGroups] = useState<DuplicateGroup[] | null>(null);
  const [removed, setRemoved] = useState<number | null>(null);
  const extras = groups?.reduce((n, g) => n + g.extras.length, 0) ?? 0;

  const scan = async () => {
    setRemoved(null);
    setGroups(findDuplicateSets(await db.sets.toArray()));
  };
  const remove = async () => {
    if (!groups) return;
    const ids = groups.flatMap((g) => g.extras.map((s) => s.id ?? -1));
    await deleteSets(db, ids);
    setRemoved(ids.length);
    setGroups(null);
  };

  return (
    <Card
      title="Find duplicates"
      subtitle="Sets with the same workout time, exercise, position and values."
    >
      {removed != null && (
        <div className="mb-3">
          <Callout tone="good" title={`Removed ${formatNumber(removed, 0)} duplicate set(s)`} />
        </div>
      )}
      {groups && !groups.length && (
        <div className="mb-3">
          <Callout tone="good" title="No duplicates found" />
        </div>
      )}
      {groups && groups.length > 0 && (
        <div className="mb-3">
          <Callout tone="warning" title={`${formatNumber(extras, 0)} duplicate set(s) found`}>
            <ul className="mt-1 max-h-40 overflow-auto text-xs">
              {groups.slice(0, 50).map((g) => (
                <li key={g.keep.key}>
                  {formatDate(g.keep.date)} · {g.keep.exercise} · set {g.keep.setIndex} ×
                  {g.extras.length + 1}
                </li>
              ))}
            </ul>
          </Callout>
        </div>
      )}
      <div className="flex gap-2">
        <Button onClick={() => void scan()}>Scan</Button>
        {extras > 0 && (
          <Button variant="danger" onClick={() => void remove()}>
            Remove {formatNumber(extras, 0)} extra copies
          </Button>
        )}
      </div>
    </Card>
  );
}

function BackupCard() {
  const [pending, setPending] = useState<Backup | null>(null);
  const [message, setMessage] = useState<{ tone: 'good' | 'critical'; text: string } | null>(null);

  const download = async () => {
    const backup = await exportBackup(db);
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overload-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pick = async (file: File) => {
    setMessage(null);
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!isBackup(data)) throw new Error('This is not an Overload backup file.');
      setPending(data);
    } catch (e) {
      setMessage({ tone: 'critical', text: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Card
      title="Backup & restore"
      subtitle="A JSON file with all workouts, exercises and settings."
    >
      {message && (
        <div className="mb-3">
          <Callout tone={message.tone} title={message.text} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void download()}>Download backup</Button>
        <label className="inline-flex cursor-pointer items-center rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-2">
          Restore from file…
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void pick(f);
            }}
          />
        </label>
      </div>
      <ConfirmDialog
        open={!!pending}
        title="Replace all data with this backup?"
        confirmLabel="Restore"
        danger
        onCancel={() => {
          setPending(null);
        }}
        onConfirm={() => {
          if (!pending) return;
          const b = pending;
          setPending(null);
          restoreBackup(db, b).then(
            () => {
              setMessage({
                tone: 'good',
                text: `Restored ${formatNumber(b.sets.length, 0)} sets.`,
              });
            },
            (e: unknown) => {
              setMessage({ tone: 'critical', text: e instanceof Error ? e.message : String(e) });
            },
          );
        }}
      >
        {pending &&
          `Backup from ${new Date(pending.exportedAt).toLocaleString()} with ${formatNumber(pending.sets.length, 0)} sets. Everything currently stored will be replaced.`}
      </ConfirmDialog>
    </Card>
  );
}

function ClearCard() {
  const [open, setOpen] = useState(false);
  const [keepSettings, setKeepSettings] = useState(true);
  const [done, setDone] = useState(false);
  return (
    <Card title="Clear data">
      {done && (
        <div className="mb-3">
          <Callout tone="good" title="All workout data cleared" />
        </div>
      )}
      <p className="mb-3 text-sm text-ink-2">
        Deletes every workout, set and import from this browser. This can&apos;t be undone.
      </p>
      <Button
        variant="danger"
        onClick={() => {
          setDone(false);
          setOpen(true);
        }}
      >
        Clear all data…
      </Button>
      <ConfirmDialog
        open={open}
        title="Delete all workout data?"
        confirmLabel="Delete everything"
        danger
        onCancel={() => {
          setOpen(false);
        }}
        onConfirm={() => {
          setOpen(false);
          void clearAllData(db, { keepSettings }).then(() => {
            setDone(true);
          });
        }}
      >
        <p className="mb-3">Consider downloading a backup first.</p>
        <Checkbox checked={keepSettings} onChange={setKeepSettings}>
          Keep preferences and exercises you&apos;ve customized (muscles, units)
        </Checkbox>
      </ConfirmDialog>
    </Card>
  );
}
