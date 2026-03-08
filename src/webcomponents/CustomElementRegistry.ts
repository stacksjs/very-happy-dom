/**
 * Custom Elements API implementation
 */

import { VirtualElement } from '../nodes/VirtualElement'
import { invokeAttributeChangedCallback, invokeConnectedCallback } from './custom-element-utils'

export interface CustomElementConstructor {
  new (): HTMLElement
}

export class CustomElementRegistry {
  private _definitions = new Map<string, CustomElementConstructor>()
  private _document: any = null
  private _whenDefinedPromises = new Map<string, {
    resolve: () => void
    reject: (error: Error) => void
  }[]>()

  define(name: string, constructor: CustomElementConstructor, _options?: ElementDefinitionOptions): void {
    if (!/^[a-z][\\.0-9_a-z]*-[\\.0-9_a-z]*$/.test(name)) {
      throw new Error(`Failed to execute 'define' on 'CustomElementRegistry': "${name}" is not a valid custom element name`)
    }

    if (this._definitions.has(name)) {
      throw new Error(`Failed to execute 'define' on 'CustomElementRegistry': the name "${name}" has already been used`)
    }

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
          Object.setPrototypeOf(node, constructor.prototype)
          for (const [attrName, attrValue] of node.attributes ?? []) {
            invokeAttributeChangedCallback(node, attrName, null, attrValue)
          }
          if (node.isConnected) {
            invokeConnectedCallback(node)
          }
        }
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
  connectedCallback?(): void
  disconnectedCallback?(): void
  attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void
  adoptedCallback?(): void

  static get observedAttributes(): string[] {
    return []
  }
}
