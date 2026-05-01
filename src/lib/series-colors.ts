// Categorical series palette. Source of truth lives in `src/styles/base.css`
// as `--series-*` CSS vars; this module reads them at runtime so components
// can pass resolved hex strings to canvas (uPlot) and SVG attrs that don't
// support `var()`. Fallbacks here mirror the CSS so SSR pre-render and
// any pre-DOM resolution path still get the right colors.
//
// Six hues spaced around the wheel at similar lightness/saturation:
//   amber 35°  · sage 100°  · teal 170°  · slate 210°  · mauve 320°  · gray neutral
// Add new colors only when 6 isn't enough — don't squeeze in close-hue
// neighbors, that's how amber/clay/ochre collided in the previous pass.

const FALLBACK = {
  amber: '#d4a574',
  sage: '#a8c39a',
  teal: '#7ec0b6',
  slate: '#7fa3c8',
  mauve: '#c293b8',
  gray: '#a89784',
} as const;

export type SeriesColor = keyof typeof FALLBACK;

export function seriesColor(key: SeriesColor): string {
  if (typeof window === 'undefined') return FALLBACK[key];
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--series-${key}`).trim();
  return v || FALLBACK[key];
}

/** Ordinal palette for tier-style series (depth 1..5, layer 1..5). */
export const SERIES_ORDER: readonly SeriesColor[] = ['amber', 'sage', 'teal', 'slate', 'mauve'];

/** Convenience: resolved hex for the first `n` ordinals. */
export function seriesPalette(n: number): string[] {
  return SERIES_ORDER.slice(0, n).map(seriesColor);
}
