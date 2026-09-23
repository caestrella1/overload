import type { MuscleAssignment, Unit, Workout, WorkoutSet } from '../domain/types';

/** Parsers name the origin; the import supplies the source and import id on commit. */
export type ParsedSet = Omit<WorkoutSet, 'id' | 'importId' | 'originSource' | 'originImportId'>;
export type ParsedWorkout = Omit<Workout, 'importId' | 'originSource' | 'originImportId'>;

export interface ParsedExercise {
  name: string;
  /** Present only when the source file specifies muscle groups. */
  muscles?: MuscleAssignment;
  /** Present only when the source file specifies a weight unit. */
  unit?: Unit;
}

export interface ParseResult {
  source: string;
  workouts: ParsedWorkout[];
  sets: ParsedSet[];
  exercises: ParsedExercise[];
  rowCount: number;
  skippedRows: number;
  warnings: string[];
}

export type CsvRow = Record<string, string | undefined>;

export interface Importer {
  id: string;
  label: string;
  /** True when the headers look like this importer's format. */
  detect(headers: string[]): boolean;
  parse(rows: CsvRow[], headers: string[]): ParseResult;
}
