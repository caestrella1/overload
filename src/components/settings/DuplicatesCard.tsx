import { useState } from 'react';
import { db } from '../../db/db';
import { deleteSets, findDuplicateSets, type DuplicateGroup } from '../../db/repo';
import { formatDate } from '../../domain/dates';
import { formatNumber } from '../../domain/units';
import { DeleteIcon, DuplicatesIcon, SearchIcon } from '../icons';
import { Button, Callout, Card } from '../ui';

export function DuplicatesCard() {
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
      icon={<DuplicatesIcon />}
      title="Find duplicates"
      subtitle="Sets with the same workout time, exercise, position and values."
    >
      {removed != null && (
        <Callout
          className="mb-3"
          tone="good"
          title={`Removed ${formatNumber(removed, 0)} duplicate set(s)`}
        />
      )}
      {groups && !groups.length && (
        <Callout className="mb-3" tone="good" title="No duplicates found" />
      )}
      {groups && groups.length > 0 && (
        <Callout
          className="mb-3"
          tone="warning"
          title={`${formatNumber(extras, 0)} duplicate set(s) found`}
        >
          <ul className="mt-1 max-h-40 overflow-auto text-xs">
            {groups.slice(0, 50).map((g) => (
              <li key={g.keep.key}>
                {formatDate(g.keep.date)} · {g.keep.exercise} · set {g.keep.setIndex} ×
                {g.extras.length + 1}
              </li>
            ))}
          </ul>
        </Callout>
      )}
      <div className="flex gap-2">
        <Button onClick={() => void scan()}>
          <SearchIcon />
          Scan
        </Button>
        {extras > 0 && (
          <Button variant="danger" onClick={() => void remove()}>
            <DeleteIcon />
            Remove {formatNumber(extras, 0)} extra copies
          </Button>
        )}
      </div>
    </Card>
  );
}
