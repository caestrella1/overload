/** Categorical slots from the CSS tokens, assigned in fixed order (never cycled). */
export const SERIES_COLORS = Array.from({ length: 8 }, (_, i) => `var(--series-${i + 1})`);
