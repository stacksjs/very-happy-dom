/**
 * CSS shorthand expansion.
 *
 * `resolveProperty()` is an exact-name lookup, so a rule that declares
 * `margin: 10px` was invisible to every `margin-top` query — `getComputedStyle`
 * fell through to its initial-value table and answered `0px`. Longhands are the
 * only form anything downstream reads, so a shorthand is expanded where it is
 * set rather than guessed at where it is read: the declaration order inside a
 * block then decides the winner on its own, and `margin: 10px; margin-top: 5px`
 * comes out as 5px without anyone comparing indices.
 *
 * The shorthand itself is kept alongside its longhands so `style.margin` still
 * reads back and serialization is unchanged. Callers mark the longhands as
 * derived and leave them out of `cssText`, `item()` and `length`, which is why
 * expanding does not alter the `style` attribute an element reports.
 */

/** Longhands of a box shorthand, in `top right bottom left` order. */
type BoxSides = readonly [string, string, string, string]

const BOX_SHORTHANDS: Record<string, BoxSides> = {
  'margin': ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  'padding': ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
  'border-width': ['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'],
  'border-style': ['border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style'],
  'border-color': ['border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'],
  'inset': ['top', 'right', 'bottom', 'left'],
}

/** Shorthands taking one or two values, second defaulting to the first. */
const PAIR_SHORTHANDS: Record<string, readonly [string, string]> = {
  'gap': ['row-gap', 'column-gap'],
  'overflow': ['overflow-x', 'overflow-y'],
  'place-items': ['align-items', 'justify-items'],
  'place-content': ['align-content', 'justify-content'],
  'place-self': ['align-self', 'justify-self'],
}

/** The one-side border shorthands, e.g. `border-top` -> width/style/color. */
const SIDE_BORDERS = ['top', 'right', 'bottom', 'left'] as const

const BORDER_STYLES = new Set([
  'none',
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
])

const BORDER_WIDTH_KEYWORDS = new Set(['thin', 'medium', 'thick'])

/**
 * A value that means "defer to the cascade", which a shorthand passes through
 * to every one of its longhands untouched.
 */
const CSS_WIDE_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer'])

/** Initial values for the components a `border` shorthand leaves out. */
const BORDER_INITIAL = { width: 'medium', style: 'none', color: 'currentcolor' } as const

/**
 * Split a value on top-level whitespace.
 *
 * Whitespace inside `calc(...)`, `var(...)` or a quoted string is part of a
 * single value, so depth and quoting are tracked rather than splitting on
 * `/\s+/` — otherwise `margin: calc(1px + 2px) 3px` reads as four values.
 */
export function splitValues(value: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  let quote: string | null = null

  for (const char of value) {
    if (quote) {
      current += char
      if (char === quote)
        quote = null
      continue
    }

    if (char === '"' || char === '\'') {
      quote = char
      current += char
      continue
    }

    if (char === '(') {
      depth++
      current += char
      continue
    }

    if (char === ')') {
      depth = Math.max(0, depth - 1)
      current += char
      continue
    }

    if (depth === 0 && /\s/.test(char)) {
      if (current) {
        parts.push(current)
        current = ''
      }
      continue
    }

    current += char
  }

  if (current)
    parts.push(current)

  return parts
}

/** Spread 1-4 values over `top right bottom left`, as the box rules require. */
function boxValues(values: string[]): [string, string, string, string] | null {
  switch (values.length) {
    case 1:
      return [values[0], values[0], values[0], values[0]]
    case 2:
      return [values[0], values[1], values[0], values[1]]
    case 3:
      return [values[0], values[1], values[2], values[1]]
    case 4:
      return [values[0], values[1], values[2], values[3]]
    default:
      return null
  }
}

/** Is this a length, a percentage, or a bare number? */
function isLength(value: string): boolean {
  return /^[+-]?(?:\d*\.)?\d+(?:px|em|rem|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc|q)?$/i.test(value)
    || /^(?:calc|min|max|clamp)\(/i.test(value)
}

/**
 * Sort a `border` value's components by shape: a style keyword is a style, a
 * length or `thin|medium|thick` is a width, and anything left is the color.
 * CSS lets them appear in any order, so position says nothing.
 */
function borderComponents(values: string[]): { width: string, style: string, color: string } | null {
  const found: { width?: string, style?: string, color?: string } = {}

  for (const value of values) {
    const lower = value.toLowerCase()

    if (BORDER_STYLES.has(lower)) {
      if (found.style !== undefined)
        return null
      found.style = value
      continue
    }

    if (BORDER_WIDTH_KEYWORDS.has(lower) || isLength(value)) {
      if (found.width !== undefined)
        return null
      found.width = value
      continue
    }

    if (found.color !== undefined)
      return null
    found.color = value
  }

  return {
    width: found.width ?? BORDER_INITIAL.width,
    style: found.style ?? BORDER_INITIAL.style,
    color: found.color ?? BORDER_INITIAL.color,
  }
}

/**
 * Every name that expands, for rejecting the rest in one lookup.
 *
 * `expandShorthand` runs on every style write and almost none of them are
 * shorthands, so the miss has to be cheap.
 */
const SHORTHAND_NAMES: ReadonlySet<string> = new Set([
  ...Object.keys(BOX_SHORTHANDS),
  ...Object.keys(PAIR_SHORTHANDS),
  'border',
  ...SIDE_BORDERS.map(side => `border-${side}`),
])

/**
 * First letters of those names, so a property that cannot be a shorthand is
 * rejected without normalizing a string it is about to discard. `color`,
 * `width` and `display` never reach a second lookup.
 */
const SHORTHAND_INITIALS: ReadonlySet<number> = new Set(
  Array.from(SHORTHAND_NAMES, name => name.charCodeAt(0)),
)

/** Every longhand a shorthand owns, for resetting them all to a keyword. */
function longhandsOf(property: string): readonly string[] | null {
  if (BOX_SHORTHANDS[property])
    return BOX_SHORTHANDS[property]

  if (PAIR_SHORTHANDS[property])
    return PAIR_SHORTHANDS[property]

  if (property === 'border') {
    return SIDE_BORDERS.flatMap(side => [
      `border-${side}-width`,
      `border-${side}-style`,
      `border-${side}-color`,
    ])
  }

  const side = SIDE_BORDERS.find(candidate => property === `border-${candidate}`)
  if (side)
    return [`border-${side}-width`, `border-${side}-style`, `border-${side}-color`]

  return null
}

/** Does this property name expand into longhands? */
export function isShorthand(property: string): boolean {
  return SHORTHAND_NAMES.has(property) || SHORTHAND_NAMES.has(property.toLowerCase().trim())
}

/**
 * The longhands a shorthand declaration sets, or `null` when `property` is not
 * a supported shorthand or `value` does not parse as one.
 *
 * A shorthand resets every longhand it owns, so a component the author left out
 * comes back at its initial value rather than being omitted — `border: 2px solid`
 * yields a `currentcolor` border color, the way a browser reports it.
 */
export function expandShorthand(property: string, value: string): Array<[string, string]> | null {
  let name = property
  if (!SHORTHAND_NAMES.has(name)) {
    if (!SHORTHAND_INITIALS.has(property.charCodeAt(0) | 0x20))
      return null

    name = property.toLowerCase().trim()
    if (!SHORTHAND_NAMES.has(name))
      return null
  }

  const longhands = longhandsOf(name)
  if (!longhands)
    return null

  const trimmed = value.trim()
  if (!trimmed)
    return null

  // A CSS-wide keyword applies to each longhand as written.
  if (CSS_WIDE_KEYWORDS.has(trimmed.toLowerCase()))
    return longhands.map(longhand => [longhand, trimmed] as [string, string])

  const values = splitValues(trimmed)
  if (values.length === 0)
    return null

  const box = BOX_SHORTHANDS[name]
  if (box) {
    const sides = boxValues(values)
    if (!sides)
      return null
    return box.map((longhand, index) => [longhand, sides[index]] as [string, string])
  }

  const pair = PAIR_SHORTHANDS[name]
  if (pair) {
    if (values.length > 2)
      return null
    return [
      [pair[0], values[0]],
      [pair[1], values[1] ?? values[0]],
    ]
  }

  const components = borderComponents(values)
  if (!components)
    return null

  if (name === 'border') {
    return SIDE_BORDERS.flatMap(side => [
      [`border-${side}-width`, components.width],
      [`border-${side}-style`, components.style],
      [`border-${side}-color`, components.color],
    ] as Array<[string, string]>)
  }

  const side = SIDE_BORDERS.find(candidate => name === `border-${candidate}`)!
  return [
    [`border-${side}-width`, components.width],
    [`border-${side}-style`, components.style],
    [`border-${side}-color`, components.color],
  ]
}
