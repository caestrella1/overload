/**
 * Generates src/themes.css: the accent and tinted neutrals for every colour theme.
 *
 *   node scripts/build-themes.mjs
 *
 * Every theme is one hue. Neutrals are that hue at very low chroma, so the whole page
 * carries a tint rather than sitting on flat grey. Lightness is not fixed across hues —
 * a yellow and a blue of equal OKLCH lightness have very different luminance — so each
 * value is searched until it meets its WCAG contrast target against the surface it sits on.
 *
 * Chart series colours are deliberately NOT themed: they encode data identity and are
 * validated for colour-vision deficiency as a set. Only `--chart-primary`, used where a
 * chart draws a single series, follows the accent.
 */
import { writeFileSync } from 'node:fs';

const OUT = new URL('../src/themes.css', import.meta.url);

/** Hue angles in OKLCH. */
const THEMES = {
  blue: 255,
  green: 150,
  red: 25,
  pink: 350,
  orange: 55,
  yellow: 95,
  purple: 300,
};

// --- colour maths ---------------------------------------------------------

function oklchToRgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = ([r, g, b]) => [r, g, b].every((c) => c >= -0.0001 && c <= 1.0001);
const encode = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

/** Nearest in-gamut colour at this lightness and hue, dropping chroma if it must. */
function toHex(L, C, hue) {
  let chroma = C;
  let rgb = oklchToRgb(L, chroma, hue);
  while (!inGamut(rgb) && chroma > 0) {
    chroma = Math.max(0, chroma - 0.002);
    rgb = oklchToRgb(L, chroma, hue);
  }
  const hex = rgb
    .map((c) => Math.round(Math.min(1, Math.max(0, encode(c))) * 255))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
  return `#${hex}`;
}

function luminance(hex) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * Walks lightness in `step` until the colour clears `target` contrast against `bg`.
 * Returns the first passing value, so the colour stays as close to the intent as the
 * requirement allows.
 */
function fit({ L, C, hue, bg, target, step }) {
  let lightness = L;
  for (let i = 0; i < 400; i++) {
    const hex = toHex(lightness, C, hue);
    if (contrast(hex, bg) >= target) return hex;
    lightness += step;
    if (lightness <= 0 || lightness >= 1) break;
  }
  return toHex(Math.min(1, Math.max(0, lightness)), C, hue);
}

// --- token recipes --------------------------------------------------------

/** Neutrals: the theme hue at a whisper of chroma. Targets are WCAG ratios vs surface. */
const LIGHT = {
  surface: { L: 0.995, C: 0.004 },
  page: { L: 0.968, C: 0.008 },
  surface2: { L: 0.945, C: 0.012 },
  border: { L: 0.885, C: 0.016, target: 1.35 },
  grid: { L: 0.925, C: 0.012 },
  textPrimary: { L: 0.2, C: 0.02, target: 13 },
  textSecondary: { L: 0.45, C: 0.018, target: 7 },
  textMuted: { L: 0.6, C: 0.015, target: 4.5 },
  accent: { L: 0.62, C: 0.17, target: 4.5 },
};

const DARK = {
  surface: { L: 0.215, C: 0.014 },
  page: { L: 0.165, C: 0.012 },
  surface2: { L: 0.275, C: 0.018 },
  border: { L: 0.37, C: 0.022, target: 1.35 },
  grid: { L: 0.315, C: 0.016 },
  textPrimary: { L: 0.97, C: 0.006, target: 13 },
  textSecondary: { L: 0.82, C: 0.014, target: 7 },
  textMuted: { L: 0.67, C: 0.014, target: 4.5 },
  accent: { L: 0.72, C: 0.16, target: 4.5 },
};

/** Text on the accent: whichever of the two extremes reads better, and it must clear 4.5. */
function accentInk(accent, hue) {
  const light = toHex(0.99, 0.004, hue);
  const dark = toHex(0.18, 0.02, hue);
  return contrast(accent, light) >= contrast(accent, dark) ? light : dark;
}

/**
 * The accent has two readability duties at once: it must be legible on the surface, and
 * whatever text sits on top of it must be legible too. Fitting only the first can leave a
 * mid-lightness accent that neither black nor white clears, so both are searched together.
 */
function fitAccent({ L, C, hue, bg, target, step }) {
  let lightness = L;
  for (let i = 0; i < 400; i++) {
    const hex = toHex(lightness, C, hue);
    if (contrast(hex, bg) >= target && contrast(hex, accentInk(hex, hue)) >= target) return hex;
    lightness += step;
    if (lightness <= 0 || lightness >= 1) break;
  }
  return toHex(Math.min(1, Math.max(0, lightness)), C, hue);
}

function buildMode(hue, recipe, darker) {
  const surface = toHex(recipe.surface.L, recipe.surface.C, hue);
  // Text and borders darken on light surfaces and lighten on dark ones until they pass.
  const step = darker ? -0.01 : 0.01;
  const against = (key) =>
    fit({ ...recipe[key], hue, bg: surface, target: recipe[key].target, step });

  const accent = fitAccent({
    ...recipe.accent,
    hue,
    bg: surface,
    target: recipe.accent.target,
    step,
  });
  return {
    page: toHex(recipe.page.L, recipe.page.C, hue),
    surface,
    'surface-2': toHex(recipe.surface2.L, recipe.surface2.C, hue),
    border: against('border'),
    grid: toHex(recipe.grid.L, recipe.grid.C, hue),
    'text-primary': against('textPrimary'),
    'text-secondary': against('textSecondary'),
    'text-muted': against('textMuted'),
    accent,
    'accent-ink': accentInk(accent, hue),
    'chart-primary': accent,
  };
}

const block = (selector, tokens, extra = '') =>
  `${selector} {\n${extra}${Object.entries(tokens)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join('\n')}\n}\n`;

const themes = Object.entries(THEMES).map(([name, hue]) => ({
  name,
  light: buildMode(hue, LIGHT, true),
  dark: buildMode(hue, DARK, false),
}));

const [defaultTheme, ...rest] = themes;

// Every theme's accent is also published on its own, so the theme picker can paint a
// swatch per choice without the page having to be in that theme.
const swatches = (mode) =>
  Object.fromEntries(themes.map((t) => [`accent-${t.name}`, t[mode].accent]));
const baseLight = { ...defaultTheme.light, ...swatches('light') };
const baseDark = { ...defaultTheme.dark, ...swatches('dark') };

const lines = [
  '/* Generated by scripts/build-themes.mjs. Do not edit by hand. */',
  '',
  block(':root', baseLight, '  color-scheme: light;\n'),
  ...rest.map((t) => block(`:root[data-accent='${t.name}']`, t.light)),
  '@media (prefers-color-scheme: dark) {',
  block("  :root:not([data-theme='light'])", baseDark, '  color-scheme: dark;\n')
    .split('\n')
    .map((l) => (l ? `  ${l}` : l))
    .join('\n')
    .replace(/^ {2}/, ''),
  ...rest.map((t) =>
    block(`  :root:not([data-theme='light'])[data-accent='${t.name}']`, t.dark)
      .split('\n')
      .map((l) => (l.startsWith('  --') ? `  ${l}` : l))
      .join('\n'),
  ),
  '}',
  '',
  block(":root[data-theme='dark']", baseDark, '  color-scheme: dark;\n'),
  ...rest.map((t) => block(`:root[data-theme='dark'][data-accent='${t.name}']`, t.dark)),
];

writeFileSync(OUT, `${lines.join('\n')}`);

// --- report ---------------------------------------------------------------

const check = (label, fg, bg, min) => {
  const ratio = contrast(fg, bg);
  const ok = ratio >= min;
  if (!ok) process.exitCode = 1;
  return `${ok ? 'pass' : 'FAIL'} ${label} ${ratio.toFixed(2)}:1 (min ${min})`;
};

for (const t of themes) {
  for (const mode of ['light', 'dark']) {
    const c = t[mode];
    const results = [
      check('text', c['text-primary'], c.surface, 12),
      check('secondary', c['text-secondary'], c.surface, 7),
      check('muted', c['text-muted'], c.surface, 4.5),
      check('accent', c.accent, c.surface, 4.5),
      check('accent-ink', c['accent-ink'], c.accent, 4.5),
      check('border', c.border, c.surface, 1.3),
    ];
    const failed = results.filter((r) => r.startsWith('FAIL'));
    console.log(
      `${t.name.padEnd(7)} ${mode.padEnd(5)} accent ${c.accent} ${failed.length ? failed.join(' | ') : 'all pass'}`,
    );
  }
}
