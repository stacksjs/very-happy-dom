/**
 * Grid track sizing, placement and alignment.
 *
 * A grid container used to lay its children out as blocks, so they stacked
 * instead of being placed in cells.
 *
 * Like `flex.ts`, this is the arithmetic only: parsing a track list, deciding
 * which cells each item occupies, sizing the tracks, and saying where each item
 * goes. Measuring an item and laying its subtree out stay in `flow.ts`, which
 * keeps this pure and testable on its own.
 */

/** One component of a track's size. */
export type TrackSize =
  | { kind: 'length', px: number }
  | { kind: 'percent', fraction: number }
  | { kind: 'fr', factor: number }
  | { kind: 'auto' }
  | { kind: 'min-content' }
  | { kind: 'max-content' }

/** A track, as a `minmax()` pair — every form reduces to one. */
export interface Track {
  min: TrackSize
  max: TrackSize
}

/** Where an item sits, as zero-based track indices, end exclusive. */
export interface GridPlacement {
  columnStart: number
  columnEnd: number
  rowStart: number
  rowEnd: number
}

/** One item's line requests, as written. */
export interface GridItemLines {
  columnStart: string
  columnEnd: string
  rowStart: string
  rowEnd: string
}

const AUTO: TrackSize = { kind: 'auto' }

/** `auto` as a track: it can shrink to its content and grow to it as well. */
export const AUTO_TRACK: Track = { min: AUTO, max: AUTO }

/** Split a track list on whitespace, keeping `repeat(...)` and `minmax(...)` whole. */
function tokenise(value: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  let bracket = false

  for (const char of value) {
    if (char === '[') {
      bracket = true
      continue
    }
    if (char === ']') {
      bracket = false
      continue
    }
    // Named lines are parsed away rather than recorded: nothing here resolves a
    // line by name, and keeping them would make them look supported.
    if (bracket)
      continue

    if (char === '(')
      depth++
    else if (char === ')')
      depth = Math.max(0, depth - 1)

    if (depth === 0 && /\s/.test(char)) {
      if (current)
        parts.push(current)
      current = ''
      continue
    }

    current += char
  }

  if (current)
    parts.push(current)

  return parts
}

/** Parse one size component, or `null` when it is not one this models. */
function parseSize(value: string, resolve: (text: string) => number | null): TrackSize | null {
  const lower = value.trim().toLowerCase()

  if (lower === 'auto')
    return { kind: 'auto' }
  if (lower === 'min-content')
    return { kind: 'min-content' }
  if (lower === 'max-content')
    return { kind: 'max-content' }

  const fr = /^([+-]?(?:\d*\.)?\d+)fr$/i.exec(lower)
  if (fr)
    return { kind: 'fr', factor: Math.max(0, Number.parseFloat(fr[1])) }

  if (lower.endsWith('%')) {
    const percent = Number.parseFloat(lower)
    if (Number.isFinite(percent))
      return { kind: 'percent', fraction: percent / 100 }
  }

  const px = resolve(value)
  return px === null ? null : { kind: 'length', px }
}

/** Parse one entry of a track list into a track. */
function parseTrack(value: string, resolve: (text: string) => number | null): Track | null {
  const trimmed = value.trim()

  const minmax = /^minmax\((.*)\)$/i.exec(trimmed)
  if (minmax) {
    const [minText, maxText] = minmax[1].split(',')
    if (maxText === undefined)
      return null
    const min = parseSize(minText, resolve)
    const max = parseSize(maxText, resolve)
    if (!min || !max)
      return null
    // An `fr` minimum is invalid and means `auto`, as the spec says.
    return { min: min.kind === 'fr' ? AUTO : min, max }
  }

  const fitContent = /^fit-content\((.*)\)$/i.exec(trimmed)
  if (fitContent) {
    const limit = parseSize(fitContent[1], resolve)
    // Treated as `minmax(auto, <limit>)`, which is what it means short of the
    // clamping refinement.
    return limit ? { min: AUTO, max: limit } : null
  }

  const size = parseSize(trimmed, resolve)
  if (!size)
    return null

  // A single `fr` or intrinsic keyword has an `auto` minimum; a length is fixed.
  if (size.kind === 'fr' || size.kind === 'min-content' || size.kind === 'max-content')
    return { min: size.kind === 'fr' ? AUTO : size, max: size }

  return { min: size, max: size }
}

export interface TrackListOptions {
  /** Resolve a length to pixels, or `null` when it cannot be. */
  resolve: (text: string) => number | null
  /** The container's size along this axis, for `auto-fill`; `null` if indefinite. */
  available: number | null
  /** The gap between tracks, for working out how many `auto-fill` fits. */
  gap: number
}

/**
 * Parse `grid-template-columns` or `grid-template-rows`.
 *
 * `repeat(auto-fill, …)` needs the container's size to know how many fit, and
 * falls back to a single repetition when that size is indefinite. `auto-fit` is
 * parsed as `auto-fill`: collapsing the empty tracks it implies is not modelled.
 */
export function parseTrackList(value: string, options: TrackListOptions): Track[] {
  const trimmed = value.trim()
  if (trimmed === '' || trimmed.toLowerCase() === 'none')
    return []

  const tracks: Track[] = []

  for (const token of tokenise(trimmed)) {
    const repeat = /^repeat\((.*)\)$/i.exec(token)
    if (!repeat) {
      const track = parseTrack(token, options.resolve)
      if (track)
        tracks.push(track)
      continue
    }

    const comma = repeat[1].indexOf(',')
    if (comma === -1)
      continue

    const countText = repeat[1].slice(0, comma).trim().toLowerCase()
    const bodyTracks = tokenise(repeat[1].slice(comma + 1).trim())
      .map(entry => parseTrack(entry, options.resolve))
      .filter((track): track is Track => track !== null)

    if (bodyTracks.length === 0)
      continue

    let count: number
    if (countText === 'auto-fill' || countText === 'auto-fit') {
      count = autoRepeatCount(bodyTracks, options)
    }
    else {
      const parsed = Number.parseInt(countText, 10)
      count = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1000) : 0
    }

    for (let i = 0; i < count; i++)
      tracks.push(...bodyTracks.map(track => ({ ...track })))
  }

  return tracks
}

/** How many times an `auto-fill` pattern fits in the container. */
function autoRepeatCount(body: Track[], options: TrackListOptions): number {
  if (options.available === null)
    return 1

  // Only a definite size can be counted against; an intrinsic one cannot say
  // how many fit, so the pattern is taken once.
  let patternSize = 0
  for (const track of body) {
    const size = definiteSize(track.max, options.available) ?? definiteSize(track.min, options.available)
    if (size === null)
      return 1
    patternSize += size
  }

  if (patternSize <= 0)
    return 1

  const perPattern = patternSize + body.length * options.gap
  const fits = Math.floor((options.available + options.gap) / perPattern)
  return Math.max(1, Math.min(fits, 1000))
}

/** A size that needs no content measurement, or `null`. */
function definiteSize(size: TrackSize, available: number): number | null {
  if (size.kind === 'length')
    return size.px
  if (size.kind === 'percent')
    return size.fraction * available
  return null
}

/** One line request, resolved against a track count. */
function parseLine(value: string, explicitCount: number): { line: number | null, span: number } {
  const trimmed = value.trim().toLowerCase()

  if (trimmed === '' || trimmed === 'auto')
    return { line: null, span: 1 }

  const span = /^span\s+(\d+)$/.exec(trimmed)
  if (span)
    return { line: null, span: Math.max(1, Number.parseInt(span[1], 10)) }

  if (trimmed === 'span')
    return { line: null, span: 1 }

  const number = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(number) || number === 0)
    return { line: null, span: 1 }

  // A negative line counts back from the end of the explicit grid, so `-1` is
  // the last line — the usual way to say "stretch to the end".
  const resolved = number > 0 ? number : explicitCount + 2 + number
  return { line: resolved, span: 1 }
}

export interface PlacementOptions {
  columnCount: number
  rowCount: number
  /** `row` fills each row before moving on; `column` fills each column. */
  flow: string
  /** Areas by name, as `grid-template-areas` defined them. */
  areas: Map<string, GridPlacement>
}

/**
 * Decide which cells each item occupies.
 *
 * Items with both lines given are placed first, then the rest are auto-placed
 * into the first free run of cells, in order. `dense` packing is not modelled:
 * auto-placement never goes back to fill a hole it has passed.
 */
export function placeItems(items: GridItemLines[], options: PlacementOptions): GridPlacement[] {
  const byRow = options.flow !== 'column' && options.flow !== 'column dense'
  const placements: Array<GridPlacement | null> = items.map(() => null)
  const occupied = new Set<string>()

  const cell = (column: number, row: number): string => `${column}:${row}`

  const fill = (placement: GridPlacement): void => {
    for (let column = placement.columnStart; column < placement.columnEnd; column++) {
      for (let row = placement.rowStart; row < placement.rowEnd; row++)
        occupied.add(cell(column, row))
    }
  }

  const free = (placement: GridPlacement): boolean => {
    for (let column = placement.columnStart; column < placement.columnEnd; column++) {
      for (let row = placement.rowStart; row < placement.rowEnd; row++) {
        if (occupied.has(cell(column, row)))
          return false
      }
    }
    return true
  }

  /** Resolve one axis of one item into a start and an end, or `null` for auto. */
  const resolveAxis = (
    startText: string,
    endText: string,
    explicitCount: number,
  ): { start: number | null, span: number } => {
    const start = parseLine(startText, explicitCount)
    const end = parseLine(endText, explicitCount)

    if (start.line !== null && end.line !== null) {
      const from = Math.min(start.line, end.line)
      const to = Math.max(start.line, end.line)
      return { start: from - 1, span: Math.max(1, to - from) }
    }

    if (start.line !== null)
      return { start: start.line - 1, span: Math.max(start.span, end.span) }

    if (end.line !== null)
      return { start: Math.max(0, end.line - 1 - start.span), span: start.span }

    return { start: null, span: Math.max(start.span, end.span) }
  }

  // Named areas win over line numbers, since `grid-area: header` sets both.
  const named: Array<GridPlacement | null> = items.map((item) => {
    const area = options.areas.get(item.rowStart.trim())
    return area && item.rowStart.trim() === item.columnStart.trim() ? area : null
  })

  const axes = items.map((item, index) => {
    if (named[index])
      return null
    return {
      column: resolveAxis(item.columnStart, item.columnEnd, options.columnCount),
      row: resolveAxis(item.rowStart, item.rowEnd, options.rowCount),
    }
  })

  // Pass one: anything whose position is fully known.
  items.forEach((_, index) => {
    const area = named[index]
    if (area) {
      placements[index] = { ...area }
      fill(area)
      return
    }

    const axis = axes[index]!
    if (axis.column.start === null || axis.row.start === null)
      return

    const placement = {
      columnStart: axis.column.start,
      columnEnd: axis.column.start + axis.column.span,
      rowStart: axis.row.start,
      rowEnd: axis.row.start + axis.row.span,
    }
    placements[index] = placement
    fill(placement)
  })

  // Pass two: everything else, in document order, sharing one cursor.
  //
  // The cursor is what makes an explicitly-columned item affect what comes
  // after it: placing one moves the cursor to its column, so the next
  // auto-placed item starts looking from there rather than from where it would
  // have been. Without that, an item after `grid-column: 3` lands in the hole
  // the explicit one skipped instead of on the next row.
  let cursorColumn = 0
  let cursorRow = 0

  items.forEach((_, index) => {
    if (placements[index])
      return

    const axis = axes[index]!
    const columnSpan = axis.column.span
    const rowSpan = axis.row.span
    const columns = Math.max(options.columnCount, columnSpan, 1)
    const rows = Math.max(options.rowCount, rowSpan, 1)

    const take = (placement: GridPlacement): void => {
      placements[index] = placement
      fill(placement)
    }

    if (byRow) {
      // A definite column: the cursor moves there, wrapping to the next row if
      // that means going backwards.
      if (axis.column.start !== null) {
        if (axis.column.start < cursorColumn)
          cursorRow++
        cursorColumn = axis.column.start

        let row = cursorRow
        for (;;) {
          const candidate = {
            columnStart: axis.column.start,
            columnEnd: axis.column.start + columnSpan,
            rowStart: row,
            rowEnd: row + rowSpan,
          }
          if (free(candidate)) {
            take(candidate)
            cursorRow = row
            break
          }
          row++
        }
        return
      }

      for (;;) {
        if (cursorColumn + columnSpan > columns) {
          cursorColumn = 0
          cursorRow++
          continue
        }
        const candidate = {
          columnStart: cursorColumn,
          columnEnd: cursorColumn + columnSpan,
          rowStart: cursorRow,
          rowEnd: cursorRow + rowSpan,
        }
        if (free(candidate)) {
          take(candidate)
          cursorColumn += columnSpan
          break
        }
        cursorColumn++
      }
      return
    }

    // Column flow: the same, with the axes swapped.
    if (axis.row.start !== null) {
      if (axis.row.start < cursorRow)
        cursorColumn++
      cursorRow = axis.row.start

      let column = cursorColumn
      for (;;) {
        const candidate = {
          columnStart: column,
          columnEnd: column + columnSpan,
          rowStart: axis.row.start,
          rowEnd: axis.row.start + rowSpan,
        }
        if (free(candidate)) {
          take(candidate)
          cursorColumn = column
          break
        }
        column++
      }
      return
    }

    for (;;) {
      if (cursorRow + rowSpan > rows) {
        cursorRow = 0
        cursorColumn++
        continue
      }
      const candidate = {
        columnStart: cursorColumn,
        columnEnd: cursorColumn + columnSpan,
        rowStart: cursorRow,
        rowEnd: cursorRow + rowSpan,
      }
      if (free(candidate)) {
        take(candidate)
        cursorRow += rowSpan
        break
      }
      cursorRow++
    }
  })

  return placements as GridPlacement[]
}

/** Parse `grid-template-areas` into a name-to-cells map, and the row count. */
export function parseAreas(value: string): { areas: Map<string, GridPlacement>, rows: number, columns: number } {
  const areas = new Map<string, GridPlacement>()
  const rows = value.match(/"[^"]*"|'[^']*'/g) ?? []
  let columns = 0

  rows.forEach((rowText, rowIndex) => {
    const names = rowText.slice(1, -1).trim().split(/\s+/).filter(name => name !== '')
    columns = Math.max(columns, names.length)

    names.forEach((name, columnIndex) => {
      if (name === '.')
        return

      const existing = areas.get(name)
      if (!existing) {
        areas.set(name, {
          columnStart: columnIndex,
          columnEnd: columnIndex + 1,
          rowStart: rowIndex,
          rowEnd: rowIndex + 1,
        })
        return
      }

      // A name repeated across cells spans them all.
      existing.columnStart = Math.min(existing.columnStart, columnIndex)
      existing.columnEnd = Math.max(existing.columnEnd, columnIndex + 1)
      existing.rowStart = Math.min(existing.rowStart, rowIndex)
      existing.rowEnd = Math.max(existing.rowEnd, rowIndex + 1)
    })
  })

  return { areas, rows: rows.length, columns }
}

export interface SizingOptions {
  /** The container's content size along this axis, or `null` when indefinite. */
  available: number | null
  gap: number
  /**
   * The largest content size any item spanning only this track needs, by track
   * index. Used for `auto`, `min-content` and `max-content` tracks.
   */
  contributions: number[]
  /**
   * Whether leftover space should be shared out among the `auto` tracks.
   *
   * True for `justify-content`/`align-content` of `normal` or `stretch`, which
   * is the initial value. Only `auto` tracks stretch — a fixed or `fr` track
   * does not — which is what gives two implicit columns half the container
   * each rather than nothing at all.
   */
  stretchAuto: boolean
}

/**
 * Size a list of tracks.
 *
 * Definite sizes first, then the intrinsic ones from their items'
 * contributions, then whatever is left over goes to the `fr` tracks in
 * proportion. With no space left over an `fr` track falls back to its content,
 * which is what keeps a `1fr` column from collapsing in a container that has no
 * definite width.
 */
export function sizeTracks(tracks: Track[], options: SizingOptions): number[] {
  const basis = options.available ?? 0
  const sizes = tracks.map((track, index) => {
    const contribution = options.contributions[index] ?? 0

    const definite = definiteSize(track.max, basis)
    if (definite !== null)
      return Math.max(definite, definiteSize(track.min, basis) ?? 0)

    // An `fr` track starts at its minimum and takes free space later. Its
    // content is deliberately not the base: `1fr` means `minmax(auto, 1fr)`,
    // and treating that automatic minimum as the item's max-content let a
    // single auto-width child claim the whole container before any sharing out.
    // The refinement this gives up is an `fr` track refusing to shrink below
    // its content.
    if (track.max.kind === 'fr')
      return definiteSize(track.min, basis) ?? 0

    return Math.max(contribution, definiteSize(track.min, basis) ?? 0)
  })

  if (options.available === null)
    return sizes

  const gaps = Math.max(0, tracks.length - 1) * options.gap
  const used = sizes.reduce((total, size) => total + size, 0) + gaps
  const free = options.available - used

  if (free <= 0)
    return sizes

  const frTotal = tracks.reduce((total, track) => total + (track.max.kind === 'fr' ? track.max.factor : 0), 0)
  if (frTotal > 0) {
    tracks.forEach((track, index) => {
      if (track.max.kind !== 'fr')
        return
      sizes[index] += free * (track.max.factor / frTotal)
    })
    return sizes
  }

  // No `fr` track to absorb the slack, so the `auto` tracks share it equally.
  if (!options.stretchAuto)
    return sizes

  const autoTracks = tracks.reduce((count, track) => count + (track.max.kind === 'auto' ? 1 : 0), 0)
  if (autoTracks === 0)
    return sizes

  const each = free / autoTracks
  tracks.forEach((track, index) => {
    if (track.max.kind === 'auto')
      sizes[index] += each
  })

  return sizes
}

/** Offsets for each track, given its size, the gap and how to distribute slack. */
export function trackOffsets(
  sizes: number[],
  gap: number,
  available: number | null,
  distribute: string,
): { offsets: number[], total: number } {
  const content = sizes.reduce((total, size) => total + size, 0) + Math.max(0, sizes.length - 1) * gap
  const free = available === null ? 0 : Math.max(0, available - content)

  let start = 0
  let between = gap

  if (free > 0.001 && sizes.length > 0) {
    switch (distribute) {
      case 'end':
      case 'flex-end':
      case 'right':
        start = free
        break
      case 'center':
        start = free / 2
        break
      case 'space-between':
        if (sizes.length > 1)
          between = gap + free / (sizes.length - 1)
        break
      case 'space-around':
        start = free / sizes.length / 2
        between = gap + free / sizes.length
        break
      case 'space-evenly':
        start = free / (sizes.length + 1)
        between = gap + free / (sizes.length + 1)
        break
      default:
        break
    }
  }

  const offsets: number[] = []
  let cursor = start
  sizes.forEach((size, index) => {
    offsets.push(cursor)
    cursor += size + (index < sizes.length - 1 ? between : 0)
  })

  return { offsets, total: cursor }
}
