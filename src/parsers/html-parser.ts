import type { VirtualNode } from '../nodes/VirtualNode'
import { VirtualCommentNode } from '../nodes/VirtualCommentNode'
import { VirtualElement } from '../nodes/VirtualElement'
import { VirtualTextNode } from '../nodes/VirtualTextNode'

/**
 * Parse HTML string into virtual DOM nodes
 */
export function parseHTML(html: string): VirtualNode[] {
  let pos = 0

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

  function parseTag(): VirtualElement | VirtualCommentNode | null {
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
      return new VirtualCommentNode(commentText)
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

    const element = new VirtualElement(tagName)

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
      element.setAttribute(attrName, hasValue ? attrValue : attrName)
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
    if (isSelfClosing || voidElements.includes(tagName.toLowerCase())) {
      return element
    }

    // Parse children
    const children = parseNodes(tagName)
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

    return new VirtualTextNode(text)
  }

  function parseNodes(closingTag?: string): VirtualNode[] {
    const children: VirtualNode[] = []

    while (pos < html.length) {
      // Check for closing tag
      if (closingTag && html.slice(pos, pos + 2 + closingTag.length + 1) === `</${closingTag}>`) {
        pos += 2 + closingTag.length + 1
        break
      }

      if (peek() === '<') {
        const node = parseTag()
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
