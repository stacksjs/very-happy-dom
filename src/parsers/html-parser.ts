import type { VirtualNode } from '../nodes/VirtualNode'
import { decodeHtmlEntities } from './html-utils'
import { VirtualCommentNode } from '../nodes/VirtualCommentNode'
import { VirtualElement } from '../nodes/VirtualElement'
import { VirtualSVGElement } from '../nodes/VirtualSVGElement'
import { VirtualTextNode } from '../nodes/VirtualTextNode'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML'

/**
 * Parse HTML string into virtual DOM nodes
 */
export function parseHTML(html: string, ownerDocument?: any): VirtualNode[] {
  let pos = 0
  const lowerHtml = html.toLowerCase()

  function peek(): string {
    return html[pos] || ''
  }

  function consume(): string {
    return html[pos++] || ''
  }

  function consumeWhitespace(): void {
    while (/\s/.test(peek())) {
      consume()
    }
  }

  function createElementNode(tagName: string, namespaceURI: string | null = null): any {
    if (ownerDocument) {
      if (namespaceURI) {
        return ownerDocument.createElementNS?.(namespaceURI, tagName)
      }
      return ownerDocument.createElement(tagName)
    }

    const element = namespaceURI === SVG_NAMESPACE ? new VirtualSVGElement(tagName) : new VirtualElement(tagName)
    if (namespaceURI && namespaceURI !== SVG_NAMESPACE) {
      element.namespaceURI = namespaceURI
    }
    return element
  }

  function createTextNode(text: string): VirtualTextNode {
    const node = ownerDocument?.createTextNode?.(text) ?? new VirtualTextNode(text)
    if (!node.ownerDocument && ownerDocument) {
      node.ownerDocument = ownerDocument
    }
    return node
  }

  function createCommentNode(text: string): VirtualCommentNode {
    const node = ownerDocument?.createComment?.(text) ?? new VirtualCommentNode(text)
    if (!node.ownerDocument && ownerDocument) {
      node.ownerDocument = ownerDocument
    }
    return node
  }

  function consumeClosingTag(tagName: string): boolean {
    if (html.slice(pos, pos + 2) !== '</') {
      return false
    }

    const end = html.indexOf('>', pos + 2)
    if (end === -1) {
      return false
    }

    const closingName = html.slice(pos + 2, end).trim().toLowerCase()
    if (closingName !== tagName.toLowerCase()) {
      return false
    }

    pos = end + 1
    return true
  }

  function readUntilClosingTag(tagName: string): string {
    const closingToken = `</${tagName.toLowerCase()}`
    const end = lowerHtml.indexOf(closingToken, pos)
    if (end === -1) {
      const text = html.slice(pos)
      pos = html.length
      return text
    }

    const text = html.slice(pos, end)
    pos = end
    return text
  }

  function peekStartTagName(): string | null {
    if (peek() !== '<' || html.slice(pos, pos + 2) === '</' || html.slice(pos, pos + 4) === '<!--' || html.slice(pos, pos + 2) === '<!') {
      return null
    }

    let index = pos + 1
    let name = ''
    while (html[index] && /[a-z0-9-]/i.test(html[index])) {
      name += html[index]
      index++
    }
    return name ? name.toLowerCase() : null
  }

  function peekClosingTagName(): string | null {
    if (html.slice(pos, pos + 2) !== '</') {
      return null
    }

    let index = pos + 2
    let name = ''
    while (html[index] && /[a-z0-9-]/i.test(html[index])) {
      name += html[index]
      index++
    }

    return name ? name.toLowerCase() : null
  }

  function shouldImplicitlyClose(currentTag: string, upcomingTag: string | null): boolean {
    if (!upcomingTag) {
      return false
    }

    const closingRules: Record<string, string[]> = {
      li: ['li'],
      p: ['address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul'],
      dt: ['dt', 'dd'],
      dd: ['dt', 'dd'],
      option: ['option', 'optgroup'],
      thead: ['tbody', 'tfoot'],
      tbody: ['tbody', 'tfoot'],
      tr: ['tr', 'tbody', 'thead', 'tfoot'],
      td: ['td', 'th', 'tr', 'tbody', 'thead', 'tfoot'],
      th: ['td', 'th', 'tr', 'tbody', 'thead', 'tfoot'],
    }

    return closingRules[currentTag]?.includes(upcomingTag) ?? false
  }

  function appendParsedChild(parent: VirtualElement, child: VirtualNode): void {
    if (child.nodeType !== 1) {
      parent.appendChild(child)
      return
    }

    const parentTag = parent.tagName.toLowerCase()
    const childElement = child as VirtualElement
    const childTag = childElement.tagName.toLowerCase()

    if (parentTag === 'table' && childTag === 'tr') {
      let tbody = parent.lastChild as VirtualElement | null
      if (!tbody || tbody.nodeType !== 1 || (tbody as VirtualElement).tagName !== 'TBODY') {
        tbody = createElementNode('tbody', parent.namespaceURI) as VirtualElement
        parent.appendChild(tbody)
      }
      tbody.appendChild(child)
      return
    }

    if (parentTag === 'table' && (childTag === 'td' || childTag === 'th')) {
      let tbody = parent.lastChild as VirtualElement | null
      if (!tbody || tbody.nodeType !== 1 || (tbody as VirtualElement).tagName !== 'TBODY') {
        tbody = createElementNode('tbody', parent.namespaceURI) as VirtualElement
        parent.appendChild(tbody)
      }
      let row = tbody.lastChild as VirtualElement | null
      if (!row || row.nodeType !== 1 || (row as VirtualElement).tagName !== 'TR') {
        row = createElementNode('tr', parent.namespaceURI) as VirtualElement
        tbody.appendChild(row)
      }
      row.appendChild(child)
      return
    }

    if ((parentTag === 'tbody' || parentTag === 'thead' || parentTag === 'tfoot') && (childTag === 'td' || childTag === 'th')) {
      let row = parent.lastChild as VirtualElement | null
      if (!row || row.nodeType !== 1 || (row as VirtualElement).tagName !== 'TR') {
        row = createElementNode('tr', parent.namespaceURI) as VirtualElement
        parent.appendChild(row)
      }
      row.appendChild(child)
      return
    }

    parent.appendChild(child)
  }

  function parseTag(namespaceURI: string | null = null): VirtualElement | VirtualCommentNode | null {
    if (peek() !== '<')
      return null

    consume() // <

    // Check for comment
    if (html.slice(pos, pos + 3) === '!--') {
      pos += 3
      const commentEnd = html.indexOf('-->', pos)
      if (commentEnd === -1) {
        throw new Error('Unclosed comment')
      }
      const commentText = html.slice(pos, commentEnd)
      pos = commentEnd + 3
      return createCommentNode(commentText)
    }

    // Check for DOCTYPE
    if (html.slice(pos, pos + 8).toUpperCase() === '!DOCTYPE') {
      const doctypeEnd = html.indexOf('>', pos)
      if (doctypeEnd === -1) {
        throw new Error('Unclosed DOCTYPE')
      }
      pos = doctypeEnd + 1
      return null // Skip DOCTYPE
    }

    // Check for closing tag
    if (peek() === '/') {
      consume()
      const tagNameEnd = html.indexOf('>', pos)
      if (tagNameEnd === -1) {
        throw new Error('Unclosed tag')
      }
      pos = tagNameEnd + 1
      return null // Signal closing tag
    }

    // Parse tag name
    let tagName = ''
    while (peek() && /[a-z0-9-]/i.test(peek())) {
      tagName += consume()
    }

    if (!tagName) {
      throw new Error('Invalid tag name')
    }

    const tagNameLower = tagName.toLowerCase()
    const elementNamespace = namespaceURI === SVG_NAMESPACE || namespaceURI === MATHML_NAMESPACE
      ? namespaceURI
      : tagNameLower === 'svg'
        ? SVG_NAMESPACE
        : tagNameLower === 'math'
          ? MATHML_NAMESPACE
          : null
    const element = createElementNode(tagName, elementNamespace)

    // Parse attributes
    while (peek() && peek() !== '>' && peek() !== '/') {
      consumeWhitespace()

      if (peek() === '>' || peek() === '/')
        break

      // Parse attribute name
      let attrName = ''
      while (peek() && /[\w\-:]/.test(peek())) {
        attrName += consume()
      }

      if (!attrName)
        break

      consumeWhitespace()

      // Check for attribute value
      let attrValue = ''
      let hasValue = false
      if (peek() === '=') {
        hasValue = true
        consume() // =
        consumeWhitespace()

        if (peek() === '"' || peek() === '\'') {
          const quote = consume()
          while (peek() && peek() !== quote) {
            attrValue += consume()
          }
          if (peek() === quote) {
            consume()
          }
        }
        else {
          // Unquoted attribute value
          while (peek() && !/[\s>]/.test(peek())) {
            attrValue += consume()
          }
        }
      }

      // If attribute has value (with =), use it even if empty string
      // Otherwise use attribute name as value (boolean attribute)
      element.setAttribute(attrName, hasValue ? decodeHtmlEntities(attrValue) : '')
    }

    // Check for self-closing tag
    const isSelfClosing = peek() === '/'
    if (isSelfClosing) {
      consume() // /
    }

    if (peek() === '>') {
      consume() // >
    }

    // Self-closing tags and void elements don't have children
    const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']
    if (isSelfClosing || voidElements.includes(tagNameLower)) {
      return element
    }

    const rawTextElements = new Set(['script', 'style'])
    const rcDataElements = new Set(['textarea', 'title'])
    if (rawTextElements.has(tagNameLower) || rcDataElements.has(tagNameLower)) {
      const textContent = readUntilClosingTag(tagName)
      if (textContent) {
        element.appendChild(createTextNode(rcDataElements.has(tagNameLower) ? decodeHtmlEntities(textContent) : textContent))
      }
      consumeClosingTag(tagName)
      return element
    }

    // Parse children
    const children = parseNodes(tagNameLower, elementNamespace)
    for (const child of children) {
      appendParsedChild(element, child)
    }

    return element
  }

  function parseText(): VirtualTextNode | null {
    let text = ''
    while (peek() && peek() !== '<') {
      text += consume()
    }

    if (!text)
      return null

    return createTextNode(decodeHtmlEntities(text))
  }

  function parseNodes(closingTag?: string, namespaceURI: string | null = null): VirtualNode[] {
    const children: VirtualNode[] = []

    while (pos < html.length) {
      // Check for closing tag
      if (closingTag && consumeClosingTag(closingTag)) {
        break
      }

      if (closingTag && peekClosingTagName()) {
        break
      }

      if (closingTag && shouldImplicitlyClose(closingTag, peekStartTagName())) {
        break
      }

      if (peek() === '<') {
        const node = parseTag(namespaceURI)
        if (node === null) {
          // DOCTYPE or closing tag - skip it and continue
          // (expected closing tags are already handled above)
          continue
        }
        children.push(node)
      }
      else {
        const textNode = parseText()
        if (textNode) {
          children.push(textNode)
        }
      }
    }

    return children
  }

  const rootNodes = parseNodes()
  return rootNodes
}
