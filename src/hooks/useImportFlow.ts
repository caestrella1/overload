import { useCallback, useState } from 'react';
import { db } from '../db/db';
import { commitImport, previewImport, type ImportPreview } from '../db/repo';
import type { ImportRecord } from '../domain/types';
import { parseFile, type ParseResult } from '../importers';
import { errorMessage } from '../lib/errors';
import { sha256 } from '../lib/hash';
import { requestPersistence } from '../lib/persistence';

export type ImportState =
  | { step: 'idle' }
  | { step: 'working'; message: string }
  | { step: 'error'; message: string }
  | {
      step: 'preview';
      fileName: string;
      fileHash: string;
      parsed: ParseResult;
      preview: ImportPreview;
    }
  | { step: 'done'; record: ImportRecord };

export type PreviewState = Extract<ImportState, { step: 'preview' }>;

/** Read → parse → preview → commit, as a small state machine. */
export function useImportFlow() {
  const [state, setState] = useState<ImportState>({ step: 'idle' });

  const load = useCallback(async (fileName: string, text: string) => {
    setState({ step: 'working', message: `Reading ${fileName}…` });
    try {
      const fileHash = await sha256(text);
      const parsed = parseFile(text);
      const preview = await previewImport(db, parsed, fileHash);
      setState({ step: 'preview', fileName, fileHash, parsed, preview });
    } catch (e) {
      setState({ step: 'error', message: errorMessage(e) });
    }
  }, []);

  const loadFile = useCallback(
    async (file: File) => {
      await load(file.name, await file.text());
    },
    [load],
  );

  const commit = useCallback(
    async (preview: PreviewState, options: { updateChanged: boolean; sync: boolean }) => {
      const { parsed, fileName, fileHash } = preview;
      setState({ step: 'working', message: 'Saving…' });
      try {
        const record = await commitImport(db, parsed, { fileName, fileHash, ...options });
        // Ask the browser not to evict our data under storage pressure.
        void requestPersistence();
        setState({ step: 'done', record });
      } catch (e) {
        setState({ step: 'error', message: errorMessage(e) });
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setState({ step: 'idle' });
  }, []);

  return { state, load, loadFile, commit, reset };
}
