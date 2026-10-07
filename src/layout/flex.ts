/**
 * Flex line building, flexible length resolution and alignment.
 *
 * A flex container used to lay its children out as blocks, so they stacked
 * where a browser puts them in a row — the largest difference from a browser
 * there was, and most app markup is flex.
 *
 * This is the arithmetic only: it takes each item's measured sizes and returns
 * where the item goes and how big it ends up. Measuring and placing stay in
 * `flow.ts`, which keeps this side pure, independently testable, and free of a
 * cycle with the module that calls it.
 *
 * Sizes here are **border-box** along each axis, with margins carried
 * separately, because that is what free space is distributed over.
 */

/** One item's input to the solver, measured by the caller. */
export interface FlexItemInput {
  /** The hypothetical main size: the flex base size, already min/max clamped. */
  baseMain: number
  /** Clamps on the main size, as border-box values. `Infinity` for no maximum. */
  minMain: number
  maxMain: number
  grow: number
  shrink: number
  marginMainStart: number
  marginMainEnd: number
  marginCrossStart: number
  marginCrossEnd: number
  /** The hypothetical cross size, border-box. */
  baseCross: number
  /** Margins written `auto`, which take the line's free space. */
  autoMainStart: boolean
  autoMainEnd: boolean
  autoCrossStart: boolean
  autoCrossEnd: boolean
  /** True when the cross size came from content rather than a declaration. */
  crossIsAuto: boolean
  /** The item's own `align-self`, already resolved against the container's. */
  align: string
}

/** Where one item ended up. */
export interface FlexItemOutput {
  /** Index into the input array. */
  index: number
  /** Offset from the container's content box, along each axis. */
  mainStart: number
  crossStart: number
  /** Final border-box sizes. */
  mainSize: number
  crossSize: number
}

export interface FlexLineOutput {
  items: FlexItemOutput[]
  crossSize: number
}

export interface FlexOptions {
  /** The container's main-axis content size, or `null` when it is indefinite. */
  availableMain: number | null
  /** The container's cross-axis content size, or `null` when indefinite. */
  availableCross: number | null
  wrap: string
  justifyContent: string
  alignContent: string
  mainGap: number
  crossGap: number
}

export interface FlexResult {
  lines: FlexLineOutput[]
  /** The main size the content needs. */
  contentMain: number
  /** The cross size the content needs. */
  contentCross: number
}

const outerMain = (item: FlexItemInput, main: number): number =>
  item.marginMainStart + main + item.marginMainEnd

const outerCross = (item: FlexItemInput, cross: number): number =>
  item.marginCrossStart + cross + item.marginCrossEnd

/**
 * Break the items into lines.
 *
 * `nowrap` keeps one line however much it overflows. Wrapping is greedy, as the
 * spec requires: an item goes on the current line unless it does not fit, and a
 * line always holds at least one item even when that one item is too wide.
 */
function buildLines(items: FlexItemInput[], options: FlexOptions): FlexItemInput[][] {
  if (options.wrap === 'nowrap' || options.availableMain === null)
    return items.length > 0 ? [items] : []

  const lines: FlexItemInput[][] = []
  let current: FlexItemInput[] = []
  let used = 0

  for (const item of items) {
    const outer = outerMain(item, item.baseMain)
    const withGap = current.length > 0 ? used + options.mainGap + outer : outer

    if (current.length > 0 && withGap > options.availableMain) {
      lines.push(current)
      current = [item]
      used = outer
      continue
    }

    current.push(item)
    used = withGap
  }

  if (current.length > 0)
    lines.push(current)

  return lines
}

/**
 * Distribute a line's free space over its items.
 *
 * Grow and shrink are both resolved by freezing: an item that hits a clamp is
 * fixed at it and the remaining space is redistributed over the rest, which is
 * what keeps a `min-width` from being violated when everything is shrinking.
 * Shrinking weights each item by `shrink x baseMain`, so a large item gives up
 * more than a small one with the same factor.
 */
function resolveFlexibleLengths(line: FlexItemInput[], options: FlexOptions, mainGap: number): number[] {
  const sizes = line.map(item => item.baseMain)

  if (options.availableMain === null)
    return sizes

  const gaps = Math.max(0, line.length - 1) * mainGap
  const used = (): number => line.reduce((total, item, i) => total + outerMain(item, sizes[i]), 0) + gaps
  const initialFree = options.availableMain - used()

  if (Math.abs(initialFree) < 0.001)
    return sizes

  const growing = initialFree > 0
  const frozen = line.map(item => (growing ? item.grow : item.shrink) <= 0)

  // Nothing can absorb the space, so the line simply overflows or underfills.
  if (frozen.every(Boolean))
    return sizes

  for (let pass = 0; pass < line.length + 1; pass++) {
    const free = options.availableMain - used()
    if (Math.abs(free) < 0.001)
      break

    const weight = (index: number): number => {
      const item = line[index]
      return growing ? item.grow : item.shrink * item.baseMain
    }

    let total = 0
    for (let i = 0; i < line.length; i++) {
      if (!frozen[i])
        total += weight(i)
    }
    if (total <= 0)
      break

    let clamped = false
    for (let i = 0; i < line.length; i++) {
      if (frozen[i])
        continue

      const wanted = sizes[i] + free * (weight(i) / total)
      const bounded = Math.min(Math.max(wanted, line[i].minMain), line[i].maxMain)
      sizes[i] = bounded

      if (bounded !== wanted) {
        frozen[i] = true
        clamped = true
      }
    }

    // Nothing hit a clamp, so the distribution above was exact.
    if (!clamped)
      break
  }

  return sizes.map((size, i) => Math.max(line[i].minMain, Math.min(size, line[i].maxMain)))
}

/**
 * Starting offset and the gap between items, for a `justify-content` value.
 *
 * `space-*` values only distribute space that exists: with none left over they
 * all behave as `flex-start`, which is what a browser does.
 */
function distributeMain(
  mode: string,
  free: number,
  count: number,
  gap: number,
): { start: number, between: number } {
  if (free <= 0.001 || count === 0)
    return { start: 0, between: gap }

  switch (mode) {
    case 'flex-end':
    case 'end':
    case 'right':
      return { start: free, between: gap }
    case 'center':
      return { start: free / 2, between: gap }
    case 'space-between':
      return count === 1 ? { start: 0, between: gap } : { start: 0, between: gap + free / (count - 1) }
    case 'space-around': {
      const each = free / count
      return { start: each / 2, between: gap + each }
    }
    case 'space-evenly': {
      const each = free / (count + 1)
      return { start: each, between: gap + each }
    }
    default:
      // `flex-start`, `start`, `left`, `normal` and anything unrecognised.
      return { start: 0, between: gap }
  }
}

/** One item's cross offset within its line, and its final cross size. */
function alignInLine(
  item: FlexItemInput,
  align: string,
  lineCross: number,
): { offset: number, size: number } {
  const outer = outerCross(item, item.baseCross)

  // An `auto` cross margin absorbs the leftover before alignment does, so one
  // on each side centres the item and one on a single side pushes it over.
  if (item.autoCrossStart || item.autoCrossEnd) {
    const slack = Math.max(0, lineCross - outer)
    const shares = (item.autoCrossStart ? 1 : 0) + (item.autoCrossEnd ? 1 : 0)
    const before = item.autoCrossStart ? slack / shares : 0
    return { offset: item.marginCrossStart + before, size: item.baseCross }
  }

  switch (align) {
    case 'flex-end':
    case 'end':
    case 'self-end':
      return { offset: lineCross - outer + item.marginCrossStart, size: item.baseCross }
    case 'center':
      return { offset: (lineCross - outer) / 2 + item.marginCrossStart, size: item.baseCross }
    case 'flex-start':
    case 'start':
    case 'self-start':
      return { offset: item.marginCrossStart, size: item.baseCross }
    case 'baseline':
    case 'first baseline':
    case 'last baseline':
      // No font baselines to align to, so this is the top of the box. Noted as
      // a limitation rather than approximated with something invented.
      return { offset: item.marginCrossStart, size: item.baseCross }
    default: {
      // `stretch` and `normal`. Only an item with no declared cross size
      // stretches; one that declared it keeps it.
      const size = item.crossIsAuto
        ? Math.max(0, lineCross - item.marginCrossStart - item.marginCrossEnd)
        : item.baseCross
      return { offset: item.marginCrossStart, size }
    }
  }
}

/**
 * Lay a flex container's items out.
 *
 * Returns each item's position relative to the container's content box, in
 * main/cross terms — the caller maps those onto x and y, and handles the
 * reversing that `row-reverse` and `wrap-reverse` ask for.
 */
export function solveFlex(items: FlexItemInput[], options: FlexOptions): FlexResult {
  const lines = buildLines(items, options)
  if (lines.length === 0)
    return { lines: [], contentMain: 0, contentCross: 0 }

  const indexOf = new Map<FlexItemInput, number>()
  items.forEach((item, index) => indexOf.set(item, index))

  const resolved = lines.map((line) => {
    const sizes = resolveFlexibleLengths(line, options, options.mainGap)

    // The line's cross size is set by its tallest item, before any stretching:
    // stretching is what fills the line, so it cannot also define it.
    const crossSize = line.reduce((tallest, item) => Math.max(tallest, outerCross(item, item.baseCross)), 0)

    return { line, sizes, crossSize }
  })

  // A definite cross size can leave room for `align-content` to distribute.
  const totalLineCross = resolved.reduce((sum, entry) => sum + entry.crossSize, 0)
    + Math.max(0, resolved.length - 1) * options.crossGap

  const contentCross = options.availableCross ?? totalLineCross
  const crossFree = contentCross - totalLineCross

  // A single line in a definite container fills it, so `align-items: stretch`
  // stretches to the container rather than to the tallest item.
  if (resolved.length === 1 && options.availableCross !== null && options.wrap === 'nowrap')
    resolved[0].crossSize = Math.max(resolved[0].crossSize, contentCross)

  const lineDistribution = distributeMain(
    options.alignContent,
    resolved.length > 1 ? crossFree : 0,
    resolved.length,
    options.crossGap,
  )

  const stretchLines = (options.alignContent === 'stretch' || options.alignContent === 'normal')
    && crossFree > 0
    && resolved.length > 1

  const out: FlexLineOutput[] = []
  let crossCursor = stretchLines ? 0 : lineDistribution.start
  let contentMain = 0

  for (const entry of resolved) {
    const lineCross = stretchLines
      ? entry.crossSize + crossFree / resolved.length
      : entry.crossSize

    const gaps = Math.max(0, entry.line.length - 1) * options.mainGap
    const usedMain = entry.line.reduce((total, item, i) => total + outerMain(item, entry.sizes[i]), 0) + gaps
    const mainFree = options.availableMain === null ? 0 : options.availableMain - usedMain

    // An `auto` margin takes the free space before `justify-content` can, so
    // `margin-left: auto` pushes an item to the end and leaves the container's
    // own alignment with nothing to distribute.
    const autoCount = entry.line.reduce(
      (count, item) => count + (item.autoMainStart ? 1 : 0) + (item.autoMainEnd ? 1 : 0),
      0,
    )
    const perAutoMargin = autoCount > 0 && mainFree > 0.001 ? mainFree / autoCount : 0

    const main = distributeMain(
      options.justifyContent,
      perAutoMargin > 0 ? 0 : mainFree,
      entry.line.length,
      options.mainGap,
    )

    let mainCursor = main.start
    const placed: FlexItemOutput[] = []

    entry.line.forEach((item, i) => {
      const mainSize = entry.sizes[i]
      const aligned = alignInLine(item, item.align, lineCross)

      if (item.autoMainStart)
        mainCursor += perAutoMargin

      placed.push({
        index: indexOf.get(item)!,
        mainStart: mainCursor + item.marginMainStart,
        crossStart: crossCursor + aligned.offset,
        mainSize,
        crossSize: aligned.size,
      })

      mainCursor += outerMain(item, mainSize)
      if (item.autoMainEnd)
        mainCursor += perAutoMargin
      if (i < entry.line.length - 1)
        mainCursor += main.between
    })

    contentMain = Math.max(contentMain, mainCursor)
    out.push({ items: placed, crossSize: lineCross })

    crossCursor += lineCross + (stretchLines ? options.crossGap : lineDistribution.between)
  }

  const usedCross = out.reduce((sum, line) => sum + line.crossSize, 0)
    + Math.max(0, out.length - 1) * options.crossGap

  return {
    lines: out,
    contentMain,
    contentCross: Math.max(contentCross, usedCross),
  }
}
