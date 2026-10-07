/**
 * Types for the layout pass.
 *
 * Positions used to be absent entirely: `getBoundingClientRect()` reported a
 * size at (0, 0), so nothing about overlap, ordering or hit testing could be
 * asked. This models normal flow well enough to answer those questions, and is
 * explicit about the parts it does not model.
 */

/** The four sides of a box's margin, padding or border, in pixels. */
export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

/** Which sides were declared `auto`, which only a margin can be. */
export interface AutoSides {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

/** One element's computed box, in viewport coordinates before scrolling. */
export interface LayoutBox {
  /** Border-box origin, relative to the initial containing block. */
  x: number
  y: number
  /** Border-box size: content plus padding plus border. */
  width: number
  height: number
  content: { width: number, height: number }
  padding: Insets
  border: Insets
  margin: Insets
  /** The extent of the content, which may exceed the padding box. */
  scrollWidth: number
  scrollHeight: number
  /** False for an element that generates no box at all. */
  rendered: boolean
  /** `position`, kept so `offsetParent` and hit testing can consult it. */
  position: string
  /** `pointer-events`, for hit testing. */
  pointerEvents: string
  /** True when the element or an ancestor is `visibility: hidden`. */
  invisible: boolean
  /** Paint order within the document, ascending. Later paints on top. */
  order: number
}

/** How a flex container arranges its line, and its items within it. */
export interface FlexContainerStyle {
  direction: string
  wrap: string
  justifyContent: string
  alignItems: string
  alignContent: string
  rowGap: number
  columnGap: number
}

/** How one flex item sizes and aligns itself. */
export interface FlexItemStyle {
  grow: number
  shrink: number
  /** The declared `flex-basis`, kept as text: `auto` and `content` are not lengths. */
  basis: string
  alignSelf: string
  order: number
}

/** How a grid container defines its tracks and places what goes in them. */
export interface GridContainerStyle {
  templateColumns: string
  templateRows: string
  templateAreas: string
  autoColumns: string
  autoRows: string
  autoFlow: string
  justifyContent: string
  alignContent: string
  justifyItems: string
  alignItems: string
  rowGap: number
  columnGap: number
}

/** Which lines one grid item asks for, and how it aligns in its area. */
export interface GridItemStyle {
  columnStart: string
  columnEnd: string
  rowStart: string
  rowEnd: string
  justifySelf: string
  alignSelf: string
}

/** The layout-relevant computed values for one element. */
export interface LayoutStyle {
  display: string
  position: string
  boxSizing: string
  overflow: string
  pointerEvents: string
  visibility: string
  fontSize: number
  /** The declared `font-family` list, for picking a metrics table. */
  fontFamily: string
  /** The declared `font-weight`, which decides regular or bold advances. */
  fontWeight: string
  lineHeight: number | null
  flexContainer: FlexContainerStyle
  flexItem: FlexItemStyle
  gridContainer: GridContainerStyle
  gridItem: GridItemStyle
  width: string
  height: string
  minWidth: string
  minHeight: string
  maxWidth: string
  maxHeight: string
  margin: Insets
  /**
   * The margins written as `auto`.
   *
   * They resolve to zero like anything unresolved, but a flex container gives
   * them the free space on their line before `justify-content` sees it — which
   * is what `margin-left: auto` is for.
   */
  autoMargin: AutoSides
  padding: Insets
  border: Insets
  offsets: { top: string, right: string, bottom: string, left: string }
}

/** A finished layout: one box per element that generated one. */
export type LayoutResult = Map<object, LayoutBox>

export const EMPTY_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 }

/**
 * The box reported for an element that generates none, and the value every
 * read falls back to before a layout pass has run.
 */
export const EMPTY_BOX: LayoutBox = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  content: { width: 0, height: 0 },
  padding: EMPTY_INSETS,
  border: EMPTY_INSETS,
  margin: EMPTY_INSETS,
  scrollWidth: 0,
  scrollHeight: 0,
  rendered: false,
  position: 'static',
  pointerEvents: 'auto',
  invisible: false,
  order: -1,
}
