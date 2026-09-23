/**
 * Generates a deterministic Strong-format CSV with a push/pull/legs program and steady
 * progression, so the app can be tried without a real export.
 */

type Lift = [name: string, start: number, reps: number, weeklyGain: number];

const PROGRAM: Record<number, [string, Lift[]]> = {
  0: [
    'Push',
    [
      ['Bench Press (Barbell)', 135, 8, 1],
      ['Overhead Press (Barbell)', 85, 8, 0.5],
      ['Incline Bench Press (Dumbbell)', 45, 10, 0.4],
      ['Lateral Raise (Dumbbell)', 15, 12, 0.15],
      ['Triceps Pushdown (Cable - Straight Bar)', 40, 12, 0.3],
    ],
  ],
  2: [
    'Pull',
    [
      ['Pull Up (Assisted)', 90, 8, -0.6],
      ['Bent Over Row (Barbell)', 95, 10, 0.7],
      ['Lat Pulldown (Cable)', 100, 10, 0.6],
      ['Face Pull (Cable)', 30, 15, 0.2],
      ['Bicep Curl (Dumbbell)', 20, 10, 0.2],
    ],
  ],
  4: [
    'Legs',
    [
      ['Squat (Barbell)', 155, 6, 1.4],
      ['Romanian Deadlift (Barbell)', 135, 8, 1],
      ['Leg Press', 200, 10, 2],
      ['Lying Leg Curl (Machine)', 60, 10, 0.4],
      ['Standing Calf Raise (Machine)', 100, 12, 0.6],
    ],
  ],
};

/** Small seeded PRNG (mulberry32) so the sample is identical every time. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

export function generateSampleCsv(weeks = 52, end: Date = new Date()): string {
  const rand = rng(42);
  const lines = [
    'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE',
  ];
  // Start on the Monday `weeks` weeks before `end`.
  const start = new Date(end);
  start.setHours(18, 0, 0, 0);
  start.setDate(start.getDate() - weeks * 7 - ((start.getDay() + 6) % 7));

  // Inclusive of the current week so "this week" stats have data.
  for (let week = 0; week <= weeks; week++) {
    const deload = week % 8 === 7;
    for (const [offset, [workout, lifts]] of Object.entries(PROGRAM)) {
      if (rand() < 0.1) continue; // skipped session
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + Number(offset));
      date.setMinutes(Math.floor(rand() * 60));
      if (date > end) continue;
      const ds = stamp(date);
      const duration = `1h ${Math.floor(rand() * 30)}m`;
      lifts.forEach(([name, base, reps, gain], liftIndex) => {
        const raw = base + gain * week * (deload ? 0.7 : 0.9);
        const step = Math.abs(gain) >= 0.5 ? 5 : 2.5;
        const weight = Math.max(step, Math.round(raw / step) * step);
        if (liftIndex === 0 && workout !== 'Pull') {
          lines.push(`${ds},"${workout}",${duration},"${name}",W,45.0,10.0,0,0.0,,,`);
        }
        for (let set = 1; set <= 4; set++) {
          const r = Math.max(1, reps + Math.floor(rand() * 4) - 2 - Math.floor(set / 3));
          const rpe = week > weeks / 2 && rand() < 0.5 ? String(7 + set * 0.5) : '';
          const notes = liftIndex === 0 && set === 1 ? '"Sample data"' : '';
          lines.push(
            `${ds},"${workout}",${duration},"${name}",${set},${weight.toFixed(1)},${r}.0,0,0.0,"",${notes},${rpe}`,
          );
        }
      });
      if (workout === 'Legs' && rand() < 0.5) {
        const km = (1 + rand() * 2).toFixed(2);
        lines.push(
          `${ds},"${workout}",${duration},"Running",1,0,0,${km},${600 + Math.floor(rand() * 900)},,,`,
        );
      }
    }
  }
  return `${lines.join('\n')}\n`;
}
