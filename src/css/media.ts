/**
 * Media query evaluation, in one place (#1611).
 *
 * `matchMedia` answered queries and the cascade refused to look inside `@media`
 * blocks, so the two disagreed about the same document: `matchMedia` reported
 * dark mode active while `getComputedStyle` returned the light value. That is the
 * shape of #1600 again — someone confirms the query matches, reasonably concludes
 * the rules apply, and writes an assertion that compares the light value to the
 * light value.
 *
 * Evaluating it twice would have recreated the split, so `matchMedia` and the
 * cascade both come here.
 *
 * This is a working subset. The features below are understood; anything else
 * makes its query false, which is what a browser does with a feature it does not
 * know. That is no worse than before — every `@media` block was dropped — but it
 * is worth knowing that `@media (hover: hover)` is currently one of them.
 */

/** Everything a query can be asked about. */
export interface MediaContext {
  width: number
  height: number
  colorScheme: 'light' | 'dark'
  reducedMotion: 'reduce' | 'no-preference'
  forcedColors: 'active' | 'none'
  /** `screen` unless `emulateMedia({ media: 'print' })` says otherwise. */
  type: 'screen' | 'print'
}

/** The media features this understands. Anything else makes a query false. */
export const SUPPORTED_FEATURES: readonly string[] = [
  'prefers-color-scheme',
  'prefers-reduced-motion',
  'forced-colors',
  'orientation',
  'min-width',
  'max-width',
  'width',
  'min-height',
  'max-height',
  'height',
]

/** A length in CSS units, as a number of pixels. `em`/`rem` assume 16px. */
function toPixels(value: string, unit: string | undefined): number {
  const size = Number.parseFloat(value)
  if (!Number.isFinite(size))
    return Number.NaN

  return unit === 'em' || unit === 'rem' ? size * 16 : size
}

/** Evaluate one `(feature: value)` term. */
function matchesFeature(term: string, context: MediaContext): boolean {
  const parsed = /^\(\s*([\w-]+)\s*(?::\s*([^)]+?)\s*)?\)$/.exec(term.trim())
  if (!parsed)
    return false

  const [, feature, raw] = parsed
  const value = (raw ?? '').trim().toLowerCase()

  switch (feature.toLowerCase()) {
    case 'prefers-color-scheme':
      return context.colorScheme === value

    case 'prefers-reduced-motion':
      // A bare `(prefers-reduced-motion)` asks whether any preference is set.
      return value === '' ? context.reducedMotion === 'reduce' : context.reducedMotion === value

    case 'forced-colors':
      return value === '' ? context.forcedColors === 'active' : context.forcedColors === value

    case 'orientation':
      return (context.height >= context.width ? 'portrait' : 'landscape') === value

    case 'min-width':
    case 'max-width':
    case 'width':
    case 'min-height':
    case 'max-height':
    case 'height': {
      const lengths = /^(\d+(?:\.\d+)?)\s*(px|em|rem)?$/.exec(value)
      if (!lengths)
        return false

      const wanted = toPixels(lengths[1], lengths[2])
      const actual = feature.endsWith('width') ? context.width : context.height

      if (feature.startsWith('min-'))
        return actual >= wanted
      if (feature.startsWith('max-'))
        return actual <= wanted
      return actual === wanted
    }

    default:
      // Unknown to us, so the query is false — a browser does the same with a
      // feature it does not recognise.
      return false
  }
}

/** Evaluate one comma-separated branch, whose terms are joined by `and`. */
function matchesBranch(branch: string, context: MediaContext): boolean {
  const trimmed = branch.trim().toLowerCase()
  if (trimmed === '')
    return false

  // `not` inverts the branch; `only` is a legacy no-op for old browsers.
  const negated = /^not\s+/.test(trimmed)
  const body = trimmed.replace(/^not\s+/, '').replace(/^only\s+/, '')

  const terms = body.split(/\s+and\s+/).map(term => term.trim()).filter(Boolean)
  if (terms.length === 0)
    return false

  const matched = terms.every((term) => {
    // A bare word is a media type rather than a feature.
    if (!term.startsWith('(')) {
      if (term === 'all')
        return true
      return term === context.type
    }

    return matchesFeature(term, context)
  })

  return negated ? !matched : matched
}

/**
 * Whether `query` matches.
 *
 * A comma-separated list is a union, and the terms within a branch are joined by
 * `and`. The previous implementation checked each feature with a separate `if`
 * that overwrote the running answer, so `(min-width: 100px) and (max-width: 50px)`
 * reported whatever the last clause happened to say.
 */
export function matchesMediaQuery(query: string, context: MediaContext): boolean {
  const text = String(query ?? '').trim()
  if (text === '')
    return false

  return text.split(',').some(branch => matchesBranch(branch, context))
}
