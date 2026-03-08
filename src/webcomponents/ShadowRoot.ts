/**
 * Shadow DOM implementation
 */

import { parseHTML } from '../parsers/html-parser'
import { escapeHtmlAttribute, escapeHtmlText } from '../parsers/html-utils'
import { VirtualDocumentFragment } from '../nodes/VirtualDocumentFragment'
import { COMMENT_NODE, ELEMENT_NODE, TEXT_NODE, type VirtualNode } from '../nodes/VirtualNode'
import type { VirtualElement } from '../nodes/VirtualElement'
import type { VirtualEventTarget } from '../events/VirtualEventTarget'

export type ShadowRootMode = 'open' | 'closed'

export interface ShadowRootInit {
  mode: ShadowRootMode
  delegatesFocus?: boolean
}

/**
 * ShadowRoot represents a shadow DOM tree
 */
export class ShadowRoot extends VirtualDocumentFragment {
  public mode: ShadowRootMode
  public delegatesFocus: boolean
  public host: VirtualElement

  constructor(host: VirtualElement, init: ShadowRootInit) {
    super()
    this.host = host
    this.mode = init.mode
    this.delegatesFocus = init.delegatesFocus || false
    this.parentNode = host
    this.ownerDocument = host.ownerDocument
    this.nodeName = '#shadow-root'
  }

  get innerHTML(): string {
    return this.childNodes.map(child => this._serializeNode(child, undefined)).join('')
  }

  set innerHTML(html: string) {
    while (this.childNodes.length > 0) {
      this.removeChild(this.childNodes[0])
    }

    if (!html) {
      return
    }

    const nodes = parseHTML(html, this.ownerDocument)
    for (const node of nodes) {
      this.appendChild(node)
    }
  }

  protected _getEventParent(): VirtualEventTarget | null {
    return this.host as unknown as VirtualEventTarget
  }

  private _serializeNode(node: VirtualNode, parentTagName?: string): string {
    if (node.nodeType === TEXT_NODE) {
      const text = node.nodeValue || ''
      if (parentTagName === 'SCRIPT' || parentTagName === 'STYLE') {
        return text
      }
      return escapeHtmlText(text)
    }
    if (node.nodeType === COMMENT_NODE) {
      return `<!--${node.nodeValue || ''}-->`
    }
    if (node.nodeType === ELEMENT_NODE) {
      const element = node as VirtualElement
      const tagName = element.tagName.toLowerCase()
      let html = `<${tagName}`

      for (const [name, value] of element.attributes) {
        html += ` ${name}="${escapeHtmlAttribute(value)}"`
      }

      const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']
      if (voidElements.includes(tagName)) {
        return `${html}>`
      }

      html += '>'
      for (const child of element.childNodes) {
        html += this._serializeNode(child, element.tagName)
      }
      html += `</${tagName}>`
      return html
    }
    return ''
  }
}
