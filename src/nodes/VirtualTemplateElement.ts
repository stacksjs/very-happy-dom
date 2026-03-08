import { VirtualDocumentFragment } from './VirtualDocumentFragment'
import type { VirtualNode } from './VirtualNode'
import { VirtualElement } from './VirtualElement'

export class VirtualTemplateElement extends VirtualElement {
  content: VirtualDocumentFragment

  constructor() {
    super('template')
    this.content = new VirtualDocumentFragment()

    Object.defineProperty(this, 'childNodes', {
      configurable: true,
      enumerable: true,
      get: () => this.content.childNodes,
      set: (value: VirtualNode[]) => {
        this.content.childNodes = value
      },
    })
  }

  appendChild(child: VirtualNode): VirtualNode {
    return this.content.appendChild(child)
  }

  removeChild(child: VirtualNode): VirtualNode {
    return this.content.removeChild(child)
  }

  insertBefore(newNode: VirtualNode, referenceNode: VirtualNode | null): VirtualNode {
    return this.content.insertBefore(newNode, referenceNode)
  }

  replaceChild(newNode: VirtualNode, oldNode: VirtualNode): VirtualNode {
    return this.content.replaceChild(newNode, oldNode)
  }

  cloneNode(deep = false): VirtualTemplateElement {
    const clone = new VirtualTemplateElement()
    clone.namespaceURI = this.namespaceURI
    clone.nodeName = this.nodeName
    clone.tagName = this.tagName
    clone.ownerDocument = this.ownerDocument
    clone.content.ownerDocument = this.content.ownerDocument || this.ownerDocument

    for (const [name, value] of this.attributes) {
      clone.setAttribute(name, value)
    }

    if (deep) {
      for (const child of this.content.childNodes) {
        const childClone = (child as any).cloneNode?.(true)
        if (childClone) {
          clone.appendChild(childClone)
        }
      }
    }

    return clone
  }
}
