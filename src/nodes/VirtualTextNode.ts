import type { NodeType, VirtualNode } from './VirtualNode'

export class VirtualTextNode implements VirtualNode {
  nodeType: NodeType = 'text'
  nodeName: string = '#text'
  nodeValue: string
  attributes: Map<string, string> = new Map<string, string>()
  children: VirtualNode[] = []
  parentNode: VirtualNode | null = null

  constructor(text: string) {
    this.nodeValue = text
  }

  get textContent(): string {
    return this.nodeValue || ''
  }

  set textContent(value: string) {
    this.nodeValue = value
  }
}
