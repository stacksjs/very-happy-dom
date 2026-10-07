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
import { type AutoSides, type FlexContainerStyle, type FlexItemStyle, type GridContainerStyle, type GridItemStyle, type Insets, type LayoutStyle } from './types'

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

/** The absolute-size keywords, as the pixel sizes browsers give them. */
const FONT_SIZE_KEYWORDS: Record<string, number> = {
  'xx-small': 9,
  'x-small': 10,
  'small': 13,
  'medium': 16,
  'large': 18,
  'x-large': 24,
  'xx-large': 32,
  'xxx-large': 48,
}

/**
 * The font size in pixels.
 *
 * `font-size` is inherited, so an element declaring none takes its parent's. A
 * percentage or an `em` here measures against the *parent's* size rather than
 * its own, which is what stops it being circular, and `larger`/`smaller` step
 * from the parent by the conventional 1.2.
 */
function readFontSize(declared: string, basis: LengthBasis, inherited: number): number {
  const trimmed = declared.trim().toLowerCase()

  if (trimmed === '' || trimmed === 'inherit')
    return inherited

  const keyword = FONT_SIZE_KEYWORDS[trimmed]
  if (keyword !== undefined)
    return keyword

  if (trimmed === 'larger')
    return inherited * 1.2
  if (trimmed === 'smaller')
    return inherited / 1.2

  const parentRelative: LengthBasis = { ...basis, basis: inherited, fontSize: inherited }
  const resolved = resolveLength(trimmed, parentRelative)
  return resolved !== null && resolved > 0 ? resolved : inherited
}

/**
 * `line-height`, or `null` for `normal` — which the caller turns into a ratio.
 *
 * Inherited, like `font-size`. A bare number is a multiple of the element's own
 * font size, and a percentage resolves against it too.
 */
function readLineHeight(
  declared: string,
  fontSize: number,
  basis: LengthBasis,
  inherited: number | null,
): number | null {
  const trimmed = declared.trim()
  if (trimmed === '' || trimmed === 'inherit')
    return inherited
  if (trimmed === 'normal')
    return null

  // A bare number is a multiple of the font size, not a pixel count.
  if (/^[+-]?(?:\d*\.)?\d+$/.test(trimmed))
    return Number.parseFloat(trimmed) * fontSize

  return resolveLength(trimmed, { ...basis, basis: fontSize, fontSize })
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

/** Which margins were written `auto`. */
function readAutoSides(read: (property: string) => string): AutoSides {
  const side = (name: typeof SIDES[number]): boolean => read(`margin-${name}`).trim().toLowerCase() === 'auto'
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

/** A number, or the fallback when the value is not one. */
function readNumber(declared: string, fallback: number): number {
  const parsed = Number.parseFloat(declared.trim())
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

/**
 * A `gap`, where `normal` means zero.
 *
 * `normal` is the initial value, and for a flex container it computes to 0 —
 * unlike in a multi-column context, which is not modelled.
 */
function readGap(declared: string, basis: LengthBasis): number {
  const trimmed = declared.trim()
  if (trimmed === '' || trimmed === 'normal')
    return 0
  return Math.max(0, resolveLength(trimmed, basis) ?? 0)
}

function readFlexContainer(declared: (property: string) => string, basis: LengthBasis): FlexContainerStyle {
  return {
    direction: declared('flex-direction').trim().toLowerCase(),
    wrap: declared('flex-wrap').trim().toLowerCase(),
    justifyContent: declared('justify-content').trim().toLowerCase(),
    alignItems: declared('align-items').trim().toLowerCase(),
    alignContent: declared('align-content').trim().toLowerCase(),
    rowGap: readGap(declared('row-gap'), basis),
    columnGap: readGap(declared('column-gap'), basis),
  }
}

function readFlexItem(declared: (property: string) => string): FlexItemStyle {
  return {
    grow: readNumber(declared('flex-grow'), 0),
    shrink: readNumber(declared('flex-shrink'), 1),
    basis: declared('flex-basis').trim().toLowerCase(),
    alignSelf: declared('align-self').trim().toLowerCase(),
    order: Math.trunc(Number.parseFloat(declared('order')) || 0),
  }
}

function readGridContainer(declared: (property: string) => string, basis: LengthBasis): GridContainerStyle {
  return {
    // Track lists are kept as text: parsing one needs the container's own size,
    // for `repeat(auto-fill, ...)`, which is not known here.
    templateColumns: declared('grid-template-columns'),
    templateRows: declared('grid-template-rows'),
    templateAreas: declared('grid-template-areas'),
    autoColumns: declared('grid-auto-columns'),
    autoRows: declared('grid-auto-rows'),
    autoFlow: declared('grid-auto-flow').trim().toLowerCase(),
    justifyContent: declared('justify-content').trim().toLowerCase(),
    alignContent: declared('align-content').trim().toLowerCase(),
    justifyItems: declared('justify-items').trim().toLowerCase(),
    alignItems: declared('align-items').trim().toLowerCase(),
    rowGap: readGap(declared('row-gap'), basis),
    columnGap: readGap(declared('column-gap'), basis),
  }
}

function readGridItem(declared: (property: string) => string): GridItemStyle {
  return {
    columnStart: declared('grid-column-start'),
    columnEnd: declared('grid-column-end'),
    rowStart: declared('grid-row-start'),
    rowEnd: declared('grid-row-end'),
    justifySelf: declared('justify-self').trim().toLowerCase(),
    alignSelf: declared('align-self').trim().toLowerCase(),
  }
}

/** The values an element takes from its parent when it declares none. */
export interface InheritedStyle {
  fontSize: number
  fontFamily: string
  fontWeight: string
  lineHeight: number | null
}

/**
 * Resolve everything layout needs for one element.
 *
 * `basis` carries the containing block's inline size, because percentages and
 * viewport units cannot be resolved without it.
 */
export function resolveLayoutStyle(
  element: StyledElement,
  basis: LengthBasis,
  inherited: InheritedStyle,
): LayoutStyle {
  const read = element._styleReader()
  const declared = (property: string): string => read(property) || initialValue(property, element.tagName)

  // Resolved first, and against the parent's size, because every other length
  // on this element that uses `em` measures against the result.
  const fontSize = readFontSize(read('font-size'), basis, inherited.fontSize)
  const own: LengthBasis = { ...basis, fontSize }

  // Both inherit, and both pick which advance table measures this element's
  // text, so an undeclared one takes the parent's rather than the initial value.
  const declaredFamily = read('font-family').trim()
  const fontFamily = declaredFamily === '' || declaredFamily === 'inherit' ? inherited.fontFamily : declaredFamily
  const declaredWeight = read('font-weight').trim()
  const fontWeight = declaredWeight === '' || declaredWeight === 'inherit' ? inherited.fontWeight : declaredWeight

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
    fontFamily,
    fontWeight,
    lineHeight: readLineHeight(read('line-height'), fontSize, own, inherited.lineHeight),
    flexContainer: readFlexContainer(declared, own),
    flexItem: readFlexItem(declared),
    gridContainer: readGridContainer(declared, own),
    gridItem: readGridItem(declared),
    width: size('width'),
    height: size('height'),
    minWidth: read('min-width'),
    minHeight: read('min-height'),
    maxWidth: read('max-width'),
    maxHeight: read('max-height'),
    // Margins may be negative; padding and border may not.
    margin: readInsets(read, 'margin', own, true),
    autoMargin: readAutoSides(read),
    padding: readInsets(read, 'padding', own, false),
    border: readBorder(read, own),
    offsets: {
      top: read('top'),
      right: read('right'),
      bottom: read('bottom'),
      left: read('left'),
    },
  }
}
