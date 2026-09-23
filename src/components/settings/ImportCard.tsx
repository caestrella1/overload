import { formatDate } from '../../domain/dates';
import { formatNumber } from '../../domain/units';
import { useImports } from '../../hooks/useData';
import { useSourceLabels } from '../../hooks/useSourceLabels';
import { ImportIcon } from '../icons';
import { Card, LinkButton, Muted } from '../ui';

/**
 * Importing is occasional, so it lives behind an entry point rather than a permanent
 * navigation slot. This card is one of the ways in, and says where things stand.
 */
export function ImportCard() {
  const imports = useImports();
  const label = useSourceLabels();
  const last = imports?.[0];

  return (
    <Card
      icon={<ImportIcon />}
      title="Import"
      subtitle="Bring in a Strong export, or any CSV you map yourself."
      actions={
        <LinkButton to="/import">
          <ImportIcon />
          Import data
        </LinkButton>
      }
    >
      {last ? (
        <Muted>
          Last import: {last.fileName} ({label(last.source)}), {formatNumber(last.added, 0)} set(s)
          added on {formatDate(last.importedAt.slice(0, 19))}.
        </Muted>
      ) : (
        <Muted>Nothing imported yet.</Muted>
      )}
    </Card>
  );
}
