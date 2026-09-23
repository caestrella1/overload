import type { Exercise, Unit } from './types';

const LB_PER_KG = 2.2046226218;

export function convertWeight(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  return from === 'kg' ? value * LB_PER_KG : value / LB_PER_KG;
}

export function exerciseUnit(exercise: Pick<Exercise, 'unit'> | undefined, fallback: Unit): Unit {
  return exercise?.unit ?? fallback;
}

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '–';
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function formatWeight(value: number | null | undefined, unit: Unit, digits = 1): string {
  if (value == null) return '–';
  return `${formatNumber(value, digits)} ${unit}`;
}

/** 12,345 -> "12.3k"; smaller values are printed normally. */
export function formatCompact(value: number, digits = 0): string {
  return Math.abs(value) >= 10000
    ? `${formatNumber(value / 1000, 1)}k`
    : formatNumber(value, digits);
}

export function exercisePath(name: string): string {
  return `/exercises/${encodeURIComponent(name)}`;
}
