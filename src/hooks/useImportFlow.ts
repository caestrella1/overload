import { useCallback, useState } from 'react';
import { db } from '../db/db';
import {
  aliasMap,
  applyAliases,
  commitImport,
  findProfile,
  previewImport,
  saveProfile,
  type ImportPreview,
} from '../db/repo';
import type { ImportRecord } from '../domain/types';
import {
  inspectDates,
  inspectFile,
  parseMapped,
  type InspectedFile,
  type ParseResult,
} from '../importers';
import type { DateOrder } from '../importers/dates';
import { guessUnit, mappedSource, type FieldMap } from '../importers/mapping';
import { errorMessage } from '../lib/errors';
import { sha256 } from '../lib/hash';
import { requestPersistence } from '../lib/persistence';

export interface FileMeta {
  fileName: string;
  fileHash: string;
}

/** What the user fills in on the mapping step. */
export interface MappingDraft {
  name: string;
  map: FieldMap;
  unit: 'lb' | 'kg';
  dateOrder: DateOrder;
}

export type ImportState =
  | { step: 'idle' }
  | { step: 'working'; message: string }
  | { step: 'error'; message: string }
  | ({
      step: 'mapping';
      file: InspectedFile;
      draft: MappingDraft;
      ambiguousDate: boolean;
    } & FileMeta)
  | ({
      step: 'preview';
      parsed: ParseResult;
      preview: ImportPreview;
      /** Name of the saved mapping used, when the file needed one. */
      mappedWith?: string;
    } & FileMeta)
  | { step: 'done'; record: ImportRecord };

export type PreviewState = Extract<ImportState, { step: 'preview' }>;
export type MappingState = Extract<ImportState, { step: 'mapping' }>;

/** Read → recognise (or map) → preview → commit, as a small state machine. */
export function useImportFlow(defaultUnit: 'lb' | 'kg' = 'lb') {
  const [state, setState] = useState<ImportState>({ step: 'idle' });

  const toPreview = useCallback(async (raw: ParseResult, meta: FileMeta, mappedWith?: string) => {
    // Exercises renamed or merged here keep their new name when re-imported.
    const parsed = applyAliases(raw, await aliasMap(db));
    const preview = await previewImport(db, parsed, meta.fileHash);
    setState({ step: 'preview', parsed, preview, mappedWith, ...meta });
  }, []);

  const load = useCallback(
    async (fileName: string, text: string) => {
      setState({ step: 'working', message: `Reading ${fileName}…` });
      try {
        const fileHash = await sha256(text);
        const file = inspectFile(text);
        const meta = { fileName, fileHash };

        if (file.importer) {
          const parsed = file.importer.parse(file.rows, file.headers);
          await toPreview({ ...parsed, warnings: [...file.errors, ...parsed.warnings] }, meta);
          return;
        }

        // A layout mapped before imports itself; anything else goes to the mapping step.
        const profile = await findProfile(db, file.signature);
        if (profile) {
          const parsed = parseMapped(file.rows, {
            map: profile.map,
            unit: profile.unit,
            dateOrder: profile.dateOrder,
            source: mappedSource(file.signature),
          });
          await toPreview(
            { ...parsed, warnings: [...file.errors, ...parsed.warnings] },
            meta,
            profile.name,
          );
          return;
        }

        const detection = inspectDates(file, file.guess.date);
        setState({
          step: 'mapping',
          file,
          ambiguousDate: detection.ambiguous,
          draft: {
            name: fileName.replace(/\.csv$/i, ''),
            map: file.guess,
            unit: guessUnit(file.guess.weight, defaultUnit),
            dateOrder: detection.order,
          },
          ...meta,
        });
      } catch (e) {
        setState({ step: 'error', message: errorMessage(e) });
      }
    },
    [defaultUnit, toPreview],
  );

  const loadFile = useCallback(
    async (file: File) => {
      await load(file.name, await file.text());
    },
    [load],
  );

  const updateDraft = useCallback((patch: Partial<MappingDraft>) => {
    setState((s) => (s.step === 'mapping' ? { ...s, draft: { ...s.draft, ...patch } } : s));
  }, []);

  /** Saves the mapping for next time, then parses the file with it. */
  const applyMapping = useCallback(
    async (mapping: MappingState) => {
      const { file, draft, fileName, fileHash } = mapping;
      setState({ step: 'working', message: 'Applying mapping…' });
      try {
        await saveProfile(db, {
          name: draft.name.trim() || fileName,
          signature: file.signature,
          map: draft.map,
          unit: draft.unit,
          dateOrder: draft.dateOrder,
        });
        const parsed = parseMapped(file.rows, {
          map: draft.map,
          unit: draft.unit,
          dateOrder: draft.dateOrder,
          source: mappedSource(file.signature),
        });
        await toPreview(
          { ...parsed, warnings: [...file.errors, ...parsed.warnings] },
          { fileName, fileHash },
          draft.name.trim() || fileName,
        );
      } catch (e) {
        setState({ step: 'error', message: errorMessage(e) });
      }
    },
    [toPreview],
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

  return { state, load, loadFile, updateDraft, applyMapping, commit, reset };
}
