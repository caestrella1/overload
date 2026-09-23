import type { Exercise } from '../types';
import { catalogEntry, catalogReferenceFor } from './lookup';

const exercise = (patch: Partial<Exercise>): Exercise => ({
  name: 'Bench Press (Barbell)',
  baseName: 'Bench Press',
  equipment: 'Barbell',
  muscles: { primary: ['Chest'], secondary: ['Shoulders', 'Triceps'] },
  muscleSource: 'suggested',
  unit: null,
  assisted: false,
  bodyweight: false,
  bodyweightFactor: 1,
  origins: [],
  catalogId: null,
  suggestionConfidence: 'high',
  suggestionReason: null,
  ...patch,
});

describe('catalogEntry', () => {
  it('looks an entry up by the id a suggestion recorded', () => {
    const entry = catalogEntry('Barbell_Bench_Press_-_Medium_Grip');
    expect(entry?.name).toBe('Barbell Bench Press - Medium Grip');
    expect(entry?.equipment).toBe('barbell');
    expect(entry?.mechanic).toBe('compound');
    expect(entry?.force).toBe('push');
    expect(entry?.level).toBe('beginner');
  });

  it('is null for nothing, and for an id the catalogue dropped', () => {
    expect(catalogEntry(null)).toBeNull();
    expect(catalogEntry('Not_An_Entry')).toBeNull();
  });
});

describe('catalogReferenceFor', () => {
  it('prefers the recorded link', () => {
    const ref = catalogReferenceFor(
      exercise({ catalogId: 'Barbell_Bench_Press_-_Medium_Grip', name: 'Whatever I Called It' }),
    );
    expect(ref?.linked).toBe(true);
    expect(ref?.entry.name).toBe('Barbell Bench Press - Medium Grip');
  });

  it('falls back to a strong name match when nothing was recorded', () => {
    const ref = catalogReferenceFor(exercise({ muscleSource: 'user' }));
    expect(ref?.linked).toBe(false);
    expect(ref?.entry.primary).toEqual(['Chest']);
  });

  it('shows nothing rather than a loose guess', () => {
    expect(catalogReferenceFor(exercise({ name: 'Blorptastic Flumox' }))).toBeNull();
  });

  it('reports whether the exercise agrees with the catalogue', () => {
    const linked = { catalogId: 'Barbell_Bench_Press_-_Medium_Grip' };
    expect(catalogReferenceFor(exercise(linked))?.agrees).toBe(true);
    expect(
      catalogReferenceFor(exercise({ ...linked, muscles: { primary: ['Quads'], secondary: [] } }))
        ?.agrees,
    ).toBe(false);
  });
});
