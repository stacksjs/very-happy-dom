/**
 * The layout pass, and the reads that depend on it.
 *
 * A document is laid out whole, on demand, and cached until something changes.
 * One element's position depends on every preceding sibling's height, which
 * depends on their whole subtrees, so there is no cheaper unit of work than the
 * document — and no point recomputing it per property read.
 *
 * Staleness is the risk a cache like this carries, so the key is made of
 * everything that can move a box: a version the document bumps on any DOM
 * mutation, the viewport, and a revision the CSSOM bumps when a rule changes.
 * `test/layout-invalidation.test.ts` walks every route that should bump one.
 */

import { CSSOM_REVISION } from '../css/CSSOM'
import { layoutTree } from './flow'
import { EMPTY_BOX, type LayoutBox, type LayoutResult } from './types'

/** The parts of a document this module needs, kept structural to avoid a cycle. */
interface LayoutDocument {
  documentElement?: any
  defaultView?: any
  _layoutVersion?: number
  _layoutCache?: { key: string, boxes: LayoutResult } | null
}

interface LayoutElement {
  ownerDocument?: any
  isConnected: boolean
  parentElement?: LayoutElement | null
  tagName?: string
  scrollTop?: number
  scrollLeft?: number
}

/** Bump a document's layout version, so the next read lays it out again. */
export function invalidateLayout(document: LayoutDocument | null | undefined): void {
  if (document)
    document._layoutVersion = (document._layoutVersion ?? 0) + 1
}

function viewportOf(document: LayoutDocument): { width: number, height: number } {
  const view = document.defaultView
  return {
    width: typeof view?.innerWidth === 'number' ? view.innerWidth : 1024,
    height: typeof view?.innerHeight === 'number' ? view.innerHeight : 768,
  }
}

/**
 * The root font size, for `rem`.
 *
 * Exported because anything that resolves lengths outside the layout pass — the
 * screenshot renderer builds its own basis — has to start from the same number,
 * or `rem` means one thing in a box read and another in a screenshot.
 */
export function rootFontSizeOf(document: LayoutDocument): number {
  const root = document.documentElement
  if (!root?._styleReader)
    return 16

  const declared = root._styleReader()('font-size')
  const match = /^([+-]?(?:\d*\.)?\d+)px$/i.exec(declared.trim())
  return match ? Number.parseFloat(match[1]) : 16
}

/**
 * The media conditions the cascade is resolved under, as a cache key fragment.
 *
 * `emulateMedia({ colorScheme: 'dark' })` changes which `@media` blocks apply,
 * which changes the boxes, and nothing about the DOM or the CSSOM moved — so
 * without this the next read answers from a stale layout.
 */
function mediaSignature(document: LayoutDocument): string {
  const context = document.defaultView?._mediaContext?.()
  if (!context)
    return ''

  return `${context.colorScheme}|${context.reducedMotion}|${context.forcedColors}|${context.type}`
}

/** Lay the document out if the cache is stale, and return every box. */
function boxesFor(document: LayoutDocument): LayoutResult {
  const viewport = viewportOf(document)
  const key = [
    document._layoutVersion ?? 0,
    `${viewport.width}x${viewport.height}`,
    CSSOM_REVISION.value,
    mediaSignature(document),
  ].join('|')

  const cached = document._layoutCache
  if (cached && cached.key === key)
    return cached.boxes

  const root = document.documentElement
  const boxes = root
    ? layoutTree(root, {
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        rootFontSize: rootFontSizeOf(document),
      })
    : new Map()

  document._layoutCache = { key, boxes }
  return boxes
}

/**
 * The laid-out box for an element, or `null` when layout does not describe it.
 *
 * `null` means the caller should fall back: an element outside a document has
 * no place in any flow, but its declared size is still reported, which is the
 * contract that predates layout.
 */
export function boxFor(element: LayoutElement): LayoutBox | null {
  if (!element.isConnected)
    return null

  const document = element.ownerDocument as LayoutDocument | undefined
  if (!document?.documentElement)
    return null

  return boxesFor(document).get(element as object) ?? null
}

/** The box, or an empty one — for a caller that wants numbers either way. */
export function boxOrEmpty(element: LayoutElement): LayoutBox {
  return boxFor(element) ?? EMPTY_BOX
}

/**
 * How far an element has been scrolled by its ancestors.
 *
 * `getBoundingClientRect()` is viewport-relative, and layout computes positions
 * in the document, so the scroll offsets between the two have to come off.
 */
export function scrollOffsetFor(element: LayoutElement): { x: number, y: number } {
  let x = 0
  let y = 0

  let current = element.parentElement
  while (current) {
    x += current.scrollLeft ?? 0
    y += current.scrollTop ?? 0
    current = current.parentElement ?? null
  }

  const view = (element.ownerDocument as LayoutDocument | undefined)?.defaultView
  if (view) {
    x += typeof view.scrollX === 'number' ? view.scrollX : 0
    y += typeof view.scrollY === 'number' ? view.scrollY : 0
  }

  return { x, y }
}

/**
 * The element an `offsetTop` is measured against: the nearest positioned
 * ancestor, or the body.
 *
 * `null` for an element that is not rendered, and for the root and the body
 * themselves — a browser answers `null` there too.
 */
export function offsetParentFor(element: LayoutElement): LayoutElement | null {
  const box = boxFor(element)
  if (!box || !box.rendered || box.position === 'fixed')
    return null

  const tag = element.tagName
  if (tag === 'BODY' || tag === 'HTML')
    return null

  const body = (element.ownerDocument as any)?.body ?? null

  let current = element.parentElement
  while (current) {
    const parentBox = boxFor(current)
    if (parentBox?.rendered && parentBox.position !== 'static')
      return current
    if (current === body)
      return body
    current = current.parentElement ?? null
  }

  return body
}

/**
 * Every rendered element whose border box contains the point, topmost first.
 *
 * Paint order stands in for a stacking context: a box laid out later paints
 * over one laid out earlier, which is document order. `z-index` is not
 * consulted, so a page that reorders its layers with it is hit tested as though
 * it had not.
 */
export function elementsFromPointIn(document: LayoutDocument, x: number, y: number): LayoutElement[] {
  const viewport = viewportOf(document)
  if (x < 0 || y < 0 || x > viewport.width || y > viewport.height)
    return []

  const boxes = boxesFor(document)
  const hits: Array<{ element: LayoutElement, order: number }> = []

  for (const [node, box] of boxes) {
    if (!box.rendered || box.invisible || box.pointerEvents === 'none')
      continue
    if (x < box.x || x > box.x + box.width || y < box.y || y > box.y + box.height)
      continue

    hits.push({ element: node as LayoutElement, order: box.order })
  }

  // Later in paint order sits on top, so the deepest, latest box comes first.
  hits.sort((a, b) => b.order - a.order)
  return hits.map(hit => hit.element)
}

export { EMPTY_BOX }
export type { LayoutBox }
