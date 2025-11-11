import type { ShadowRootInit } from '../webcomponents/ShadowRoot'
import type { EventListener, EventListenerOptions, NodeType, VirtualNode } from './VirtualNode'
import { VirtualEvent } from '../events/VirtualEvent'
import { parseHTML } from '../parsers/html-parser'
import { hasCombinators, matchesComplexSelector, matchesSimpleSelector, querySelectorAllEngine, querySelectorEngine } from '../selectors/engine'
import { ShadowRoot } from '../webcomponents/ShadowRoot'

export class VirtualElement implements VirtualNode {
  nodeType: NodeType = 'element'
  nodeName: string
  nodeValue: string | null = null
  tagName: string
  attributes: Map<string, string> = new Map<string, string>()
  childNodes: VirtualNode[] = []
  parentNode: VirtualNode | null = null
  shadowRoot: ShadowRoot | null = null
  private eventListeners: Map<string, EventListener[]> = new Map<string, EventListener[]>()
  private _customValidity: string = ''
  private _internalStyles: Map<string, string> = new Map<string, string>()

  // children should only contain element nodes, per DOM spec
  get children(): VirtualNode[] {
    return this.childNodes.filter(node => node.nodeType === 'element')
  }

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase()
    this.nodeName = this.tagName
  }

  // Attribute methods
  getAttribute(name: string): string | null {
    return this.attributes.get(name.toLowerCase()) ?? null
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name.toLowerCase(), value)
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name.toLowerCase())
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name.toLowerCase())
  }

  // Child manipulation methods
  appendChild(child: VirtualNode): VirtualNode {
    // Don't remove from previous parent - allow same child to be appended multiple times
    // if (child.parentNode) {
    //   const prevParent = child.parentNode as VirtualElement
    //   const index = prevParent.childNodes.indexOf(child)
    //   if (index !== -1) {
    //     prevParent.childNodes.splice(index, 1)
    //   }
    // }

    this.childNodes.push(child)
    child.parentNode = this
    return child
  }

  removeChild(child: VirtualNode): VirtualNode {
    const index = this.childNodes.indexOf(child)
    if (index === -1) {
      // Don't throw - just return the child
      return child
    }

    this.childNodes.splice(index, 1)
    child.parentNode = null
    return child
  }

  insertBefore(newNode: VirtualNode, referenceNode: VirtualNode | null): VirtualNode {
    if (referenceNode === null) {
      return this.appendChild(newNode)
    }

    const index = this.childNodes.indexOf(referenceNode)
    if (index === -1) {
      throw new Error('Reference node not found')
    }

    // Remove from previous parent if any
    if (newNode.parentNode) {
      const prevParent = newNode.parentNode as VirtualElement
      const prevIndex = prevParent.childNodes.indexOf(newNode)
      if (prevIndex !== -1) {
        prevParent.childNodes.splice(prevIndex, 1)
      }
    }

    this.childNodes.splice(index, 0, newNode)
    newNode.parentNode = this
    return newNode
  }

  replaceChild(newNode: VirtualNode, oldNode: VirtualNode): VirtualNode {
    const index = this.childNodes.indexOf(oldNode)
    if (index === -1) {
      throw new Error('Old node not found')
    }

    // Remove from previous parent if any
    if (newNode.parentNode) {
      const prevParent = newNode.parentNode as VirtualElement
      const prevIndex = prevParent.childNodes.indexOf(newNode)
      if (prevIndex !== -1) {
        prevParent.childNodes.splice(prevIndex, 1)
      }
    }

    this.childNodes.splice(index, 1, newNode)
    oldNode.parentNode = null
    newNode.parentNode = this
    return oldNode
  }

  cloneNode(deep = false): VirtualElement {
    const clone = new VirtualElement(this.tagName)

    // Copy attributes
    for (const [name, value] of this.attributes) {
      clone.setAttribute(name, value)
    }

    // Deep clone children
    if (deep) {
      for (const child of this.childNodes) {
        if (child.nodeType === 'element') {
          const childClone = (child as VirtualElement).cloneNode(true)
          clone.appendChild(childClone)
        }
        else {
          // Clone text/comment nodes
          const childClone = { ...child, parentNode: null }
          clone.appendChild(childClone)
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
      if (matchesSimpleSelector(element, selector)) {
        return element
      }
      element = element.parentNode as VirtualElement | null
      if (element?.nodeType !== 'element') {
        element = null
      }
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
    if (!this.parentNode)
      return null

    const siblings = this.parentNode.children
    const index = siblings.indexOf(this)
    if (index === -1)
      return null

    for (let i = index + 1; i < siblings.length; i++) {
      if (siblings[i].nodeType === 'element') {
        return siblings[i] as VirtualElement
      }
    }

    return null
  }

  get previousElementSibling(): VirtualElement | null {
    if (!this.parentNode)
      return null

    const siblings = this.parentNode.children
    const index = siblings.indexOf(this)
    if (index === -1)
      return null

    for (let i = index - 1; i >= 0; i--) {
      if (siblings[i].nodeType === 'element') {
        return siblings[i] as VirtualElement
      }
    }

    return null
  }

  // Text content
  get textContent(): string {
    let text = ''
    for (const child of this.childNodes) {
      text += child.textContent
    }
    return text
  }

  set textContent(value: string) {
    this.childNodes = []
    if (value) {
      // We need to import VirtualTextNode but avoid circular dependency
      // For now, create a simple text node object
      const textNode: VirtualNode = {
        nodeType: 'text',
        nodeName: '#text',
        nodeValue: value,
        attributes: new Map(),
        children: [],
        parentNode: this,
        textContent: value,
      }
      this.childNodes.push(textNode)
    }
  }

  get innerHTML(): string {
    return this.childNodes.map(child => this._serializeNode(child)).join('')
  }

  set innerHTML(html: string) {
    this.childNodes = []
    if (html) {
      const nodes = parseHTML(html)

      // Special case: if we're the documentElement (<html>) and the parsed HTML
      // contains an <html> element, extract its children instead of nesting
      if (this.tagName === 'HTML' && nodes.length > 0) {
        // Look for an <html> element in the parsed nodes
        for (const node of nodes) {
          if (node.nodeType === 'element') {
            const element = node as VirtualElement
            if (element.tagName === 'HTML') {
              // Extract the <html> element's children (head, body, etc.)
              for (const child of element.children) {
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
  }

  get outerHTML(): string {
    return this._serializeNode(this)
  }

  // classList implementation
  get classList(): {
    add: (...tokens: string[]) => void
    remove: (...tokens: string[]) => void
    toggle: (token: string) => boolean
    contains: (token: string) => boolean
    replace: (oldToken: string, newToken: string) => boolean
  } {
    // eslint-disable-next-line ts/no-this-alias
    const element = this

    return {
      add(...tokens: string[]): void {
        const classes = element.getAttribute('class')?.split(/\s+/).filter(Boolean) || []
        for (const token of tokens) {
          if (!classes.includes(token)) {
            classes.push(token)
          }
        }
        element.setAttribute('class', classes.join(' '))
      },
      remove(...tokens: string[]): void {
        const classes = element.getAttribute('class')?.split(/\s+/).filter(Boolean) || []
        const filtered = classes.filter(c => !tokens.includes(c))
        if (filtered.length > 0) {
          element.setAttribute('class', filtered.join(' '))
        }
        else {
          element.removeAttribute('class')
        }
      },
      toggle(token: string): boolean {
        const classes = element.getAttribute('class')?.split(/\s+/).filter(Boolean) || []
        const index = classes.indexOf(token)
        if (index !== -1) {
          classes.splice(index, 1)
          if (classes.length > 0) {
            element.setAttribute('class', classes.join(' '))
          }
          else {
            element.removeAttribute('class')
          }
          return false
        }
        else {
          classes.push(token)
          element.setAttribute('class', classes.join(' '))
          return true
        }
      },
      contains(token: string): boolean {
        const classes = element.getAttribute('class')?.split(/\s+/).filter(Boolean) || []
        return classes.includes(token)
      },
      replace(oldToken: string, newToken: string): boolean {
        const classes = element.getAttribute('class')?.split(/\s+/).filter(Boolean) || []
        const index = classes.indexOf(oldToken)
        if (index !== -1) {
          classes[index] = newToken
          element.setAttribute('class', classes.join(' '))
          return true
        }
        return false
      },
    }
  }

  private _serializeNode(node: VirtualNode): string {
    if (node.nodeType === 'text') {
      return node.nodeValue || ''
    }
    if (node.nodeType === 'comment') {
      return `<!--${node.nodeValue}-->`
    }
    if (node.nodeType === 'element') {
      const element = node as VirtualElement
      const tagName = element.tagName.toLowerCase()
      let html = `<${tagName}`

      for (const [name, value] of element.attributes) {
        html += ` ${name}="${value}"`
      }

      // Check if this is a void element (self-closing tag)
      const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']
      if (voidElements.includes(tagName)) {
        html += '/>'
        return html
      }

      html += '>'

      for (const child of element.childNodes) {
        html += this._serializeNode(child)
      }

      html += `</${tagName}>`
      return html
    }
    return ''
  }

  // Style property with Proxy for dynamic access
  get style(): CSSStyleDeclaration & { [key: string]: any } {
    // eslint-disable-next-line ts/no-this-alias
    const element = this

    return new Proxy(
      {
        getPropertyValue(property: string): string {
          return element._internalStyles.get(property) || ''
        },
        setProperty(property: string, value: string): void {
          element._internalStyles.set(property, value)
          element._updateStyleAttribute()
        },
        removeProperty(property: string): void {
          element._internalStyles.delete(property)
          element._updateStyleAttribute()
        },
      } as any,
      {
        get(target, prop: string) {
          if (prop === 'getPropertyValue' || prop === 'setProperty' || prop === 'removeProperty') {
            return target[prop]
          }
          // Convert camelCase to kebab-case
          const kebabProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
          const value = element._internalStyles.get(kebabProp)
          return value
        },
        set(_target, prop: string, value: string) {
          // Convert camelCase to kebab-case
          const kebabProp = prop.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)
          element._internalStyles.set(kebabProp, value)
          element._updateStyleAttribute()
          return true
        },
      },
    )
  }

  private _updateStyleAttribute(): void {
    const styleString = Array.from(this._internalStyles.entries())
      .map(([prop, value]) => `${prop}: ${value}`)
      .join('; ')

    if (styleString) {
      this.setAttribute('style', styleString)
    }
    else {
      this.removeAttribute('style')
    }
  }

  // Dataset property for data-* attributes
  get dataset(): { [key: string]: string } {
    // eslint-disable-next-line ts/no-this-alias
    const self = this

    return new Proxy({}, {
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
    const value = this.getAttribute('value') || ''
    const type = this.getAttribute('type') || 'text'
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

    // Check required
    if (required && !value) {
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
    return this.validity.valid
  }

  reportValidity(): boolean {
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
      while (root.parentNode && root.parentNode.nodeType !== 'document') {
        root = root.parentNode
      }
      // If we have a document parent, use the document as root
      if (root.parentNode && root.parentNode.nodeType === 'document') {
        root = root.parentNode
      }

      return matchesComplexSelector(this, selector, root)
    }
    else {
      // Simple selector without combinators
      return matchesSimpleSelector(this, selector)
    }
  }

  // Event handling
  addEventListener(type: string, listener: (event: VirtualEvent) => void, options: EventListenerOptions | boolean = {}): void {
    const opts: EventListenerOptions = typeof options === 'boolean'
      ? { capture: options }
      : { capture: options.capture ?? false, once: options.once, passive: options.passive }

    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, [])
    }

    const listeners = this.eventListeners.get(type)!

    // Don't add duplicate listeners - check if same listener with same capture option already exists
    const isDuplicate = listeners.some(
      l => l.listener === listener && l.options.capture === opts.capture,
    )

    if (!isDuplicate) {
      listeners.push({
        listener,
        options: opts,
      })
    }
  }

  removeEventListener(type: string, listener: (event: VirtualEvent) => void, options: EventListenerOptions | boolean = {}): void {
    const opts: EventListenerOptions = typeof options === 'boolean'
      ? { capture: options }
      : { capture: options.capture ?? false }
    const listeners = this.eventListeners.get(type)

    if (!listeners)
      return

    const index = listeners.findIndex(
      l => l.listener === listener && l.options.capture === opts.capture,
    )

    if (index !== -1) {
      listeners.splice(index, 1)
    }
  }

  dispatchEvent(event: any): boolean {
    // Try to set target and currentTarget if they're writable
    // Native Event objects have readonly properties, so we need to handle that
    try {
      event.target = this
      event.currentTarget = this
    }
    catch {
      // If properties are readonly, that's okay - native Events set these automatically
    }

    // Capture phase - traverse from root to target
    const path: VirtualElement[] = []
    // eslint-disable-next-line ts/no-this-alias
    let current: VirtualNode | null = this
    while (current && current.nodeType === 'element') {
      path.unshift(current as VirtualElement)
      current = current.parentNode
    }

    // Get event properties safely
    const isPropagationStopped = () => event.propagationStopped || event._propagationStopped || false

    // Capture phase
    for (let i = 0; i < path.length - 1 && !isPropagationStopped(); i++) {
      const element = path[i]
      try {
        event.currentTarget = element
      }
      catch {
        // Ignore if readonly
      }
      this._invokeEventListeners(element, event, true)
    }

    // Target phase
    if (!isPropagationStopped()) {
      try {
        event.currentTarget = this
      }
      catch {
        // Ignore if readonly
      }
      this._invokeEventListeners(this, event, false)
      this._invokeEventListeners(this, event, true)
    }

    // Bubble phase
    const bubbles = event.bubbles ?? true
    if (bubbles && !isPropagationStopped()) {
      for (let i = path.length - 2; i >= 0 && !isPropagationStopped(); i--) {
        const element = path[i]
        try {
          event.currentTarget = element
        }
        catch {
          // Ignore if readonly
        }
        this._invokeEventListeners(element, event, false)
      }
    }

    return !(event.defaultPrevented ?? false)
  }

  private _invokeEventListeners(element: VirtualElement, event: VirtualEvent, capture: boolean): void {
    const listeners = element.eventListeners.get(event.type)
    if (!listeners)
      return

    // Create a copy to avoid issues if listeners are removed during iteration
    const listenersCopy = [...listeners]

    for (const { listener, options } of listenersCopy) {
      if (options.capture !== capture)
        continue

      if (event.immediatePropagationStopped)
        break

      try {
        listener.call(element, event)
      }
      catch (error) {
        // Log error but continue executing other listeners
        console.error('Error in event listener:', error)
      }

      if (options.once) {
        element.removeEventListener(event.type, listener, options)
      }
    }
  }

  // Click simulation
  click(): void {
    const event = new VirtualEvent('click', { bubbles: true, cancelable: true })
    this.dispatchEvent(event)
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
    return this.hasAttribute('disabled')
  }

  set disabled(value: boolean) {
    if (value) {
      this.setAttribute('disabled', '')
    }
    else {
      this.removeAttribute('disabled')
    }
  }

  // Visibility check
  isVisible(): boolean {
    // Check display: none
    const display = this.style.getPropertyValue('display')
    if (display === 'none')
      return false

    // Check visibility: hidden
    const visibility = this.style.getPropertyValue('visibility')
    if (visibility === 'hidden')
      return false

    // Check opacity
    const opacity = this.style.getPropertyValue('opacity')
    if (opacity === '0')
      return false

    return true
  }

  // Shadow DOM
  attachShadow(init: ShadowRootInit): ShadowRoot {
    if (this.shadowRoot) {
      throw new Error('Shadow root already exists')
    }
    this.shadowRoot = new ShadowRoot(this, init)
    return this.shadowRoot
  }
}
