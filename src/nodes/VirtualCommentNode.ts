import { COMMENT_NODE, VirtualNodeBase, type NodeKind, type NodeType } from './VirtualNode'

export class VirtualCommentNode extends VirtualNodeBase {
  nodeType: NodeType = COMMENT_NODE
  nodeKind: NodeKind = 'comment'
  nodeName: string = '#comment'
  nodeValue: string

  constructor(text: string) {
    super()
    this.nodeValue = text
  }

  // Per DOM spec, textContent on comment nodes returns the data (nodeValue)
  get textContent(): string {
    return this.nodeValue || ''
  }

  set textContent(value: string) {
    this.nodeValue = value
  }

  // CharacterData interface
  get data(): string {
    return this.nodeValue || ''
  }

  set data(value: string) {
    this.nodeValue = value
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
    this.nodeValue = (this.nodeValue || '') + data
  }

  insertData(offset: number, data: string): void {
    const current = this.nodeValue || ''
    if (offset < 0 || offset > current.length) {
      throw new DOMException('The index is not in the allowed range.', 'IndexSizeError')
    }
    this.nodeValue = current.slice(0, offset) + data + current.slice(offset)
  }

  deleteData(offset: number, count: number): void {
    const current = this.nodeValue || ''
    if (offset < 0 || offset > current.length) {
      throw new DOMException('The index is not in the allowed range.', 'IndexSizeError')
    }
    this.nodeValue = current.slice(0, offset) + current.slice(offset + count)
  }

  replaceData(offset: number, count: number, data: string): void {
    const current = this.nodeValue || ''
    if (offset < 0 || offset > current.length) {
      throw new DOMException('The index is not in the allowed range.', 'IndexSizeError')
    }
    this.nodeValue = current.slice(0, offset) + data + current.slice(offset + count)
  }

  cloneNode(): VirtualCommentNode {
    return new VirtualCommentNode(this.nodeValue)
  }
}
