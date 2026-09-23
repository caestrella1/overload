import { useEffect, useState } from 'react';
import { formatNumber } from '../../domain/units';
import { requestPersistence, storageInfo } from '../../lib/persistence';
import { Button, Card } from '../ui';

export function StorageCard() {
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
