import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { deleteProfile, listProfiles } from '../../db/repo';
import { formatDate } from '../../domain/dates';
import { MAPPED_FIELDS, type MappingProfile } from '../../importers/mapping';
import { FormatsIcon } from '../icons';
import { Button, Card, ConfirmDialog, DataTable, Muted } from '../ui';

/** Column mappings saved for CSV layouts the app has no built-in importer for. */
export function FormatsCard() {
  const profiles = useLiveQuery(() => listProfiles(db), []);
  const [removing, setRemoving] = useState<MappingProfile | null>(null);
  if (!profiles?.length) return null;

  const mappedCount = (p: MappingProfile) => MAPPED_FIELDS.filter((f) => p.map[f.id]).length;

  return (
    <Card
      icon={<FormatsIcon />}
      title="Saved CSV formats"
      subtitle="Layouts you've mapped. A matching file imports without asking again."
    >
      <DataTable
        minWidth={420}
        rows={profiles}
        rowKey={(p) => String(p.id)}
        columns={[
          { key: 'name', label: 'Format', render: (p) => p.name },
          {
            key: 'fields',
            label: 'Columns',
            align: 'right',
            className: 'text-ink-2',
            render: (p) => `${mappedCount(p)} mapped · ${p.unit}`,
          },
          {
            key: 'used',
            label: 'Last used',
            align: 'right',
            className: 'text-ink-2',
            render: (p) => formatDate(p.lastUsedAt.slice(0, 19)),
          },
          {
            key: 'remove',
            label: <span className="sr-only">Actions</span>,
            align: 'right',
            render: (p) => (
              <Button
                variant="ghost"
                onClick={() => {
                  setRemoving(p);
                }}
              >
                Forget
              </Button>
            ),
          },
        ]}
      />
      <Muted className="mt-3">Forgetting a format keeps everything it imported.</Muted>
      <ConfirmDialog
        open={!!removing}
        title="Forget this format?"
        confirmLabel="Forget"
        danger
        onCancel={() => {
          setRemoving(null);
        }}
        onConfirm={() => {
          if (removing?.id != null) void deleteProfile(db, removing.id);
          setRemoving(null);
        }}
      >
        {removing &&
          `The next file with these columns will ask you to map them again. Sets already imported from "${removing.name}" are not affected.`}
      </ConfirmDialog>
    </Card>
  );
}
