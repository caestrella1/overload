import { useState } from 'react';
import { useSampleImport } from '../hooks/useSampleData';
import { Button, Callout } from './ui';

/** Marks generated sample data as such, with a one-click way to remove it. */
export function SampleDataBanner() {
  const { record, remove } = useSampleImport();
  const [busy, setBusy] = useState(false);
  if (!record) return null;
  return (
    <Callout className="mb-6" tone="info" title="You're looking at generated sample data">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>Remove it before importing your own Strong export so the two don&apos;t mix.</span>
        <Button
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void remove().finally(() => {
              setBusy(false);
            });
          }}
        >
          Remove sample data
        </Button>
      </div>
    </Callout>
  );
}
