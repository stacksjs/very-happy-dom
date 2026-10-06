/**
 * CSS length resolution for the layout pass.
 *
 * `px`, unitless numbers and percentages were all `VirtualElement` could read,
 * and a percentage resolved against whatever the parent had declared rather
 * than against a containing block. Layout has a real containing block to
 * resolve against, and a viewport, so the units that depend on them work here.
 *
 * `em` is deliberately absent: it needs the inherited `font-size` chain, and
 * reporting it wrong is worse than reporting it unresolved.
 */

/** What a relative length resolves against. */
export interface LengthBasis {
  /** The containing block's size along the axis being resolved. */
  basis: number
  viewportWidth: number
  viewportHeight: number
  /** The root element's font size, for `rem`. */
  rootFontSize: number
}

const UNIT_PATTERN = /^([+-]?(?:\d*\.)?\d+)(px|%|vh|vw|vmin|vmax|rem|pt|pc|in|cm|mm|q)?$/i

/** Absolute units, as the CSS spec fixes them against the px. */
const ABSOLUTE: Record<string, number> = {
  px: 1,
  pt: 96 / 72,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  q: 96 / 101.6,
}

/**
 * Resolve a length to pixels, or `null` when it is `auto`, empty or something
 * this does not model.
 *
 * `null` is the signal to fall back — for a width it means "fill the
 * containing block", for a height "take the content's own height" — so an
 * unmodelled unit degrades to automatic sizing rather than to zero.
 */
export function resolveLength(value: string, basis: LengthBasis): number | null {
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === 'auto' || trimmed === 'none')
    return null

  const match = UNIT_PATTERN.exec(trimmed)
  if (!match)
    return null

  const magnitude = Number.parseFloat(match[1])
  if (!Number.isFinite(magnitude))
    return null

  const unit = (match[2] ?? 'px').toLowerCase()

  if (unit === '%')
    return (magnitude / 100) * basis.basis

  switch (unit) {
    case 'vw':
      return (magnitude / 100) * basis.viewportWidth
    case 'vh':
      return (magnitude / 100) * basis.viewportHeight
    case 'vmin':
      return (magnitude / 100) * Math.min(basis.viewportWidth, basis.viewportHeight)
    case 'vmax':
      return (magnitude / 100) * Math.max(basis.viewportWidth, basis.viewportHeight)
    case 'rem':
      return magnitude * basis.rootFontSize
  }

  return magnitude * (ABSOLUTE[unit] ?? 1)
}

/** Resolve a length, treating anything unresolved as zero. */
export function resolveLengthOrZero(value: string, basis: LengthBasis): number {
  return resolveLength(value, basis) ?? 0
}

/** Clamp a size between its `min-*` and `max-*`, each of which may be absent. */
export function clampSize(size: number, min: string, max: string, basis: LengthBasis): number {
  let result = size

  const maximum = resolveLength(max, basis)
  if (maximum !== null)
    result = Math.min(result, maximum)

  // `min-width` wins over `max-width` when they conflict, as the spec says.
  const minimum = resolveLength(min, basis)
  if (minimum !== null)
    result = Math.max(result, minimum)

  return Math.max(0, result)
}
