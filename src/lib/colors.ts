/** Categorical slots from the CSS tokens, assigned in fixed order (never cycled). */
export const SERIES_COLORS = Array.from({ length: 8 }, (_, i) => `var(--series-${i + 1})`);

/**
 * The mark color for a chart drawing a single series. Nothing is being told apart here,
 * so it follows the chosen theme rather than taking a categorical slot.
 */
export const CHART_PRIMARY = 'var(--chart-primary)';
