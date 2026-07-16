/**
 * Custom Elements API implementation
 */

import { VirtualElement } from '../nodes/VirtualElement'
import { invokeAttributeChangedCallback, invokeConnectedCallback } from './custom-element-utils'

export interface CustomElementConstructor {
  new (): HTMLElement
}

const RESERVED_CUSTOM_ELEMENT_NAMES = new Set([
  'annotation-xml',
  'color-profile',
  'font-face',
  'font-face-src',
  'font-face-uri',
  'font-face-format',
  'font-face-name',
  'missing-glyph',
])

const PRESERVED_UPGRADE_PROPERTIES = new Set<PropertyKey>([
  'attributes',
  'childNodes',
  'namespaceURI',
  'nodeKind',
  'nodeName',
  'nodeType',
  'nodeValue',
  'ownerDocument',
  'parentNode',
  'tagName',
])

function isValidCustomElementName(name: string): boolean {
  return /^[a-z][.0-9_a-z-]*-[.0-9_a-z-]*$/.test(name) && !RESERVED_CUSTOM_ELEMENT_NAMES.has(name)
}

function mergeEventListeners(existing: any, initialized: any): any {
  if (!(existing instanceof Map) || !(initialized instanceof Map)) {
    return existing ?? initialized
  }

  for (const [event, listeners] of initialized) {
    const current = existing.get(event) ?? []
    existing.set(event, [...current, ...listeners])
  }
  return existing
}

function initializeUpgradedElement(node: any, constructor: CustomElementConstructor): void {
  const existingShadowRoot = node._getInternalShadowRoot?.() ?? null
  const initialized: any = new constructor()
  const initializedShadowRoot = initialized._getInternalShadowRoot?.() ?? null
  const existingListeners = node._eventListeners

  for (const key of Reflect.ownKeys(initialized)) {
    if (!PRESERVED_UPGRADE_PROPERTIES.has(key)) {
      node[key] = initialized[key]
    }
  }

  node._eventListeners = mergeEventListeners(existingListeners, initialized._eventListeners)
  if (existingShadowRoot) {
    if (initializedShadowRoot) {
      for (const key of Reflect.ownKeys(node)) {
        if (node[key] === initializedShadowRoot) {
          node[key] = existingShadowRoot
        }
      }
    }
    node._shadowRoot = existingShadowRoot
  }
  const shadowRoot = node._getInternalShadowRoot?.()
  if (shadowRoot) {
    shadowRoot.host = node
    shadowRoot.parentNode = node
    const setOwnerDocument = (current: any): void => {
      current.ownerDocument = node.ownerDocument
      for (const child of current.childNodes ?? []) {
        setOwnerDocument(child)
      }
    }
    setOwnerDocument(shadowRoot)
  }
}

export class CustomElementRegistry {
  private _definitions = new Map<string, CustomElementConstructor>()
  private _document: any = null
  private _whenDefinedPromises = new Map<string, {
    resolve: () => void
    reject: (error: Error) => void
  }[]>()

  define(name: string, constructor: CustomElementConstructor, _options?: ElementDefinitionOptions): void {
    if (!isValidCustomElementName(name)) {
      throw new Error(`Failed to execute 'define' on 'CustomElementRegistry': "${name}" is not a valid custom element name`)
    }

    if (this._definitions.has(name)) {
      throw new Error(`Failed to execute 'define' on 'CustomElementRegistry': the name "${name}" has already been used`)
    }
    if ([...this._definitions.values()].includes(constructor)) {
      throw new Error(`Failed to execute 'define' on 'CustomElementRegistry': this constructor has already been used`)
    }

    // eslint-disable-next-line max-statements-per-line
    ;(constructor as any).__veryHappyCustomElementName = name
    this._definitions.set(name, constructor)
    if (this._document) {
      this.upgrade(this._document)
    }

    // Resolve whenDefined promises
    const promises = this._whenDefinedPromises.get(name)
    if (promises) {
      promises.forEach(p => p.resolve())
      this._whenDefinedPromises.delete(name)
    }
  }

  get(name: string): CustomElementConstructor | undefined {
    return this._definitions.get(name)
  }

  whenDefined(name: string): Promise<CustomElementConstructor> {
    if (!isValidCustomElementName(name)) {
      return Promise.reject(new Error(`Failed to execute 'whenDefined' on 'CustomElementRegistry': "${name}" is not a valid custom element name`))
    }

    if (this._definitions.has(name)) {
      return Promise.resolve(this._definitions.get(name)!)
    }

    return new Promise((resolve, reject) => {
      if (!this._whenDefinedPromises.has(name)) {
        this._whenDefinedPromises.set(name, [])
      }
      this._whenDefinedPromises.get(name)!.push({
        resolve: () => resolve(this._definitions.get(name)!),
        reject,
      })
    })
  }

  _setDocument(document: any): void {
    this._document = document
  }

  upgrade(root: Node): void {
    const visit = (node: any): void => {
      if (node?.tagName) {
        const name = `${node.tagName}`.toLowerCase()
        const constructor = this._definitions.get(name)
        if (constructor && !(node instanceof constructor)) {
          initializeUpgradedElement(node, constructor)
          Object.setPrototypeOf(node, constructor.prototype)
          // eslint-disable-next-line max-statements-per-line
          ;(node as any).__veryHappyCustomElementName = name
          for (const [attrName, attrValue] of node.attributes ?? []) {
            invokeAttributeChangedCallback(node, attrName, null, attrValue)
          }
          if (node.isConnected) {
            invokeConnectedCallback(node)
          }
        }
      }

      const internalShadowRoot = node?._getInternalShadowRoot?.()
      if (internalShadowRoot) {
        visit(internalShadowRoot)
      }

      for (const child of node?.childNodes ?? []) {
        visit(child)
      }
    }

    visit(root)
  }
}

interface ElementDefinitionOptions {
  extends?: string
}

// Simplified HTMLElement for custom elements
export class HTMLElement extends VirtualElement {
  constructor(tagName?: string) {
    const ctor = new.target as any
    super(tagName || ctor.__veryHappyCustomElementName || 'div')
  }

  connectedCallback?(): void
  disconnectedCallback?(): void
  attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void
  adoptedCallback?(): void

  static get observedAttributes(): string[] {
    return []
  }
}
