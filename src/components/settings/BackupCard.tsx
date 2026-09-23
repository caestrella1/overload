import { useState } from 'react';
import { db } from '../../db/db';
import { exportBackup, isBackup, restoreBackup, type Backup } from '../../db/repo';
import { formatNumber } from '../../domain/units';
import { downloadFile } from '../../lib/download';
import { errorMessage } from '../../lib/errors';
import { Button, Callout, Card, ConfirmDialog, FileButton } from '../ui';

interface Message {
  tone: 'good' | 'critical';
  text: string;
}

export function BackupCard() {
  const [pending, setPending] = useState<Backup | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const download = async () => {
    const backup = await exportBackup(db);
    const day = new Date().toISOString().slice(0, 10);
    downloadFile(`overload-backup-${day}.json`, JSON.stringify(backup), 'application/json');
  };

  const pick = async (file: File) => {
    setMessage(null);
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!isBackup(data)) throw new Error('This is not an Overload backup file.');
      setPending(data);
    } catch (e) {
      setMessage({ tone: 'critical', text: errorMessage(e) });
    }
  };

  const restore = (backup: Backup) => {
    setPending(null);
    restoreBackup(db, backup).then(
      () => {
        setMessage({ tone: 'good', text: `Restored ${formatNumber(backup.sets.length, 0)} sets.` });
      },
      (e: unknown) => {
        setMessage({ tone: 'critical', text: errorMessage(e) });
      },
    );
  };

  return (
    <Card
      title="Backup & restore"
      subtitle="A JSON file with all workouts, exercises and settings."
    >
      {message && <Callout className="mb-3" tone={message.tone} title={message.text} />}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void download()}>Download backup</Button>
        <FileButton accept=".json,application/json" onFile={(f) => void pick(f)}>
          Restore from file…
        </FileButton>
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
          if (pending) restore(pending);
        }}
      >
        {pending &&
          `Backup from ${new Date(pending.exportedAt).toLocaleString()} with ${formatNumber(pending.sets.length, 0)} sets. Everything currently stored will be replaced.`}
      </ConfirmDialog>
    </Card>
  );
}
