import type { VirtualNode } from '../nodes/VirtualNode'
import { decodeHtmlEntities } from './html-utils'
import { VirtualCommentNode } from '../nodes/VirtualCommentNode'
import { VirtualElement } from '../nodes/VirtualElement'
import { VirtualSVGElement } from '../nodes/VirtualSVGElement'
import { VirtualTextNode } from '../nodes/VirtualTextNode'

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

  function createElementNode(tagName: string, inSvg = false): any {
    if (ownerDocument) {
      return inSvg
        ? ownerDocument.createElementNS?.('http://www.w3.org/2000/svg', tagName)
        : ownerDocument.createElement(tagName)
    }

    const element = inSvg ? new VirtualSVGElement(tagName) : new VirtualElement(tagName)
    if (ownerDocument) {
      element.ownerDocument = ownerDocument
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

  function parseTag(inSvg = false): VirtualElement | VirtualCommentNode | null {
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

    const isSvgElement = inSvg || tagName.toLowerCase() === 'svg'
    const element = createElementNode(tagName, isSvgElement)
    const tagNameLower = tagName.toLowerCase()

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
    const children = parseNodes(tagName, isSvgElement)
    for (const child of children) {
      element.appendChild(child)
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

  function parseNodes(closingTag?: string, inSvg = false): VirtualNode[] {
    const children: VirtualNode[] = []

    while (pos < html.length) {
      // Check for closing tag
      if (closingTag && consumeClosingTag(closingTag)) {
        break
      }

      if (peek() === '<') {
        const node = parseTag(inSvg)
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
