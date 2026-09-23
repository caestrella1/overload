/** Guards for the Storage API, which is missing in insecure contexts and some browsers. */
function manager(): StorageManager | null {
  return 'storage' in navigator ? navigator.storage : null;
}

export async function requestPersistence(): Promise<boolean> {
  const m = manager();
  return m && 'persist' in m ? m.persist() : false;
}

export async function storageInfo(): Promise<{ usage: number; persisted: boolean } | null> {
  const m = manager();
  if (!m) return null;
  const [est, persisted] = await Promise.all([
    'estimate' in m ? m.estimate() : Promise.resolve({ usage: 0 }),
    'persisted' in m ? m.persisted() : Promise.resolve(false),
  ]);
  return { usage: est.usage ?? 0, persisted };
}
