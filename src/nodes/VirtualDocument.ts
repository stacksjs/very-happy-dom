import type { XPathResult } from '../xpath/XPathResult'
import type { CSSStyleSheet } from '../css/CSSOM'
import type { ICookie } from '../browser/CookieContainer'
import { CookieContainer, CookieSameSiteEnum } from '../browser/CookieContainer'
import { CustomEvent } from '../events/CustomEvent'
import { VirtualEvent } from '../events/VirtualEvent'
import { MouseEvent, KeyboardEvent, FocusEvent, UIEvent } from '../events/EventClasses'
import type { History, HistoryState, Location, NodeKind, NodeType, VirtualNode } from './VirtualNode'
import { parseHTML } from '../parsers/html-parser'
import { NodeIterator, Range, Selection, TreeWalker, type NodeFilterInput } from '../traversal'
import { XPathEvaluator } from '../xpath/XPathEvaluator'
import { XPathResultType } from '../xpath/XPathResult'
import { VirtualCommentNode } from './VirtualCommentNode'
import { VirtualDocumentFragment } from './VirtualDocumentFragment'
import { querySelectorAllEngine, querySelectorEngine } from '../selectors/engine'
import { VirtualElement } from './VirtualElement'
import { VirtualSVGElement } from './VirtualSVGElement'
import { VirtualTemplateElement } from './VirtualTemplateElement'
import { VirtualTextNode } from './VirtualTextNode'
import { DOCUMENT_NODE, ELEMENT_NODE, VirtualNodeBase } from './VirtualNode'
import { appendNode, setOwnerDocumentRecursive } from './tree-operations'

export class VirtualDocument extends VirtualNodeBase {
  nodeType: NodeType = DOCUMENT_NODE
  nodeKind: NodeKind = 'document'
  nodeName: string = '#document'
  defaultView: any = null
  _idIndex: Map<string, VirtualElement> = new Map()

  /**
   * Happy-DOM alias for defaultView. Lets tests written against happy-dom
   * that reach for `document.parentWindow.someWindowAPI` work unchanged.
   */
  get parentWindow(): any {
    return this.defaultView
  }

  documentElement: VirtualElement | null = null
  head: VirtualElement | null = null
  body: VirtualElement | null = null
  location: Location
  history: History

  private _fallbackTitle = ''

  get title(): string {
    const el = this.head?.querySelector('title')
    return el?.textContent ?? this._fallbackTitle
  }

  set title(value: string) {
    this._fallbackTitle = value
    if (!this.head)
      return
    let el: VirtualElement | null = this.head.querySelector('title')
    if (!el) {
      el = this.createElement('title')
      if (!el)
        return
      this.head.appendChild(el)
    }
    el.textContent = value
  }

  readyState: string = 'complete'
  compatMode: string = 'CSS1Compat'
  contentType: string = 'text/html'
  characterSet: string = 'UTF-8'
  doctype: null = null
  hidden: boolean = false
  visibilityState: string = 'visible'
  dir: string = ''
  referrer: string = ''
  designMode: string = 'off'

  get charset(): string {
    return this.characterSet
  }

  get inputEncoding(): string {
    return this.characterSet
  }

  get URL(): string {
    return this.location.href
  }

  get documentURI(): string {
    return this.URL
  }

  get baseURI(): string {
    const baseElement = this.head?.querySelector('base[href]') || this.querySelector('base[href]')
    const href = baseElement?.getAttribute('href')
    return href ? this._resolveAgainstDocumentURL(href) : this._getDocumentURLForResolution()
  }

  get domain(): string {
    if (this._locationState.hostname) {
      return this._locationState.hostname
    }
    try {
      return new URL(this._getDocumentURLForResolution()).hostname
    }
    catch {
      return ''
    }
  }

  get lastModified(): string {
    return new Date().toLocaleString()
  }

  private _focusedElement: VirtualElement | null = null

  get activeElement(): VirtualElement | null {
    return this._focusedElement || this.body
  }

  get scrollingElement(): VirtualElement | null {
    return this.documentElement
  }

  get forms(): VirtualElement[] {
    return this.querySelectorAll('form')
  }

  get images(): VirtualElement[] {
    return this.querySelectorAll('img')
  }

  get links(): VirtualElement[] {
    return this.querySelectorAll('a[href], area[href]')
  }

  get scripts(): VirtualElement[] {
    return this.querySelectorAll('script')
  }

  get anchors(): VirtualElement[] {
    return this.querySelectorAll('a[name]')
  }

  get embeds(): VirtualElement[] {
    return this.querySelectorAll('embed')
  }

  get plugins(): VirtualElement[] {
    return this.embeds
  }

  currentScript: VirtualElement | null = null

  private _adoptedStyleSheets: CSSStyleSheet[] = []

  get styleSheets(): CSSStyleSheet[] {
    return []
  }

  get adoptedStyleSheets(): CSSStyleSheet[] {
    return this._adoptedStyleSheets
  }

  set adoptedStyleSheets(value: CSSStyleSheet[]) {
    this._adoptedStyleSheets = value
  }

  implementation = {
    createHTMLDocument: (title?: string): VirtualDocument => {
      const doc = new VirtualDocument()
      if (title !== undefined) {
        doc.title = title
      }
      return doc
    },
    hasFeature: (): boolean => true,
  }

  private _historyStack: HistoryState[] = []
  private _historyIndex = -1
  private _xpathEvaluator = new XPathEvaluator()
  private _cookieContainer = new CookieContainer()
  private _selection: Selection | null = null
  private _locationState: {
    href: string
    protocol: string
    host: string
    hostname: string
    port: string
    pathname: string
    search: string
    hash: string
    origin: string
  } = {
      href: '',
      protocol: '',
      host: '',
      hostname: '',
      port: '',
      pathname: '',
      search: '',
      hash: '',
      origin: '',
    }

  constructor() {
    super()
    // Initialize with basic structure
    this.documentElement = new VirtualElement('html')
    this.head = new VirtualElement('head')
    this.body = new VirtualElement('body')

    this.documentElement.appendChild(this.head)
    this.documentElement.appendChild(this.body)
    this.appendChild(this.documentElement)

    // Initialize location
    this.location = this._createLocation()

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
        const resolvedUrl = url ? doc._resolveLocationString(url) : doc.location.href
        // Remove any forward history
        doc._historyStack = doc._historyStack.slice(0, doc._historyIndex + 1)

        // Add new state
        doc._historyStack.push({
          state,
          title,
          url: resolvedUrl,
        })
        doc._historyIndex++

        // Update location if URL provided
        if (url) {
          doc._updateLocation(resolvedUrl, { triggerHashchange: false })
        }
      },
      replaceState(state: any, title: string, url?: string) {
        const resolvedUrl = url ? doc._resolveLocationString(url) : doc.location.href
        // Ensure there is at least one entry so replaceState always succeeds.
        if (doc._historyIndex < 0) {
          doc._historyStack.push({ state, title, url: resolvedUrl })
          doc._historyIndex = 0
        }
        else {
          doc._historyStack[doc._historyIndex] = {
            state,
            title,
            url: resolvedUrl,
          }
        }
        if (url)
          doc._updateLocation(resolvedUrl, { triggerHashchange: false })
      },
      back() {
        if (doc._historyIndex > 0) {
          doc._historyIndex--
          const entry = doc._historyStack[doc._historyIndex]
          if (entry.url) {
            doc._updateLocation(entry.url, { triggerPopstate: true, popState: entry.state })
          }
        }
      },
      forward() {
        if (doc._historyIndex < doc._historyStack.length - 1) {
          doc._historyIndex++
          const entry = doc._historyStack[doc._historyIndex]
          if (entry.url) {
            doc._updateLocation(entry.url, { triggerPopstate: true, popState: entry.state })
          }
        }
      },
      go(delta: number) {
        const newIndex = doc._historyIndex + delta
        if (newIndex >= 0 && newIndex < doc._historyStack.length) {
          doc._historyIndex = newIndex
          const entry = doc._historyStack[doc._historyIndex]
          if (entry.url) {
            doc._updateLocation(entry.url, { triggerPopstate: true, popState: entry.state })
          }
        }
      },
    }

    // Don't seed the initial history entry — existing tests rely on
    // length 1 after a single pushState (not length 2 with the seeded
    // entry). replaceState's impl updates the URL even when the stack is
    // empty, so this stays spec-adjacent without breaking them.
  }

  private _createLocation(): Location {
    const location = {} as Location

    const mutateLocation = (mutator: (url: URL) => void): void => {
      const parsed = new URL(this._getDocumentURLForResolution(), 'http://localhost/')
      mutator(parsed)
      this._updateLocation(parsed.href)
    }

    Object.defineProperties(location, {
      href: {
        enumerable: true,
        get: () => this._locationState.href,
        set: (value: string) => {
          this._updateLocation(`${value}`)
        },
      },
      protocol: {
        enumerable: true,
        get: () => this._locationState.protocol,
        set: (value: string) => mutateLocation(url => { url.protocol = value.endsWith(':') ? value : `${value}:` }),
      },
      host: {
        enumerable: true,
        get: () => this._locationState.host,
        set: (value: string) => mutateLocation(url => { url.host = value }),
      },
      hostname: {
        enumerable: true,
        get: () => this._locationState.hostname,
        set: (value: string) => mutateLocation(url => { url.hostname = value }),
      },
      port: {
        enumerable: true,
        get: () => this._locationState.port,
        set: (value: string) => mutateLocation(url => { url.port = value }),
      },
      pathname: {
        enumerable: true,
        get: () => this._locationState.pathname,
        set: (value: string) => mutateLocation(url => { url.pathname = value.startsWith('/') ? value : `/${value}` }),
      },
      search: {
        enumerable: true,
        get: () => this._locationState.search,
        set: (value: string) => mutateLocation(url => { url.search = value ? (value.startsWith('?') ? value : `?${value}`) : '' }),
      },
      hash: {
        enumerable: true,
        get: () => this._locationState.hash,
        set: (value: string) => mutateLocation(url => { url.hash = value ? (value.startsWith('#') ? value : `#${value}`) : '' }),
      },
      origin: { enumerable: true, get: () => this._locationState.origin },
    })

    location.assign = (url: string) => {
      this._updateLocation(url)
    }
    location.replace = (url: string) => {
      this._updateLocation(url)
    }
    location.reload = () => {}
    // eslint-disable-next-line max-statements-per-line
    ;(location as any).toString = () => this._locationState.href

    return location
  }

  private _getDocumentURLForResolution(): string {
    return this.location.href || this.defaultView?.location?.href || 'http://localhost/'
  }

  private _resolveAgainstDocumentURL(url: string): string {
    try {
      return new URL(url, this._getDocumentURLForResolution()).href
    }
    catch {
      return url
    }
  }

  private _resolveLocationString(url: string): string {
    try {
      return new URL(url, this._getDocumentURLForResolution()).href
    }
    catch {
      return url
    }
  }

  private _updateLocation(
    url: string,
    options: { triggerHashchange?: boolean, triggerPopstate?: boolean, popState?: any } = {},
  ): void {
    const { triggerHashchange = true, triggerPopstate = false, popState = null } = options
    const previousHref = this._locationState.href
    const previousHash = this._locationState.hash

    try {
      // Only use a base URL when the current document location is itself a
      // valid URL — an `about:blank` document cannot resolve relative inputs,
      // and bare strings like "not-a-valid-url" must stay as-is (matching
      // browser behavior when assigning to location.href on a blank page).
      const baseCandidate = this.location.href || this.defaultView?.location?.href || ''
      let parsed: URL
      if (baseCandidate && !baseCandidate.startsWith('about:')) {
        parsed = new URL(url, baseCandidate)
      }
      else {
        parsed = new URL(url)
      }
      this._locationState.href = parsed.href
      this._locationState.protocol = parsed.protocol
      this._locationState.host = parsed.host
      this._locationState.hostname = parsed.hostname
      this._locationState.port = parsed.port
      this._locationState.pathname = parsed.pathname
      this._locationState.search = parsed.search
      this._locationState.hash = parsed.hash
      this._locationState.origin = parsed.origin
    }
    catch {
      this._locationState.href = url
      this._locationState.protocol = ''
      this._locationState.host = ''
      this._locationState.hostname = ''
      this._locationState.port = ''
      this._locationState.pathname = ''
      this._locationState.search = ''
      this._locationState.hash = ''
      this._locationState.origin = ''
    }

    if (triggerHashchange && previousHref && previousHash !== this._locationState.hash) {
      this._dispatchWindowEvent('hashchange', {
        oldURL: previousHref,
        newURL: this._locationState.href,
      })
    }

    if (triggerPopstate) {
      this._dispatchWindowEvent('popstate', {
        state: popState,
      })
    }
  }

  private _dispatchWindowEvent(type: string, extra: Record<string, any>): void {
    if (!this.defaultView) {
      return
    }

    const event = new VirtualEvent(type)
    for (const [key, value] of Object.entries(extra)) {
      // eslint-disable-next-line max-statements-per-line
      ;(event as any)[key] = value
    }
    this.defaultView.dispatchEvent(event)
  }

  private _getCookieOrigin(): string {
    const href = this._getDocumentURLForResolution()
    if (!href || href === 'about:blank' || href.startsWith('about:')) {
      return 'http://localhost/'
    }
    try {
      const parsed = new URL(href, 'http://localhost/')
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'http://localhost/'
      }
      return parsed.href
    }
    catch {
      return 'http://localhost/'
    }
  }

  private _getDefaultCookiePath(): string {
    let pathname = '/'
    try {
      pathname = new URL(this._getDocumentURLForResolution(), 'http://localhost/').pathname || '/'
    }
    catch {
      pathname = this.location.pathname || '/'
    }

    if (!pathname.startsWith('/')) {
      return '/'
    }
    if (pathname === '/') {
      return '/'
    }

    const lastSlash = pathname.lastIndexOf('/')
    if (lastSlash <= 0) {
      return '/'
    }

    return pathname.slice(0, lastSlash + 1)
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
    return appendNode(this, child)
  }

  private _setOwnerDocumentRecursive(node: VirtualNode, doc: VirtualDocument): void {
    setOwnerDocumentRecursive(node, doc)
  }

  createElement(tagName: string): VirtualElement | any {
    // Special handling for canvas elements
    if (tagName.toLowerCase() === 'canvas') {
      const { HTMLCanvasElement } = require('../apis/Canvas')
      const el = new HTMLCanvasElement()
      el.ownerDocument = this
      return el
    }
    if (tagName.toLowerCase() === 'template') {
      const el = new VirtualTemplateElement()
      el.ownerDocument = this
      el.content.ownerDocument = this
      return el
    }
    const customElement = this.defaultView?.customElements?.get?.(tagName.toLowerCase())
    const el = customElement ? new customElement(tagName) : new VirtualElement(tagName)
    el.ownerDocument = this
    return el
  }

  createElementNS(namespace: string | null, qualifiedName: string): VirtualElement {
    let el: VirtualElement
    if (namespace === 'http://www.w3.org/2000/svg') {
      el = new VirtualSVGElement(qualifiedName)
    }
    else {
      el = new VirtualElement(qualifiedName)
      el.namespaceURI = namespace
    }
    el.ownerDocument = this
    return el
  }

  createTextNode(text: string): VirtualTextNode {
    const node = new VirtualTextNode(text)
    node.ownerDocument = this
    return node
  }

  createComment(text: string): VirtualCommentNode {
    const node = new VirtualCommentNode(text)
    node.ownerDocument = this
    return node
  }

  createDocumentFragment(): VirtualDocumentFragment {
    const fragment = new VirtualDocumentFragment()
    fragment.ownerDocument = this
    return fragment
  }

  _setFocusedElement(element: VirtualElement | null): void {
    this._focusedElement = element
  }

  createEvent(type: string): VirtualEvent {
    // The createEvent factory - returns the appropriate event subclass
    // This is a deprecated API but still widely used in tests
    const normalizedType = type.toLowerCase()
    switch (normalizedType) {
      case 'customevent':
      case 'customevents':
        return new CustomEvent('')
      case 'mouseevent':
      case 'mouseevents':
        return new MouseEvent('')
      case 'keyboardevent':
        return new KeyboardEvent('')
      case 'focusevent':
        return new FocusEvent('')
      case 'uievent':
      case 'uievents':
        return new UIEvent('')
      default:
        return new VirtualEvent('')
    }
  }

  createAttribute(name: string): { name: string, value: string, specified: boolean } {
    return {
      name: name.toLowerCase(),
      value: '',
      specified: true,
    }
  }

  importNode(node: VirtualNode, deep: boolean = false): VirtualNode {
    if (typeof (node as any).cloneNode !== 'function') {
      throw new Error('Failed to execute \'importNode\': parameter 1 is not of type \'Node\'.')
    }
    const clone = (node as any).cloneNode(deep)
    this._setOwnerDocumentRecursive(clone, this)
    return clone
  }

  adoptNode(node: VirtualNode): VirtualNode {
    if (node.parentNode) {
      // eslint-disable-next-line max-statements-per-line
      ;(node.parentNode as any).removeChild(node)
    }
    this._setOwnerDocumentRecursive(node, this)
    return node
  }

  hasFocus(): boolean {
    return this._focusedElement !== null
  }

  execCommand(_command: string, _showUI?: boolean, _value?: string): boolean {
    return false
  }

  queryCommandEnabled(_command: string): boolean {
    return false
  }

  queryCommandSupported(_command: string): boolean {
    return false
  }

  createTreeWalker(root: VirtualNode, whatToShow = 0xFFFFFFFF, filter: NodeFilterInput = null): TreeWalker {
    return new TreeWalker(root, whatToShow, filter)
  }

  createNodeIterator(root: VirtualNode, whatToShow = 0xFFFFFFFF, filter: NodeFilterInput = null): NodeIterator {
    return new NodeIterator(root, whatToShow, filter)
  }

  createRange(): Range {
    return new Range(this)
  }

  getSelection(): Selection {
    if (!this._selection) {
      this._selection = new Selection(this)
    }
    return this._selection
  }

  querySelector(selector: string): VirtualElement | null {
    return querySelectorEngine(this, selector)
  }

  querySelectorAll(selector: string): VirtualElement[] {
    return querySelectorAllEngine(this, selector)
  }

  getElementById(id: string): VirtualElement | null {
    return this._idIndex.get(id) ?? null
  }

  getElementsByTagName(tagName: string): VirtualElement[] {
    return this.querySelectorAll(tagName)
  }

  getElementsByName(name: string): VirtualElement[] {
    return this.querySelectorAll(`[name="${name}"]`)
  }

  getElementsByClassName(className: string): VirtualElement[] {
    const tokens = className.trim().split(/\s+/).filter(Boolean)
    if (tokens.length === 0)
      return []
    return this.querySelectorAll(tokens.map(token => `.${token}`).join(''))
  }

  // Parse and set body HTML
  parseHTML(html: string): void {
    const nodes = parseHTML(html, this)

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
    const nodes = parseHTML(html, this)

    // If the HTML contains a full document structure, replace documentElement
    for (const node of nodes) {
      if (node.nodeType === ELEMENT_NODE) {
        const element = node as VirtualElement
        if (element.tagName === 'HTML') {
          // Replace the entire document structure
          this.childNodes = []
          this.documentElement = element
          this.appendChild(element)

          // Update head and body references
          for (const child of element.children) {
            if (child.nodeType === ELEMENT_NODE) {
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

  open(): VirtualDocument {
    // Clear the document body for new content
    if (this.body) {
      this.body.childNodes = []
    }
    return this
  }

  close(): void {
    // No-op — signals end of document.write() stream
  }

  writeln(html: string): void {
    this.write(`${html}\n`)
  }

  // Get computed styles
  getComputedStyle(element: VirtualElement, _pseudoElt?: string | null): any {
    const defaultDisplay: Record<string, string> = {
      // Block
      ADDRESS: 'block', ARTICLE: 'block', ASIDE: 'block', BLOCKQUOTE: 'block',
      BODY: 'block', DETAILS: 'block', DIALOG: 'block', DIV: 'block',
      DL: 'block', DT: 'block', FIELDSET: 'block', FIGCAPTION: 'block',
      FIGURE: 'block', FOOTER: 'block', FORM: 'block', H1: 'block',
      H2: 'block', H3: 'block', H4: 'block', H5: 'block', H6: 'block',
      HEADER: 'block', HR: 'block', HTML: 'block', LEGEND: 'block',
      MAIN: 'block', NAV: 'block', OL: 'block', P: 'block',
      PRE: 'block', SECTION: 'block', UL: 'block',
      // List-item
      LI: 'list-item',
      // Table
      TABLE: 'table', CAPTION: 'table-caption',
      THEAD: 'table-header-group', TBODY: 'table-row-group',
      TFOOT: 'table-footer-group', TR: 'table-row',
      TH: 'table-cell', TD: 'table-cell', COLGROUP: 'table-column-group',
      COL: 'table-column',
      // Inline-block
      BUTTON: 'inline-block', INPUT: 'inline-block', SELECT: 'inline-block',
      TEXTAREA: 'inline-block',
      // Inline (default for everything else) — these are explicit for clarity
      A: 'inline', ABBR: 'inline', B: 'inline', CITE: 'inline', CODE: 'inline',
      DFN: 'inline', EM: 'inline', I: 'inline', KBD: 'inline',
      LABEL: 'inline', MARK: 'inline', Q: 'inline', S: 'inline',
      SAMP: 'inline', SMALL: 'inline', SPAN: 'inline', STRONG: 'inline',
      SUB: 'inline', SUP: 'inline', TIME: 'inline', U: 'inline',
      VAR: 'inline', IMG: 'inline', BR: 'inline',
      // Hidden
      SCRIPT: 'none', STYLE: 'none', HEAD: 'none', TITLE: 'none',
      META: 'none', LINK: 'none',
      // Flex by default? No — keep author-specified.
    }

    const computedDefaults = (prop: string, tagName: string): string => {
      switch (prop) {
        case 'display': return defaultDisplay[tagName] || 'inline'
        case 'visibility': return 'visible'
        case 'opacity': return '1'
        case 'position': return 'static'
        case 'float': return 'none'
        case 'clear': return 'none'
        case 'overflow':
        case 'overflow-x':
        case 'overflow-y':
          return 'visible'
        case 'box-sizing': return 'content-box'
        case 'z-index': return 'auto'
        case 'flex-direction': return 'row'
        case 'flex-wrap': return 'nowrap'
        case 'justify-content': return 'normal'
        case 'align-items': return 'normal'
        case 'align-content': return 'normal'
        case 'text-align': return 'start'
        case 'text-transform': return 'none'
        case 'text-decoration':
        case 'text-decoration-line':
          return 'none'
        case 'font-size': return '16px'
        case 'font-family': return 'serif'
        case 'font-weight': return '400'
        case 'font-style': return 'normal'
        case 'line-height': return 'normal'
        case 'color': return 'rgb(0, 0, 0)'
        case 'background-color': return 'rgba(0, 0, 0, 0)'
        case 'border-width':
        case 'border-top-width':
        case 'border-right-width':
        case 'border-bottom-width':
        case 'border-left-width':
          return '0px'
        case 'border-style':
        case 'border-top-style':
        case 'border-right-style':
        case 'border-bottom-style':
        case 'border-left-style':
          return 'none'
        case 'margin':
        case 'margin-top':
        case 'margin-right':
        case 'margin-bottom':
        case 'margin-left':
        case 'padding':
        case 'padding-top':
        case 'padding-right':
        case 'padding-bottom':
        case 'padding-left':
          return '0px'
        case 'width':
        case 'height':
        case 'min-width':
        case 'min-height':
          return 'auto'
        case 'max-width':
        case 'max-height':
          return 'none'
        case 'cursor': return 'auto'
        case 'pointer-events': return 'auto'
        default: return ''
      }
    }

    const self = element
    return new Proxy(
      {
        getPropertyValue(property: string): string {
          const value = self.style.getPropertyValue(property)
          if (value) return value
          return computedDefaults(property, self.tagName)
        },
        getPropertyPriority(property: string): string {
          return self.style.getPropertyPriority(property)
        },
      },
      {
        get(target, prop: string | symbol) {
          if (prop === 'getPropertyValue') return target.getPropertyValue
          if (prop === 'getPropertyPriority') return target.getPropertyPriority
          if (typeof prop !== 'string') return undefined
          const kebab = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
          const value = self.style.getPropertyValue(kebab)
          if (value) return value
          return computedDefaults(kebab, self.tagName)
        },
      },
    )
  }

  // Event listener methods
  addEventListener(type: string, listener: (event: any) => void, options: any = {}): void {
    super.addEventListener(type, listener, options)
  }

  removeEventListener(type: string, listener: (event: any) => void, options: any = {}): void {
    super.removeEventListener(type, listener, options)
  }

  dispatchEvent(event: any): boolean {
    return super.dispatchEvent(event)
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
    return this._cookieContainer
      .getCookies(this._getCookieOrigin())
      .map(cookie => `${cookie.key}=${cookie.value || ''}`)
      .join('; ')
  }

  set cookie(value: string) {
    const parts = value.split(';').map(part => part.trim()).filter(Boolean)
    const [nameValue, ...attributes] = parts
    if (!nameValue) {
      return
    }

    const separator = nameValue.indexOf('=')
    const name = (separator === -1 ? nameValue : nameValue.slice(0, separator)).trim()
    const cookieValue = separator === -1 ? '' : nameValue.slice(separator + 1).trim()
    if (!name) {
      return
    }

    const cookie: ICookie = {
      key: name,
      value: cookieValue,
      originURL: this._getCookieOrigin(),
      path: this._getDefaultCookiePath(),
      hostOnly: true,
    }

    for (const attribute of attributes) {
      const [rawName, ...rawValueParts] = attribute.split('=')
      const attributeName = rawName.trim().toLowerCase()
      const attributeValue = rawValueParts.join('=').trim()

      if (attributeName === 'expires') {
        const expires = new Date(attributeValue)
        if (!Number.isNaN(expires.getTime())) {
          cookie.expires = expires
        }
      }
      else if (attributeName === 'max-age') {
        const seconds = Number.parseInt(attributeValue, 10)
        if (!Number.isNaN(seconds)) {
          cookie.expires = new Date(Date.now() + seconds * 1000)
        }
      }
      else if (attributeName === 'path') {
        cookie.path = attributeValue || '/'
      }
      else if (attributeName === 'domain') {
        cookie.domain = attributeValue.replace(/^\./, '')
        cookie.hostOnly = false
      }
      else if (attributeName === 'secure') {
        cookie.secure = true
      }
      else if (attributeName === 'httponly') {
        cookie.httpOnly = true
      }
      else if (attributeName === 'samesite') {
        const normalized = attributeValue.toLowerCase()
        cookie.sameSite = normalized === 'strict'
          ? CookieSameSiteEnum.strict
          : normalized === 'none'
            ? CookieSameSiteEnum.none
            : CookieSameSiteEnum.lax
      }
    }

    this._cookieContainer.addCookies([cookie])
  }

  getElementsByTagNameNS(_namespace: string | null, tagName: string): VirtualElement[] {
    // For now, delegate to getElementsByTagName (namespace filtering is rare in tests)
    return this.getElementsByTagName(tagName)
  }

  createAttributeNS(namespace: string | null, qualifiedName: string): { name: string, value: string, namespaceURI: string | null, specified: boolean } {
    return {
      name: qualifiedName.toLowerCase(),
      value: '',
      namespaceURI: namespace,
      specified: true,
    }
  }

  createProcessingInstruction(target: string, data: string): VirtualNode {
    // Return a minimal processing instruction node
    const node = new VirtualCommentNode(`?${target} ${data}?`)
    return node as any
  }

  elementFromPoint(_x: number, _y: number): VirtualElement | null {
    return this.body
  }

  elementsFromPoint(_x: number, _y: number): VirtualElement[] {
    return this.body ? [this.body] : []
  }
}

/**
 * Factory function to create a new virtual document
 */
export function createDocument(): VirtualDocument {
  return new VirtualDocument()
}
