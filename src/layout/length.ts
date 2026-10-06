/**
 * CSS length resolution for the layout pass.
 *
 * `px`, unitless numbers and percentages were all `VirtualElement` could read,
 * and a percentage resolved against whatever the parent had declared rather
 * than against a containing block. Layout has a real containing block to
 * resolve against, a viewport, and an inherited font size, so the units that
 * depend on any of those work here — along with `calc()` and the comparison
 * functions that take lengths.
 */

/** What a relative length resolves against. */
export interface LengthBasis {
  /** The containing block's size along the axis being resolved. */
  basis: number
  viewportWidth: number
  viewportHeight: number
  /** The root element's font size, for `rem`. */
  rootFontSize: number
  /**
   * The font size `em` is relative to.
   *
   * The element's own, except when resolving `font-size` itself, where it is
   * the parent's — `font-size: 2em` doubles what was inherited rather than
   * being circular.
   */
  fontSize: number
}

const UNIT_PATTERN = /^([+-]?(?:\d*\.)?\d+)(px|%|em|ex|ch|vh|vw|vmin|vmax|rem|pt|pc|in|cm|mm|q)?$/i

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

  // `calc()` and the comparison functions are expressions, not single values.
  if (/^(?:calc|min|max|clamp)\(/i.test(trimmed))
    return evaluateExpression(trimmed, basis)

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
    case 'em':
      return magnitude * basis.fontSize
    // Approximations, and the only honest ones without font metrics: `ex` is
    // the x-height and `ch` the width of a zero, both of which need the font.
    // The ratios below are the conventional fallbacks.
    case 'ex':
      return magnitude * basis.fontSize * 0.5
    case 'ch':
      return magnitude * basis.fontSize * 0.5
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

// ---------------------------------------------------------------------------
// calc() and the comparison functions
// ---------------------------------------------------------------------------

/**
 * Evaluate `calc()`, `min()`, `max()` or `clamp()` to pixels.
 *
 * Each length inside is resolved against the same basis the whole expression
 * was given, so `calc(100% - 2em)` mixes a containing-block fraction with a
 * font-relative length the way it is meant to. `null` for anything that does
 * not parse, which degrades to automatic sizing rather than to zero.
 *
 * `+` and `-` must be surrounded by whitespace, as the grammar requires:
 * `calc(100%-20px)` is invalid CSS, because `-20px` there is a single signed
 * value rather than a subtraction. Accepting it would let markup pass here that
 * a browser throws away.
 */
function evaluateExpression(value: string, basis: LengthBasis): number | null {
  const trimmed = value.trim()

  const call = /^([a-z-]+)\((.*)\)$/is.exec(trimmed)
  if (!call)
    return null

  const name = call[1].toLowerCase()
  const body = call[2]

  if (name === 'calc')
    return evaluateSum(body, basis)

  if (name === 'min' || name === 'max' || name === 'clamp') {
    const parts = splitArguments(body).map(part => evaluateSum(part, basis))
    if (parts.some(part => part === null) || parts.length === 0)
      return null

    const numbers = parts as number[]
    if (name === 'min')
      return Math.min(...numbers)
    if (name === 'max')
      return Math.max(...numbers)

    // clamp(min, preferred, max), which is max(min, min(preferred, max)).
    if (numbers.length !== 3)
      return null
    return Math.max(numbers[0], Math.min(numbers[1], numbers[2]))
  }

  return null
}

/** Split a function's arguments on top-level commas. */
function splitArguments(body: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0

  for (const char of body) {
    if (char === '(')
      depth++
    else if (char === ')')
      depth--

    if (depth === 0 && char === ',') {
      parts.push(current)
      current = ''
      continue
    }

    current += char
  }

  parts.push(current)
  return parts
}

/**
 * A sum of products: the `+` and `-` level of the grammar.
 *
 * Split from the right so the terms associate left, which matters for
 * subtraction: `calc(100px - 20px - 5px)` is 75, not 85.
 */
function evaluateSum(expression: string, basis: LengthBasis): number | null {
  const trimmed = expression.trim()
  if (trimmed === '')
    return null

  let depth = 0
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const char = trimmed[i]
    if (char === ')')
      depth++
    else if (char === '(')
      depth--

    if (depth !== 0 || (char !== '+' && char !== '-'))
      continue

    // Whitespace on both sides is what makes this an operator rather than the
    // sign of the value that follows it.
    if (!/\s/.test(trimmed[i - 1] ?? '') || !/\s/.test(trimmed[i + 1] ?? ''))
      continue

    const left = evaluateSum(trimmed.slice(0, i), basis)
    const right = evaluateProduct(trimmed.slice(i + 1), basis)
    if (left === null || right === null)
      return null

    return char === '+' ? left + right : left - right
  }

  return evaluateProduct(trimmed, basis)
}

/**
 * A product of terms: the `*` and `/` level.
 *
 * One side of a multiplication must be a plain number, and a division's right
 * side must be — `2em * 3px` is not a length. Split from the right, as above.
 */
function evaluateProduct(expression: string, basis: LengthBasis): number | null {
  const trimmed = expression.trim()
  if (trimmed === '')
    return null

  let depth = 0
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const char = trimmed[i]
    if (char === ')')
      depth++
    else if (char === '(')
      depth--

    if (depth !== 0 || (char !== '*' && char !== '/'))
      continue

    const leftText = trimmed.slice(0, i).trim()
    const rightText = trimmed.slice(i + 1).trim()

    if (char === '/') {
      const divisor = plainNumber(rightText)
      const left = evaluateProduct(leftText, basis)
      if (left === null || divisor === null || divisor === 0)
        return null
      return left / divisor
    }

    // Either side may be the number; the other is the length.
    const rightNumber = plainNumber(rightText)
    if (rightNumber !== null) {
      const left = evaluateProduct(leftText, basis)
      return left === null ? null : left * rightNumber
    }

    const leftNumber = plainNumber(leftText)
    if (leftNumber !== null) {
      const right = evaluateProduct(rightText, basis)
      return right === null ? null : right * leftNumber
    }

    return null
  }

  return evaluateTerm(trimmed, basis)
}

/** A plain unitless number, or `null`. */
function plainNumber(value: string): number | null {
  if (!/^[+-]?(?:\d*\.)?\d+$/.test(value.trim()))
    return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** A single value: a parenthesised sum, a nested function, or a length. */
function evaluateTerm(expression: string, basis: LengthBasis): number | null {
  const trimmed = expression.trim()

  if (trimmed.startsWith('(') && trimmed.endsWith(')'))
    return evaluateSum(trimmed.slice(1, -1), basis)

  if (/^(?:calc|min|max|clamp)\(/i.test(trimmed))
    return evaluateExpression(trimmed, basis)

  // A bare number inside an expression is a number, not a pixel count — but
  // `calc(2 * 10px)` has already consumed those, so anything reaching here
  // with no unit is only valid where a number is, which is nowhere.
  const match = UNIT_PATTERN.exec(trimmed)
  if (!match || match[2] === undefined)
    return null

  return resolveLength(trimmed, basis)
}
