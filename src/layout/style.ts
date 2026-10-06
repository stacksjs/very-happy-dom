/**
 * Reading one element's layout-relevant computed values.
 *
 * The cascade is matched once per element, because matching is the expensive
 * half and a box needs two dozen properties. Declared values come from the
 * element; anything undeclared falls back to `css/initial-values`, which is the
 * same table `getComputedStyle` answers from.
 */

import { initialValue } from '../css/initial-values'
import { type LengthBasis, resolveLength, resolveLengthOrZero } from './length'
import { type Insets, type LayoutStyle } from './types'

/** The parts of an element this module needs, kept structural to avoid a cycle. */
export interface StyledElement {
  tagName: string
  _styleReader: () => (property: string) => string
  getAttribute?: (name: string) => string | null
}

const SIDES = ['top', 'right', 'bottom', 'left'] as const

const BORDER_WIDTH_KEYWORDS: Record<string, number> = { thin: 1, medium: 3, thick: 5 }

/** Border styles that suppress the border, making its used width zero. */
const NO_BORDER = new Set(['', 'none', 'hidden'])

/**
 * The font size in pixels.
 *
 * Only absolute units are read. `em` and the size keywords would need the
 * inherited chain, and layout uses this solely to estimate text height, so a
 * wrong answer here is worse than the 16px initial value.
 */
function readFontSize(declared: string, basis: LengthBasis): number {
  const resolved = resolveLength(declared, basis)
  return resolved !== null && resolved > 0 ? resolved : 16
}

/** `line-height`, or `null` for `normal` — which the caller turns into a ratio. */
function readLineHeight(declared: string, fontSize: number, basis: LengthBasis): number | null {
  const trimmed = declared.trim()
  if (trimmed === '' || trimmed === 'normal')
    return null

  // A bare number is a multiple of the font size, not a pixel count.
  if (/^[+-]?(?:\d*\.)?\d+$/.test(trimmed))
    return Number.parseFloat(trimmed) * fontSize

  return resolveLength(trimmed, { ...basis, basis: fontSize })
}

/** Resolve the four sides of `margin` or `padding`. */
function readInsets(
  read: (property: string) => string,
  property: 'margin' | 'padding',
  basis: LengthBasis,
  allowNegative: boolean,
): Insets {
  const side = (name: typeof SIDES[number]): number => {
    const declared = read(`${property}-${name}`)
    // Percentage margins and padding resolve against the containing block's
    // WIDTH on every side, vertical ones included. That is the spec, and it is
    // the part people are surprised by.
    const value = resolveLengthOrZero(declared, basis)
    return allowNegative ? value : Math.max(0, value)
  }

  return { top: side('top'), right: side('right'), bottom: side('bottom'), left: side('left') }
}

/** Resolve the four border widths, as used rather than as declared. */
function readBorder(read: (property: string) => string, basis: LengthBasis): Insets {
  const side = (name: typeof SIDES[number]): number => {
    const style = read(`border-${name}-style`).trim().toLowerCase()
    if (NO_BORDER.has(style))
      return 0

    const declared = read(`border-${name}-width`).trim().toLowerCase()
    const keyword = BORDER_WIDTH_KEYWORDS[declared]
    if (keyword !== undefined)
      return keyword

    return Math.max(0, resolveLength(declared, basis) ?? BORDER_WIDTH_KEYWORDS.medium)
  }

  return { top: side('top'), right: side('right'), bottom: side('bottom'), left: side('left') }
}

/**
 * Resolve everything layout needs for one element.
 *
 * `basis` carries the containing block's inline size, because percentages and
 * viewport units cannot be resolved without it.
 */
export function resolveLayoutStyle(element: StyledElement, basis: LengthBasis): LayoutStyle {
  const read = element._styleReader()
  const declared = (property: string): string => read(property) || initialValue(property, element.tagName)

  const fontSize = readFontSize(declared('font-size'), basis)

  /**
   * A declared size, or the `width`/`height` attribute when CSS says nothing.
   *
   * `<canvas>`, `<img>` and `<svg>` carry their size as an attribute, and
   * resolving a box without it would report them as unsized. CSS wins, as the
   * presentational hint it overrides should.
   */
  const size = (dimension: 'width' | 'height'): string => {
    const styled = read(dimension)
    if (styled.trim() !== '')
      return styled
    return element.getAttribute?.(dimension) ?? ''
  }

  return {
    display: declared('display').trim().toLowerCase(),
    position: declared('position').trim().toLowerCase(),
    boxSizing: declared('box-sizing').trim().toLowerCase(),
    overflow: declared('overflow').trim().toLowerCase(),
    pointerEvents: declared('pointer-events').trim().toLowerCase(),
    visibility: declared('visibility').trim().toLowerCase(),
    fontSize,
    lineHeight: readLineHeight(declared('line-height'), fontSize, basis),
    width: size('width'),
    height: size('height'),
    minWidth: read('min-width'),
    minHeight: read('min-height'),
    maxWidth: read('max-width'),
    maxHeight: read('max-height'),
    // Margins may be negative; padding and border may not.
    margin: readInsets(read, 'margin', basis, true),
    padding: readInsets(read, 'padding', basis, false),
    border: readBorder(read, basis),
    offsets: {
      top: read('top'),
      right: read('right'),
      bottom: read('bottom'),
      left: read('left'),
    },
  }
}
