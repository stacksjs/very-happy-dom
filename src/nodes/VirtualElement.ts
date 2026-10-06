import { inert, isInert, isInTemplateContent } from './inert'
import type { ShadowRootInit } from '../webcomponents/ShadowRoot'
import { DOMRect } from '../dom/DOMClasses'
import { hidesItself } from '../aria/visibility'
import { collectCascade, resolveProperty } from '../css/cascade'
import { expandShorthand } from '../css/shorthand'
import { VirtualEvent } from '../events/VirtualEvent'
import { parseHTML } from '../parsers/html-parser'
import { escapeHtmlAttribute, escapeHtmlText } from '../parsers/html-utils'
import { hasCombinators, matchesComplexSelector, matchesSimpleSelector, querySelectorAllEngine, querySelectorEngine } from '../selectors/engine'
import { ShadowRoot } from '../webcomponents/ShadowRoot'
import { invokeAttributeChangedCallback } from '../webcomponents/custom-element-utils'
import { notifySlotAssignmentChange } from '../webcomponents/slot-utils'
import { MutationObserver } from '../observers/MutationObserver'

/**
 * Tags that start and end a line in rendered text.
 *
 * A Set built once rather than an array literal rebuilt for every node visited,
 * which is what `innerText` did before.
 */
const BLOCK_LEVEL_TAGS = new Set([
  'DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'TABLE', 'TR',
  'BLOCKQUOTE', 'PRE', 'HR', 'SECTION', 'ARTICLE', 'NAV', 'HEADER', 'FOOTER',
  'MAIN', 'ASIDE', 'DETAILS', 'SUMMARY', 'FORM', 'FIELDSET', 'ADDRESS', 'DL',
  'DT', 'DD', 'FIGURE', 'FIGCAPTION',
])
import {
  COMMENT_NODE,
  DOCUMENT_NODE,
  ELEMENT_NODE,
  TEXT_NODE,
  VirtualNodeBase,
  isElementNode,
  type EventListenerOptions,
  type NodeKind,
  type NodeType,
  type VirtualNode,
} from './VirtualNode'
import { appendNode, getNodeTextContent, insertNodeBefore, nodeContains, removeIdFromIndex as removeIdFromIndexExported, removeNode, replaceNode, setOwnerDocumentRecursive } from './tree-operations'
import { VirtualTextNode } from './VirtualTextNode'

/** The four sides of a box's padding or border, in pixels. */
interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * The pixel widths browsers give the `border-width` keywords. `medium` is also
 * the initial value, so it stands in for a width that will not parse.
 */
const BORDER_WIDTH_KEYWORDS: Record<string, number> = { thin: 1, medium: 3, thick: 5 }

export class VirtualElement extends VirtualNodeBase {
  nodeType: NodeType = ELEMENT_NODE
  nodeKind: NodeKind = 'element'
  nodeName: string
  tagName: string
  namespaceURI: string | null = 'http://www.w3.org/1999/xhtml'
  private _shadowRoot: ShadowRoot | null = null
  private _customValidity: string = ''
  private _internalStyles: Map<string, string> | null = null
  private _stylePriorities: Map<string, string> | null = null
  /**
   * Longhands written by a shorthand rather than declared. They answer reads
   * but are left out of `cssText`, `item()`, `length` and the serialized
   * `style` attribute, so expanding a shorthand does not change the markup an
   * element reports.
   */
  private _derivedStyles: Set<string> | null = null
  private _styleProxy: any = null
  private _datasetProxy: any = null
  private _valueState: string | null = null
  private _valueDirty = false
  private _checkedState: boolean | null = null
  private _checkedDirty = false
  private _selectedState: boolean | null = null
  private _selectedDirty = false
  private _capturedPointerIds: Set<number> | null = null

  // children should only contain element nodes, per DOM spec
  get children(): VirtualNode[] {
    const cn = this.childNodes
    const result: VirtualNode[] = []
    for (let i = 0; i < cn.length; i++) {
      if (cn[i].nodeType === ELEMENT_NODE) result.push(cn[i])
    }
    return result
  }

  constructor(tagName: string) {
    super()
    this.tagName = tagName.toUpperCase()
    this.nodeName = this.tagName
  }

  get shadowRoot(): ShadowRoot | null {
    return this._shadowRoot?.mode === 'open' ? this._shadowRoot : null
  }

  _getInternalShadowRoot(): ShadowRoot | null {
    return this._shadowRoot
  }

  // Attribute methods
  getAttribute(name: string): string | null {
    return this.attributes.get(name.toLowerCase()) ?? null
  }

  getAttributeNS(_namespace: string | null, localName: string): string | null {
    return this.getAttribute(localName)
  }

  setAttribute(name: string, value: string): void {
    const normalizedName = name.toLowerCase()
    const normalizedValue = `${value}`
    const oldValue = this.attributes.get(normalizedName) ?? null

    this.attributes.set(normalizedName, normalizedValue)

    if (normalizedName === 'id') {
      const doc = this.ownerDocument
      if (doc && doc._idIndex) {
        if (oldValue !== null) {
          doc._idIndex.delete(oldValue)
        }
        doc._idIndex.set(normalizedValue, this)
      }
    }

    if (normalizedName === 'style') {
      this._setStylesFromAttribute(normalizedValue)
    }

    invokeAttributeChangedCallback(this, normalizedName, oldValue, normalizedValue)
    if (normalizedName === 'slot' || (normalizedName === 'name' && this.tagName === 'SLOT')) {
      notifySlotAssignmentChange(this)
    }

    MutationObserver._queueMutationRecord({
      type: 'attributes',
      target: this,
      addedNodes: [],
      removedNodes: [],
      previousSibling: null,
      nextSibling: null,
      attributeName: normalizedName,
      attributeNamespace: null,
      oldValue,
    })
  }

  setAttributeNS(_namespace: string | null, qualifiedName: string, value: string): void {
    this.setAttribute(qualifiedName, value)
  }

  removeAttribute(name: string): void {
    const normalizedName = name.toLowerCase()
    const oldValue = this.attributes.get(normalizedName) ?? null
    if (oldValue === null) {
      return
    }
    this.attributes.delete(normalizedName)

    if (normalizedName === 'id') {
      const doc = this.ownerDocument
      if (doc && doc._idIndex) {
        doc._idIndex.delete(oldValue)
      }
    }

    if (normalizedName === 'style') {
      this._internalStyles = null
      this._stylePriorities = null
      this._derivedStyles = null
    }

    invokeAttributeChangedCallback(this, normalizedName, oldValue, null)
    if (normalizedName === 'slot' || (normalizedName === 'name' && this.tagName === 'SLOT')) {
      notifySlotAssignmentChange(this)
    }

    MutationObserver._queueMutationRecord({
      type: 'attributes',
      target: this,
      addedNodes: [],
      removedNodes: [],
      previousSibling: null,
      nextSibling: null,
      attributeName: normalizedName,
      attributeNamespace: null,
      oldValue,
    })
  }

  removeAttributeNS(_namespace: string | null, localName: string): void {
    this.removeAttribute(localName)
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name.toLowerCase())
  }

  hasAttributeNS(_namespace: string | null, localName: string): boolean {
    return this.hasAttribute(localName)
  }

  toggleAttribute(name: string, force?: boolean): boolean {
    const normalizedName = name.toLowerCase()
    if (force !== undefined) {
      if (force) {
        this.setAttribute(normalizedName, '')
        return true
      }
      this.removeAttribute(normalizedName)
      return false
    }
    if (this.hasAttribute(normalizedName)) {
      this.removeAttribute(normalizedName)
      return false
    }
    this.setAttribute(normalizedName, '')
    return true
  }

  getAttributeNames(): string[] {
    return Array.from(this.attributes.keys())
  }

  /**
   * The text as rendered: hidden subtrees left out, whitespace collapsed.
   *
   * The collapsing is what `innerText` is *for*. Without it the only difference
   * from `textContent` was trimming the ends, so the name promised three things
   * and did one and a half (#1614). It bites hardest on templated markup, where
   * indentation between elements came through as literal runs of spaces and a
   * comparison failed for a reason invisible in the source.
   *
   * Visibility goes through the shared per-node check rather than reading
   * `el.style` directly, so a `display: none` from a stylesheet is excluded too —
   * the same gap #1600 closed for box metrics. Ancestors are handled by not
   * descending, which is why the non-walking form is the right one here.
   *
   * `white-space: pre`, `pre-wrap` and `break-spaces` keep their text verbatim;
   * `pre-line` keeps newlines and collapses the rest. A `<pre>` element counts as
   * `pre` even with no rule saying so, as a user-agent stylesheet would have it.
   */
  get innerText(): string {
    // Chunks rather than one growing string, and a pending-space flag rather than
    // stripping the tail. Stripping meant a regex and a copy over everything
    // accumulated so far on *every* block boundary, which is quadratic: a
    // 2000-element table took 6.3ms where the chunk form takes 0.8ms.
    // Resolving through the cascade costs a full rule walk per element, and this
    // visits every node in the subtree. When the document has no stylesheets the
    // inline style *is* the answer, so the cascade is skipped — without this the
    // common case measured hundreds of times slower than reading `el.style`
    // directly, which is not a trade worth making for correctness nobody could
    // observe.
    const view = (this.ownerDocument as any)?.defaultView
    const sheetCount = ((this.ownerDocument as any)?.styleSheets?.length ?? 0)
      + ((this.ownerDocument as any)?._adoptedStyleSheets?.length ?? 0)
    const styleOf = sheetCount > 0 && typeof view?.getComputedStyle === 'function'
      ? (element: any): any => view.getComputedStyle(element)
      : (element: any): any => element.style

    const chunks: string[] = []
    /** A collapsible space seen but not yet emitted, since it may not render. */
    let pendingSpace = false
    let atLineStart = true
    let sawVerbatim = false

    const emit = (text: string): void => {
      // A space only renders between content, never at the start of a line.
      if (pendingSpace && !atLineStart)
        chunks.push(' ')
      pendingSpace = false
      chunks.push(text)
      atLineStart = false
    }

    /** End the current line, if there is one and it has not ended already. */
    const breakLine = (): void => {
      // A space before a break does not render.
      pendingSpace = false
      if (chunks.length === 0 || chunks[chunks.length - 1].endsWith('\n'))
        return
      chunks.push('\n')
      atLineStart = true
    }

    /** Append already-collapsed text, holding on to its edge spaces. */
    const appendCollapsed = (collapsed: string): void => {
      if (collapsed === '')
        return

      if (collapsed === ' ') {
        pendingSpace = true
        return
      }

      if (collapsed.startsWith(' '))
        pendingSpace = true

      const core = collapsed.slice(
        collapsed.startsWith(' ') ? 1 : 0,
        collapsed.endsWith(' ') ? -1 : undefined,
      )
      if (core !== '')
        emit(core)

      if (collapsed.endsWith(' '))
        pendingSpace = true
    }

    /** Append rendered text, collapsing unless the context preserves it. */
    const append = (text: string, whiteSpace: string): void => {
      if (!text)
        return

      if (whiteSpace === 'pre' || whiteSpace === 'pre-wrap' || whiteSpace === 'break-spaces') {
        sawVerbatim = true
        emit(text)
        return
      }

      // `pre-line` collapses spaces and tabs but keeps the line breaks, so its
      // newlines become real breaks rather than collapsing into spaces.
      if (whiteSpace === 'pre-line') {
        const lines = text.replace(/[^\S\n]+/g, ' ').split('\n')
        lines.forEach((line, index) => {
          if (index > 0)
            breakLine()
          appendCollapsed(line)
        })
        return
      }

      appendCollapsed(text.replace(/\s+/g, ' '))
    }

    const visit = (node: VirtualNode, whiteSpace: string): void => {
      if (node.nodeType === ELEMENT_NODE) {
        const el = node as VirtualElement

        const tag = el.tagName
        if (tag === 'BR') {
          breakLine()
          return
        }
        if (tag === 'SCRIPT' || tag === 'STYLE')
          return

        // Resolved once and used for both questions.
        const style = styleOf(el)

        // One definition of hidden, shared with the locator queries.
        if (hidesItself(el as any, style))
          return

        const declared = style?.getPropertyValue?.('white-space')
        const inherited = declared || (tag === 'PRE' ? 'pre' : whiteSpace)

        const isBlock = BLOCK_LEVEL_TAGS.has(tag)

        if (isBlock)
          breakLine()
        for (const child of el.childNodes)
          visit(child, inherited)
        if (isBlock)
          breakLine()
      }
      else if (node.nodeType === TEXT_NODE) {
        append(node.nodeValue || '', whiteSpace)
      }
    }

    const root = styleOf(this)?.getPropertyValue?.('white-space')
    for (const child of this.childNodes)
      visit(child, root || (this.tagName === 'PRE' ? 'pre' : 'normal'))

    const joined = chunks.join('')

    // Not applied when any verbatim text was collected: a <pre> may legitimately
    // contain blank lines, and squeezing them would be the opposite of the point.
    return sawVerbatim
      ? joined.replace(/^\n+|\n+$/g, '')
      : joined.replace(/\n{3,}/g, '\n\n').trim()
  }

  set innerText(value: string) {
    while (this.childNodes.length > 0) {
      this.removeChild(this.childNodes[0])
    }
    if (value) {
      const textNode = new VirtualTextNode(value)
      this.appendChild(textNode)
    }
  }

  replaceChildren(...nodes: Array<VirtualNode | string>): void {
    while (this.childNodes.length > 0) {
      this.removeChild(this.childNodes[0])
    }
    for (const node of nodes) {
      if (typeof node === 'string') {
        this.appendChild(new VirtualTextNode(node))
      }
      else {
        this.appendChild(node)
      }
    }
  }

  // Child manipulation methods
  appendChild(child: VirtualNode): VirtualNode {
    return appendNode(this, child)
  }

  removeChild(child: VirtualNode): VirtualNode {
    return removeNode(this, child)
  }

  insertBefore(newNode: VirtualNode, referenceNode: VirtualNode | null): VirtualNode {
    return insertNodeBefore(this, newNode, referenceNode)
  }

  replaceChild(newNode: VirtualNode, oldNode: VirtualNode): VirtualNode {
    return replaceNode(this, newNode, oldNode)
  }

  cloneNode(deep = false): VirtualElement {
    // A copy is made the way the document makes an element, so it keeps its
    // element class and a custom element is constructed - as cloneNode does in
    // a browser. It always made a plain VirtualElement, so a cloned custom
    // element never ran its constructor or callbacks. A node in template
    // content is copied inert, as a browser copies it into the template's
    // inert document; it is upgraded when inserted into a live document.
    const inertCopy = isInert() || isInTemplateContent(this)
    if (inertCopy && !isInert())
      return inert(() => this.cloneNode(deep))
    const doc = this.ownerDocument
    const isHtml = !this.namespaceURI || this.namespaceURI === 'http://www.w3.org/1999/xhtml'
    const clone = this.namespaceURI === 'http://www.w3.org/2000/svg'
      ? new (require('./VirtualSVGElement').VirtualSVGElement)(this.tagName)
      : isHtml && typeof doc?.createElement === 'function'
        ? doc.createElement(this.tagName.toLowerCase())
        : new VirtualElement(this.tagName)
    clone.namespaceURI = this.namespaceURI
    clone.nodeName = this.nodeName
    clone.tagName = this.tagName

    // Copy attributes
    for (const [name, value] of this.attributes) {
      clone.setAttribute(name, value)
    }

    // Deep clone children and shadow root
    if (deep) {
      for (const child of this.childNodes) {
        const childClone = (child as any).cloneNode?.(true)
        if (childClone) {
          clone.appendChild(childClone)
        }
      }

      // Clone shadow root if present
      if (this._shadowRoot) {
        const shadowClone = clone.attachShadow({ mode: this._shadowRoot.mode })
        for (const child of this._shadowRoot.childNodes) {
          const childClone = (child as any).cloneNode?.(true)
          if (childClone) {
            shadowClone.appendChild(childClone)
          }
        }
      }
    }

    return clone
  }

  // Navigation methods
  closest(selector: string): VirtualElement | null {
    // eslint-disable-next-line ts/no-this-alias
    let element: VirtualElement | null = this

    while (element) {
      if (element.matches(selector)) {
        return element
      }
      element = element.parentElement
    }

    return null
  }

  // parentElement - returns parent if it's an element
  get parentElement(): VirtualElement | null {
    if (isElementNode(this.parentNode)) {
      return this.parentNode as VirtualElement
    }
    return null
  }

  // firstChild - returns first child of any type
  get firstChild(): VirtualNode | null {
    return this.childNodes.length > 0 ? this.childNodes[0] : null
  }

  // lastChild - returns last child of any type
  get lastChild(): VirtualNode | null {
    return this.childNodes.length > 0 ? this.childNodes[this.childNodes.length - 1] : null
  }

  // nextSibling - returns next sibling node of any type
  get nextSibling(): VirtualNode | null {
    if (!this.parentNode)
      return null

    const siblings = (this.parentNode as VirtualElement).childNodes
    const index = siblings.indexOf(this)
    if (index === -1 || index >= siblings.length - 1)
      return null

    return siblings[index + 1]
  }

  // previousSibling - returns previous sibling node of any type
  get previousSibling(): VirtualNode | null {
    if (!this.parentNode)
      return null

    const siblings = (this.parentNode as VirtualElement).childNodes
    const index = siblings.indexOf(this)
    if (index <= 0)
      return null

    return siblings[index - 1]
  }

  get nextElementSibling(): VirtualElement | null {
    if (!this.parentNode) return null
    const siblings = this.parentNode.childNodes
    let found = false
    for (let i = 0; i < siblings.length; i++) {
      if (siblings[i] === this) {
        found = true
        continue
      }
      if (found && siblings[i].nodeType === ELEMENT_NODE) {
        return siblings[i] as VirtualElement
      }
    }
    return null
  }

  get previousElementSibling(): VirtualElement | null {
    if (!this.parentNode) return null
    const siblings = this.parentNode.childNodes
    let lastElement: VirtualElement | null = null
    for (let i = 0; i < siblings.length; i++) {
      if (siblings[i] === this) return lastElement
      if (siblings[i].nodeType === ELEMENT_NODE) {
        lastElement = siblings[i] as VirtualElement
      }
    }
    return null
  }

  // Text content
  get textContent(): string {
    return getNodeTextContent(this)
  }

  set textContent(value: string) {
    for (const child of this.childNodes) {
      child.parentNode = null
    }
    this.childNodes.length = 0

    if (value) {
      const textNode = new VirtualTextNode(value)
      textNode.parentNode = this
      textNode.ownerDocument = this.ownerDocument
      this.childNodes.push(textNode)
    }

    MutationObserver._queueMutationRecord({
      type: 'childList',
      target: this,
      addedNodes: value ? [this.childNodes[0]] : [],
      removedNodes: [],
      previousSibling: null,
      nextSibling: null,
      attributeName: null,
      attributeNamespace: null,
      oldValue: null,
    })
    notifySlotAssignmentChange(this)
  }

  private _setStylesFromAttribute(styleText: string): void {
    const styles = this._internalStyles ?? (this._internalStyles = new Map())
    const priorities = this._stylePriorities ?? (this._stylePriorities = new Map())
    styles.clear()
    priorities.clear()
    this._derivedStyles?.clear()

    for (const declaration of styleText.split(';')) {
      const trimmed = declaration.trim()
      if (!trimmed) continue

      const separator = trimmed.indexOf(':')
      if (separator === -1) continue

      const property = trimmed.slice(0, separator).trim().toLowerCase()
      let value = trimmed.slice(separator + 1).trim()
      if (!property) continue

      let priority = ''
      if (/!important$/i.test(value)) {
        value = value.replace(/!important$/i, '').trim()
        priority = 'important'
      }

      this._writeStyleProperty(property, value, priority, true)
    }
  }

  /**
   * Record one inline declaration, expanding it when it is a shorthand.
   *
   * Every write path lands here — `setProperty`, a camelCase assignment and the
   * `style` attribute parser — so a shorthand behaves the same however it was
   * set. The expansion runs after the shorthand itself is stored, which is what
   * makes `margin: 10px; margin-top: 5px` resolve to 5px: the longhand written
   * later simply overwrites the derived entry and sheds its derived mark.
   *
   * `respectImportant` is for the `style` attribute, which is parsed CSS: there
   * importance beats declaration order, so a normal value cannot displace an
   * `!important` one. A `setProperty()` call leaves it off and overwrites, which
   * is what a browser does.
   */
  private _writeStyleProperty(property: string, value: string, priority: string, respectImportant = false): void {
    this._writeOneStyle(property, value, priority, respectImportant, false)

    const expanded = expandShorthand(property, value)
    if (!expanded)
      return

    for (let i = 0; i < expanded.length; i++)
      this._writeOneStyle(expanded[i][0], expanded[i][1], priority, respectImportant, true)
  }

  /**
   * Store one resolved declaration.
   *
   * A method rather than a closure inside `_writeStyleProperty`, because that
   * runs on every style write and allocated one per call.
   */
  private _writeOneStyle(name: string, value: string, priority: string, respectImportant: boolean, derived: boolean): void {
    if (respectImportant && !priority && this._stylePriorities?.get(name) === 'important')
      return

    const styles = this._internalStyles ?? (this._internalStyles = new Map())
    styles.set(name, value)

    if (priority) {
      const priorities = this._stylePriorities ?? (this._stylePriorities = new Map())
      priorities.set(name, priority)
    }
    else if (this._stylePriorities !== null) {
      this._stylePriorities.delete(name)
    }

    if (derived)
      (this._derivedStyles ?? (this._derivedStyles = new Set())).add(name)
    else if (this._derivedStyles !== null)
      this._derivedStyles.delete(name)
  }

  /**
   * Drop an inline declaration, along with any longhand it alone put there.
   *
   * A longhand the author also declared outlives its shorthand, so only derived
   * entries are removed.
   */
  private _deleteStyleProperty(property: string): void {
    const previous = this._internalStyles?.get(property) ?? ''
    this._internalStyles?.delete(property)
    this._stylePriorities?.delete(property)
    this._derivedStyles?.delete(property)

    for (const [longhand] of expandShorthand(property, previous) ?? []) {
      if (this._derivedStyles?.has(longhand)) {
        this._internalStyles?.delete(longhand)
        this._stylePriorities?.delete(longhand)
        this._derivedStyles.delete(longhand)
      }
    }
  }

  /**
   * The author's declarations as `style` attribute text.
   *
   * Walked in place rather than collected first: this runs on every style
   * write, where building an array to serialize it cost more than the
   * expansion it was supporting.
   */
  private _serializeDeclaredStyles(): string {
    if (!this._internalStyles)
      return ''

    const derived = this._derivedStyles
    let text = ''
    for (const [prop, value] of this._internalStyles) {
      if (derived !== null && derived.has(prop))
        continue
      if (text)
        text += '; '
      const priority = this._stylePriorities?.get(prop)
      text += priority ? `${prop}: ${value} !${priority}` : `${prop}: ${value}`
    }
    return text
  }

  /** The declarations the author wrote, in order, with derived longhands left out. */
  private _declaredStyleEntries(): Array<[string, string]> {
    if (!this._internalStyles)
      return []
    const derived = this._derivedStyles
    if (!derived || derived.size === 0)
      return Array.from(this._internalStyles.entries())
    return Array.from(this._internalStyles.entries()).filter(([prop]) => !derived.has(prop))
  }

  get innerHTML(): string {
    return this.childNodes.map(child => this._serializeNode(child, this.tagName)).join('')
  }

  set innerHTML(html: string) {
    if (this.childNodes.length > 0) {
      const doc = this.ownerDocument
      if (doc?._idIndex && doc._idIndex.size > 0) {
        for (const child of this.childNodes) {
          removeIdFromIndexExported(child)
        }
      }
      for (const child of this.childNodes) {
        child.parentNode = null
      }
      this.childNodes.length = 0
    }
    if (html) {
      // A template's markup becomes its content, which is inert.
      const nodes = this.tagName === 'TEMPLATE'
        ? inert(() => parseHTML(html, this.ownerDocument))
        : parseHTML(html, this.ownerDocument)

      // Special case: if we're the documentElement (<html>) and the parsed HTML
      // contains an <html> element, extract its children instead of nesting
      if (this.tagName === 'HTML' && nodes.length > 0) {
        // Look for an <html> element in the parsed nodes
        for (const node of nodes) {
          if (node.nodeType === ELEMENT_NODE) {
            const element = node as VirtualElement
            if (element.tagName === 'HTML') {
              // Extract the <html> element's children (head, body, etc.)
              for (const child of [...element.childNodes]) {
                this.appendChild(child)
              }
              // Continue to process any remaining nodes
              continue
            }
          }
          // For non-html elements, append normally
          this.appendChild(node)
        }
      }
      else {
        // Normal case: just append all parsed nodes
        for (const node of nodes) {
          this.appendChild(node)
        }
      }
    }
    notifySlotAssignmentChange(this)
  }

  get outerHTML(): string {
    return this._serializeNode(this)
  }

  set outerHTML(html: string) {
    const parent = this.parentNode
    if (!parent)
      throw new DOMException('This element has no parent node.', 'NoModificationAllowedError')
    const parsed = parseHTML(html, this.ownerDocument)
    const index = parent.childNodes.indexOf(this)
    // Detach self via tree-operations so the id index is cleaned up.
    removeNode(parent as any, this)
    for (let i = 0; i < parsed.length; i++) {
      const node = parsed[i]
      parent.childNodes.splice(index + i, 0, node)
      // eslint-disable-next-line max-statements-per-line
      ;(node as any).parentNode = parent
      const doc = this.ownerDocument
      if (doc)
        setOwnerDocumentRecursive(node as VirtualNode, doc)
    }
  }

  // className getter/setter
  get className(): string {
    return this.getAttribute('class') || ''
  }

  set className(value: string) {
    this.setAttribute('class', value)
  }

  // slot getter/setter
  get slot(): string {
    return this.getAttribute('slot') || ''
  }

  set slot(value: string) {
    this.setAttribute('slot', value)
  }

  // classList implementation (DOMTokenList-like)
  get classList(): {
    add: (...tokens: string[]) => void
    remove: (...tokens: string[]) => void
    toggle: (token: string, force?: boolean) => boolean
    contains: (token: string) => boolean
    replace: (oldToken: string, newToken: string) => boolean
    readonly length: number
    item: (index: number) => string | null
    readonly value: string
    toString: () => string
    forEach: (callback: (value: string, index: number, list: any) => void) => void
    [Symbol.iterator]: () => IterableIterator<string>
    entries: () => IterableIterator<[number, string]>
    keys: () => IterableIterator<number>
    values: () => IterableIterator<string>
  } {
    // eslint-disable-next-line ts/no-this-alias
    const element = this

    const getClasses = (): string[] => element.getAttribute('class')?.split(/\s+/).filter(Boolean) || []

    return {
      add(...tokens: string[]): void {
        const classes = getClasses()
        for (const token of tokens) {
          if (!classes.includes(token)) {
            classes.push(token)
          }
        }
        element.setAttribute('class', classes.join(' '))
      },
      remove(...tokens: string[]): void {
        const classes = getClasses()
        const filtered = classes.filter(c => !tokens.includes(c))
        if (filtered.length > 0) {
          element.setAttribute('class', filtered.join(' '))
        }
        else {
          element.removeAttribute('class')
        }
      },
      // `force` pins the outcome instead of flipping: `true` only ever adds,
      // `false` only ever removes, and the return value is the resulting
      // membership. `el.classList.toggle('active', isActive)` depends on it.
      toggle(token: string, force?: boolean): boolean {
        const classes = getClasses()
        const index = classes.indexOf(token)
        const shouldAdd = force === undefined ? index === -1 : force

        if (shouldAdd) {
          if (index === -1) {
            classes.push(token)
            element.setAttribute('class', classes.join(' '))
          }
          return true
        }

        if (index !== -1) {
          classes.splice(index, 1)
          if (classes.length > 0) {
            element.setAttribute('class', classes.join(' '))
          }
          else {
            element.removeAttribute('class')
          }
        }
        return false
      },
      contains(token: string): boolean {
        return getClasses().includes(token)
      },
      replace(oldToken: string, newToken: string): boolean {
        const classes = getClasses()
        const index = classes.indexOf(oldToken)
        if (index !== -1) {
          classes[index] = newToken
          element.setAttribute('class', classes.join(' '))
          return true
        }
        return false
      },
      get length(): number {
        return getClasses().length
      },
      item(index: number): string | null {
        return getClasses()[index] ?? null
      },
      get value(): string {
        return element.getAttribute('class') || ''
      },
      toString(): string {
        return element.getAttribute('class') || ''
      },
      forEach(callback: (value: string, index: number, list: any) => void): void {
        const classes = getClasses()
        for (let i = 0; i < classes.length; i++) {
          callback(classes[i], i, this)
        }
      },
      * [Symbol.iterator](): IterableIterator<string> {
        yield * getClasses()
      },
      * entries(): IterableIterator<[number, string]> {
        const classes = getClasses()
        for (let i = 0; i < classes.length; i++) {
          yield [i, classes[i]]
        }
      },
      * keys(): IterableIterator<number> {
        const classes = getClasses()
        for (let i = 0; i < classes.length; i++) {
          yield i
        }
      },
      * values(): IterableIterator<string> {
        yield * getClasses()
      },
    }
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
      return `<!--${node.nodeValue}-->`
    }
    if (node.nodeType === ELEMENT_NODE) {
      const element = node as VirtualElement
      const tagName = element.tagName.toLowerCase()
      let html = `<${tagName}`

      for (const [name, value] of element.attributes) {
        html += ` ${name}="${escapeHtmlAttribute(value)}"`
      }

      // Check if this is a void element (self-closing tag)
      const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']
      if (voidElements.includes(tagName)) {
        html += '>'
        return html
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

  // Style property with Proxy for dynamic access
  get style(): CSSStyleDeclaration & { [key: string]: any } {
    if (this._styleProxy) return this._styleProxy

    // eslint-disable-next-line ts/no-this-alias
    const element = this

    this._styleProxy = new Proxy(
      {
        getPropertyValue(property: string): string {
          return element._internalStyles?.get(property) || ''
        },
        getPropertyPriority(property: string): string {
          return element._stylePriorities?.get(property) || ''
        },
        setProperty(property: string, value: string | number, priority = ''): void {
          const stringValue = `${value}`
          const normalizedValue = stringValue.trim()
          if (normalizedValue === 'NaN' || normalizedValue.includes('NaN')) {
            return
          }

          element._writeStyleProperty(property, stringValue, priority)
          element._updateStyleAttribute()
        },
        removeProperty(property: string): string {
          const previous = element._internalStyles?.get(property) || ''
          element._deleteStyleProperty(property)
          element._updateStyleAttribute()
          return previous
        },
        item(index: number): string {
          return element._declaredStyleEntries()[index]?.[0] ?? ''
        },
        get length(): number {
          return element._declaredStyleEntries().length
        },
        get cssText(): string {
          return element._serializeDeclaredStyles()
        },
        set cssText(value: string) {
          element._internalStyles = null
          element._stylePriorities = null
          element._derivedStyles = null
          if (value) {
            element._setStylesFromAttribute(value)
          }
          element._updateStyleAttribute()
        },
      } as any,
      {
        get(target, prop: string) {
          if (prop === 'getPropertyValue' || prop === 'getPropertyPriority' || prop === 'setProperty' || prop === 'removeProperty' || prop === 'item' || prop === 'length' || prop === 'cssText') {
            const val = target[prop]
            return typeof val === 'function' ? val.bind(target) : val
          }
          // Convert camelCase to kebab-case
          const kebabProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
          return element._internalStyles?.get(kebabProp)
        },
        set(target, prop: string, value: string | number) {
          if (prop === 'cssText') {
            target.cssText = value as string
            return true
          }
          // Convert camelCase to kebab-case
          const kebabProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
          element._writeStyleProperty(kebabProp, `${value}`, '')
          element._updateStyleAttribute()
          return true
        },
      },
    )

    return this._styleProxy
  }

  private _updateStyleAttribute(): void {
    const styleString = this._serializeDeclaredStyles()
    if (!styleString) {
      if (this.attributes.has('style')) {
        this.removeAttribute('style')
      }
      return
    }

    const oldValue = this.attributes.get('style') ?? null
    this.attributes.set('style', styleString)

    MutationObserver._queueMutationRecord({
      type: 'attributes',
      target: this,
      addedNodes: [],
      removedNodes: [],
      previousSibling: null,
      nextSibling: null,
      attributeName: 'style',
      attributeNamespace: null,
      oldValue,
    })
  }

  // Dataset property for data-* attributes
  get dataset(): { [key: string]: string } {
    if (this._datasetProxy) return this._datasetProxy

    // eslint-disable-next-line ts/no-this-alias
    const self = this

    this._datasetProxy = new Proxy({}, {
      get(_target, prop: string): string {
        // Convert camelCase to kebab-case
        const kebabProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
        return self.getAttribute(`data-${kebabProp}`) || ''
      },
      set(_target, prop: string, value: string): boolean {
        // Convert camelCase to kebab-case
        const kebabProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
        self.setAttribute(`data-${kebabProp}`, value)
        return true
      },
      deleteProperty(_target, prop: string): boolean {
        // Convert camelCase to kebab-case
        const kebabProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
        self.removeAttribute(`data-${kebabProp}`)
        return true
      },
      has(_target, prop: string): boolean {
        const kebabProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
        return self.hasAttribute(`data-${kebabProp}`)
      },
      ownKeys(_target): string[] {
        const dataAttrs: string[] = []
        for (const [key] of self.attributes) {
          if (key.startsWith('data-')) {
            // Convert data-kebab-case to camelCase
            const camelKey = key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
            dataAttrs.push(camelKey)
          }
        }
        return dataAttrs
      },
      getOwnPropertyDescriptor(_target, prop: string) {
        const kebabProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
        if (self.hasAttribute(`data-${kebabProp}`)) {
          return {
            configurable: true,
            enumerable: true,
            writable: true,
            value: self.getAttribute(`data-${kebabProp}`),
          }
        }
        return undefined
      },
    })

    return this._datasetProxy
  }

  private _isInputElement(): boolean {
    return this.tagName === 'INPUT'
  }

  private _isTextareaElement(): boolean {
    return this.tagName === 'TEXTAREA'
  }

  private _isSelectElement(): boolean {
    return this.tagName === 'SELECT'
  }

  private _isOptionElement(): boolean {
    return this.tagName === 'OPTION'
  }

  private _getInputType(): string {
    return this._isInputElement() ? (this.getAttribute('type') || 'text').toLowerCase() : ''
  }

  private _getOptionValue(): string {
    const attributeValue = this.getAttribute('value')
    return attributeValue !== null ? attributeValue : this.textContent
  }

  private _getSelectOptions(): VirtualElement[] {
    return this._isSelectElement() ? this.querySelectorAll('option') : []
  }

  private _getSelectedOptionsInternal(): VirtualElement[] {
    const options = this._getSelectOptions()
    if (options.length === 0) {
      return []
    }

    const selected = options.filter(option => option.selected)
    if (this.hasAttribute('multiple')) {
      return selected
    }

    return selected.length > 0 ? [selected[0]] : [options[0]]
  }

  private _getOwningSelect(): VirtualElement | null {
    let current = this.parentNode
    while (current) {
      if ((current as any).tagName === 'SELECT') {
        return current as VirtualElement
      }
      current = current.parentNode
    }
    return null
  }

  private _isButtonElement(): boolean {
    return this.tagName === 'BUTTON'
  }

  private _isFormElement(): boolean {
    return this.tagName === 'FORM'
  }

  private _isFieldsetElement(): boolean {
    return this.tagName === 'FIELDSET'
  }

  private _isLegendElement(): boolean {
    return this.tagName === 'LEGEND'
  }

  private _isLabelElement(): boolean {
    return this.tagName === 'LABEL'
  }

  private _isLabelableElement(): boolean {
    if (this._isInputElement()) {
      return this._getInputType() !== 'hidden'
    }
    return this._isButtonElement() || this._isSelectElement() || this._isTextareaElement() || this.tagName === 'METER' || this.tagName === 'OUTPUT' || this.tagName === 'PROGRESS'
  }

  private _isListedFormAssociatedElement(): boolean {
    return ['BUTTON', 'FIELDSET', 'INPUT', 'OBJECT', 'OUTPUT', 'SELECT', 'TEXTAREA'].includes(this.tagName)
  }

  private _collectDescendantElements(root: VirtualNode = this): VirtualElement[] {
    const elements: VirtualElement[] = []
    const visit = (node: VirtualNode): void => {
      for (const child of node.childNodes) {
        if (child.nodeType === ELEMENT_NODE) {
          const element = child as VirtualElement
          elements.push(element)
          visit(element)
        }
      }
    }
    visit(root)
    return elements
  }

  private _isWithinFirstLegendOfFieldset(fieldset: VirtualElement): boolean {
    const firstLegend = fieldset.children.find(child => (child as any).tagName === 'LEGEND') as VirtualElement | undefined
    if (!firstLegend) {
      return false
    }
    return firstLegend === this || nodeContains(firstLegend, this)
  }

  private _isActuallyDisabled(): boolean {
    if (this.hasAttribute('disabled')) {
      return true
    }

    if (this._isOptionElement()) {
      const parentElement = this.parentElement as VirtualElement | null
      if (parentElement?.tagName === 'OPTGROUP' && parentElement.disabled) {
        return true
      }
    }

    if (!['BUTTON', 'INPUT', 'OPTION', 'OPTGROUP', 'SELECT', 'TEXTAREA'].includes(this.tagName)) {
      return false
    }

    let current = this.parentNode
    while (current) {
      if ((current as any).tagName === 'FIELDSET' && (current as VirtualElement).hasAttribute('disabled')) {
        if (!this._isWithinFirstLegendOfFieldset(current as VirtualElement)) {
          return true
        }
      }
      current = current.parentNode
    }

    return false
  }

  private _resetFormControlState(): void {
    if (this._isInputElement() || this._isTextareaElement()) {
      this._valueDirty = false
      this._valueState = null
    }

    if (this._isInputElement()) {
      this._checkedDirty = false
      this._checkedState = null
    }

    if (this._isOptionElement()) {
      this._selectedDirty = false
      this._selectedState = null
    }

    if (this._isSelectElement()) {
      for (const option of this._getSelectOptions()) {
        option._selectedDirty = false
        option._selectedState = null
      }
    }
  }

  private _syncRadioGroupSelection(): void {
    if (!this._isInputElement() || this._getInputType() !== 'radio' || !this.checked) {
      return
    }

    const name = this.getAttribute('name')
    if (!name) {
      return
    }

    const root = (this.form ?? this.ownerDocument?.documentElement ?? this.parentNode) as VirtualElement | null
    const radios = root?.querySelectorAll?.('input') ?? []

    for (const radio of radios) {
      if (radio === this) {
        continue
      }
      if ((radio.getAttribute('type') || 'text').toLowerCase() !== 'radio' || radio.getAttribute('name') !== name) {
        continue
      }
      if (this.form ? radio.form !== this.form : radio.form !== null) {
        continue
      }
      radio._checkedDirty = true
      radio._checkedState = false
    }
  }

  get form(): VirtualElement | null {
    if (this._isOptionElement()) {
      return this._getOwningSelect()?.form ?? null
    }

    return ['BUTTON', 'FIELDSET', 'INPUT', 'OBJECT', 'OUTPUT', 'SELECT', 'TEXTAREA'].includes(this.tagName)
      ? this.closest('form')
      : null
  }

  get elements(): VirtualElement[] {
    if (this._isFormElement()) {
      return this._collectDescendantElements().filter(element => element._isListedFormAssociatedElement() && element.form === this)
    }
    if (this._isFieldsetElement()) {
      return this._collectDescendantElements().filter(element => element._isListedFormAssociatedElement())
    }
    return []
  }

  get labels(): VirtualElement[] {
    if (!this._isLabelableElement()) {
      return []
    }

    const labels: VirtualElement[] = []
    let current = this.parentNode
    while (current) {
      if ((current as any).tagName === 'LABEL') {
        labels.push(current as VirtualElement)
      }
      current = current.parentNode
    }

    const id = this.id
    if (id && this.ownerDocument) {
      for (const label of this.ownerDocument.querySelectorAll('label')) {
        if (label.getAttribute('for') === id && !labels.includes(label)) {
          labels.push(label)
        }
      }
    }

    return labels
  }

  get type(): string {
    if (this._isInputElement()) {
      return this._getInputType()
    }
    if (this._isButtonElement()) {
      return (this.getAttribute('type') || 'submit').toLowerCase()
    }
    return this.getAttribute('type') || ''
  }

  set type(value: string) {
    this.setAttribute('type', value)
  }

  get name(): string {
    return this.getAttribute('name') || ''
  }

  set name(value: string) {
    this.setAttribute('name', value)
  }

  get id(): string {
    return this.getAttribute('id') || ''
  }

  set id(value: string) {
    this.setAttribute('id', value)
  }

  get htmlFor(): string {
    return this.getAttribute('for') || ''
  }

  set htmlFor(value: string) {
    this.setAttribute('for', value)
  }

  // Reflected boolean/string properties
  get hidden(): boolean {
    return this.hasAttribute('hidden')
  }

  set hidden(value: boolean) {
    if (value) {
      this.setAttribute('hidden', '')
    }
    else {
      this.removeAttribute('hidden')
    }
  }

  get title(): string {
    return this.getAttribute('title') || ''
  }

  set title(value: string) {
    this.setAttribute('title', value)
  }

  get lang(): string {
    return this.getAttribute('lang') || ''
  }

  set lang(value: string) {
    this.setAttribute('lang', value)
  }

  get dir(): string {
    return this.getAttribute('dir') || ''
  }

  set dir(value: string) {
    this.setAttribute('dir', value)
  }

  get contentEditable(): string {
    const value = this.getAttribute('contenteditable')
    if (value === null) return 'inherit'
    if (value === '' || value === 'true') return 'true'
    if (value === 'false') return 'false'
    return 'inherit'
  }

  set contentEditable(value: string) {
    if (value === 'inherit') {
      this.removeAttribute('contenteditable')
    }
    else {
      this.setAttribute('contenteditable', value)
    }
  }

  get draggable(): boolean {
    return this.getAttribute('draggable') === 'true'
  }

  set draggable(value: boolean) {
    this.setAttribute('draggable', String(value))
  }

  get spellcheck(): boolean {
    const val = this.getAttribute('spellcheck')
    return val !== 'false'
  }

  set spellcheck(value: boolean) {
    this.setAttribute('spellcheck', String(value))
  }

  get translate(): boolean {
    const val = this.getAttribute('translate')
    return val !== 'no'
  }

  set translate(value: boolean) {
    this.setAttribute('translate', value ? 'yes' : 'no')
  }

  get accessKey(): string {
    return this.getAttribute('accesskey') || ''
  }

  set accessKey(value: string) {
    this.setAttribute('accesskey', value)
  }

  get autocapitalize(): string {
    return this.getAttribute('autocapitalize') || ''
  }

  set autocapitalize(value: string) {
    this.setAttribute('autocapitalize', value)
  }

  get isContentEditable(): boolean {
    const value = this.contentEditable
    if (value === 'true') return true
    if (value === 'false') return false
    // inherit: walk up the tree
    if (this.parentElement) {
      return (this.parentElement as VirtualElement).isContentEditable
    }
    return false
  }

  // Form-related reflected boolean properties
  get required(): boolean {
    return this.hasAttribute('required')
  }

  set required(value: boolean) {
    if (value) this.setAttribute('required', '')
    else this.removeAttribute('required')
  }

  get readOnly(): boolean {
    return this.hasAttribute('readonly')
  }

  set readOnly(value: boolean) {
    if (value) this.setAttribute('readonly', '')
    else this.removeAttribute('readonly')
  }

  get autofocus(): boolean {
    return this.hasAttribute('autofocus')
  }

  set autofocus(value: boolean) {
    if (value) this.setAttribute('autofocus', '')
    else this.removeAttribute('autofocus')
  }

  get multiple(): boolean {
    return this.hasAttribute('multiple')
  }

  set multiple(value: boolean) {
    if (value) this.setAttribute('multiple', '')
    else this.removeAttribute('multiple')
  }

  get noValidate(): boolean {
    return this.hasAttribute('novalidate')
  }

  set noValidate(value: boolean) {
    if (value) this.setAttribute('novalidate', '')
    else this.removeAttribute('novalidate')
  }

  // Reflected string properties
  get placeholder(): string {
    return this.getAttribute('placeholder') || ''
  }

  set placeholder(value: string) {
    this.setAttribute('placeholder', value)
  }

  get src(): string {
    return this.getAttribute('src') || ''
  }

  set src(value: string) {
    this.setAttribute('src', value)
  }

  get href(): string {
    return this.getAttribute('href') || ''
  }

  set href(value: string) {
    this.setAttribute('href', value)
  }

  get rel(): string {
    return this.getAttribute('rel') || ''
  }

  set rel(value: string) {
    this.setAttribute('rel', value)
  }

  // target property for forms and anchors
  get target(): string {
    return this.getAttribute('target') || ''
  }

  set target(value: string) {
    this.setAttribute('target', value)
  }

  // ARIA / role
  get role(): string {
    return this.getAttribute('role') || ''
  }

  set role(value: string) {
    this.setAttribute('role', value)
  }

  // outerText
  get outerText(): string {
    return this.innerText
  }

  set outerText(value: string) {
    if (!this.parentNode) {
      throw new DOMException('This element has no parent node.', 'NoModificationAllowedError')
    }
    const textNode = new VirtualTextNode(value)
    // eslint-disable-next-line max-statements-per-line
    ;(this.parentNode as VirtualElement).replaceChild(textNode, this)
  }

  // Reflected number properties
  get minLength(): number {
    const val = this.getAttribute('minlength')
    return val !== null ? Number.parseInt(val, 10) : -1
  }

  set minLength(value: number) {
    this.setAttribute('minlength', String(value))
  }

  get maxLength(): number {
    const val = this.getAttribute('maxlength')
    return val !== null ? Number.parseInt(val, 10) : -1
  }

  set maxLength(value: number) {
    this.setAttribute('maxlength', String(value))
  }

  get size(): number {
    const val = this.getAttribute('size')
    return val !== null ? Number.parseInt(val, 10) : 20
  }

  set size(value: number) {
    this.setAttribute('size', String(value))
  }

  get rows(): number {
    const val = this.getAttribute('rows')
    return val !== null ? Number.parseInt(val, 10) : 2
  }

  set rows(value: number) {
    this.setAttribute('rows', String(value))
  }

  get cols(): number {
    const val = this.getAttribute('cols')
    return val !== null ? Number.parseInt(val, 10) : 20
  }

  set cols(value: number) {
    this.setAttribute('cols', String(value))
  }

  get download(): string {
    return this.getAttribute('download') || ''
  }

  set download(value: string) {
    this.setAttribute('download', value)
  }

  // Attribute node interface
  getAttributeNode(name: string): { name: string, value: string, specified: boolean, ownerElement: VirtualElement } | null {
    const normalizedName = name.toLowerCase()
    const value = this.attributes.get(normalizedName)
    if (value === undefined) return null
    return { name: normalizedName, value, specified: true, ownerElement: this }
  }

  setAttributeNode(attr: { name: string, value: string }): { name: string, value: string, specified: boolean, ownerElement: VirtualElement } | null {
    const old = this.getAttributeNode(attr.name)
    this.setAttribute(attr.name, attr.value)
    return old
  }

  removeAttributeNode(attr: { name: string }): { name: string, value: string, specified: boolean, ownerElement: VirtualElement } {
    const existing = this.getAttributeNode(attr.name)
    if (!existing) {
      throw new DOMException('The attribute is not found.', 'NotFoundError')
    }
    this.removeAttribute(attr.name)
    return existing
  }

  hasAttributes(): boolean {
    return this.attributes.size > 0
  }

  get willValidate(): boolean {
    if (!this._isListedFormAssociatedElement() || this.disabled) {
      return false
    }
    if (this._isFieldsetElement() || this.tagName === 'OUTPUT') {
      return false
    }
    if (this._isInputElement()) {
      return !['button', 'hidden', 'image', 'reset', 'submit'].includes(this._getInputType())
    }
    if (this._isButtonElement()) {
      return false
    }
    return this._isSelectElement() || this._isTextareaElement()
  }

  get value(): string {
    if (this._isOptionElement()) {
      return this._getOptionValue()
    }
    if (this._isTextareaElement()) {
      return this._valueDirty ? (this._valueState ?? '') : getNodeTextContent(this)
    }
    if (this._isInputElement()) {
      if (this._valueDirty) {
        return this._valueState ?? ''
      }
      const attributeValue = this.getAttribute('value')
      if (attributeValue !== null) {
        return attributeValue
      }
      const type = this._getInputType()
      return type === 'checkbox' || type === 'radio' ? 'on' : ''
    }
    if (this._isSelectElement()) {
      return this._getSelectedOptionsInternal()[0]?.value ?? ''
    }
    return this.getAttribute('value') || ''
  }

  set value(value: string) {
    const normalizedValue = `${value}`
    if (this._isTextareaElement() || this._isInputElement()) {
      this._valueDirty = true
      this._valueState = normalizedValue
      return
    }
    if (this._isSelectElement()) {
      let matched = false
      for (const option of this._getSelectOptions()) {
        const shouldSelect = !matched && option.value === normalizedValue
        option.selected = shouldSelect
        if (shouldSelect) {
          matched = true
        }
      }
      if (!matched) {
        this.selectedIndex = -1
      }
      return
    }
    this.setAttribute('value', normalizedValue)
  }

  get defaultValue(): string {
    if (this._isTextareaElement()) {
      return getNodeTextContent(this)
    }
    return this.getAttribute('value') || ''
  }

  set defaultValue(value: string) {
    const normalizedValue = `${value}`
    if (this._isTextareaElement()) {
      this.textContent = normalizedValue
      if (!this._valueDirty) {
        this._valueState = null
      }
      return
    }
    this.setAttribute('value', normalizedValue)
    if (!this._valueDirty) {
      this._valueState = null
    }
  }

  get checked(): boolean {
    if (!this._isInputElement()) {
      return false
    }
    const type = this._getInputType()
    if (type !== 'checkbox' && type !== 'radio') {
      return false
    }
    return this._checkedDirty ? Boolean(this._checkedState) : this.hasAttribute('checked')
  }

  set checked(value: boolean) {
    if (!this._isInputElement()) {
      return
    }
    const type = this._getInputType()
    if (type !== 'checkbox' && type !== 'radio') {
      return
    }
    const boolValue = Boolean(value)
    this._checkedDirty = true
    this._checkedState = boolValue
    if (type === 'radio' && boolValue) {
      this._syncRadioGroupSelection()
    }
  }

  get defaultChecked(): boolean {
    return this.hasAttribute('checked')
  }

  set defaultChecked(value: boolean) {
    if (value) {
      this.setAttribute('checked', '')
    }
    else {
      this.removeAttribute('checked')
    }
  }

  get selected(): boolean {
    if (!this._isOptionElement()) {
      return false
    }
    return this._selectedDirty ? Boolean(this._selectedState) : this.hasAttribute('selected')
  }

  set selected(value: boolean) {
    if (!this._isOptionElement()) {
      return
    }
    const normalizedValue = Boolean(value)
    const select = this._getOwningSelect()
    if (normalizedValue && select && !select.hasAttribute('multiple')) {
      for (const option of select._getSelectOptions()) {
        if (option === this) {
          continue
        }
        option._selectedDirty = true
        option._selectedState = false
      }
    }
    this._selectedDirty = true
    this._selectedState = normalizedValue
  }

  get defaultSelected(): boolean {
    return this.hasAttribute('selected')
  }

  set defaultSelected(value: boolean) {
    if (value) {
      this.setAttribute('selected', '')
    }
    else {
      this.removeAttribute('selected')
    }
  }

  get options(): VirtualElement[] {
    return this._getSelectOptions()
  }

  get selectedOptions(): VirtualElement[] {
    if (this._isSelectElement()) {
      return this._getSelectedOptionsInternal()
    }
    return this._isOptionElement() && this.selected ? [this] : []
  }

  get selectedIndex(): number {
    if (!this._isSelectElement()) {
      return -1
    }
    const options = this._getSelectOptions()
    const selected = this._getSelectedOptionsInternal()[0]
    return selected ? options.indexOf(selected) : -1
  }

  set selectedIndex(value: number) {
    if (!this._isSelectElement()) {
      return
    }
    const options = this._getSelectOptions()
    for (let index = 0; index < options.length; index++) {
      options[index].selected = value >= 0 && index === value
    }
  }

  // Form validation
  get validity(): {
    valid: boolean
    valueMissing: boolean
    typeMismatch: boolean
    patternMismatch: boolean
    tooLong: boolean
    tooShort: boolean
    rangeUnderflow: boolean
    rangeOverflow: boolean
    stepMismatch: boolean
    badInput: boolean
    customError: boolean
  } {
    const value = this.value
    const type = this.type || 'text'
    const required = this.hasAttribute('required')
    const pattern = this.getAttribute('pattern')
    const minlength = this.getAttribute('minlength')
    const maxlength = this.getAttribute('maxlength')
    const min = this.getAttribute('min')
    const max = this.getAttribute('max')

    const validity = {
      valid: true,
      valueMissing: false,
      typeMismatch: false,
      patternMismatch: false,
      tooLong: false,
      tooShort: false,
      rangeUnderflow: false,
      rangeOverflow: false,
      stepMismatch: false,
      badInput: false,
      customError: false,
    }

    if (!this.willValidate) {
      return validity
    }

    // Check required
    if (required && ((type === 'checkbox' || type === 'radio') ? !this.checked : !value)) {
      validity.valueMissing = true
      validity.valid = false
    }

    // Check pattern
    if (pattern && value) {
      const regex = new RegExp(pattern)
      if (!regex.test(value)) {
        validity.patternMismatch = true
        validity.valid = false
      }
    }

    // Check minlength
    if (minlength && value.length < Number.parseInt(minlength, 10)) {
      validity.tooShort = true
      validity.valid = false
    }

    // Check maxlength
    if (maxlength && value.length > Number.parseInt(maxlength, 10)) {
      validity.tooLong = true
      validity.valid = false
    }

    // Check min/max for numbers
    if (type === 'number' || type === 'range') {
      const numValue = Number.parseFloat(value)
      if (!Number.isNaN(numValue)) {
        if (min && numValue < Number.parseFloat(min)) {
          validity.rangeUnderflow = true
          validity.valid = false
        }
        if (max && numValue > Number.parseFloat(max)) {
          validity.rangeOverflow = true
          validity.valid = false
        }
      }
    }

    // Check type-specific validation
    if (type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        validity.typeMismatch = true
        validity.valid = false
      }
    }

    if (type === 'url' && value) {
      try {
        // eslint-disable-next-line no-new
        new URL(value)
      }
      catch {
        validity.typeMismatch = true
        validity.valid = false
      }
    }

    // Check custom validity
    if (this._customValidity) {
      validity.customError = true
      validity.valid = false
    }

    return validity
  }

  get validationMessage(): string {
    if (this._customValidity) {
      return this._customValidity
    }

    const validity = this.validity

    if (validity.valueMissing) {
      return 'Please fill out this field.'
    }
    if (validity.typeMismatch) {
      const type = this.getAttribute('type')
      if (type === 'email') {
        return 'Please enter an email address.'
      }
      if (type === 'url') {
        return 'Please enter a URL.'
      }
      return 'Please match the requested format.'
    }
    if (validity.patternMismatch) {
      return 'Please match the requested format.'
    }
    if (validity.tooShort) {
      const minlength = this.getAttribute('minlength')
      return `Please lengthen this text to ${minlength} characters or more.`
    }
    if (validity.tooLong) {
      const maxlength = this.getAttribute('maxlength')
      return `Please shorten this text to ${maxlength} characters or less.`
    }
    if (validity.rangeUnderflow) {
      const min = this.getAttribute('min')
      return `Value must be greater than or equal to ${min}.`
    }
    if (validity.rangeOverflow) {
      const max = this.getAttribute('max')
      return `Value must be less than or equal to ${max}.`
    }

    return ''
  }

  setCustomValidity(message: string): void {
    this._customValidity = message
  }

  checkValidity(): boolean {
    if (this._isFormElement() || this._isFieldsetElement()) {
      return this.elements.every(element => element.checkValidity())
    }
    return this.validity.valid
  }

  reportValidity(): boolean {
    if (this._isFormElement() || this._isFieldsetElement()) {
      return this.elements.every(element => element.reportValidity())
    }
    const isValid = this.checkValidity()
    if (!isValid) {
      const event = new VirtualEvent('invalid', { bubbles: false, cancelable: true })
      this.dispatchEvent(event)
    }
    return isValid
  }

  // Selector methods
  querySelector(selector: string): VirtualElement | null {
    return querySelectorEngine(this, selector)
  }

  querySelectorAll(selector: string): VirtualElement[] {
    return querySelectorAllEngine(this, selector)
  }

  matches(selector: string): boolean {
    // Check if selector has combinators
    if (hasCombinators(selector)) {
      // For complex selectors with combinators, we need to find a root to search from
      // Navigate to the document root or highest ancestor
      // eslint-disable-next-line ts/no-this-alias
      let root: VirtualNode = this
      while (root.parentNode && root.parentNode.nodeType !== DOCUMENT_NODE) {
        root = root.parentNode
      }
      // If we have a document parent, use the document as root
      if (root.parentNode && root.parentNode.nodeType === DOCUMENT_NODE) {
        root = root.parentNode
      }

      return matchesComplexSelector(this, selector, root)
    }
    else {
      // Simple selector without combinators - pass self as scope root for :scope
      return matchesSimpleSelector(this, selector, this)
    }
  }

  webkitMatchesSelector(selector: string): boolean {
    return this.matches(selector)
  }

  // Form element reflected properties
  get action(): string {
    if (!this._isFormElement()) return ''
    return this.getAttribute('action') || ''
  }

  set action(value: string) {
    if (this._isFormElement()) this.setAttribute('action', value)
  }

  get method(): string {
    if (!this._isFormElement()) return ''
    return (this.getAttribute('method') || 'get').toLowerCase()
  }

  set method(value: string) {
    if (this._isFormElement()) this.setAttribute('method', value)
  }

  get enctype(): string {
    if (!this._isFormElement()) return ''
    return this.getAttribute('enctype') || 'application/x-www-form-urlencoded'
  }

  set enctype(value: string) {
    if (this._isFormElement()) this.setAttribute('enctype', value)
  }

  get encoding(): string {
    return this.enctype
  }

  set encoding(value: string) {
    this.enctype = value
  }

  // Event handling
  addEventListener(type: string, listener: (event: VirtualEvent) => void, options: EventListenerOptions | boolean = {}): void {
    super.addEventListener(type, listener, options)
  }

  removeEventListener(type: string, listener: (event: VirtualEvent) => void, options: EventListenerOptions | boolean = {}): void {
    super.removeEventListener(type, listener, options)
  }

  dispatchEvent(event: any): boolean {
    return super.dispatchEvent(event)
  }

  // Focus/blur with actual focus tracking.
  // Fires both the non-bubbling focus/blur and the bubbling focusin/focusout
  // so listeners on ancestor elements (e.g. delegated focus handlers) work.
  focus(): void {
    const doc = this.ownerDocument
    if (doc) {
      const previouslyFocused = doc.activeElement
      if (previouslyFocused && previouslyFocused !== this && previouslyFocused !== doc.body) {
        previouslyFocused.dispatchEvent(new VirtualEvent('blur', { bubbles: false }))
        previouslyFocused.dispatchEvent(new VirtualEvent('focusout', { bubbles: true }))
      }
      doc._setFocusedElement(this)
    }
    this.dispatchEvent(new VirtualEvent('focus', { bubbles: false }))
    this.dispatchEvent(new VirtualEvent('focusin', { bubbles: true }))
  }

  blur(): void {
    const doc = this.ownerDocument
    if (doc && doc.activeElement === this)
      doc._setFocusedElement(null)
    this.dispatchEvent(new VirtualEvent('blur', { bubbles: false }))
    this.dispatchEvent(new VirtualEvent('focusout', { bubbles: true }))
  }

  // Scroll methods — virtual layout, but update scroll state and fire events.
  scrollIntoView(_arg?: boolean | ScrollIntoViewOptions): void {
    this._scrollTop = 0
    this._scrollLeft = 0
    const event = new VirtualEvent('scroll', { bubbles: false })
    this.dispatchEvent(event)
  }

  scrollTo(x?: number | { left?: number, top?: number }, y?: number): void {
    if (typeof x === 'object' && x !== null) {
      if (typeof x.left === 'number') this._scrollLeft = x.left
      if (typeof x.top === 'number') this._scrollTop = x.top
    }
    else {
      if (typeof x === 'number') this._scrollLeft = x
      if (typeof y === 'number') this._scrollTop = y
    }
    const event = new VirtualEvent('scroll', { bubbles: false })
    this.dispatchEvent(event)
  }

  scrollBy(x?: number | { left?: number, top?: number }, y?: number): void {
    if (typeof x === 'object' && x !== null) {
      if (typeof x.left === 'number') this._scrollLeft += x.left
      if (typeof x.top === 'number') this._scrollTop += x.top
    }
    else {
      if (typeof x === 'number') this._scrollLeft += x
      if (typeof y === 'number') this._scrollTop += y
    }
    const event = new VirtualEvent('scroll', { bubbles: false })
    this.dispatchEvent(event)
  }

  // ---- HTMLMediaElement surface (gated on tag) ----

  private _isMediaElement(): boolean {
    return this.tagName === 'AUDIO' || this.tagName === 'VIDEO'
  }

  private _mediaPaused: boolean = true
  private _mediaEnded: boolean = false
  private _mediaCurrentTime: number = 0
  private _mediaDuration: number = Number.NaN
  private _mediaVolume: number = 1
  private _mediaMuted: boolean = false
  private _mediaPlaybackRate: number = 1
  private _mediaReadyState: number = 0
  private _mediaNetworkState: number = 0

  get paused(): boolean {
    if (!this._isMediaElement()) return true
    return this._mediaPaused
  }

  get ended(): boolean {
    if (!this._isMediaElement()) return false
    return this._mediaEnded
  }

  get currentTime(): number {
    if (!this._isMediaElement()) return 0
    return this._mediaCurrentTime
  }

  set currentTime(value: number) {
    if (!this._isMediaElement()) return
    this._mediaCurrentTime = value
    this.dispatchEvent(new VirtualEvent('timeupdate', { bubbles: false }))
  }

  get duration(): number {
    if (!this._isMediaElement()) return 0
    return this._mediaDuration
  }

  get volume(): number {
    if (!this._isMediaElement()) return 1
    return this._mediaVolume
  }

  set volume(value: number) {
    if (!this._isMediaElement()) return
    this._mediaVolume = Math.max(0, Math.min(1, value))
    this.dispatchEvent(new VirtualEvent('volumechange', { bubbles: false }))
  }

  get muted(): boolean {
    if (!this._isMediaElement()) return false
    return this._mediaMuted
  }

  set muted(value: boolean) {
    if (!this._isMediaElement()) return
    this._mediaMuted = Boolean(value)
    this.dispatchEvent(new VirtualEvent('volumechange', { bubbles: false }))
  }

  get playbackRate(): number {
    if (!this._isMediaElement()) return 1
    return this._mediaPlaybackRate
  }

  set playbackRate(value: number) {
    if (!this._isMediaElement()) return
    this._mediaPlaybackRate = value
    this.dispatchEvent(new VirtualEvent('ratechange', { bubbles: false }))
  }

  get readyState(): number {
    if (!this._isMediaElement()) return 0
    return this._mediaReadyState
  }

  get networkState(): number {
    if (!this._isMediaElement()) return 0
    return this._mediaNetworkState
  }

  play(): Promise<void> {
    if (!this._isMediaElement())
      return Promise.reject(new DOMException('Not a media element', 'InvalidStateError'))
    const wasPaused = this._mediaPaused
    this._mediaPaused = false
    this._mediaEnded = false
    if (wasPaused) {
      queueMicrotask(() => {
        this.dispatchEvent(new VirtualEvent('play', { bubbles: false }))
        this.dispatchEvent(new VirtualEvent('playing', { bubbles: false }))
      })
    }
    return Promise.resolve()
  }

  pause(): void {
    if (!this._isMediaElement()) return
    if (this._mediaPaused) return
    this._mediaPaused = true
    queueMicrotask(() => {
      this.dispatchEvent(new VirtualEvent('pause', { bubbles: false }))
    })
  }

  load(): void {
    if (!this._isMediaElement()) return
    this._mediaCurrentTime = 0
    this._mediaEnded = false
    this._mediaPaused = true
    queueMicrotask(() => {
      this.dispatchEvent(new VirtualEvent('loadstart', { bubbles: false }))
      this.dispatchEvent(new VirtualEvent('loadedmetadata', { bubbles: false }))
    })
  }

  canPlayType(_type: string): string {
    if (!this._isMediaElement()) return ''
    // Probably is the most permissive and what tests usually want.
    return 'maybe'
  }

  addTextTrack(_kind: string, _label?: string, _language?: string): { kind: string, label: string, language: string, mode: string } {
    return { kind: _kind, label: _label ?? '', language: _language ?? '', mode: 'disabled' }
  }

  // ---- HTMLImageElement.decode ----
  decode(): Promise<void> {
    return Promise.resolve()
  }

  // ---- Element.animate — returns a minimal Animation stub ----
  animate(_keyframes: unknown, _options?: unknown): {
    play: () => void
    pause: () => void
    cancel: () => void
    finish: () => void
    reverse: () => void
    finished: Promise<{ currentTime: number }>
    playState: string
    currentTime: number | null
    // eslint-disable-next-line pickier/no-unused-vars
    onfinish: ((event: Event) => void) | null
    // eslint-disable-next-line pickier/no-unused-vars
    oncancel: ((event: Event) => void) | null
  } {
    const animation = {
      play: (): void => {},
      pause: (): void => {},
      cancel: (): void => {},
      finish: (): void => {
        if (animation.onfinish)
          try { animation.onfinish(new VirtualEvent('finish') as unknown as Event) }
          catch {}
      },
      reverse: (): void => {},
      finished: Promise.resolve({ currentTime: 0 }),
      playState: 'finished',
      currentTime: 0 as number | null,
      // eslint-disable-next-line pickier/no-unused-vars
      onfinish: null as ((event: Event) => void) | null,
      // eslint-disable-next-line pickier/no-unused-vars
      oncancel: null as ((event: Event) => void) | null,
    }
    return animation
  }

  /**
   * The boxes this element generates.
   *
   * Without a layout pass there is no line splitting, so a rendered element has
   * the one box `getBoundingClientRect()` reports, and an element that
   * generates none has an empty list — which is the distinction a caller
   * checking `length` is usually after.
   *
   * This is where being outside a document counts, unlike the measurements
   * above: an element that was never appended is the case a caller uses this
   * list to detect, and it was already answered with `[]` before any of them
   * returned a rect at all.
   */
  getClientRects(): DOMRect[] {
    if (!this.isConnected || this._isDisplayNone())
      return []
    return [this.getBoundingClientRect()]
  }

  private _validateInsertAdjacentPosition(position: string): string {
    const normalized = position.toLowerCase()
    if (normalized !== 'beforebegin' && normalized !== 'afterbegin' && normalized !== 'beforeend' && normalized !== 'afterend') {
      throw new DOMException(`Failed to execute 'insertAdjacentHTML' on 'Element': The value provided ('${position}') is not one of 'beforeBegin', 'afterBegin', 'beforeEnd', or 'afterEnd'.`, 'SyntaxError')
    }
    return normalized
  }

  // insertAdjacentHTML
  insertAdjacentHTML(position: string, html: string): void {
    const pos = this._validateInsertAdjacentPosition(position)
    const nodes = parseHTML(html, this.ownerDocument)
    switch (pos) {
      case 'beforebegin':
        if (this.parentNode) {
          for (const node of nodes) {
            (this.parentNode as VirtualElement).insertBefore(node, this)
          }
        }
        break
      case 'afterbegin':
        for (let i = nodes.length - 1; i >= 0; i--) {
          this.insertBefore(nodes[i], this.firstChild)
        }
        break
      case 'beforeend':
        for (const node of nodes) {
          this.appendChild(node)
        }
        break
      case 'afterend':
        if (this.parentNode) {
          const next = this.nextSibling
          for (const node of nodes) {
            (this.parentNode as VirtualElement).insertBefore(node, next)
          }
        }
        break
    }
  }

  // insertAdjacentElement
  insertAdjacentElement(position: string, element: VirtualElement): VirtualElement | null {
    const pos = this._validateInsertAdjacentPosition(position)
    switch (pos) {
      case 'beforebegin':
        if (this.parentNode) {
          (this.parentNode as VirtualElement).insertBefore(element, this)
          return element
        }
        return null
      case 'afterbegin':
        this.insertBefore(element, this.firstChild)
        return element
      case 'beforeend':
        this.appendChild(element)
        return element
      case 'afterend':
        if (this.parentNode) {
          (this.parentNode as VirtualElement).insertBefore(element, this.nextSibling)
          return element
        }
        return null
      default:
        return null
    }
  }

  // insertAdjacentText
  insertAdjacentText(position: string, text: string): void {
    const pos = this._validateInsertAdjacentPosition(position)
    const textNode = new VirtualTextNode(text)
    switch (pos) {
      case 'beforebegin':
        if (this.parentNode) {
          (this.parentNode as VirtualElement).insertBefore(textNode, this)
        }
        break
      case 'afterbegin':
        this.insertBefore(textNode, this.firstChild)
        break
      case 'beforeend':
        this.appendChild(textNode)
        break
      case 'afterend':
        if (this.parentNode) {
          (this.parentNode as VirtualElement).insertBefore(textNode, this.nextSibling)
        }
        break
    }
  }

  // Click simulation
  click(): void {
    if (this.disabled) {
      return
    }
    const event = new VirtualEvent('click', { bubbles: true, cancelable: true })
    const shouldContinue = this.dispatchEvent(event)
    if (!shouldContinue) {
      return
    }

    if (this._isInputElement()) {
      const type = this._getInputType()
      if (type === 'checkbox') {
        this.checked = !this.checked
      }
      else if (type === 'radio') {
        this.checked = true
      }
      else if ((type === 'submit' || type === 'image') && this.form) {
        this.form.requestSubmit(this)
      }
      else if (type === 'reset' && this.form) {
        this.form.reset()
      }
    }

    if (this._isButtonElement() && this.form) {
      if (this.type === 'reset') {
        this.form.reset()
      }
      else if (this.type === 'submit') {
        this.form.requestSubmit(this)
      }
    }

    if (this.tagName === 'A' && this.href) {
      const view = this.ownerDocument?.defaultView
      if (!view) return

      let destination = this.href
      try {
        destination = new URL(destination, view.location.href).href
      }
      catch {
        // Preserve the raw href when URL resolution fails.
      }

      if (this.target === '_blank') {
        const rel = this.rel.toLowerCase().split(/\s+/)
        const features = rel.filter(value => value === 'noopener' || value === 'noreferrer').join(',')
        view.open(destination, '_blank', features)
      }
      else {
        view.location.href = destination
      }
    }
  }

  submit(): void {
    if (!this._isFormElement()) {
      return
    }
    const event = new VirtualEvent('submit', { bubbles: true, cancelable: true })
    // eslint-disable-next-line max-statements-per-line
    ;(event as any).submitter = null
    this.dispatchEvent(event)
  }

  requestSubmit(submitter?: VirtualElement): void {
    if (!this._isFormElement()) {
      return
    }
    if (submitter && submitter.form !== this) {
      throw new Error('The specified element is not owned by this form element')
    }
    if (!this.reportValidity()) {
      return
    }
    const event = new VirtualEvent('submit', { bubbles: true, cancelable: true })
    // eslint-disable-next-line max-statements-per-line
    ;(event as any).submitter = submitter ?? null
    this.dispatchEvent(event)
  }

  reset(): void {
    if (!this._isFormElement()) {
      return
    }
    const event = new VirtualEvent('reset', { bubbles: true, cancelable: true })
    const shouldContinue = this.dispatchEvent(event)
    if (!shouldContinue) {
      return
    }
    for (const element of this.elements) {
      element._resetFormControlState()
    }
  }

  // Form element properties
  get tabIndex(): number {
    const tabIndexAttr = this.getAttribute('tabindex')

    // If tabindex attribute exists, return its value
    if (tabIndexAttr !== null) {
      return Number.parseInt(tabIndexAttr, 10)
    }

    // Default tabIndex for naturally focusable elements
    if (this.tagName === 'A' || this.tagName === 'BUTTON'
        || this.tagName === 'INPUT' || this.tagName === 'TEXTAREA'
        || this.tagName === 'SELECT') {
      return 0
    }

    // Non-focusable elements return -1
    return -1
  }

  set tabIndex(value: number) {
    this.setAttribute('tabindex', String(value))
  }

  get disabled(): boolean {
    if (!['BUTTON', 'FIELDSET', 'INPUT', 'OPTION', 'OPTGROUP', 'SELECT', 'TEXTAREA'].includes(this.tagName)) {
      return this.hasAttribute('disabled')
    }
    return this._isActuallyDisabled()
  }

  set disabled(value: boolean) {
    if (value) {
      this.setAttribute('disabled', '')
    }
    else {
      this.removeAttribute('disabled')
    }
  }

  // Layout properties. There is no layout pass, so position stays at the
  // origin — but the box a declared size implies is real, and the four
  // measurements below are each a different part of it.
  get clientLeft(): number {
    return this._box().border.left
  }

  get clientTop(): number {
    return this._box().border.top
  }

  /** The padding box: content plus padding, inside the border. */
  get clientWidth(): number {
    const box = this._box()
    return box.content.width + box.padding.left + box.padding.right
  }

  get clientHeight(): number {
    const box = this._box()
    return box.content.height + box.padding.top + box.padding.bottom
  }

  /** The border box: content, padding and border together. */
  get offsetWidth(): number {
    const box = this._box()
    return box.content.width + box.padding.left + box.padding.right + box.border.left + box.border.right
  }

  get offsetHeight(): number {
    const box = this._box()
    return box.content.height + box.padding.top + box.padding.bottom + box.border.top + box.border.bottom
  }

  get offsetTop(): number {
    return 0
  }

  get offsetLeft(): number {
    return 0
  }

  /**
   * The element's box, split into the parts each layout property reports.
   *
   * `offsetWidth` is a border-box measurement and `clientWidth` a padding-box
   * one, so both need the padding and border separately from the content —
   * they used to return the content width and the element's own padding went
   * unreported. `box-sizing` decides which way the declared `width` is read.
   *
   * An element in a `display: none` subtree generates no box, so every part is
   * zero however it was sized.
   *
   * Being detached is not treated the same way. A browser gives an element
   * outside a document no box at all, but a declared size is reported here
   * whether or not the element was ever appended — tests measure elements they
   * never attach, and that contract predates this.
   */
  private _box(): { content: { width: number, height: number }, padding: Insets, border: Insets } {
    const empty = { width: 0, height: 0 }
    const zero: Insets = { top: 0, right: 0, bottom: 0, left: 0 }

    const cascade = this._buildCascade()

    if (this._isDisplayNone(cascade))
      return { content: empty, padding: zero, border: zero }

    const padding = this._insets('padding', cascade)
    const border = this._borderInsets(cascade)

    // `content-box` is the initial value, so anything other than an explicit
    // `border-box` is read as a content size.
    const borderBox = this._cascadedStyleValue('box-sizing', cascade).trim() === 'border-box'

    const resolve = (dimension: 'width' | 'height'): number => {
      const declared = this._resolveInlineSize(dimension, cascade)
      if (!borderBox)
        return declared

      const surrounds = dimension === 'width'
        ? padding.left + padding.right + border.left + border.right
        : padding.top + padding.bottom + border.top + border.bottom

      return Math.max(0, declared - surrounds)
    }

    return { content: { width: resolve('width'), height: resolve('height') }, padding, border }
  }

  /**
   * Is this element, or anything it sits inside, `display: none`?
   *
   * Only `display` is consulted. `visibility: hidden` and `opacity: 0` still
   * occupy their space, so their boxes are real and their measurements are not
   * zero.
   *
   * The walk is the expensive part of a box read, because resolving a property
   * through the cascade means matching every rule against that element — once
   * per ancestor. So the sheets are asked first whether any rule declares
   * `display` at all, which costs one map lookup per rule and no selector
   * matching. When none does, and that is the common case, only the inline
   * styles can hide anything and the walk is a map lookup per ancestor.
   */
  private _isDisplayNone(ownCascade?: ReturnType<typeof collectCascade> | null): boolean {
    if (this._cascadedStyleValue('display', ownCascade).trim() === 'none')
      return true

    const parent = this.parentElement
    if (!parent)
      return false

    const fromSheets = this._sheetsDeclareDisplay()

    // eslint-disable-next-line ts/no-this-alias
    let current: VirtualElement | null = parent
    while (current) {
      const inline = current._internalStyles?.get('display')
      if (inline !== undefined && inline.trim() === 'none')
        return true

      if (fromSheets && current._cascadedStyleValue('display').trim() === 'none')
        return true

      current = current.parentElement
    }

    return false
  }

  /** Does any rule in the document declare `display`? */
  private _sheetsDeclareDisplay(): boolean {
    const document = this.ownerDocument as any
    if (!document)
      return false

    const sheets = [...(document.styleSheets ?? []), ...(document._adoptedStyleSheets ?? [])]

    const declaresDisplay = (rules: ArrayLike<any>): boolean => {
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i]
        if (rule?.cssRules && declaresDisplay(rule.cssRules))
          return true
        if (rule?.style?.getPropertyValue('display'))
          return true
      }
      return false
    }

    for (const sheet of sheets) {
      if (sheet?.cssRules && declaresDisplay(sheet.cssRules))
        return true
    }

    return false
  }

  /** The four sides of `margin` or `padding`, resolved through the cascade. */
  private _insets(property: 'margin' | 'padding', cascade?: ReturnType<typeof collectCascade> | null): Insets {
    const side = (name: 'top' | 'right' | 'bottom' | 'left'): number => {
      const dimension = name === 'top' || name === 'bottom' ? 'height' : 'width'
      const value = this._cascadedStyleValue(`${property}-${name}`, cascade)
      return Math.max(0, this._parseCssSize(value, dimension) ?? 0)
    }

    return { top: side('top'), right: side('right'), bottom: side('bottom'), left: side('left') }
  }

  /**
   * The four border widths, as used rather than as declared.
   *
   * `border-style: none` or `hidden` forces the used width to zero whatever
   * `border-width` says, and the width keywords resolve to the pixel values
   * browsers use for them.
   */
  private _borderInsets(cascade?: ReturnType<typeof collectCascade> | null): Insets {
    const side = (name: 'top' | 'right' | 'bottom' | 'left'): number => {
      const style = this._cascadedStyleValue(`border-${name}-style`, cascade).trim().toLowerCase()
      if (style === '' || style === 'none' || style === 'hidden')
        return 0

      const declared = this._cascadedStyleValue(`border-${name}-width`, cascade).trim().toLowerCase()
      const keyword = BORDER_WIDTH_KEYWORDS[declared]
      if (keyword !== undefined)
        return keyword

      const dimension = name === 'top' || name === 'bottom' ? 'height' : 'width'
      // An unparseable width with a real style is `medium`, the initial value.
      return Math.max(0, this._parseCssSize(declared, dimension) ?? BORDER_WIDTH_KEYWORDS.medium)
    }

    return { top: side('top'), right: side('right'), bottom: side('bottom'), left: side('left') }
  }

  /**
   * Resolve an inline size (width/height) from the element's inline style or
   * width/height attribute. Returns a numeric pixel value, or 0 when no
   * inline size is known.
   *
   * very-happy-dom doesn't run a layout engine, so we honor the inline style
   * value as the "resolved" pixel size. This is faithful enough for testing:
   *  - `style.width = '800px'` -> 800
   *  - `style.width = '50%'` combined with a parent that has an inline width
   *    -> percentage of the parent
   *  - `width="800"` attribute (used by <svg>, <canvas>, <img>) -> 800
   */
  private _resolveInlineSize(dimension: 'width' | 'height', cascade?: ReturnType<typeof collectCascade> | null): number {
    const styled = this._cascadedStyleValue(dimension, cascade)
    if (styled) {
      const parsed = this._parseCssSize(styled, dimension)
      if (parsed !== null)
        return parsed
    }

    // Fall back to the width/height attribute (common for SVG, <canvas>, <img>).
    const attrValue = this.attributes.get(dimension)
    if (attrValue !== undefined && attrValue !== '') {
      const parsed = this._parseCssSize(attrValue, dimension)
      if (parsed !== null)
        return parsed
    }

    return 0
  }

  /**
   * The winning value for a property, decided the way `getComputedStyle()`
   * decides it — specificity, `!important`, and inline over a sheet.
   *
   * The box metrics used to read the inline style directly, so once
   * `getComputedStyle()` learned the cascade the two disagreed about the same
   * element: a class-based `width: 120px` computed as `120px` while the rect
   * reported 0 (#1600). They resolve through the same rules now.
   *
   * A document with no stylesheets skips the cascade entirely and reads the
   * inline style, which is the common case in a unit test and costs nothing.
   */
  private _cascadedStyleValue(property: string, prebuilt?: ReturnType<typeof collectCascade> | null): string {
    const inline = this._internalStyles?.get(property) ?? ''
    const cascade = prebuilt === undefined ? this._buildCascade() : prebuilt
    if (!cascade)
      return inline

    return resolveProperty(property, this.style as any, cascade) ?? inline
  }

  /**
   * Match this element against the document's rules, or null when there are
   * none to match. Matching is the expensive half — `getComputedStyle()` pays
   * the same price — so a caller reading more than one property builds it once
   * and passes it in.
   */
  private _buildCascade(): ReturnType<typeof collectCascade> | null {
    const document = this.ownerDocument as any
    if (!document)
      return null

    const adopted = document._adoptedStyleSheets ?? []
    const sheets = document.styleSheets ?? []
    if (sheets.length === 0 && adopted.length === 0)
      return null

    // The window owns the viewport and the device settings, so it is the one
    // that can say what a `@media` condition resolves to (#1611).
    return collectCascade(this as any, [...sheets, ...adopted], document.defaultView?._mediaContext?.())
  }

  /**
   * Parse a CSS length value. Supports px, plain numbers (treated as px),
   * and percentage values when the parent has a resolvable size.
   * Returns null if the value can't be resolved.
   */
  private _parseCssSize(value: string, dimension: 'width' | 'height'): number | null {
    const trimmed = value.trim()
    if (trimmed === '' || trimmed === 'auto')
      return null

    // Percentage -> resolve against the parent's inline size, if any.
    if (trimmed.endsWith('%')) {
      const pct = Number.parseFloat(trimmed)
      if (!Number.isFinite(pct))
        return null
      const parent = this.parentElement
      if (!parent)
        return null
      const parentSize = parent._resolveInlineSize(dimension)
      if (parentSize === 0)
        return null
      return (pct / 100) * parentSize
    }

    // px value or bare number (common for SVG width="800" and <canvas>).
    const match = /^(-?\d*\.?\d+)(px)?$/i.exec(trimmed)
    if (match) {
      const n = Number.parseFloat(match[1])
      return Number.isFinite(n) ? n : null
    }

    return null
  }

  get offsetParent(): VirtualElement | null {
    return this.parentElement
  }

  get scrollWidth(): number {
    return 0
  }

  get scrollHeight(): number {
    return 0
  }

  private _scrollTop = 0
  private _scrollLeft = 0

  get scrollTop(): number {
    return this._scrollTop
  }

  set scrollTop(value: number) {
    this._scrollTop = value
  }

  get scrollLeft(): number {
    return this._scrollLeft
  }

  set scrollLeft(value: number) {
    this._scrollLeft = value
  }

  getBoundingClientRect(): DOMRect {
    // A border-box measurement, like `offsetWidth` — the rect a browser hands
    // back covers the padding and border, not just the content. Position stays
    // at (0, 0) since we don't run an actual layout pass.
    return new DOMRect(0, 0, this.offsetWidth, this.offsetHeight)
  }

  // Pointer capture API — no-op book-keeping so libraries that capture
  // pointers during drag/zoom interactions don't throw in tests.
  setPointerCapture(pointerId: number): void {
    this._capturedPointerIds ??= new Set()
    this._capturedPointerIds.add(pointerId)
  }

  releasePointerCapture(pointerId: number): void {
    this._capturedPointerIds?.delete(pointerId)
  }

  hasPointerCapture(pointerId: number): boolean {
    return this._capturedPointerIds?.has(pointerId) ?? false
  }

  // Visibility check - walks ancestor chain
  isVisible(): boolean {
    // eslint-disable-next-line ts/no-this-alias
    let current: VirtualElement | null = this
    while (current) {
      const display = current.style.getPropertyValue('display')
      if (display === 'none')
        return false

      const visibility = current.style.getPropertyValue('visibility')
      if (visibility === 'hidden' || visibility === 'collapse')
        return false

      const opacity = current.style.getPropertyValue('opacity')
      if (opacity === '0')
        return false

      current = current.parentElement
    }

    return true
  }

  // Shadow DOM
  attachShadow(init: ShadowRootInit): ShadowRoot {
    if (this._shadowRoot) {
      throw new Error('Shadow root already exists')
    }
    this._shadowRoot = new ShadowRoot(this, init)
    return this._shadowRoot
  }

  private _setOwnerDocument(node: VirtualNode, doc: any): void {
    setOwnerDocumentRecursive(node, doc)
  }

  private _rootNode(node: VirtualNode): VirtualNode {
    let root = node
    while (root.parentNode) {
      root = root.parentNode
    }
    return root
  }

  private _containsNode(parent: VirtualNode, target: VirtualNode): boolean {
    return parent !== target && nodeContains(parent, target)
  }

  private _documentOrder(root: VirtualNode): VirtualNode[] {
    const ordered: VirtualNode[] = []

    const visit = (node: VirtualNode): void => {
      ordered.push(node)

      const children = (node as any).childNodes ?? (node as any).children ?? []
      for (const child of children as VirtualNode[]) {
        visit(child)
      }
    }

    visit(root)
    return ordered
  }
}
