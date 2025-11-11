import type { XPathResult } from '../xpath/XPathResult'
import type { History, HistoryState, Location, NodeType, VirtualNode } from './VirtualNode'
import { parseHTML } from '../parsers/html-parser'
import { XPathEvaluator } from '../xpath/XPathEvaluator'
import { XPathResultType } from '../xpath/XPathResult'
import { VirtualCommentNode } from './VirtualCommentNode'
import { VirtualElement } from './VirtualElement'
import { VirtualTextNode } from './VirtualTextNode'

export class VirtualDocument implements VirtualNode {
  nodeType: NodeType = 'document'
  nodeName: string = '#document'
  nodeValue: string | null = null
  attributes: Map<string, string> = new Map<string, string>()
  children: VirtualNode[] = []
  parentNode: VirtualNode | null = null

  documentElement: VirtualElement | null = null
  head: VirtualElement | null = null
  body: VirtualElement | null = null
  location: Location
  history: History
  title = ''

  private _historyStack: HistoryState[] = []
  private _historyIndex = -1
  private _eventListeners = new Map<string, Array<(event: any) => void>>()
  private _xpathEvaluator = new XPathEvaluator()
  private _cookies: Record<string, string> = {}

  constructor() {
    // Initialize with basic structure
    this.documentElement = new VirtualElement('html')
    this.head = new VirtualElement('head')
    this.body = new VirtualElement('body')

    this.documentElement.appendChild(this.head)
    this.documentElement.appendChild(this.body)
    this.appendChild(this.documentElement)

    // Initialize location
    this.location = {
      href: '',
      protocol: '',
      host: '',
      hostname: '',
      port: '',
      pathname: '',
      search: '',
      hash: '',
      origin: '',
      assign: (url: string) => {
        this._updateLocation(url)
      },
      replace: (url: string) => {
        this._updateLocation(url)
      },
      reload: () => {
        // No-op in virtual DOM
      },
    }

    // Initialize history with closure to maintain 'this' context
    // eslint-disable-next-line ts/no-this-alias
    const doc = this
    this.history = {
      get length() {
        return doc._historyStack.length
      },
      get state() {
        return doc._historyStack[doc._historyIndex]?.state || null
      },
      pushState(state: any, title: string, url?: string) {
        // Remove any forward history
        doc._historyStack = doc._historyStack.slice(0, doc._historyIndex + 1)

        // Add new state
        doc._historyStack.push({
          state,
          title,
          url: url || doc.location.href,
        })
        doc._historyIndex++

        // Update location if URL provided
        if (url) {
          doc._updateLocation(url)
        }
      },
      replaceState(state: any, title: string, url?: string) {
        if (doc._historyIndex >= 0) {
          doc._historyStack[doc._historyIndex] = {
            state,
            title,
            url: url || doc.location.href,
          }

          // Update location if URL provided
          if (url) {
            doc._updateLocation(url)
          }
        }
      },
      back() {
        if (doc._historyIndex > 0) {
          doc._historyIndex--
          const entry = doc._historyStack[doc._historyIndex]
          if (entry.url) {
            doc._updateLocation(entry.url)
          }
        }
      },
      forward() {
        if (doc._historyIndex < doc._historyStack.length - 1) {
          doc._historyIndex++
          const entry = doc._historyStack[doc._historyIndex]
          if (entry.url) {
            doc._updateLocation(entry.url)
          }
        }
      },
      go(delta: number) {
        const newIndex = doc._historyIndex + delta
        if (newIndex >= 0 && newIndex < doc._historyStack.length) {
          doc._historyIndex = newIndex
          const entry = doc._historyStack[doc._historyIndex]
          if (entry.url) {
            doc._updateLocation(entry.url)
          }
        }
      },
    }

    // Don't initialize history stack - let pushState be the first entry
    // this._historyStack.push({
    //   state: null,
    //   title: '',
    //   url: this.location.href,
    // })
    // this._historyIndex = 0
  }

  private _updateLocation(url: string): void {
    try {
      const parsed = new URL(url, this.location.href)
      this.location.href = parsed.href
      this.location.protocol = parsed.protocol
      this.location.host = parsed.host
      this.location.hostname = parsed.hostname
      this.location.port = parsed.port
      this.location.pathname = parsed.pathname
      this.location.search = parsed.search
      this.location.hash = parsed.hash
      this.location.origin = parsed.origin
    }
    catch {
      // Invalid URL, ignore
    }
  }

  get textContent(): string {
    return this.documentElement?.textContent || ''
  }

  set textContent(value: string) {
    if (this.documentElement) {
      this.documentElement.textContent = value
    }
  }

  appendChild(child: VirtualNode): VirtualNode {
    this.children.push(child)
    child.parentNode = this
    return child
  }

  createElement(tagName: string): VirtualElement {
    return new VirtualElement(tagName)
  }

  createTextNode(text: string): VirtualTextNode {
    return new VirtualTextNode(text)
  }

  createComment(text: string): VirtualCommentNode {
    return new VirtualCommentNode(text)
  }

  createDocumentFragment(): VirtualElement {
    // DocumentFragment is similar to a VirtualElement but doesn't get serialized
    // For simplicity, we use a VirtualElement with a special tag
    const fragment = new VirtualElement('document-fragment')
    // Mark it as a fragment internally
    ;(fragment as any)._isFragment = true
    return fragment
  }

  querySelector(selector: string): VirtualElement | null {
    return this.documentElement?.querySelector(selector) || null
  }

  querySelectorAll(selector: string): VirtualElement[] {
    return this.documentElement?.querySelectorAll(selector) || []
  }

  getElementById(id: string): VirtualElement | null {
    return this.querySelector(`#${id}`)
  }

  getElementsByTagName(tagName: string): VirtualElement[] {
    return this.querySelectorAll(tagName)
  }

  getElementsByClassName(className: string): VirtualElement[] {
    return this.querySelectorAll(`.${className}`)
  }

  // Parse and set body HTML
  parseHTML(html: string): void {
    const nodes = parseHTML(html)

    if (this.body) {
      // Clear all child nodes (children is a computed property)
      this.body.childNodes = []
      for (const node of nodes) {
        this.body.appendChild(node)
      }
    }
  }

  /**
   * Writes HTML to the document
   * Compatible with Happy DOM's document.write()
   */
  write(html: string): void {
    // Parse the HTML
    const nodes = parseHTML(html)

    // If the HTML contains a full document structure, replace documentElement
    for (const node of nodes) {
      if (node.nodeType === 'element') {
        const element = node as VirtualElement
        if (element.tagName === 'HTML') {
          // Replace the entire document structure
          this.documentElement = element
          element.parentNode = this

          // Update head and body references
          for (const child of element.children) {
            if (child.nodeType === 'element') {
              const childEl = child as VirtualElement
              if (childEl.tagName === 'HEAD') {
                this.head = childEl
              }
              else if (childEl.tagName === 'BODY') {
                this.body = childEl
              }
            }
          }
          return
        }
      }
    }

    // Otherwise, append to body
    if (this.body) {
      for (const node of nodes) {
        this.body.appendChild(node)
      }
    }
  }

  // Get computed styles
  getComputedStyle(element: VirtualElement): any {
    // Define default display values for common elements
    const defaultDisplay: Record<string, string> = {
      DIV: 'block',
      P: 'block',
      H1: 'block',
      H2: 'block',
      H3: 'block',
      H4: 'block',
      H5: 'block',
      H6: 'block',
      UL: 'block',
      OL: 'block',
      LI: 'list-item',
      TABLE: 'table',
      TR: 'table-row',
      TD: 'table-cell',
      TH: 'table-cell',
      SPAN: 'inline',
      A: 'inline',
      EM: 'inline',
      STRONG: 'inline',
      SCRIPT: 'none',
      STYLE: 'none',
      HEAD: 'none',
    }

    const self = element
    return new Proxy(
      {
        getPropertyValue(property: string): string {
          const value = self.style.getPropertyValue(property)
          if (value)
            return value

          // Return default display value for the element type
          if (property === 'display' && !value) {
            return defaultDisplay[self.tagName] || 'block'
          }

          return value || ''
        },
      },
      {
        get(target, prop: string) {
          if (prop === 'getPropertyValue') {
            return target.getPropertyValue
          }
          // Convert camelCase to kebab-case
          const kebabProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
          const value = self.style.getPropertyValue(kebabProp)
          if (value)
            return value

          // Return default display value for the element type
          if (kebabProp === 'display' && !value) {
            return defaultDisplay[self.tagName] || 'block'
          }

          return value || ''
        },
      },
    )
  }

  // Event listener methods
  addEventListener(type: string, listener: (event: any) => void): void {
    if (!this._eventListeners.has(type)) {
      this._eventListeners.set(type, [])
    }
    this._eventListeners.get(type)!.push(listener)
  }

  removeEventListener(type: string, listener: (event: any) => void): void {
    const listeners = this._eventListeners.get(type)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
  }

  dispatchEvent(event: any): boolean {
    const listeners = this._eventListeners.get(event.type)
    if (listeners) {
      for (const listener of listeners) {
        listener(event)
      }
    }
    return true
  }

  // XPath support
  evaluate(
    expression: string,
    contextNode: VirtualNode = this,
    resolver: any = null,
    type: XPathResultType = XPathResultType.ANY_TYPE,
    result: XPathResult | null = null,
  ): XPathResult {
    // If contextNode is the document, start from documentElement
    const actualContext = contextNode === this ? (this.documentElement || this) : contextNode
    return this._xpathEvaluator.evaluate(expression, actualContext, resolver, type, result)
  }

  createExpression(expression: string, resolver: any = null): any {
    return {
      evaluate: (contextNode: VirtualNode, type: XPathResultType = XPathResultType.ANY_TYPE) => {
        // If contextNode is the document, start from documentElement
        const actualContext = contextNode === this ? (this.documentElement || this) : contextNode
        return this._xpathEvaluator.evaluate(expression, actualContext, resolver, type, null)
      },
    }
  }

  // Cookie API
  get cookie(): string {
    return Object.entries(this._cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ')
  }

  set cookie(value: string) {
    // Parse cookie string: "name=value; expires=...; path=..."
    const parts = value.split(';').map(p => p.trim())
    const [nameValue] = parts

    if (nameValue) {
      const [name, val] = nameValue.split('=').map(s => s.trim())
      if (name) {
        this._cookies[name] = val || ''
      }
    }
  }
}

/**
 * Factory function to create a new virtual document
 */
export function createDocument(): VirtualDocument {
  return new VirtualDocument()
}
