/**
 * Adjoining margin collapsing.
 *
 * Vertical margins that meet with nothing between them collapse into one, so
 * two stacked siblings with a 30px bottom margin and a 20px top margin are 30
 * apart rather than 50. Margins used to add up here, which put every box below
 * such a pair further down than a browser would.
 *
 * Collapsing is not a running maximum. A set of margins collapses to the
 * largest positive plus the most negative — `{10, -5, 20}` is 15, not 20 — so a
 * collapsed margin is carried as that pair rather than as a single number.
 * Folding pairwise over a single number loses it: `collapse(collapse(10, -5),
 * 20)` is 20.
 */

/** A collapsed margin: the largest positive and the most negative seen. */
export interface Margin {
  positive: number
  negative: number
}

export const NO_MARGIN: Margin = { positive: 0, negative: 0 }

/** One declared margin, as a collapsible pair. */
export function marginOf(value: number): Margin {
  return value >= 0 ? { positive: value, negative: 0 } : { positive: 0, negative: value }
}

/** Two margins that adjoin, collapsed together. */
export function joinMargins(a: Margin, b: Margin): Margin {
  return {
    positive: Math.max(a.positive, b.positive),
    negative: Math.min(a.negative, b.negative),
  }
}

/** The space a collapsed margin actually takes. */
export function marginValue(margin: Margin): number {
  return margin.positive + margin.negative
}

export function isEmptyMargin(margin: Margin): boolean {
  return margin.positive === 0 && margin.negative === 0
}
