/** Splits Strong-style names: "Bench Press (Barbell)" -> base "Bench Press", equipment "Barbell". */
export function parseExerciseName(name: string): { baseName: string; equipment: string | null } {
  const match = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(name.trim());
  if (!match?.[1]) return { baseName: name.trim(), equipment: null };
  return { baseName: match[1], equipment: match[2] ?? null };
}

export function isAssistedName(name: string): boolean {
  return /\bassist(ed)?\b/i.test(name);
}
