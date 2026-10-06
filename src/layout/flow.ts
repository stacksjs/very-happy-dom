/**
 * Normal flow.
 *
 * Block-level boxes stack down their containing block, each filling its width
 * unless it declares one. Inline boxes flow along a line and wrap when the line
 * runs out. That is the whole model, and it is enough to answer what positions
 * are usually asked for: does A sit above B, do these two overlap, is this
 * point inside that box, is this above the fold.
 *
 * What it does not model, and reports plainly rather than approximating badly:
 *
 * - **Flex and grid.** A flex container lays its children out as blocks, so
 *   they stack instead of sitting in a row. Most app markup is flex, so this is
 *   the biggest gap.
 * - **Margin collapsing.** Adjacent vertical margins add up here; a browser
 *   collapses them to the larger. Every vertical position below two stacked
 *   siblings with margins is therefore further down than a browser would say.
 * - **Floats.** Not implemented. A floated box stays in flow.
 * - **Text metrics.** There is no font engine, so a line count is estimated
 *   from the character count. An element whose height comes only from wrapped
 *   text is approximate.
 * - **A user-agent stylesheet.** An element has only the margins and padding
 *   the page declares, so `body` starts at (0, 0) rather than a browser's 8px
 *   inset, and a `<p>` has no margins of its own.
 * - **Transforms.** `transform` does not move or resize a box.
 * - **Intrinsic sizes.** Nothing is decoded or measured, so an `<img>` with no
 *   declared size has no size.
 */

import { clampSize, type LengthBasis, resolveLength } from './length'
import { resolveLayoutStyle, type StyledElement } from './style'
import { EMPTY_INSETS, type Insets, type LayoutBox, type LayoutResult, type LayoutStyle } from './types'

/** The parts of a node the flow needs, kept structural to avoid a cycle. */
interface FlowNode {
  nodeType: number
  childNodes: FlowNode[]
  nodeValue?: string | null
  tagName?: string
  _styleReader?: () => (property: string) => string
}

const ELEMENT = 1
const TEXT = 3

/**
 * Average glyph width as a fraction of the font size.
 *
 * A stand-in for font metrics. Chosen to match the screenshot renderer, which
 * has been estimating text this way since before layout existed, so the two
 * agree about how tall a paragraph is.
 */
const GLYPH_WIDTH_RATIO = 0.5

/** Line height when `line-height` is `normal`, as a multiple of the font size. */
const NORMAL_LINE_HEIGHT = 1.2

/** Tags whose content is not rendered, so they take part in no flow. */
const NOT_RENDERED = new Set(['SCRIPT', 'STYLE', 'HEAD', 'TITLE', 'META', 'LINK', 'BASE', 'TEMPLATE'])

/** Display values that take part in inline flow rather than block flow. */
const INLINE_LEVEL = new Set(['inline', 'inline-block', 'inline-flex', 'inline-grid', 'inline-table'])

// Anything not inline-level is laid out as a block, which is why `flex`, `grid`
// and the table displays stack their children instead of arranging them.

interface Context {
  boxes: LayoutResult
  viewportWidth: number
  viewportHeight: number
  rootFontSize: number
  /** Incremented per box so paint order is recoverable for hit testing. */
  order: number
  /** Out-of-flow boxes to place once their containing block is known. */
  deferred: Array<{ node: FlowNode, style: LayoutStyle, ancestors: FlowNode[], staticX: number, staticY: number }>
  /**
   * The last resolved style per element, for this pass.
   *
   * Resolving means matching every rule against the element, and the flow asks
   * for the same element's style more than once — to decide whether it is block
   * or inline, then again to lay it out, and again when measuring an intrinsic
   * width. Those asks are consecutive and share a containing width, so one slot
   * per element captures the reuse; a map keyed by width would allocate a
   * second map per element to hold a single entry.
   *
   * The width is part of what is stored because percentages resolve against it:
   * a different containing block is a different answer, not a cache hit.
   */
  styles: Map<FlowNode, { width: number, style: LayoutStyle }>
}

function basisFor(context: Context, basis: number): LengthBasis {
  return {
    basis,
    viewportWidth: context.viewportWidth,
    viewportHeight: context.viewportHeight,
    rootFontSize: context.rootFontSize,
  }
}

/** The element's resolved style for this containing width, matched once. */
function styleFor(context: Context, node: FlowNode, containingWidth: number): LayoutStyle {
  const cached = context.styles.get(node)
  if (cached && cached.width === containingWidth)
    return cached.style

  const style = resolveLayoutStyle(node as unknown as StyledElement, basisFor(context, containingWidth))
  context.styles.set(node, { width: containingWidth, style })
  return style
}

function isElement(node: FlowNode): boolean {
  return node.nodeType === ELEMENT && typeof node._styleReader === 'function'
}

/** Text that contributes to a line, with runs of whitespace collapsed. */
function renderedText(node: FlowNode): string {
  return (node.nodeValue ?? '').replace(/\s+/g, ' ')
}

/** The estimated width of a text run at a given font size. */
function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * GLYPH_WIDTH_RATIO
}

function lineHeightOf(style: LayoutStyle): number {
  return style.lineHeight ?? style.fontSize * NORMAL_LINE_HEIGHT
}

/**
 * Resolve a length, but treat a percentage as unresolved.
 *
 * A percentage height against a containing block whose own height is `auto`
 * computes to `auto`, rather than to a fraction of something indefinite.
 */
function absoluteOnly(value: string, basis: LengthBasis): number | null {
  return value.trim().endsWith('%') ? null : resolveLength(value, basis)
}

/** Sum of a box's horizontal padding and border. */
function horizontalSurrounds(style: LayoutStyle): number {
  return style.padding.left + style.padding.right + style.border.left + style.border.right
}

function verticalSurrounds(style: LayoutStyle): number {
  return style.padding.top + style.padding.bottom + style.border.top + style.border.bottom
}

/**
 * The content width of a block-level box whose `width` is `auto`: whatever is
 * left of its containing block once its own margins, padding and border are
 * taken out.
 */
function autoContentWidth(style: LayoutStyle, containingWidth: number): number {
  const available = containingWidth - style.margin.left - style.margin.right - horizontalSurrounds(style)
  return Math.max(0, available)
}

/**
 * The width an inline-level box with `width: auto` takes: its content's own
 * width, never more than the room available.
 *
 * `width` does not apply to a non-replaced inline box at all, and an
 * `inline-block` shrinks to fit. Filling the containing block the way a block
 * does would report an empty `<span>` as the full width of the viewport.
 *
 * Measured without recording any boxes, so the real layout still runs once and
 * paint order is not disturbed by the measurement.
 */
function intrinsicWidth(context: Context, node: FlowNode, available: number): number {
  let widest = 0
  let lineWidth = 0

  for (const child of node.childNodes) {
    if (child.nodeType === TEXT) {
      const text = renderedText(child)
      if (text.trim() === '')
        continue

      const style = styleFor(context, node, available)
      lineWidth += textWidth(text, style.fontSize)
      widest = Math.max(widest, lineWidth)
      continue
    }

    if (!isElement(child))
      continue

    const childStyle = styleFor(context, child, available)
    if (childStyle.display === 'none' || NOT_RENDERED.has(child.tagName ?? ''))
      continue
    if (childStyle.position === 'absolute' || childStyle.position === 'fixed')
      continue

    const surrounds = horizontalSurrounds(childStyle) + childStyle.margin.left + childStyle.margin.right
    const declared = resolveLength(childStyle.width, basisFor(context, available))

    const own = declared !== null
      ? (childStyle.boxSizing === 'border-box' ? declared : declared + surrounds)
      : INLINE_LEVEL.has(childStyle.display)
        ? intrinsicWidth(context, child, Math.max(0, available - surrounds)) + surrounds
        // A block child of a shrink-to-fit box takes all the room there is,
        // which is what makes the box itself take it.
        : available

    if (INLINE_LEVEL.has(childStyle.display)) {
      lineWidth += own
      widest = Math.max(widest, lineWidth)
    }
    else {
      lineWidth = 0
      widest = Math.max(widest, own)
    }
  }

  return Math.min(available, widest)
}

/** Resolve a declared `width` into a content width, honouring `box-sizing`. */
function contentWidthFrom(declared: number, style: LayoutStyle): number {
  if (style.boxSizing !== 'border-box')
    return Math.max(0, declared)
  return Math.max(0, declared - horizontalSurrounds(style))
}

function contentHeightFrom(declared: number, style: LayoutStyle): number {
  if (style.boxSizing !== 'border-box')
    return Math.max(0, declared)
  return Math.max(0, declared - verticalSurrounds(style))
}

function emptyBoxFor(style: LayoutStyle, order: number): LayoutBox {
  return {
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
    position: style.position,
    pointerEvents: style.pointerEvents,
    invisible: true,
    order,
  }
}

/** Mark a subtree as generating no boxes, so every descendant reads as zero. */
function markSubtreeEmpty(context: Context, node: FlowNode, style: LayoutStyle): void {
  context.boxes.set(node as object, emptyBoxFor(style, context.order++))

  for (const child of node.childNodes) {
    if (!isElement(child))
      continue
    const childStyle = styleFor(context, child, 0)
    markSubtreeEmpty(context, child, childStyle)
  }
}

/**
 * Lay one element out and return its outer height — the border box plus the
 * vertical margins, which is what the caller advances its cursor by.
 */
function layoutBox(
  context: Context,
  node: FlowNode,
  containingWidth: number,
  containingHeight: number | null,
  x: number,
  y: number,
  inheritedInvisible: boolean,
  ancestors: FlowNode[],
): LayoutBox {
  const style = styleFor(context, node, containingWidth)

  if (style.display === 'none' || NOT_RENDERED.has(node.tagName ?? '')) {
    markSubtreeEmpty(context, node, style)
    return context.boxes.get(node as object)!
  }

  const order = context.order++
  const invisible = inheritedInvisible || style.visibility === 'hidden' || style.visibility === 'collapse'
  const basis = basisFor(context, containingWidth)

  // --- width -------------------------------------------------------------
  const declaredWidth = resolveLength(style.width, basis)
  let contentWidth: number
  if (declaredWidth !== null) {
    contentWidth = contentWidthFrom(declaredWidth, style)
  }
  else if (INLINE_LEVEL.has(style.display)) {
    contentWidth = intrinsicWidth(context, node, autoContentWidth(style, containingWidth))
  }
  else {
    contentWidth = autoContentWidth(style, containingWidth)
  }

  // min/max clamp the content width, adjusted for box-sizing the same way.
  const clampedOuter = clampSize(
    style.boxSizing === 'border-box' ? contentWidth + horizontalSurrounds(style) : contentWidth,
    style.minWidth,
    style.maxWidth,
    basis,
  )
  contentWidth = style.boxSizing === 'border-box'
    ? Math.max(0, clampedOuter - horizontalSurrounds(style))
    : clampedOuter

  // --- height ------------------------------------------------------------
  // Resolved before the children, because a definite height is what their own
  // percentage heights resolve against. A percentage against an indefinite
  // containing block computes to `auto` instead — a fraction of something
  // indefinite is not a number.
  const heightBasis = containingHeight === null ? null : basisFor(context, containingHeight)
  const declaredHeight = heightBasis === null
    ? absoluteOnly(style.height, basis)
    : resolveLength(style.height, heightBasis)
  const definiteContentHeight = declaredHeight === null ? null : contentHeightFrom(declaredHeight, style)

  // --- children ----------------------------------------------------------
  const contentX = x + style.border.left + style.padding.left
  const contentY = y + style.border.top + style.padding.top
  const children = layoutChildren(context, node, contentWidth, definiteContentHeight, contentX, contentY, invisible, ancestors)

  let contentHeight = definiteContentHeight ?? children.height

  const clampedHeight = clampSize(
    style.boxSizing === 'border-box' ? contentHeight + verticalSurrounds(style) : contentHeight,
    style.minHeight,
    style.maxHeight,
    heightBasis ?? basisFor(context, context.viewportHeight),
  )
  contentHeight = style.boxSizing === 'border-box'
    ? Math.max(0, clampedHeight - verticalSurrounds(style))
    : clampedHeight

  const width = contentWidth + horizontalSurrounds(style)
  const height = contentHeight + verticalSurrounds(style)

  // --- relative offsets --------------------------------------------------
  // A relatively positioned box moves without affecting anything around it,
  // so this happens after the flow has placed it.
  let offsetX = 0
  let offsetY = 0
  if (style.position === 'relative') {
    const left = resolveLength(style.offsets.left, basis)
    const right = resolveLength(style.offsets.right, basis)
    const verticalBasis = heightBasis ?? basisFor(context, context.viewportHeight)
    const top = resolveLength(style.offsets.top, verticalBasis)
    const bottom = resolveLength(style.offsets.bottom, verticalBasis)

    offsetX = left ?? (right === null ? 0 : -right)
    offsetY = top ?? (bottom === null ? 0 : -bottom)
  }

  const box: LayoutBox = {
    x: x + offsetX,
    y: y + offsetY,
    width,
    height,
    content: { width: contentWidth, height: contentHeight },
    padding: style.padding,
    border: style.border,
    margin: style.margin,
    scrollWidth: Math.max(contentWidth + style.padding.left + style.padding.right, children.scrollWidth),
    scrollHeight: Math.max(contentHeight + style.padding.top + style.padding.bottom, children.scrollHeight),
    rendered: true,
    position: style.position,
    pointerEvents: style.pointerEvents,
    invisible,
    order,
  }

  context.boxes.set(node as object, box)

  // A relative shift moves the subtree with it, which the children were laid
  // out before knowing about.
  if (offsetX !== 0 || offsetY !== 0)
    shiftSubtree(context, node, offsetX, offsetY)

  return box
}

/** Move an already-placed subtree, for a relative offset or an out-of-flow box. */
function shiftSubtree(context: Context, node: FlowNode, dx: number, dy: number): void {
  for (const child of node.childNodes) {
    if (!isElement(child))
      continue

    const box = context.boxes.get(child as object)
    if (box && box.rendered) {
      box.x += dx
      box.y += dy
    }

    shiftSubtree(context, child, dx, dy)
  }
}

interface ChildrenResult {
  height: number
  scrollWidth: number
  scrollHeight: number
}

/**
 * Lay a node's children out inside its content box.
 *
 * Block-level children each take a line of their own; inline-level children and
 * text share a line until it is full.
 */
function layoutChildren(
  context: Context,
  node: FlowNode,
  contentWidth: number,
  contentHeight: number | null,
  contentX: number,
  contentY: number,
  invisible: boolean,
  ancestors: FlowNode[],
): ChildrenResult {
  let cursorY = contentY
  let maxRight = contentX
  let maxBottom = contentY

  // The line currently being filled: where it starts, how much it has used,
  // and how tall the tallest thing on it is.
  let lineWidth = 0
  let lineHeight = 0

  const endLine = (): void => {
    if (lineHeight === 0 && lineWidth === 0)
      return
    cursorY += lineHeight
    maxBottom = Math.max(maxBottom, cursorY)
    lineWidth = 0
    lineHeight = 0
  }

  for (const child of node.childNodes) {
    if (child.nodeType === TEXT) {
      const text = renderedText(child)
      if (text.trim() === '')
        continue

      // Text takes its font from the element containing it.
      const style = styleFor(context, node, contentWidth)
      const perLine = lineHeightOf(style)
      const width = textWidth(text, style.fontSize)
      const roomOnLine = Math.max(0, contentWidth - lineWidth)

      if (width <= roomOnLine) {
        lineWidth += width
        lineHeight = Math.max(lineHeight, perLine)
        maxRight = Math.max(maxRight, contentX + lineWidth)
        continue
      }

      // Wrap: finish the line in progress, then take as many full lines as the
      // run needs. The last partial line stays open for whatever follows.
      endLine()
      const lines = contentWidth > 0 ? Math.max(1, Math.ceil(width / contentWidth)) : 1
      cursorY += (lines - 1) * perLine
      lineWidth = width - (lines - 1) * contentWidth
      lineHeight = perLine
      maxRight = Math.max(maxRight, contentX + Math.min(width, contentWidth))
      maxBottom = Math.max(maxBottom, cursorY + perLine)
      continue
    }

    if (!isElement(child))
      continue

    const childStyle = styleFor(context, child, contentWidth)

    if (childStyle.display === 'none' || NOT_RENDERED.has(child.tagName ?? '')) {
      markSubtreeEmpty(context, child, childStyle)
      continue
    }

    // Out of flow: placed later, against its containing block, and it does not
    // move the cursor.
    if (childStyle.position === 'absolute' || childStyle.position === 'fixed') {
      // The containing block cannot be read yet: this element's own box is set
      // only once its children are done. The chain is recorded instead and
      // resolved in `placeDeferred`, which also lets the nearest POSITIONED
      // ancestor be found rather than assuming the parent is it.
      context.deferred.push({
        node: child,
        style: childStyle,
        ancestors: [node, ...ancestors],
        staticX: contentX + lineWidth,
        staticY: cursorY,
      })
      continue
    }

    if (INLINE_LEVEL.has(childStyle.display)) {
      const probe = layoutBox(context, child, contentWidth, contentHeight, contentX, cursorY, invisible, [node, ...ancestors])
      const outerWidth = probe.width + childStyle.margin.left + childStyle.margin.right

      if (lineWidth > 0 && lineWidth + outerWidth > contentWidth) {
        endLine()
        // Re-place it at the start of the new line.
        const dx = contentX - probe.x
        const dy = cursorY - probe.y
        probe.x += dx
        probe.y += dy
        shiftSubtree(context, child, dx, dy)
      }
      else {
        const dx = contentX + lineWidth + childStyle.margin.left - probe.x
        if (dx !== 0) {
          probe.x += dx
          shiftSubtree(context, child, dx, 0)
        }
      }

      lineWidth += outerWidth
      lineHeight = Math.max(lineHeight, probe.height + childStyle.margin.top + childStyle.margin.bottom)
      maxRight = Math.max(maxRight, probe.x + probe.width)
      maxBottom = Math.max(maxBottom, probe.y + probe.height)
      continue
    }

    // Block level: ends any line in progress and takes one of its own.
    endLine()

    const childY = cursorY + childStyle.margin.top
    const childX = contentX + childStyle.margin.left
    const box = layoutBox(context, child, contentWidth, contentHeight, childX, childY, invisible, [node, ...ancestors])

    cursorY = childY + box.height + childStyle.margin.bottom
    maxRight = Math.max(maxRight, box.x + box.width)
    maxBottom = Math.max(maxBottom, box.y + box.height)
  }

  endLine()

  return {
    height: Math.max(0, Math.max(cursorY, maxBottom) - contentY),
    scrollWidth: Math.max(0, maxRight - contentX),
    scrollHeight: Math.max(0, maxBottom - contentY),
  }
}

/**
 * Place the out-of-flow boxes.
 *
 * Each is positioned against its containing block's padding box, using whatever
 * offsets it declares. An `auto` offset keeps the position the box would have
 * had in flow, which is the static position a browser uses — approximately,
 * since the flow it was removed from never reserved space for it.
 */
function placeDeferred(context: Context): void {
  // Taken as a snapshot: laying one out can defer more of its own.
  while (context.deferred.length > 0) {
    const pending = context.deferred.splice(0)

    for (const { node, style, ancestors, staticX, staticY } of pending) {
      // The containing block of an absolutely positioned box is its nearest
      // positioned ancestor — not its parent, which is what makes the common
      // `position: relative` wrapper work. A `fixed` box takes the viewport.
      const containing = style.position === 'fixed' ? null : containingBlockFor(context, ancestors)

      const containingWidth = containing?.content.width ?? context.viewportWidth
      const containingHeight = containing?.content.height ?? context.viewportHeight
      const basis = basisFor(context, containingWidth)

      const left = resolveLength(style.offsets.left, basis)
      const right = resolveLength(style.offsets.right, basis)
      const top = resolveLength(style.offsets.top, basisFor(context, containingHeight))
      const bottom = resolveLength(style.offsets.bottom, basisFor(context, containingHeight))

      // Offsets are measured from the containing block's PADDING box, so the
      // border is crossed but the padding is not.
      const originX = containing ? containing.x + containing.border.left : 0
      const originY = containing ? containing.y + containing.border.top : 0
      const boxWidth = containing ? containing.content.width + containing.padding.left + containing.padding.right : context.viewportWidth
      const boxHeight = containing ? containing.content.height + containing.padding.top + containing.padding.bottom : context.viewportHeight

      const box = layoutBox(context, node, containingWidth, containingHeight, staticX, staticY, containing?.invisible ?? false, ancestors)
      if (!box.rendered)
        continue

      let targetX = box.x
      let targetY = box.y

      if (left !== null)
        targetX = originX + left
      else if (right !== null)
        targetX = originX + boxWidth - right - box.width

      if (top !== null)
        targetY = originY + top
      else if (bottom !== null)
        targetY = originY + boxHeight - bottom - box.height

      const dx = targetX - box.x
      const dy = targetY - box.y
      if (dx !== 0 || dy !== 0) {
        box.x = targetX
        box.y = targetY
        shiftSubtree(context, node, dx, dy)
      }
    }
  }
}

/**
 * The nearest positioned ancestor's box, which an absolutely positioned box is
 * placed against. `null` when nothing in the chain is positioned, so the
 * initial containing block — the viewport — is used.
 */
function containingBlockFor(context: Context, ancestors: FlowNode[]): LayoutBox | null {
  for (const ancestor of ancestors) {
    const box = context.boxes.get(ancestor as object)
    if (box?.rendered && box.position !== 'static')
      return box
  }
  return null
}

/**
 * Lay a document out, from the root down.
 *
 * The initial containing block is the viewport, so a block-level element with
 * no declared width fills it — which is why a plain `<div>` reports the
 * viewport's width rather than zero.
 */
export function layoutTree(
  root: FlowNode,
  options: { viewportWidth: number, viewportHeight: number, rootFontSize?: number },
): LayoutResult {
  const context: Context = {
    boxes: new Map(),
    viewportWidth: options.viewportWidth,
    viewportHeight: options.viewportHeight,
    rootFontSize: options.rootFontSize ?? 16,
    order: 0,
    deferred: [],
    styles: new Map(),
  }

  if (isElement(root))
    layoutBox(context, root, context.viewportWidth, null, 0, 0, false, [])
  else
    layoutChildren(context, root, context.viewportWidth, null, 0, 0, false, [])

  placeDeferred(context)

  return context.boxes
}

export type { Insets, LayoutBox, LayoutResult }
