import { readCsv } from './csv';
import { detectDateOrder, type DateDetection } from './dates';
import { guessMapping, headerSignature, looksWideFormat, type FieldMap } from './mapping';
import { strongImporter } from './strong';
import type { CsvRow, Importer, ParseResult } from './types';

/** Register new sources here; the first importer whose `detect` matches wins. */
export const IMPORTERS: Importer[] = [strongImporter];

export class UnsupportedFormatError extends Error {}

/** How many rows to sample when working out the date format. */
const DATE_SAMPLE = 40;

export interface InspectedFile {
  headers: string[];
  rows: CsvRow[];
  /** Parse errors from the CSV itself, before any mapping. */
  errors: string[];
  /** The built-in importer for this layout, if there is one. */
  importer: Importer | null;
  /** Identity of the column layout, used to find a saved mapping. */
  signature: string;
  /** Starting point for a manual mapping. */
  guess: FieldMap;
  /** One row per workout instead of per set, which cannot be mapped. */
  wide: boolean;
}

/** Reads a CSV and works out how it can be imported, without committing to anything. */
export function inspectFile(text: string): InspectedFile {
  const csv = readCsv(text);
  if (!csv.headers.length) throw new UnsupportedFormatError('The file has no header row.');
  return {
    headers: csv.headers,
    rows: csv.rows,
    errors: csv.errors,
    importer: IMPORTERS.find((i) => i.detect(csv.headers)) ?? null,
    signature: headerSignature(csv.headers),
    guess: guessMapping(csv.headers),
    wide: looksWideFormat(csv.headers),
  };
}

/** Reads the date column of a sample of rows to work out its day/month order. */
export function inspectDates(file: InspectedFile, column: string | undefined): DateDetection {
  if (!column) return { order: 'ymd', ambiguous: false };
  const samples = file.rows.slice(0, DATE_SAMPLE).map((r) => r[column] ?? '');
  return detectDateOrder(samples);
}

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
export { parseMapped, type MappedOptions } from './mapped';
