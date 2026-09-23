import { matchCatalog, splitName } from './catalog/match';
import { suggestForName } from './suggest';

describe('matchCatalog', () => {
  it('splits Strong-style equipment suffixes', () => {
    expect(splitName('Bench Press (Barbell)')).toEqual({
      base: 'Bench Press',
      equipment: 'Barbell',
    });
    expect(splitName('Leg Press')).toEqual({ base: 'Leg Press', equipment: '' });
  });

  it('finds the movement despite different naming conventions', () => {
    expect(matchCatalog('Bench Press (Barbell)')?.entry.primary).toEqual(['Chest']);
    expect(matchCatalog('Squat (Barbell)')?.entry.primary).toEqual(['Quads']);
    expect(matchCatalog('Standing Calf Raise (Machine)')?.entry.primary).toEqual(['Calves']);
  });

  it('resolves abbreviations that token matching would miss', () => {
    expect(matchCatalog('RDL')?.entry.primary).toEqual(['Hamstrings']);
    expect(matchCatalog('Tricep Pushdown')?.entry.primary).toEqual(['Triceps']);
  });

  it('returns nothing rather than a wild guess', () => {
    expect(matchCatalog('Blorptastic Flumox')).toBeNull();
    expect(matchCatalog('')).toBeNull();
  });

  it('reports weak agreement when the candidates disagree', () => {
    const strong = matchCatalog('Bench Press (Barbell)');
    const weak = matchCatalog('Back Extension (Machine)');
    expect(strong?.agreement).toBe(1);
    expect(weak?.agreement ?? 0).toBeLessThan(0.6);
  });
});

describe('suggestForName', () => {
  it('is confident when the catalogue and the name rules agree', () => {
    const s = suggestForName('Bench Press (Barbell)');
    expect(s?.confidence).toBe('high');
    expect(typeof s?.catalogId).toBe('string');
    expect(s?.muscles.primary).toEqual(['Chest']);
    expect(s?.alternative).toBeNull();
  });

  it('borrows secondary muscles from the catalogue', () => {
    // Our own rules never suggested these; the catalogue does.
    expect(suggestForName('Squat (Barbell)')?.muscles.secondary).toContain('Hamstrings');
  });

  // These four all produced wrong muscles from the catalogue alone during research.
  it.each([
    ['Seated Row (Cable)', ['Upper Back']],
    ['Back Extension (Machine)', ['Lower Back']],
    ['Hip Abductor (Machine)', ['Abductors']],
    ['Reverse Fly (Dumbbell)', ['Shoulders']],
  ])('gets %s right', (name, primary) => {
    expect(suggestForName(name)?.muscles.primary).toEqual(primary);
  });

  it('keeps the name rules and offers both readings when the two disagree', () => {
    for (const name of ['Back Extension (Machine)', 'Hip Abductor (Machine)']) {
      const s = suggestForName(name);
      expect(s?.confidence, `${name} should not be trusted`).toBe('low');
      expect(s?.alternative, `${name} should offer both readings`).not.toBeNull();
      expect(s?.reason).toMatch(/but the name rules suggest/);
    }
  });

  it('falls back to the name rules when the catalogue has nothing', () => {
    const s = suggestForName('Landmine Row (Barbell)');
    expect(s?.muscles.primary).toEqual(['Upper Back']);
  });

  it('gives up on a name nothing recognises', () => {
    expect(suggestForName('Blorptastic Flumox')).toBeNull();
  });

  it('explains itself', () => {
    expect(suggestForName('Squat (Barbell)')?.reason).toMatch(/catalogue/);
  });
});
