import { parseExerciseName } from './exerciseName';
import type { MuscleAssignment, MuscleGroup } from './types';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Lats',
  'Upper Back',
  'Lower Back',
  'Traps',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Abs',
  'Obliques',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Adductors',
  'Abductors',
  'Calves',
  'Cardio',
  'Full Body',
];

export type Region = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Core' | 'Legs' | 'Other';

/** Fixed order; also the categorical color order in charts. */
export const REGIONS: Region[] = ['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Legs', 'Other'];

export const REGION_OF: Record<MuscleGroup, Region> = {
  Chest: 'Chest',
  Lats: 'Back',
  'Upper Back': 'Back',
  'Lower Back': 'Back',
  Traps: 'Back',
  Shoulders: 'Shoulders',
  Biceps: 'Arms',
  Triceps: 'Arms',
  Forearms: 'Arms',
  Abs: 'Core',
  Obliques: 'Core',
  Quads: 'Legs',
  Hamstrings: 'Legs',
  Glutes: 'Legs',
  Adductors: 'Legs',
  Abductors: 'Legs',
  Calves: 'Legs',
  Cardio: 'Other',
  'Full Body': 'Other',
};

const MUSCLE_ALIASES: Record<string, MuscleGroup> = {
  chest: 'Chest',
  pecs: 'Chest',
  pectorals: 'Chest',
  lats: 'Lats',
  latissimus: 'Lats',
  back: 'Upper Back',
  'upper back': 'Upper Back',
  'mid back': 'Upper Back',
  rhomboids: 'Upper Back',
  'lower back': 'Lower Back',
  erectors: 'Lower Back',
  traps: 'Traps',
  trapezius: 'Traps',
  shoulders: 'Shoulders',
  delts: 'Shoulders',
  deltoids: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  abdominals: 'Abs',
  core: 'Abs',
  obliques: 'Obliques',
  quads: 'Quads',
  quadriceps: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  adductors: 'Adductors',
  abductors: 'Abductors',
  calves: 'Calves',
  cardio: 'Cardio',
  'full body': 'Full Body',
};

/** Maps free-text muscle names from import sources onto our groups. */
export function normalizeMuscleName(raw: string): MuscleGroup | null {
  return MUSCLE_ALIASES[raw.trim().toLowerCase()] ?? null;
}

const m = (primary: MuscleGroup[], secondary: MuscleGroup[] = []): MuscleAssignment => ({
  primary,
  secondary,
});

/**
 * Built-in mapping for common exercise base names (equipment suffix stripped, lowercased).
 * Covers Strong's default exercise library; anything else falls through to keyword rules.
 */
const KNOWN: Record<string, MuscleAssignment> = {
  'bench press': m(['Chest'], ['Triceps', 'Shoulders']),
  'incline bench press': m(['Chest'], ['Shoulders', 'Triceps']),
  'decline bench press': m(['Chest'], ['Triceps']),
  'close grip bench press': m(['Triceps'], ['Chest']),
  'chest fly': m(['Chest']),
  'incline chest fly': m(['Chest'], ['Shoulders']),
  'chest press': m(['Chest'], ['Triceps', 'Shoulders']),
  'incline chest press': m(['Chest'], ['Shoulders', 'Triceps']),
  'cable crossover': m(['Chest']),
  'pec deck': m(['Chest']),
  'push up': m(['Chest'], ['Triceps', 'Shoulders']),
  'chest dip': m(['Chest'], ['Triceps']),
  'triceps dip': m(['Triceps'], ['Chest']),
  dip: m(['Chest'], ['Triceps']),
  'overhead press': m(['Shoulders'], ['Triceps']),
  'shoulder press': m(['Shoulders'], ['Triceps']),
  'seated overhead press': m(['Shoulders'], ['Triceps']),
  'arnold press': m(['Shoulders'], ['Triceps']),
  'push press': m(['Shoulders'], ['Triceps', 'Quads']),
  'lateral raise': m(['Shoulders']),
  'front raise': m(['Shoulders']),
  'reverse fly': m(['Shoulders'], ['Upper Back']),
  'face pull': m(['Shoulders'], ['Upper Back']),
  'upright row': m(['Shoulders'], ['Traps']),
  shrug: m(['Traps']),
  'pull up': m(['Lats'], ['Biceps']),
  'chin up': m(['Lats'], ['Biceps']),
  'lat pulldown': m(['Lats'], ['Biceps']),
  'straight arm pulldown': m(['Lats']),
  pullover: m(['Lats'], ['Chest']),
  'bent over row': m(['Upper Back'], ['Lats', 'Biceps']),
  'bent over one arm row': m(['Upper Back'], ['Lats', 'Biceps']),
  'pendlay row': m(['Upper Back'], ['Lats', 'Biceps']),
  'seated row': m(['Upper Back'], ['Lats', 'Biceps']),
  'seated cable row': m(['Upper Back'], ['Lats', 'Biceps']),
  't bar row': m(['Upper Back'], ['Lats', 'Biceps']),
  'inverted row': m(['Upper Back'], ['Biceps']),
  'chest supported row': m(['Upper Back'], ['Lats', 'Biceps']),
  deadlift: m(['Hamstrings', 'Glutes', 'Lower Back'], ['Quads', 'Traps', 'Forearms']),
  'romanian deadlift': m(['Hamstrings'], ['Glutes', 'Lower Back']),
  'stiff leg deadlift': m(['Hamstrings'], ['Glutes', 'Lower Back']),
  'sumo deadlift': m(['Glutes', 'Hamstrings'], ['Quads', 'Adductors', 'Lower Back']),
  'rack pull': m(['Lower Back', 'Traps'], ['Glutes', 'Hamstrings']),
  'good morning': m(['Hamstrings'], ['Lower Back', 'Glutes']),
  'back extension': m(['Lower Back'], ['Glutes', 'Hamstrings']),
  hyperextension: m(['Lower Back'], ['Glutes', 'Hamstrings']),
  squat: m(['Quads'], ['Glutes', 'Hamstrings', 'Lower Back']),
  'front squat': m(['Quads'], ['Glutes', 'Abs']),
  'goblet squat': m(['Quads'], ['Glutes']),
  'hack squat': m(['Quads'], ['Glutes']),
  'bulgarian split squat': m(['Quads'], ['Glutes', 'Hamstrings']),
  'split squat': m(['Quads'], ['Glutes']),
  lunge: m(['Quads'], ['Glutes', 'Hamstrings']),
  'walking lunge': m(['Quads'], ['Glutes', 'Hamstrings']),
  'step up': m(['Quads'], ['Glutes']),
  'leg press': m(['Quads'], ['Glutes']),
  'leg extension': m(['Quads']),
  'lying leg curl': m(['Hamstrings']),
  'seated leg curl': m(['Hamstrings']),
  'leg curl': m(['Hamstrings']),
  'hip thrust': m(['Glutes'], ['Hamstrings']),
  'glute bridge': m(['Glutes'], ['Hamstrings']),
  'hip adductor': m(['Adductors']),
  'hip abductor': m(['Abductors']),
  'standing calf raise': m(['Calves']),
  'seated calf raise': m(['Calves']),
  'calf raise': m(['Calves']),
  'bicep curl': m(['Biceps'], ['Forearms']),
  'biceps curl': m(['Biceps'], ['Forearms']),
  'hammer curl': m(['Biceps'], ['Forearms']),
  'preacher curl': m(['Biceps']),
  'concentration curl': m(['Biceps']),
  'ez bar curl': m(['Biceps'], ['Forearms']),
  'reverse curl': m(['Forearms'], ['Biceps']),
  'wrist curl': m(['Forearms']),
  'triceps extension': m(['Triceps']),
  'triceps pushdown': m(['Triceps']),
  skullcrusher: m(['Triceps']),
  'triceps kickback': m(['Triceps']),
  crunch: m(['Abs']),
  'cable crunch': m(['Abs']),
  'sit up': m(['Abs']),
  plank: m(['Abs'], ['Obliques']),
  'side plank': m(['Obliques'], ['Abs']),
  'hanging leg raise': m(['Abs'], ['Obliques']),
  'leg raise': m(['Abs']),
  'russian twist': m(['Obliques'], ['Abs']),
  'ab wheel': m(['Abs']),
  'clean and jerk': m(['Full Body']),
  'power clean': m(['Full Body']),
  snatch: m(['Full Body']),
  'kettlebell swing': m(['Glutes', 'Hamstrings'], ['Lower Back', 'Shoulders']),
  burpee: m(['Full Body'], ['Cardio']),
  running: m(['Cardio']),
  cycling: m(['Cardio']),
  rowing: m(['Cardio']),
  'rowing machine': m(['Cardio']),
  elliptical: m(['Cardio']),
  'stair climber': m(['Cardio']),
  'jump rope': m(['Cardio'], ['Calves']),
};

/** Keyword fallbacks, checked in order; first match wins. */
const RULES: [RegExp, MuscleAssignment][] = [
  [/incline.*(press|fly)/, m(['Chest'], ['Shoulders', 'Triceps'])],
  [/\bfly|crossover|pec deck/, m(['Chest'], ['Shoulders'])],
  [/close.?grip.*bench/, m(['Triceps'], ['Chest'])],
  [/bench|chest|pec|push.?up/, m(['Chest'], ['Triceps', 'Shoulders'])],
  [/overhead|shoulder|military|arnold|lateral|front raise|delt/, m(['Shoulders'], ['Triceps'])],
  [/face pull|reverse fly|rear/, m(['Shoulders'], ['Upper Back'])],
  [/shrug/, m(['Traps'])],
  [/pull.?up|chin.?up|pulldown|pull.?down|pullover/, m(['Lats'], ['Biceps'])],
  [/row/, m(['Upper Back'], ['Lats', 'Biceps'])],
  [/romanian|stiff|\brdl\b|good morning|leg curl|hamstring/, m(['Hamstrings'], ['Glutes'])],
  [/deadlift/, m(['Hamstrings', 'Glutes', 'Lower Back'], ['Quads', 'Traps'])],
  [/back extension|hyperextension/, m(['Lower Back'], ['Glutes'])],
  [/squat|lunge|leg press|leg extension|step.?up|quad/, m(['Quads'], ['Glutes'])],
  [/hip thrust|glute|bridge|kickback.*(glute|cable)/, m(['Glutes'], ['Hamstrings'])],
  [/adduct/, m(['Adductors'])],
  [/abduct/, m(['Abductors'])],
  [/calf|calves/, m(['Calves'])],
  [/tricep|pushdown|skull|kickback|dip/, m(['Triceps'])],
  [/wrist|forearm|grip|farmer/, m(['Forearms'])],
  [/curl/, m(['Biceps'], ['Forearms'])],
  [/oblique|twist|side plank|woodchop/, m(['Obliques'], ['Abs'])],
  [/crunch|sit.?up|plank|\babs?\b|leg raise|knee raise|hollow|v.?up/, m(['Abs'])],
  [/clean|snatch|jerk|thruster|burpee|turkish/, m(['Full Body'])],
  [
    /run|jog|cycl|bike|elliptical|stair|swim|walk|treadmill|rowing machine|rower|sprint/,
    m(['Cardio']),
  ],
];

/**
 * Suggests muscle groups from an exercise name: built-in mapping first, then keyword rules.
 * Returns null when nothing matches.
 */
export function suggestMuscles(name: string): MuscleAssignment | null {
  const base = parseExerciseName(name)
    .baseName.toLowerCase()
    .replace(/[-–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const known = KNOWN[base] ?? KNOWN[base.replace(/s$/, '')];
  if (known) return clone(known);
  for (const [re, assignment] of RULES) {
    if (re.test(base)) return clone(assignment);
  }
  return null;
}

function clone(a: MuscleAssignment): MuscleAssignment {
  return { primary: [...a.primary], secondary: [...a.secondary] };
}
