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
 * - **Grid.** A grid container lays its children out as blocks, so they stack
 *   instead of being placed in cells. Flex is implemented, in `flex.ts`.
 * - **Baseline alignment and auto margins in a flex container.** `baseline`
 *   falls back to `flex-start` for want of font baselines, and an `auto` margin
 *   does not absorb free space.
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

import { type FlexItemInput, solveFlex } from './flex'
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
 * A flex container's max-content width.
 *
 * Along a row that is the sum of the items' outer widths plus the gaps between
 * them; down a column it is the widest of them. Measuring it the way a block is
 * measured gives the widest child, which for an `inline-flex` row then squeezes
 * every item into one item's width.
 */
function intrinsicFlexWidth(context: Context, node: FlowNode, style: LayoutStyle, available: number): number {
  const horizontal = style.flexContainer.direction !== 'column'
    && style.flexContainer.direction !== 'column-reverse'

  let total = 0
  let widest = 0
  let count = 0

  for (const child of node.childNodes) {
    if (!isElement(child))
      continue

    const childStyle = styleFor(context, child, available)
    if (childStyle.display === 'none' || NOT_RENDERED.has(child.tagName ?? ''))
      continue
    if (childStyle.position === 'absolute' || childStyle.position === 'fixed')
      continue

    const surrounds = horizontalSurrounds(childStyle)
    const margins = childStyle.margin.left + childStyle.margin.right
    const declared = resolveLength(childStyle.width, basisFor(context, available))

    const outer = declared !== null
      ? (childStyle.boxSizing === 'border-box' ? declared : declared + surrounds) + margins
      : intrinsicWidth(context, child, Math.max(0, available - surrounds - margins)) + surrounds + margins

    total += outer
    widest = Math.max(widest, outer)
    count++
  }

  const gaps = Math.max(0, count - 1) * style.flexContainer.columnGap
  return Math.min(available, horizontal ? total + gaps : widest)
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
  const own = isElement(node) ? styleFor(context, node, available) : null
  if (own && (own.display === 'flex' || own.display === 'inline-flex'))
    return intrinsicFlexWidth(context, node, own, available)

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
  /**
   * Content sizes to use instead of resolving the declared ones.
   *
   * A flex item's size is decided by the solver, from the space on its line and
   * its grow and shrink factors, so the declared `width` has already been taken
   * into account and must not be applied again.
   */
  forced?: { contentWidth?: number, contentHeight?: number },
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
  if (forced?.contentWidth !== undefined) {
    contentWidth = forced.contentWidth
  }
  else if (declaredWidth !== null) {
    contentWidth = contentWidthFrom(declaredWidth, style)
  }
  else if (INLINE_LEVEL.has(style.display)) {
    contentWidth = intrinsicWidth(context, node, autoContentWidth(style, containingWidth))
  }
  else {
    contentWidth = autoContentWidth(style, containingWidth)
  }

  // min/max clamp the content width, adjusted for box-sizing the same way. A
  // forced size was clamped by the solver already.
  const clampedOuter = forced?.contentWidth !== undefined
    ? (style.boxSizing === 'border-box' ? contentWidth + horizontalSurrounds(style) : contentWidth)
    : clampSize(
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
  const definiteContentHeight = forced?.contentHeight !== undefined
    ? forced.contentHeight
    : declaredHeight === null ? null : contentHeightFrom(declaredHeight, style)

  // --- children ----------------------------------------------------------
  const contentX = x + style.border.left + style.padding.left
  const contentY = y + style.border.top + style.padding.top
  const children = layoutChildren(context, node, contentWidth, definiteContentHeight, contentX, contentY, invisible, ancestors)

  let contentHeight = definiteContentHeight ?? children.height

  const clampedHeight = forced?.contentHeight !== undefined
    ? (style.boxSizing === 'border-box' ? contentHeight + verticalSurrounds(style) : contentHeight)
    : clampSize(
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
  const ownStyle = styleFor(context, node, contentWidth)
  if (ownStyle.display === 'flex' || ownStyle.display === 'inline-flex') {
    return layoutFlexChildren(context, node, ownStyle, contentWidth, contentHeight, contentX, contentY, invisible, ancestors)
  }

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
 * Lay a flex container's children out.
 *
 * Each item is measured first, because the solver needs a base size and a
 * hypothetical cross size before it can distribute anything; then the solver
 * says how big each item ends up and where it goes; then each item is laid out
 * again at that size, so its own subtree is positioned inside the final box
 * rather than the measured one.
 *
 * Laying out twice is what a flex container costs. The measuring pass restores
 * the paint counter and the out-of-flow queue afterwards, so nothing it does is
 * visible except the boxes the second pass overwrites.
 */
function layoutFlexChildren(
  context: Context,
  node: FlowNode,
  style: LayoutStyle,
  contentWidth: number,
  contentHeight: number | null,
  contentX: number,
  contentY: number,
  invisible: boolean,
  ancestors: FlowNode[],
): ChildrenResult {
  const flex = style.flexContainer
  const horizontal = flex.direction !== 'column' && flex.direction !== 'column-reverse'
  const reverseMain = flex.direction === 'row-reverse' || flex.direction === 'column-reverse'
  const reverseCross = flex.wrap === 'wrap-reverse'

  const availableMain = horizontal ? contentWidth : contentHeight
  const availableCross = horizontal ? contentHeight : contentWidth
  const childAncestors = [node, ...ancestors]

  const children: FlowNode[] = []
  for (const child of node.childNodes) {
    if (!isElement(child))
      continue

    const childStyle = styleFor(context, child, contentWidth)

    if (childStyle.display === 'none' || NOT_RENDERED.has(child.tagName ?? '')) {
      markSubtreeEmpty(context, child, childStyle)
      continue
    }

    // Absolutely positioned children are not flex items, as in a browser.
    if (childStyle.position === 'absolute' || childStyle.position === 'fixed') {
      context.deferred.push({
        node: child,
        style: childStyle,
        ancestors: childAncestors,
        staticX: contentX,
        staticY: contentY,
      })
      continue
    }

    children.push(child)
  }

  if (children.length === 0)
    return { height: 0, scrollWidth: 0, scrollHeight: 0 }

  // `order` reorders the items without touching the DOM. Sorted stably, so
  // items sharing an order keep document order between them.
  const ordered = children
    .map((child, index) => ({ child, index, order: styleFor(context, child, contentWidth).flexItem.order }))
    .sort((a, b) => (a.order - b.order) || (a.index - b.index))
    .map(entry => entry.child)

  const inputs: FlexItemInput[] = []
  const measured: LayoutStyle[] = []

  for (const child of ordered) {
    const childStyle = styleFor(context, child, contentWidth)
    measured.push(childStyle)

    const basis = basisFor(context, contentWidth)
    const mainSurrounds = horizontal ? horizontalSurrounds(childStyle) : verticalSurrounds(childStyle)
    const crossSurrounds = horizontal ? verticalSurrounds(childStyle) : horizontalSurrounds(childStyle)

    // The declared size along each axis, as a border-box number.
    const toBorderBox = (content: number, surrounds: number): number =>
      childStyle.boxSizing === 'border-box' ? content : content + surrounds

    const declaredMainText = horizontal ? childStyle.width : childStyle.height
    const declaredMain = resolveLength(declaredMainText, horizontal ? basis : basisFor(context, availableCross ?? context.viewportHeight))

    // The flex base size: `flex-basis` first, then the declared main size, then
    // the content's own size. `flex: 1` sets the basis to 0%, which is what
    // makes items share the line equally regardless of their content.
    // Measuring the content size means an intrinsic-width pass along a row, or a
    // whole trial layout down a column. Both the base size and the automatic
    // minimum can want it, so it is computed at most once per item.
    let contentMain: number | null = null
    const contentMainSize = (): number => {
      contentMain ??= measureMain(context, child, childStyle, horizontal, contentWidth, availableCross, childAncestors)
      return contentMain
    }

    const basisText = childStyle.flexItem.basis
    let baseMain: number
    if (basisText !== '' && basisText !== 'auto' && basisText !== 'content') {
      const resolved = resolveLength(basisText, horizontal
        ? basisFor(context, availableMain ?? contentWidth)
        : basisFor(context, availableMain ?? context.viewportHeight))
      baseMain = resolved === null ? contentMainSize() : toBorderBox(resolved, mainSurrounds)
    }
    else if (declaredMain !== null && basisText !== 'content') {
      baseMain = toBorderBox(declaredMain, mainSurrounds)
    }
    else {
      baseMain = contentMainSize()
    }

    const minText = horizontal ? childStyle.minWidth : childStyle.minHeight
    const maxText = horizontal ? childStyle.maxWidth : childStyle.maxHeight
    const minResolved = resolveLength(minText, basis)
    const maxResolved = resolveLength(maxText, basis)

    // An item never shrinks below its content along the main axis unless it
    // says so, which is the `min-width: auto` rule flex items get.
    const autoMin = childStyle.flexItem.shrink > 0 && minText.trim() === ''
      ? Math.min(baseMain, contentMainSize())
      : 0

    const minMain = minResolved === null ? autoMin : toBorderBox(minResolved, mainSurrounds)
    const maxMain = maxResolved === null ? Infinity : toBorderBox(maxResolved, mainSurrounds)

    // The hypothetical cross size, and whether it was declared at all.
    const declaredCrossText = horizontal ? childStyle.height : childStyle.width
    const declaredCross = horizontal
      ? (availableCross === null ? absoluteOnly(declaredCrossText, basis) : resolveLength(declaredCrossText, basisFor(context, availableCross)))
      : resolveLength(declaredCrossText, basis)

    const crossIsAuto = declaredCross === null

    const align = childStyle.flexItem.alignSelf === 'auto' || childStyle.flexItem.alignSelf === ''
      ? flex.alignItems
      : childStyle.flexItem.alignSelf

    // An item that will stretch to a cross size the container already fixes
    // does not need measuring: the line's size comes from the container, and
    // the item is resized to it. That skips a trial layout per item, which is
    // the single most expensive thing a flex container does.
    const willStretch = crossIsAuto
      && (align === 'stretch' || align === 'normal' || align === '')
      && availableCross !== null
      && flex.wrap === 'nowrap'

    const baseCross = !crossIsAuto
      ? toBorderBox(declaredCross, crossSurrounds)
      : willStretch
        ? 0
        : measureCross(context, child, horizontal, baseMain, mainSurrounds, contentWidth, availableCross, childAncestors)

    inputs.push({
      baseMain: Math.min(Math.max(baseMain, minMain), maxMain),
      minMain,
      maxMain,
      grow: childStyle.flexItem.grow,
      shrink: childStyle.flexItem.shrink,
      marginMainStart: horizontal ? childStyle.margin.left : childStyle.margin.top,
      marginMainEnd: horizontal ? childStyle.margin.right : childStyle.margin.bottom,
      marginCrossStart: horizontal ? childStyle.margin.top : childStyle.margin.left,
      marginCrossEnd: horizontal ? childStyle.margin.bottom : childStyle.margin.right,
      baseCross,
      crossIsAuto,
      align,
    })
  }

  const solved = solveFlex(inputs, {
    availableMain,
    availableCross,
    wrap: flex.wrap,
    justifyContent: flex.justifyContent,
    alignContent: flex.alignContent,
    mainGap: horizontal ? flex.columnGap : flex.rowGap,
    crossGap: horizontal ? flex.rowGap : flex.columnGap,
  })

  const mainExtent = availableMain ?? solved.contentMain
  const crossExtent = availableCross ?? solved.contentCross

  let maxRight = contentX
  let maxBottom = contentY

  for (const line of solved.lines) {
    for (const placed of line.items) {
      const child = ordered[placed.index]
      const childStyle = measured[placed.index]

      // Reversing happens here rather than in the solver, which works in
      // start-to-end terms along both axes.
      const mainStart = reverseMain
        ? mainExtent - placed.mainStart - placed.mainSize
        : placed.mainStart
      const crossStart = reverseCross
        ? crossExtent - placed.crossStart - placed.crossSize
        : placed.crossStart

      const borderBoxWidth = horizontal ? placed.mainSize : placed.crossSize
      const borderBoxHeight = horizontal ? placed.crossSize : placed.mainSize

      const box = layoutBox(
        context,
        child,
        contentWidth,
        contentHeight,
        contentX + (horizontal ? mainStart : crossStart),
        contentY + (horizontal ? crossStart : mainStart),
        invisible,
        childAncestors,
        {
          contentWidth: Math.max(0, borderBoxWidth - horizontalSurrounds(childStyle)),
          contentHeight: Math.max(0, borderBoxHeight - verticalSurrounds(childStyle)),
        },
      )

      maxRight = Math.max(maxRight, box.x + box.width + childStyle.margin.right)
      maxBottom = Math.max(maxBottom, box.y + box.height + childStyle.margin.bottom)
    }
  }

  const height = horizontal ? solved.contentCross : solved.contentMain

  return {
    height: Math.max(0, height),
    scrollWidth: Math.max(0, maxRight - contentX),
    scrollHeight: Math.max(0, maxBottom - contentY),
  }
}

/**
 * An item's content-based main size, as a border-box number.
 *
 * Along a row this is the intrinsic width, which can be measured without
 * laying anything out. Along a column it is the content's height, and there is
 * no way to know that without a trial layout.
 */
function measureMain(
  context: Context,
  child: FlowNode,
  childStyle: LayoutStyle,
  horizontal: boolean,
  containingWidth: number,
  containingHeight: number | null,
  ancestors: FlowNode[],
): number {
  if (horizontal) {
    const content = intrinsicWidth(context, child, containingWidth)
    return content + horizontalSurrounds(childStyle)
  }

  return trialLayout(context, child, containingWidth, containingHeight, ancestors).height
}

/** An item's content-based cross size at a known main size, as a border box. */
function measureCross(
  context: Context,
  child: FlowNode,
  horizontal: boolean,
  baseMain: number,
  mainSurrounds: number,
  containingWidth: number,
  containingHeight: number | null,
  ancestors: FlowNode[],
): number {
  if (!horizontal) {
    // The cross axis is horizontal, so the cross size is the intrinsic width.
    const childStyle = styleFor(context, child, containingWidth)
    return intrinsicWidth(context, child, containingWidth) + horizontalSurrounds(childStyle)
  }

  // The cross axis is vertical: lay the item out at the main size it will have
  // and see how tall its content comes out.
  const trial = trialLayout(context, child, containingWidth, containingHeight, ancestors, {
    contentWidth: Math.max(0, baseMain - mainSurrounds),
  })
  return trial.height
}

/**
 * Lay a subtree out to measure it, then undo everything but the boxes.
 *
 * The paint counter and the out-of-flow queue are restored, so a measurement
 * cannot shift paint order or place an absolutely positioned box twice. The
 * boxes it records are overwritten by the real pass, which visits the same
 * nodes.
 */
function trialLayout(
  context: Context,
  node: FlowNode,
  containingWidth: number,
  containingHeight: number | null,
  ancestors: FlowNode[],
  forced?: { contentWidth?: number, contentHeight?: number },
): LayoutBox {
  const order = context.order
  const deferred = context.deferred.length

  const box = layoutBox(context, node, containingWidth, containingHeight, 0, 0, true, ancestors, forced)

  context.order = order
  context.deferred.length = deferred

  return box
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
