/**
 * The screenshot pipeline's view of a laid-out document.
 *
 * This used to be a second layout engine: its own HTML parser, its own CSS
 * parser, its own selector matcher and cascade, and its own box algorithm that
 * estimated text as `length * fontSize * 0.6`. Two engines meant a screenshot
 * and a `getBoundingClientRect()` of the same markup could disagree about where
 * anything was, and once `src/layout/` learned flexbox, grid, margin collapsing
 * and real font metrics, they disagreed about almost everything.
 *
 * So nothing here lays anything out any more. A real document is built, the
 * real cascade styles it, the real layout pass positions it, and this walks the
 * result into the `LayoutNode` tree the pixel renderer already consumed. The
 * shape is unchanged; what fills it is now the same numbers the DOM reports.
 */

import type { LengthBasis } from '../layout/length'
import type { InheritedStyle } from '../layout/style'
import type { RGBA } from './css-utils'
import { CSSStyleSheet } from '../css/CSSOM'
import { lineHeightOf } from '../layout/flow'
import { boxFor, rootFontSizeOf } from '../layout/index'
import { resolveLength } from '../layout/length'
import { resolveLayoutStyle } from '../layout/style'
import { parseHTML as parseDOM } from '../parsers/html-parser'
import { Window } from '../window/Window'
import { parseColor } from './css-utils'

/**
 * Computed box dimensions
 */
export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Computed element styles
 */
export interface ComputedStyles {
  backgroundColor: RGBA
  color: RGBA
  borderTopWidth: number
  borderRightWidth: number
  borderBottomWidth: number
  borderLeftWidth: number
  borderTopColor: RGBA
  borderRightColor: RGBA
  borderBottomColor: RGBA
  borderLeftColor: RGBA
  borderRadius: number
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
  fontSize: number
  fontWeight: string
  fontFamily: string
  textAlign: string
  display: string
  position: string
  top: number
  right: number
  bottom: number
  left: number
  opacity: number
  overflow: string
  boxShadow: string | null
  /**
   * The used `line-height`, in pixels.
   *
   * Carried so the renderer steps between wrapped lines by the same amount the
   * layout pass reserved for them, rather than by its bitmap font's own height.
   */
  lineHeight: number
}

/**
 * Layout node representing a rendered element
 */
export interface LayoutNode {
  tagName: string
  box: Box
  styles: ComputedStyles
  text: string | null
  children: LayoutNode[]
  visible: boolean
}

/**
 * Default styles for elements
 */
const DEFAULT_STYLES: ComputedStyles = {
  backgroundColor: { r: 0, g: 0, b: 0, a: 0 },
  color: { r: 0, g: 0, b: 0, a: 255 },
  borderTopWidth: 0,
  borderRightWidth: 0,
  borderBottomWidth: 0,
  borderLeftWidth: 0,
  borderTopColor: { r: 0, g: 0, b: 0, a: 255 },
  borderRightColor: { r: 0, g: 0, b: 0, a: 255 },
  borderBottomColor: { r: 0, g: 0, b: 0, a: 255 },
  borderLeftColor: { r: 0, g: 0, b: 0, a: 255 },
  borderRadius: 0,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,
  fontSize: 16,
  fontWeight: 'normal',
  fontFamily: 'sans-serif',
  textAlign: 'left',
  display: 'block',
  position: 'static',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  opacity: 1,
  overflow: 'visible',
  boxShadow: null,
  lineHeight: 19.2,
}

/**
 * Parse HTML string to simple DOM tree
 */
export interface ParsedElement {
  tagName: string
  attributes: Record<string, string>
  children: (ParsedElement | string)[]
}

/** Lower-cased tag name, as this shape has always reported it. */
function lowerTag(node: any): string {
  return String(node.tagName ?? node.nodeName ?? '').toLowerCase()
}

/** One parsed node, or `null` for whitespace this shape does not keep. */
function toParsedNode(node: any): ParsedElement | string | null {
  if (node.nodeType === 3) {
    const text = String(node.data ?? '').trim()
    return text === '' ? null : text
  }

  // Comments and doctypes never had a place in this tree.
  if (node.nodeType !== 1)
    return null

  const attributes: Record<string, string> = {}
  for (const name of node.getAttributeNames?.() ?? [])
    attributes[String(name).toLowerCase()] = node.getAttribute(name) ?? ''

  const children: (ParsedElement | string)[] = []
  for (const child of node.childNodes ?? []) {
    const parsed = toParsedNode(child)
    if (parsed !== null)
      children.push(parsed)
  }

  return { tagName: lowerTag(node), attributes, children }
}

/**
 * Parse markup into a plain tree of tags, attributes and text.
 *
 * A thin shape over the real parser — the one the DOM itself is built with, so
 * void elements, implied closes, entities and attribute quoting are handled the
 * same way here as they are for `innerHTML`. Whitespace-only text is dropped,
 * which is what this shape has always done.
 */
export function parseHTML(html: string): ParsedElement {
  const root: ParsedElement = { tagName: 'div', attributes: {}, children: [] }

  for (const node of parseDOM(html)) {
    const parsed = toParsedNode(node)
    if (parsed !== null)
      root.children.push(parsed)
  }

  return root
}

/**
 * Parse CSS stylesheet
 */
export interface CSSRule {
  selector: string
  properties: Record<string, string>
}

/** Flatten a parsed rule list, descending into `@media` and friends. */
function collectRules(rules: readonly any[], out: CSSRule[]): void {
  for (const rule of rules) {
    if (Array.isArray(rule.cssRules) && rule.cssRules.length > 0) {
      collectRules(rule.cssRules, out)
      continue
    }

    const style = rule.style
    if (typeof rule.selectorText !== 'string' || !style)
      continue

    const properties: Record<string, string> = {}
    for (let index = 0; index < style.length; index++) {
      const property = style.item(index)
      if (property)
        properties[property] = style.getPropertyValue(property)
    }

    if (Object.keys(properties).length > 0)
      out.push({ selector: rule.selectorText, properties })
  }
}

/**
 * Parse a stylesheet into selector/declaration pairs.
 *
 * Backed by the real CSSOM parser, so comments, `@media` blocks and `!important`
 * are handled once rather than twice. Only declared properties are listed: a
 * `margin: 10px` reads back as `margin`, not as the four longhands it expands
 * to internally.
 */
export function parseCSS(css: string): CSSRule[] {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(css)

  const rules: CSSRule[] = []
  collectRules(sheet.cssRules, rules)
  return rules
}

/** The paint values an element takes from its parent when it declares none. */
interface InheritedPaint {
  color: RGBA
  textAlign: string
}

/** Resolve a length against `basis`, falling back when it is absent or `auto`. */
function lengthOr(value: string, basis: LengthBasis, fallback: number): number {
  const resolved = resolveLength(value, basis)
  return resolved === null ? fallback : resolved
}

/**
 * A colour, falling back to the element's own `color`.
 *
 * An undeclared border colour is `currentcolor`, which is how a browser paints
 * `border: 2px solid` with no colour named — the old engine defaulted it to
 * black and got that wrong whenever `color` was set.
 */
function colorOr(value: string, current: RGBA): RGBA {
  const trimmed = value.trim()
  if (trimmed === '' || trimmed.toLowerCase() === 'currentcolor')
    return { ...current }
  return parseColor(trimmed)
}

/** The first family in a `font-family` list, unquoted. */
function firstFamily(list: string): string {
  const first = list.split(',')[0]?.trim() ?? ''
  const unquoted = first.replace(/^["']|["']$/g, '')
  return unquoted === '' ? DEFAULT_STYLES.fontFamily : unquoted
}

/**
 * Walk one element into a `LayoutNode`, and its children after it.
 *
 * Geometry comes from the layout pass — every inset is read off the box rather
 * than re-resolved here, so there is no second opinion about what `padding: 1em`
 * came to. Paint values come from the same cascade the layout pass read, and
 * the two that inherit are threaded down because a cascade lookup on its own
 * does not inherit.
 */
function buildNode(
  element: any,
  basis: LengthBasis,
  inherited: InheritedStyle,
  paint: InheritedPaint,
): LayoutNode {
  const read = element._styleReader()
  const layoutStyle = resolveLayoutStyle(element, basis, inherited, read)
  const own: LengthBasis = { ...basis, fontSize: layoutStyle.fontSize }

  const color = colorOr(read('color'), paint.color)
  const declaredAlign = read('text-align').trim()
  const textAlign = declaredAlign === '' ? paint.textAlign : declaredAlign

  const box = boxFor(element)

  const styles: ComputedStyles = {
    backgroundColor: parseColor(read('background-color')),
    color,
    borderTopWidth: box?.border.top ?? 0,
    borderRightWidth: box?.border.right ?? 0,
    borderBottomWidth: box?.border.bottom ?? 0,
    borderLeftWidth: box?.border.left ?? 0,
    borderTopColor: colorOr(read('border-top-color'), color),
    borderRightColor: colorOr(read('border-right-color'), color),
    borderBottomColor: colorOr(read('border-bottom-color'), color),
    borderLeftColor: colorOr(read('border-left-color'), color),
    // A percentage radius is a share of the element's own box, so it does not
    // resolve against the containing block the way every other length does.
    borderRadius: lengthOr(
      read('border-radius').split(/[\s/]+/)[0] ?? '',
      { ...own, basis: box?.width ?? own.basis },
      0,
    ),
    paddingTop: box?.padding.top ?? 0,
    paddingRight: box?.padding.right ?? 0,
    paddingBottom: box?.padding.bottom ?? 0,
    paddingLeft: box?.padding.left ?? 0,
    marginTop: box?.margin.top ?? 0,
    marginRight: box?.margin.right ?? 0,
    marginBottom: box?.margin.bottom ?? 0,
    marginLeft: box?.margin.left ?? 0,
    fontSize: layoutStyle.fontSize,
    fontWeight: layoutStyle.fontWeight || DEFAULT_STYLES.fontWeight,
    fontFamily: firstFamily(layoutStyle.fontFamily),
    textAlign,
    display: layoutStyle.display,
    position: layoutStyle.position,
    top: lengthOr(read('top'), own, 0),
    right: lengthOr(read('right'), own, 0),
    bottom: lengthOr(read('bottom'), own, 0),
    left: lengthOr(read('left'), own, 0),
    opacity: readOpacity(read('opacity')),
    overflow: layoutStyle.overflow,
    boxShadow: read('box-shadow').trim() || null,
    lineHeight: lineHeightOf(layoutStyle),
  }

  // `visibility: hidden` propagates to descendants in the layout pass, so a
  // box it marks invisible paints nothing and neither does anything inside it.
  const visible = box !== null && box.rendered && !box.invisible

  const childBasis: LengthBasis = { ...own, basis: box?.content.width ?? basis.basis }
  const childInherited: InheritedStyle = {
    fontSize: layoutStyle.fontSize,
    fontFamily: layoutStyle.fontFamily,
    fontWeight: layoutStyle.fontWeight,
    lineHeight: layoutStyle.lineHeight,
  }
  const childPaint: InheritedPaint = { color, textAlign }

  const children: LayoutNode[] = []
  for (const child of element.children ?? [])
    children.push(buildNode(child, childBasis, childInherited, childPaint))

  return {
    tagName: lowerTag(element),
    box: box && box.rendered
      ? { x: box.x, y: box.y, width: box.width, height: box.height }
      : { x: 0, y: 0, width: 0, height: 0 },
    styles,
    text: directText(element),
    children,
    visible,
  }
}

/** `opacity`, which is a number rather than a length. */
function readOpacity(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 1
}

/**
 * The element's own text, with runs of whitespace collapsed.
 *
 * Only direct text children: a child element's text belongs to that child's
 * node, and the renderer draws each node's text at its own content origin.
 */
function directText(element: any): string | null {
  let text = ''
  for (const child of element.childNodes ?? []) {
    if (child.nodeType === 3)
      text += String(child.data ?? '')
  }

  const collapsed = text.replace(/\s+/g, ' ').trim()
  return collapsed === '' ? null : collapsed
}

/**
 * Put `html` into `document`, keeping `css` ahead of anything the markup
 * declares so a document stylesheet still wins.
 *
 * A full document and a bare fragment both arrive here, so the markup decides:
 * with a `<body>` of its own it is written whole, which lets the real parser
 * place `<head>` content and keep the body's attributes, and otherwise it is a
 * body's worth of content.
 */
function writeDocument(document: any, html: string, css: string): void {
  const source = html.replace(/<!doctype[^>]*>/gi, '').trim()
  const whole = /<html[^>]*>([\s\S]*)<\/html\s*>/i.exec(source)
  const markup = whole ? whole[1] : source

  if (/<(?:body|head)[\s>]/i.test(markup))
    document.documentElement.innerHTML = markup
  else
    document.body.innerHTML = markup

  if (!css)
    return

  // A document written without a `<head>` has none to style into.
  if (!document.head) {
    const head = document.createElement('head')
    document.documentElement.insertBefore(head, document.documentElement.firstChild)
  }

  const style = document.createElement('style')
  style.textContent = css
  document.head.insertBefore(style, document.head.firstChild)
}

/**
 * Lay out `html` with `css` at the given viewport, as a tree the renderer draws.
 *
 * The returned root is the document element, so `<head>` appears among its
 * children as an invisible node and `<body>`'s own background paints.
 */
export function computeLayout(
  html: string,
  css: string,
  viewportWidth: number,
  viewportHeight: number,
): LayoutNode {
  const window = new Window({ width: viewportWidth, height: viewportHeight })
  const document = window.document as any
  writeDocument(document, html, css)

  const rootFontSize = rootFontSizeOf(document)
  const basis: LengthBasis = {
    basis: viewportWidth,
    viewportWidth,
    viewportHeight,
    rootFontSize,
    fontSize: rootFontSize,
  }

  const inherited: InheritedStyle = {
    fontSize: rootFontSize,
    fontFamily: 'serif',
    fontWeight: '400',
    lineHeight: null,
  }

  return buildNode(
    document.documentElement,
    basis,
    inherited,
    { color: { ...DEFAULT_STYLES.color }, textAlign: 'start' },
  )
}
