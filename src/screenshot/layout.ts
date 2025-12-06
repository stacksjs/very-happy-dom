/**
 * Layout Engine
 * Simple HTML layout engine for rendering to pixels
 */

import { parseBoxValues, parseColor, parseInlineStyles, parseSize, type RGBA } from './css-utils'

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
}

/**
 * Block-level elements
 */
const BLOCK_ELEMENTS = new Set([
  'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'section', 'article', 'header', 'footer', 'main', 'nav', 'aside',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'tr', 'th', 'td', 'thead', 'tbody', 'tfoot',
  'form', 'fieldset', 'legend',
  'blockquote', 'pre', 'address', 'hr', 'figure', 'figcaption',
])

/**
 * Parse HTML string to simple DOM tree
 */
export interface ParsedElement {
  tagName: string
  attributes: Record<string, string>
  children: (ParsedElement | string)[]
}

/**
 * Simple HTML parser
 */
export function parseHTML(html: string): ParsedElement {
  const root: ParsedElement = {
    tagName: 'div',
    attributes: {},
    children: [],
  }

  const stack: ParsedElement[] = [root]
  let current = root
  let pos = 0

  // Handle common entities
  const decodeEntities = (text: string): string => {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, '\'')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number.parseInt(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
      .replace(/&nbsp;/g, ' ')
  }

  while (pos < html.length) {
    const tagStart = html.indexOf('<', pos)

    // Text before tag
    if (tagStart > pos || tagStart === -1) {
      const textEnd = tagStart === -1 ? html.length : tagStart
      const text = decodeEntities(html.slice(pos, textEnd).trim())
      if (text) {
        current.children.push(text)
      }
      if (tagStart === -1)
        break
      pos = tagStart
    }

    // Comment or doctype
    if (html.slice(pos, pos + 4) === '<!--') {
      const commentEnd = html.indexOf('-->', pos + 4)
      pos = commentEnd === -1 ? html.length : commentEnd + 3
      continue
    }

    if (html.slice(pos, pos + 2).toLowerCase() === '<!') {
      const doctypeEnd = html.indexOf('>', pos)
      pos = doctypeEnd === -1 ? html.length : doctypeEnd + 1
      continue
    }

    // Parse tag
    const tagEnd = html.indexOf('>', pos)
    if (tagEnd === -1)
      break

    const tagContent = html.slice(pos + 1, tagEnd)
    const isSelfClosing = tagContent.endsWith('/') || tagContent.endsWith('/')
    const isClosing = tagContent.startsWith('/')

    if (isClosing) {
      // Closing tag
      const tagName = tagContent.slice(1).trim().toLowerCase().split(/\s/)[0]
      // Pop stack until we find matching tag
      while (stack.length > 1) {
        const popped = stack.pop()!
        current = stack[stack.length - 1]
        if (popped.tagName === tagName)
          break
      }
    }
    else {
      // Opening tag
      const spaceIdx = tagContent.search(/\s/)
      let tagName = spaceIdx === -1 ? tagContent : tagContent.slice(0, spaceIdx)
      tagName = tagName.replace(/\/$/, '').toLowerCase()

      const attributes: Record<string, string> = {}

      // Parse attributes
      if (spaceIdx !== -1) {
        const attrString = tagContent.slice(spaceIdx).replace(/\/$/, '')
        const attrRegex = /([a-z-]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gi
        let match
        while ((match = attrRegex.exec(attrString)) !== null) {
          const name = match[1].toLowerCase()
          const value = match[2] ?? match[3] ?? match[4] ?? ''
          attributes[name] = decodeEntities(value)
        }
      }

      const element: ParsedElement = {
        tagName,
        attributes,
        children: [],
      }

      current.children.push(element)

      // Self-closing or void elements
      const voidElements = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'])
      if (!isSelfClosing && !voidElements.has(tagName)) {
        stack.push(element)
        current = element
      }
    }

    pos = tagEnd + 1
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

export function parseCSS(css: string): CSSRule[] {
  const rules: CSSRule[] = []

  // Remove comments
  css = css.replace(/\/\*[\s\S]*?\*\//g, '')

  // Simple CSS rule parser
  const ruleRegex = /([^{}]+)\{([^}]*)\}/g
  let match

  while ((match = ruleRegex.exec(css)) !== null) {
    const selector = match[1].trim()
    const properties: Record<string, string> = {}

    const propString = match[2]
    const propParts = propString.split(';')

    for (const part of propParts) {
      const colonIdx = part.indexOf(':')
      if (colonIdx !== -1) {
        const prop = part.slice(0, colonIdx).trim().toLowerCase()
        const value = part.slice(colonIdx + 1).trim()
        if (prop && value) {
          properties[prop] = value
        }
      }
    }

    if (Object.keys(properties).length > 0) {
      rules.push({ selector, properties })
    }
  }

  return rules
}

/**
 * Check if an element matches a simple CSS selector
 */
function matchesSelector(element: ParsedElement, selector: string): boolean {
  selector = selector.trim()

  // Universal selector
  if (selector === '*')
    return true

  // Tag selector
  if (/^[a-z][a-z0-9-]*$/i.test(selector)) {
    return element.tagName === selector.toLowerCase()
  }

  // Class selector
  if (selector.startsWith('.')) {
    const className = selector.slice(1)
    const classes = (element.attributes.class || '').split(/\s+/)
    return classes.includes(className)
  }

  // ID selector
  if (selector.startsWith('#')) {
    const id = selector.slice(1)
    return element.attributes.id === id
  }

  // Compound selector (simplified)
  const tagMatch = selector.match(/^([a-z][a-z0-9-]*)/i)
  const classMatches = selector.match(/\.([a-z][a-z0-9-]*)/gi) || []
  const idMatch = selector.match(/#([a-z][a-z0-9-]*)/i)

  let matches = true

  if (tagMatch) {
    matches = matches && element.tagName === tagMatch[1].toLowerCase()
  }

  if (idMatch) {
    matches = matches && element.attributes.id === idMatch[1]
  }

  for (const cls of classMatches) {
    const className = cls.slice(1)
    const classes = (element.attributes.class || '').split(/\s+/)
    matches = matches && classes.includes(className)
  }

  return matches
}

/**
 * Get computed styles for an element
 */
function computeStyles(
  element: ParsedElement,
  cssRules: CSSRule[],
  parentStyles: ComputedStyles,
  containerWidth: number,
): ComputedStyles {
  const styles = { ...DEFAULT_STYLES }

  // Inherit some properties from parent
  styles.color = { ...parentStyles.color }
  styles.fontSize = parentStyles.fontSize
  styles.fontFamily = parentStyles.fontFamily
  styles.fontWeight = parentStyles.fontWeight

  // Apply CSS rules (simplified specificity - later rules win)
  for (const rule of cssRules) {
    // Handle multiple selectors
    const selectors = rule.selector.split(',').map(s => s.trim())
    for (const selector of selectors) {
      if (matchesSelector(element, selector)) {
        applyProperties(styles, rule.properties, containerWidth)
      }
    }
  }

  // Apply inline styles (highest priority)
  const inlineStyles = parseInlineStyles(element.attributes.style)
  applyProperties(styles, inlineStyles, containerWidth)

  // Set display based on tag if not explicitly set
  if (styles.display === 'block' && !inlineStyles.display) {
    styles.display = BLOCK_ELEMENTS.has(element.tagName) ? 'block' : 'inline'
  }

  return styles
}

/**
 * Apply CSS properties to computed styles
 */
function applyProperties(
  styles: ComputedStyles,
  props: Record<string, string>,
  containerWidth: number,
): void {
  for (const [prop, value] of Object.entries(props)) {
    switch (prop) {
      case 'background':
      case 'background-color':
        styles.backgroundColor = parseColor(value)
        break

      case 'color':
        styles.color = parseColor(value)
        break

      case 'border': {
        const borderMatch = value.match(/(\d+(?:px)?)\s+(\w+)\s+(\S+)/)
        if (borderMatch) {
          const width = parseSize(borderMatch[1], 0)
          const color = parseColor(borderMatch[3])
          styles.borderTopWidth = styles.borderRightWidth = styles.borderBottomWidth = styles.borderLeftWidth = width
          styles.borderTopColor = styles.borderRightColor = styles.borderBottomColor = styles.borderLeftColor = { ...color }
        }
        break
      }

      case 'border-width': {
        const [top, right, bottom, left] = parseBoxValues(value)
        styles.borderTopWidth = top
        styles.borderRightWidth = right
        styles.borderBottomWidth = bottom
        styles.borderLeftWidth = left
        break
      }

      case 'border-color': {
        const color = parseColor(value)
        styles.borderTopColor = styles.borderRightColor = styles.borderBottomColor = styles.borderLeftColor = { ...color }
        break
      }

      case 'border-top-width':
        styles.borderTopWidth = parseSize(value, 0)
        break
      case 'border-right-width':
        styles.borderRightWidth = parseSize(value, 0)
        break
      case 'border-bottom-width':
        styles.borderBottomWidth = parseSize(value, 0)
        break
      case 'border-left-width':
        styles.borderLeftWidth = parseSize(value, 0)
        break

      case 'border-top-color':
        styles.borderTopColor = parseColor(value)
        break
      case 'border-right-color':
        styles.borderRightColor = parseColor(value)
        break
      case 'border-bottom-color':
        styles.borderBottomColor = parseColor(value)
        break
      case 'border-left-color':
        styles.borderLeftColor = parseColor(value)
        break

      case 'border-radius':
        styles.borderRadius = parseSize(value, 0)
        break

      case 'padding': {
        const [top, right, bottom, left] = parseBoxValues(value)
        styles.paddingTop = top
        styles.paddingRight = right
        styles.paddingBottom = bottom
        styles.paddingLeft = left
        break
      }

      case 'padding-top':
        styles.paddingTop = parseSize(value, 0, containerWidth)
        break
      case 'padding-right':
        styles.paddingRight = parseSize(value, 0, containerWidth)
        break
      case 'padding-bottom':
        styles.paddingBottom = parseSize(value, 0, containerWidth)
        break
      case 'padding-left':
        styles.paddingLeft = parseSize(value, 0, containerWidth)
        break

      case 'margin': {
        const [top, right, bottom, left] = parseBoxValues(value)
        styles.marginTop = top
        styles.marginRight = right
        styles.marginBottom = bottom
        styles.marginLeft = left
        break
      }

      case 'margin-top':
        styles.marginTop = parseSize(value, 0, containerWidth)
        break
      case 'margin-right':
        styles.marginRight = parseSize(value, 0, containerWidth)
        break
      case 'margin-bottom':
        styles.marginBottom = parseSize(value, 0, containerWidth)
        break
      case 'margin-left':
        styles.marginLeft = parseSize(value, 0, containerWidth)
        break

      case 'font-size':
        styles.fontSize = parseSize(value, 16)
        break
      case 'font-weight':
        styles.fontWeight = value
        break
      case 'font-family':
        styles.fontFamily = value.split(',')[0].trim().replace(/['"]/g, '')
        break

      case 'text-align':
        styles.textAlign = value
        break

      case 'display':
        styles.display = value
        break

      case 'position':
        styles.position = value
        break

      case 'top':
        styles.top = parseSize(value, 0, containerWidth)
        break
      case 'right':
        styles.right = parseSize(value, 0, containerWidth)
        break
      case 'bottom':
        styles.bottom = parseSize(value, 0, containerWidth)
        break
      case 'left':
        styles.left = parseSize(value, 0, containerWidth)
        break

      case 'opacity':
        styles.opacity = Number.parseFloat(value) || 1
        break

      case 'overflow':
        styles.overflow = value
        break

      case 'width':
        // Handle in layout
        break

      case 'height':
        // Handle in layout
        break

      case 'box-shadow':
        styles.boxShadow = value
        break
    }
  }
}

/**
 * Extract text content from element
 */
function getTextContent(element: ParsedElement | string): string {
  if (typeof element === 'string')
    return element

  let text = ''
  for (const child of element.children) {
    if (typeof child === 'string') {
      text += child
    }
    else {
      text += getTextContent(child)
    }
  }
  return text
}

/**
 * Layout engine - compute positions and sizes for all elements
 */
export function computeLayout(
  html: string,
  css: string,
  viewportWidth: number,
  viewportHeight: number,
): LayoutNode {
  const parsed = parseHTML(html)
  const cssRules = parseCSS(css)

  // Extract inline style blocks
  const extractStyles = (el: ParsedElement): string => {
    let styles = ''
    if (el.tagName === 'style') {
      for (const child of el.children) {
        if (typeof child === 'string') {
          styles += child
        }
      }
    }
    for (const child of el.children) {
      if (typeof child !== 'string') {
        styles += extractStyles(child)
      }
    }
    return styles
  }

  const inlineCSS = extractStyles(parsed)
  const allRules = [...cssRules, ...parseCSS(inlineCSS)]

  // Layout the tree
  function layoutElement(
    element: ParsedElement,
    parentStyles: ComputedStyles,
    availableX: number,
    availableY: number,
    availableWidth: number,
    availableHeight: number,
  ): LayoutNode {
    const styles = computeStyles(element, allRules, parentStyles, availableWidth)

    // Check visibility
    if (styles.display === 'none') {
      return {
        tagName: element.tagName,
        box: { x: 0, y: 0, width: 0, height: 0 },
        styles,
        text: null,
        children: [],
        visible: false,
      }
    }

    // Calculate box dimensions
    const marginLeft = styles.marginLeft
    const marginTop = styles.marginTop
    const marginRight = styles.marginRight
    const marginBottom = styles.marginBottom

    const borderLeft = styles.borderLeftWidth
    const borderTop = styles.borderTopWidth
    const borderRight = styles.borderRightWidth
    const borderBottom = styles.borderBottomWidth

    const paddingLeft = styles.paddingLeft
    const paddingTop = styles.paddingTop
    const paddingRight = styles.paddingRight
    const paddingBottom = styles.paddingBottom

    // Determine width
    let explicitWidth: number | null = null
    if (element.attributes.style) {
      const widthMatch = element.attributes.style.match(/width\s*:\s*(\S+)/)
      if (widthMatch) {
        explicitWidth = parseSize(widthMatch[1], availableWidth, availableWidth)
      }
    }

    const contentWidth = explicitWidth ?? (availableWidth - marginLeft - marginRight - borderLeft - borderRight - paddingLeft - paddingRight)

    // Determine height (will expand based on content)
    let explicitHeight: number | null = null
    if (element.attributes.style) {
      const heightMatch = element.attributes.style.match(/height\s*:\s*(\S+)/)
      if (heightMatch) {
        explicitHeight = parseSize(heightMatch[1], 0, availableHeight)
      }
    }

    // Position
    let x = availableX + marginLeft
    let y = availableY + marginTop

    // Handle positioning
    if (styles.position === 'absolute' || styles.position === 'fixed') {
      if (styles.left !== 0)
        x = styles.left
      if (styles.top !== 0)
        y = styles.top
    }

    // Layout children
    const children: LayoutNode[] = []
    let childX = x + borderLeft + paddingLeft
    let childY = y + borderTop + paddingTop
    let maxChildWidth = 0
    let totalChildHeight = 0
    let lineHeight = 0
    let lineWidth = 0

    for (const child of element.children) {
      if (typeof child === 'string') {
        // Text node - will be handled in rendering
        continue
      }

      const childStyles = computeStyles(child, allRules, styles, contentWidth)

      if (childStyles.display === 'none')
        continue

      const isBlock = childStyles.display === 'block' || BLOCK_ELEMENTS.has(child.tagName)

      if (isBlock && lineWidth > 0) {
        // New line for block elements
        childY += lineHeight
        totalChildHeight += lineHeight
        lineHeight = 0
        lineWidth = 0
        childX = x + borderLeft + paddingLeft
      }

      const childLayout = layoutElement(
        child,
        styles,
        childX,
        childY,
        isBlock ? contentWidth : contentWidth - lineWidth,
        availableHeight - totalChildHeight,
      )

      children.push(childLayout)

      if (childLayout.visible) {
        if (isBlock) {
          // Block element takes full width, stack vertically
          const childTotalHeight = childLayout.box.height + childStyles.marginTop + childStyles.marginBottom
          childY += childTotalHeight
          totalChildHeight += childTotalHeight
          maxChildWidth = Math.max(maxChildWidth, childLayout.box.width)
        }
        else {
          // Inline element
          const childTotalWidth = childLayout.box.width + childStyles.marginLeft + childStyles.marginRight
          lineWidth += childTotalWidth
          childX += childTotalWidth
          lineHeight = Math.max(lineHeight, childLayout.box.height + childStyles.marginTop + childStyles.marginBottom)
          maxChildWidth = Math.max(maxChildWidth, lineWidth)
        }
      }
    }

    // Add last line height
    if (lineHeight > 0) {
      totalChildHeight += lineHeight
    }

    // Get text content for this element
    let text: string | null = null
    const textParts: string[] = []
    for (const child of element.children) {
      if (typeof child === 'string') {
        textParts.push(child)
      }
    }
    if (textParts.length > 0) {
      text = textParts.join(' ')
    }

    // Calculate text height if there's text
    let textHeight = 0
    if (text) {
      const lineCount = Math.ceil((text.length * styles.fontSize * 0.6) / contentWidth) || 1
      textHeight = lineCount * styles.fontSize * 1.2
    }

    // Final dimensions
    const contentHeight = Math.max(totalChildHeight, textHeight, explicitHeight ?? 0)
    const totalWidth = borderLeft + paddingLeft + contentWidth + paddingRight + borderRight
    const totalHeight = borderTop + paddingTop + contentHeight + paddingBottom + borderBottom

    return {
      tagName: element.tagName,
      box: {
        x,
        y,
        width: totalWidth,
        height: totalHeight,
      },
      styles,
      text,
      children,
      visible: true,
    }
  }

  const rootStyles: ComputedStyles = {
    ...DEFAULT_STYLES,
    backgroundColor: { r: 255, g: 255, b: 255, a: 255 },
  }

  return layoutElement(parsed, rootStyles, 0, 0, viewportWidth, viewportHeight)
}
