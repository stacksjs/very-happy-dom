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

/** The layout-relevant computed values for one element. */
export interface LayoutStyle {
  display: string
  position: string
  boxSizing: string
  overflow: string
  pointerEvents: string
  visibility: string
  fontSize: number
  lineHeight: number | null
  width: string
  height: string
  minWidth: string
  minHeight: string
  maxWidth: string
  maxHeight: string
  margin: Insets
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
