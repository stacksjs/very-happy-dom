import type { VirtualNode } from '../nodes/VirtualNode'

/**
 * XPathResult types
 */
export enum XPathResultType {
  ANY_TYPE = 0,
  NUMBER_TYPE = 1,
  STRING_TYPE = 2,
  BOOLEAN_TYPE = 3,
  UNORDERED_NODE_ITERATOR_TYPE = 4,
  ORDERED_NODE_ITERATOR_TYPE = 5,
  UNORDERED_NODE_SNAPSHOT_TYPE = 6,
  ORDERED_NODE_SNAPSHOT_TYPE = 7,
  ANY_UNORDERED_NODE_TYPE = 8,
  FIRST_ORDERED_NODE_TYPE = 9,
}

/**
 * XPathResult implementation
 */
export class XPathResult {
  public readonly resultType: XPathResultType
  public readonly numberValue: number
  public readonly stringValue: string
  public readonly booleanValue: boolean
  public readonly singleNodeValue: VirtualNode | null
  public readonly snapshotLength: number

  private _nodes: VirtualNode[] = []
  private _iteratorIndex = 0

  constructor(
    resultType: XPathResultType,
    nodes: VirtualNode[] = [],
    numberValue = 0,
    stringValue = '',
    booleanValue = false,
  ) {
    this.resultType = resultType
    this._nodes = nodes
    this.numberValue = numberValue
    this.stringValue = stringValue
    this.booleanValue = booleanValue
    this.singleNodeValue = nodes.length > 0 ? nodes[0] : null
    this.snapshotLength = nodes.length
  }

  iterateNext(): VirtualNode | null {
    if (this._iteratorIndex < this._nodes.length) {
      return this._nodes[this._iteratorIndex++]
    }
    return null
  }

  snapshotItem(index: number): VirtualNode | null {
    return this._nodes[index] || null
  }
}
