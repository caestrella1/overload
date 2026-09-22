import { useState } from 'react';
import { db } from '../../db/db';
import { undoImport } from '../../db/repo';
import type { ImportRecord } from '../../domain/types';
import { formatNumber } from '../../domain/units';
import { useImports } from '../../hooks/useData';
import { Button, Card, ConfirmDialog, DataTable } from '../ui';

export function ImportHistory() {
  const imports = useImports();
  const [undoing, setUndoing] = useState<ImportRecord | null>(null);
  if (!imports?.length) return null;

  const count = (n: number) => formatNumber(n, 0);

  return (
    <Card title="Import history" subtitle="Undo removes the sets an import added or updated.">
      <DataTable
        minWidth={560}
        rows={imports}
        rowKey={(r) => String(r.id)}
        columns={[
          { key: 'file', label: 'File', render: (r) => r.fileName },
          {
            key: 'when',
            label: 'Imported',
            className: 'text-ink-2',
            render: (r) => new Date(r.importedAt).toLocaleString(),
          },
          { key: 'added', label: 'Added', align: 'right', render: (r) => count(r.added) },
          { key: 'updated', label: 'Updated', align: 'right', render: (r) => count(r.updated) },
          {
            key: 'skipped',
            label: 'Skipped',
            align: 'right',
            className: 'text-ink-2',
            render: (r) => count(r.duplicates),
          },
          {
            key: 'undo',
            label: <span className="sr-only">Actions</span>,
            align: 'right',
            render: (r) => (
              <Button
                variant="ghost"
                onClick={() => {
                  setUndoing(r);
                }}
              >
                Undo
              </Button>
            ),
          },
        ]}
      />
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
