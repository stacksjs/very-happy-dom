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

  get textContent(): string {
    return ''
  }

  set textContent(_value: string) {
    // Comments don't have text content
  }

  cloneNode(): VirtualCommentNode {
    return new VirtualCommentNode(this.nodeValue)
  }
}
