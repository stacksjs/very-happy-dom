import { MutationObserver } from '../observers/MutationObserver'
import { TEXT_NODE, VirtualNodeBase, type NodeKind, type NodeType } from './VirtualNode'

export class VirtualTextNode extends VirtualNodeBase {
  nodeType: NodeType = TEXT_NODE
  nodeKind: NodeKind = 'text'
  nodeName: string = '#text'
  nodeValue: string

  constructor(text: string) {
    super()
    this.nodeValue = text
  }

  get textContent(): string {
    return this.nodeValue || ''
  }

  set textContent(value: string) {
    const oldValue = this.nodeValue || ''
    this.nodeValue = value
    MutationObserver._queueMutationRecord({
      type: 'characterData',
      target: this,
      addedNodes: [],
      removedNodes: [],
      previousSibling: null,
      nextSibling: null,
      attributeName: null,
      attributeNamespace: null,
      oldValue,
    })
  }

  cloneNode(): VirtualTextNode {
    return new VirtualTextNode(this.nodeValue)
  }
}
