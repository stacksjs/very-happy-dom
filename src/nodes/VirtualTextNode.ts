import { MutationObserver } from '../observers/MutationObserver'
import { TEXT_NODE, VirtualNodeBase, type NodeKind, type NodeType } from './VirtualNode'

export class VirtualTextNode extends VirtualNodeBase {
  nodeType: NodeType = TEXT_NODE
  nodeKind: NodeKind = 'text'
  nodeName: string = '#text'

  constructor(text: string) {
    super()
    this._nodeValue = text
  }

  /**
   * The text itself.
   *
   * Writing it reports a change, the way `textContent` does. It used to be a
   * plain field, so `node.nodeValue = '...'` edited the text without telling
   * anyone — a `MutationObserver` watching `characterData` missed it, and so
   * did the layout cache, which then answered from a pass taken before the
   * text changed.
   */
  get nodeValue(): string {
    return this._nodeValue ?? ''
  }

  set nodeValue(value: string) {
    this.textContent = value
  }

  get textContent(): string {
    return this._nodeValue || ''
  }

  set textContent(value: string) {
    const oldValue = this._nodeValue || ''
    this._nodeValue = value
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

  // CharacterData interface
  get data(): string {
    return this.nodeValue || ''
  }

  set data(value: string) {
    this.textContent = value
  }

  get length(): number {
    return (this.nodeValue || '').length
  }

  substringData(offset: number, count: number): string {
    const data = this.nodeValue || ''
    if (offset < 0 || offset > data.length) {
      throw new DOMException('The index is not in the allowed range.', 'IndexSizeError')
    }
    return data.slice(offset, offset + count)
  }

  appendData(data: string): void {
    this.textContent = (this.nodeValue || '') + data
  }

  insertData(offset: number, data: string): void {
    const current = this.nodeValue || ''
    if (offset < 0 || offset > current.length) {
      throw new DOMException('The index is not in the allowed range.', 'IndexSizeError')
    }
    this.textContent = current.slice(0, offset) + data + current.slice(offset)
  }

  deleteData(offset: number, count: number): void {
    const current = this.nodeValue || ''
    if (offset < 0 || offset > current.length) {
      throw new DOMException('The index is not in the allowed range.', 'IndexSizeError')
    }
    this.textContent = current.slice(0, offset) + current.slice(offset + count)
  }

  replaceData(offset: number, count: number, data: string): void {
    const current = this.nodeValue || ''
    if (offset < 0 || offset > current.length) {
      throw new DOMException('The index is not in the allowed range.', 'IndexSizeError')
    }
    this.textContent = current.slice(0, offset) + data + current.slice(offset + count)
  }

  splitText(offset: number): VirtualTextNode {
    const data = this.nodeValue || ''
    if (offset < 0 || offset > data.length) {
      throw new DOMException('The index is not in the allowed range.', 'IndexSizeError')
    }
    const newData = data.slice(offset)
    this.textContent = data.slice(0, offset)
    const newNode = new VirtualTextNode(newData)
    newNode.ownerDocument = this.ownerDocument
    if (this.parentNode) {
      const parent = this.parentNode as any
      const siblings = parent.childNodes
      const index = siblings.indexOf(this)
      if (index !== -1 && index < siblings.length - 1) {
        parent.insertBefore(newNode, siblings[index + 1])
      }
      else {
        parent.appendChild(newNode)
      }
    }
    return newNode
  }

  get wholeText(): string {
    let text = ''
    // eslint-disable-next-line ts/no-this-alias
    let node: VirtualTextNode | null = this
    // Walk backwards to find contiguous text nodes
    while (node?.previousSibling?.nodeType === TEXT_NODE) {
      node = node.previousSibling as VirtualTextNode
    }
    // Walk forward collecting text
    while (node && node.nodeType === TEXT_NODE) {
      text += (node as VirtualTextNode).nodeValue || ''
      node = node.nextSibling as VirtualTextNode | null
    }
    return text
  }

  cloneNode(): VirtualTextNode {
    return new VirtualTextNode(this.nodeValue)
  }
}
