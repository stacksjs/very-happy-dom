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

/** `flex-direction` values, for telling the two halves of `flex-flow` apart. */
const FLEX_DIRECTIONS = new Set(['row', 'row-reverse', 'column', 'column-reverse'])

/** `flex-wrap` values, likewise. */
const FLEX_WRAPS = new Set(['nowrap', 'wrap', 'wrap-reverse'])

/**
 * The three `flex` longhands for the keywords that stand in for all of them.
 *
 * `flex: auto` and `flex: none` read as opposites but differ in the shrink
 * factor as well as the grow one, which is the part that catches people out.
 */
const FLEX_KEYWORDS: Record<string, [string, string, string]> = {
  none: ['0', '0', 'auto'],
  auto: ['1', '1', 'auto'],
  initial: ['0', '1', 'auto'],
}

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
 * `background`'s longhands, and the initial value each takes when the
 * shorthand leaves it out.
 *
 * The order matters for serialization only; what matters here is that every one
 * is reset. `background: url(x.png)` has to clear a `background-color` an
 * earlier rule set, the way a browser does, or the two paint on top of each
 * other.
 */
const BACKGROUND_INITIAL: Record<string, string> = {
  'background-image': 'none',
  'background-position': '0% 0%',
  'background-size': 'auto',
  'background-repeat': 'repeat',
  'background-attachment': 'scroll',
  'background-origin': 'padding-box',
  'background-clip': 'border-box',
  'background-color': 'transparent',
}

const BACKGROUND_REPEATS = new Set(['repeat', 'repeat-x', 'repeat-y', 'no-repeat', 'space', 'round'])

const BACKGROUND_ATTACHMENTS = new Set(['scroll', 'fixed', 'local'])

const BACKGROUND_BOXES = new Set(['border-box', 'padding-box', 'content-box'])

const POSITION_KEYWORDS = new Set(['left', 'right', 'top', 'bottom', 'center'])

const BACKGROUND_SIZE_KEYWORDS = new Set(['auto', 'cover', 'contain'])


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

/**
 * Expand a `grid-row`/`grid-column` pair, split on `/`.
 *
 * With no `/`, the one value is the start line; the end stays `auto`, except
 * for a bare custom-ident, which the spec makes the end as well.
 */
function expandGridLine(property: 'grid-row' | 'grid-column', value: string): Array<[string, string]> {
  const [start, end] = value.split('/').map(part => part.trim())

  if (end !== undefined && end !== '')
    return [[`${property}-start`, start], [`${property}-end`, end]]

  const isIdent = /^[a-z_-][\w-]*$/i.test(start) && !/^(?:auto|span)$/i.test(start)
  return [[`${property}-start`, start], [`${property}-end`, isIdent ? start : 'auto']]
}

/**
 * Expand `grid-area`, whose values run row-start / column-start / row-end /
 * column-end — the two axes interleaved rather than one then the other.
 */
function expandGridArea(value: string): Array<[string, string]> | null {
  const parts = value.split('/').map(part => part.trim()).filter(part => part !== '')
  if (parts.length === 0 || parts.length > 4)
    return null

  const isName = (value: string | undefined): boolean =>
    value !== undefined && /^[a-z_-][\w-]*$/i.test(value) && !/^(?:auto|span)$/i.test(value)

  // An omitted component mirrors the one it pairs with when that is a name, and
  // is `auto` otherwise. A lone name therefore fills all four, which is what
  // makes `grid-area: header` select the named area.
  const [rowStart, column, rowEnd, columnEnd] = parts
  const columnStart = column ?? (isName(rowStart) ? rowStart : 'auto')

  return [
    ['grid-row-start', rowStart],
    ['grid-column-start', columnStart],
    ['grid-row-end', rowEnd ?? (isName(rowStart) ? rowStart : 'auto')],
    ['grid-column-end', columnEnd ?? (isName(columnStart) ? columnStart : 'auto')],
  ]
}

/**
 * Expand the `grid-template: <rows> / <columns>` form.
 *
 * The form that writes `grid-template-areas` inline is not expanded here; use
 * the longhand for that.
 */
function expandGridTemplate(value: string): Array<[string, string]> | null {
  if (value.includes('"') || value.includes('\''))
    return null

  const slash = splitTopLevel(value, '/')
  if (slash.length !== 2)
    return null

  return [
    ['grid-template-rows', slash[0].trim()],
    ['grid-template-columns', slash[1].trim()],
    ['grid-template-areas', 'none'],
  ]
}

/** Split on a separator that is not inside brackets or a string. */
function splitTopLevel(value: string, separator: string): string[] {
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
    if (char === '(' || char === '[')
      depth++
    else if (char === ')' || char === ']')
      depth = Math.max(0, depth - 1)

    if (depth === 0 && char === separator) {
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }

  parts.push(current)
  return parts
}

/** Is this a bare number, as `flex-grow` and `flex-shrink` take? */
function isNumber(value: string): boolean {
  return /^[+-]?(?:\d*\.)?\d+$/.test(value)
}

/**
 * Expand `flex`, whose one to three values are told apart by shape.
 *
 * A single number is a grow factor and resets the basis to `0%` — which is why
 * `flex: 1` makes items share the space equally rather than keeping their
 * content widths. A single length is a basis. Two numbers are grow and shrink.
 */
function expandFlex(values: string[]): Array<[string, string]> | null {
  if (values.length === 1) {
    const only = values[0].toLowerCase()
    const keyword = FLEX_KEYWORDS[only]
    if (keyword)
      return [['flex-grow', keyword[0]], ['flex-shrink', keyword[1]], ['flex-basis', keyword[2]]]

    if (isNumber(values[0]))
      return [['flex-grow', values[0]], ['flex-shrink', '1'], ['flex-basis', '0%']]

    if (isLength(values[0]) || only === 'content' || only === 'min-content' || only === 'max-content' || only === 'fit-content')
      return [['flex-grow', '1'], ['flex-shrink', '1'], ['flex-basis', values[0]]]

    return null
  }

  if (values.length === 2) {
    if (!isNumber(values[0]))
      return null

    // `flex: <grow> <shrink>` or `flex: <grow> <basis>`.
    if (isNumber(values[1]))
      return [['flex-grow', values[0]], ['flex-shrink', values[1]], ['flex-basis', '0%']]

    return [['flex-grow', values[0]], ['flex-shrink', '1'], ['flex-basis', values[1]]]
  }

  if (values.length === 3) {
    if (!isNumber(values[0]) || !isNumber(values[1]))
      return null
    return [['flex-grow', values[0]], ['flex-shrink', values[1]], ['flex-basis', values[2]]]
  }

  return null
}

/** Expand `flex-flow`, whose two halves may appear in either order. */
function expandFlexFlow(values: string[]): Array<[string, string]> | null {
  if (values.length > 2)
    return null

  let direction: string | undefined
  let wrap: string | undefined

  for (const value of values) {
    const lower = value.toLowerCase()
    if (FLEX_DIRECTIONS.has(lower) && direction === undefined)
      direction = value
    else if (FLEX_WRAPS.has(lower) && wrap === undefined)
      wrap = value
    else
      return null
  }

  // A half left out comes back at its initial value, as a shorthand requires.
  return [['flex-direction', direction ?? 'row'], ['flex-wrap', wrap ?? 'nowrap']]
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

/** Is this token an `<image>`, as `background-image` takes? */
function isImage(value: string): boolean {
  return value === 'none' || /^(?:url|(?:repeating-)?(?:linear|radial|conic)-gradient|image-set|-webkit-[\w-]+)\(/i.test(value)
}

/** One `background` layer's components, each absent when the layer omits it. */
interface BackgroundLayer {
  image?: string
  position?: string
  size?: string
  repeat?: string
  attachment?: string
  origin?: string
  clip?: string
  color?: string
}

/**
 * Sort one layer's tokens by shape, as `border` does — position says nothing
 * here either, beyond the `<position> / <size>` slash.
 *
 * Only the final layer may carry a colour, so `allowColor` is false for the
 * rest: a colour there is not a layer that paints oddly, it is a parse error,
 * and refusing it leaves the shorthand unexpanded rather than inventing a
 * meaning for it.
 */
function parseBackgroundLayer(layer: string, allowColor: boolean): BackgroundLayer | null {
  // The slash is its own token whether or not it is spaced, so `center/cover`
  // and `center / cover` tokenise the same way. Splitting on it first also
  // keeps a `/` inside `url(...)` out of it.
  const tokens = splitTopLevel(layer, '/').flatMap((part, index) => {
    const parts = splitValues(part.trim())
    return index === 0 ? parts : ['/', ...parts]
  })

  const found: BackgroundLayer = {}
  const position: string[] = []
  const boxes: string[] = []

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    const lower = token.toLowerCase()

    // `<position> / <size>`: the size is the one or two tokens that follow,
    // and the layer carries on after them.
    if (token === '/') {
      if (position.length === 0 || found.size !== undefined)
        return null

      const size: string[] = []
      while (size.length < 2 && index + 1 < tokens.length) {
        const next = tokens[index + 1]
        if (!BACKGROUND_SIZE_KEYWORDS.has(next.toLowerCase()) && !isLength(next))
          break
        size.push(next)
        index++
      }

      if (size.length === 0)
        return null
      found.size = size.join(' ')
      continue
    }

    if (isImage(lower)) {
      if (found.image !== undefined)
        return null
      found.image = token
      continue
    }

    if (BACKGROUND_REPEATS.has(lower)) {
      if (found.repeat !== undefined)
        return null
      found.repeat = token
      continue
    }

    if (BACKGROUND_ATTACHMENTS.has(lower)) {
      if (found.attachment !== undefined)
        return null
      found.attachment = token
      continue
    }

    // The first box is the origin and the second the clip; one box sets both.
    if (BACKGROUND_BOXES.has(lower)) {
      if (boxes.length === 2)
        return null
      boxes.push(token)
      continue
    }

    // A position component only counts before the size; after it, a length is
    // something we cannot place, so it falls through to the colour check.
    if ((POSITION_KEYWORDS.has(lower) || isLength(token)) && found.size === undefined) {
      if (position.length === 4)
        return null
      position.push(token)
      continue
    }

    // Nothing else matched, so it is the colour — or a value we cannot place.
    if (!allowColor || found.color !== undefined)
      return null
    found.color = token
  }

  if (position.length > 0)
    found.position = position.join(' ')
  if (boxes.length > 0) {
    found.origin = boxes[0]
    found.clip = boxes[1] ?? boxes[0]
  }

  return found
}

/**
 * Expand `background`.
 *
 * Worth having for `background-color` alone: `resolveProperty` is an exact-name
 * lookup, so `background: red` left `background-color` at its initial
 * `transparent` and anything painting from the computed value drew nothing.
 */
function expandBackground(value: string): Array<[string, string]> | null {
  const layers = splitTopLevel(value, ',').map(layer => layer.trim())
  if (layers.some(layer => layer === ''))
    return null

  const parsed: BackgroundLayer[] = []
  for (let index = 0; index < layers.length; index++) {
    const layer = parseBackgroundLayer(layers[index], index === layers.length - 1)
    if (!layer)
      return null
    parsed.push(layer)
  }

  // Every layer contributes to every longhand but the colour, which the last
  // layer owns on its own.
  const perLayer = (part: keyof BackgroundLayer, longhand: string): string =>
    parsed.map(layer => layer[part] ?? BACKGROUND_INITIAL[longhand]).join(', ')

  return [
    ['background-image', perLayer('image', 'background-image')],
    ['background-position', perLayer('position', 'background-position')],
    ['background-size', perLayer('size', 'background-size')],
    ['background-repeat', perLayer('repeat', 'background-repeat')],
    ['background-attachment', perLayer('attachment', 'background-attachment')],
    ['background-origin', perLayer('origin', 'background-origin')],
    ['background-clip', perLayer('clip', 'background-clip')],
    ['background-color', parsed[parsed.length - 1].color ?? BACKGROUND_INITIAL['background-color']],
  ]
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
  'background',
  'border',
  'flex',
  'flex-flow',
  'grid-row',
  'grid-column',
  'grid-area',
  'grid-template',
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

  if (property === 'grid-row' || property === 'grid-column')
    return [`${property}-start`, `${property}-end`]

  if (property === 'grid-area')
    return ['grid-row-start', 'grid-column-start', 'grid-row-end', 'grid-column-end']

  if (property === 'grid-template')
    return ['grid-template-rows', 'grid-template-columns', 'grid-template-areas']

  if (property === 'background')
    return Object.keys(BACKGROUND_INITIAL)

  if (property === 'flex')
    return ['flex-grow', 'flex-shrink', 'flex-basis']

  if (property === 'flex-flow')
    return ['flex-direction', 'flex-wrap']

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

  // The grid shorthands split on `/` rather than on whitespace, so they are
  // handled before the value is tokenised.
  if (name === 'grid-row' || name === 'grid-column')
    return expandGridLine(name, trimmed)

  if (name === 'grid-area')
    return expandGridArea(trimmed)

  if (name === 'grid-template')
    return expandGridTemplate(trimmed)

  // Layers split on top-level commas, so this runs before tokenisation too.
  if (name === 'background')
    return expandBackground(trimmed)

  if (name === 'flex')
    return expandFlex(values)

  if (name === 'flex-flow')
    return expandFlexFlow(values)

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
