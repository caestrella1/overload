import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { deleteAlias, listAliases } from '../../db/repo';
import { Button, Card, DataTable, Muted } from '../ui';

/** Renames and merges, kept so later imports of the old name follow them. */
export function AliasesCard() {
  const aliases = useLiveQuery(() => listAliases(db), []);
  if (!aliases?.length) return null;

  return (
    <Card title="Renamed exercises" subtitle="An import using the old name lands on the new one.">
      <DataTable
        minWidth={420}
        rows={aliases}
        rowKey={(a) => a.from}
        columns={[
          { key: 'from', label: 'Imported as', className: 'text-ink-2', render: (a) => a.from },
          { key: 'to', label: 'Becomes', render: (a) => a.to },
          {
            key: 'remove',
            label: <span className="sr-only">Actions</span>,
            align: 'right',
            render: (a) => (
              <Button
                variant="ghost"
                onClick={() => {
                  void deleteAlias(db, a.from);
                }}
              >
                Forget
              </Button>
            ),
          },
        ]}
      />
      <Muted className="mt-3">
        Forgetting a rename keeps the sets where they are; only future imports change.
      </Muted>
    </Card>
  );
}
