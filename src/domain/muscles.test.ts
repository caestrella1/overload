import { suggestMuscles } from './muscles';

describe('suggestMuscles', () => {
  it('uses the built-in mapping, ignoring equipment', () => {
    expect(suggestMuscles('Bench Press (Barbell)')?.primary).toEqual(['Chest']);
    expect(suggestMuscles('Pull Up (Assisted)')?.primary).toEqual(['Lats']);
    expect(suggestMuscles('Squat (Barbell)')?.primary).toEqual(['Quads']);
  });

  it('falls back to keyword rules', () => {
    expect(suggestMuscles('Landmine Row (Barbell)')?.primary).toEqual(['Upper Back']);
    expect(suggestMuscles('Spider Curl (Dumbbell)')?.primary).toEqual(['Biceps']);
    expect(suggestMuscles('Incline Smith Press')?.primary).toEqual(['Chest']);
    expect(suggestMuscles('Rope Pushdown (Cable)')?.primary).toEqual(['Triceps']);
  });

  it('returns null when nothing matches', () => {
    expect(suggestMuscles('Zottman Thing')).toBeNull();
  });

  it('returns independent copies', () => {
    const a = suggestMuscles('Bench Press (Barbell)');
    a?.primary.push('Calves');
    expect(suggestMuscles('Bench Press (Barbell)')?.primary).toEqual(['Chest']);
  });
});

describe('fly variants', () => {
  it('treat flies as chest work, not triceps', () => {
    expect(suggestMuscles('Cable Fly')).toEqual({ primary: ['Chest'], secondary: ['Shoulders'] });
    expect(suggestMuscles('Cable Crossover')?.primary).toEqual(['Chest']);
    expect(suggestMuscles('Bench Press (Barbell)')?.secondary).toContain('Triceps');
  });
});
