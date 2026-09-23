import Papa from 'papaparse';
import type { CsvRow } from './types';

export interface CsvData {
  headers: string[];
  rows: CsvRow[];
  errors: string[];
}

/** Parses CSV text; delimiter (",", ";", tab) is auto-detected. */
export function readCsv(text: string): CsvData {
  const result = Papa.parse<CsvRow>(text.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
    errors: result.errors.slice(0, 5).map((e) => `Row ${(e.row ?? 0) + 2}: ${e.message}`),
  };
}
