import type { NodeType, VirtualNode } from './VirtualNode'

export class VirtualCommentNode implements VirtualNode {
  nodeType: NodeType = 'comment'
  nodeName: string = '#comment'
  nodeValue: string
  attributes: Map<string, string> = new Map<string, string>()
  children: VirtualNode[] = []
  parentNode: VirtualNode | null = null

  constructor(text: string) {
    this.nodeValue = text
  }

  get textContent(): string {
    return ''
  }

  set textContent(_value: string) {
    // Comments don't have text content
  }
}
