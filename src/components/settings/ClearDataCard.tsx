import { useState } from 'react';
import { db } from '../../db/db';
import { clearAllData } from '../../db/repo';
import { Button, Callout, Card, Checkbox, ConfirmDialog } from '../ui';

export function ClearDataCard() {
  const [open, setOpen] = useState(false);
  const [keepSettings, setKeepSettings] = useState(true);
  const [done, setDone] = useState(false);
  return (
    <Card title="Clear data">
      {done && <Callout className="mb-3" tone="good" title="All workout data cleared" />}
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
