import { querySelectorAllEngine, querySelectorEngine } from '../selectors/engine'
import { DOCUMENT_FRAGMENT_NODE, VirtualNodeBase, type NodeKind, type NodeType } from './VirtualNode'
import type { VirtualElement } from './VirtualElement'
import type { VirtualNode } from './VirtualNode'
import { appendNode, getNodeTextContent, insertNodeBefore, removeNode, replaceNode } from './tree-operations'
import { VirtualTextNode } from './VirtualTextNode'

export class VirtualDocumentFragment extends VirtualNodeBase {
  nodeType: NodeType = DOCUMENT_FRAGMENT_NODE
  nodeKind: NodeKind = 'document-fragment'
  nodeName = '#document-fragment'

  get textContent(): string {
    return getNodeTextContent(this)
  }

  set textContent(value: string) {
    this.childNodes = []
    if (value) {
      const textNode = new VirtualTextNode(value)
      textNode.parentNode = this
      textNode.ownerDocument = this.ownerDocument
      this.childNodes.push(textNode)
    }
  }

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

  cloneNode(deep = false): VirtualDocumentFragment {
    const clone = new VirtualDocumentFragment()
    clone.ownerDocument = this.ownerDocument
    if (deep) {
      for (const child of this.childNodes) {
        const childClone = (child as any).cloneNode?.(true)
        if (childClone) {
          clone.appendChild(childClone)
        }
      }
    }
    return clone
  }

  querySelector(selector: string): VirtualElement | null {
    return querySelectorEngine(this, selector)
  }

  querySelectorAll(selector: string): VirtualElement[] {
    return querySelectorAllEngine(this, selector)
  }
}
