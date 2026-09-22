import { readCsv } from './csv';
import { strongImporter } from './strong';
import type { Importer, ParseResult } from './types';

/** Register new sources here; the first importer whose `detect` matches wins. */
export const IMPORTERS: Importer[] = [strongImporter];

export class UnsupportedFormatError extends Error {}

export function parseFile(text: string): ParseResult & { importer: Importer } {
  const csv = readCsv(text);
  if (!csv.headers.length) throw new UnsupportedFormatError('The file has no header row.');
  const importer = IMPORTERS.find((i) => i.detect(csv.headers));
  if (!importer) {
    throw new UnsupportedFormatError(
      `Unrecognized format. Supported: ${IMPORTERS.map((i) => i.label).join(', ')}. Found columns: ${csv.headers.join(', ')}`,
    );
  }
  const result = importer.parse(csv.rows, csv.headers);
  return { ...result, warnings: [...csv.errors, ...result.warnings], importer };
}

export type { ParseResult, Importer } from './types';
