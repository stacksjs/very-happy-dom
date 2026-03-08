import {
  COMMENT_NODE,
  DOCUMENT_FRAGMENT_NODE,
  DOCUMENT_NODE,
  DOCUMENT_POSITION_CONTAINED_BY,
  DOCUMENT_POSITION_FOLLOWING,
  ELEMENT_NODE,
  TEXT_NODE,
  type VirtualNode,
} from './nodes/VirtualNode'

export type NodeFilterInput = { acceptNode?: (node: VirtualNode) => number } | ((node: VirtualNode) => number) | null

export const FILTER_ACCEPT = 1
export const FILTER_REJECT = 2
export const FILTER_SKIP = 3

export const SHOW_ALL = 0xFFFFFFFF
export const SHOW_ELEMENT = 0x1
export const SHOW_TEXT = 0x4
export const SHOW_COMMENT = 0x80
export const SHOW_DOCUMENT = 0x100
export const SHOW_DOCUMENT_FRAGMENT = 0x400

export interface NodeFilterConstants {
  FILTER_ACCEPT: number
  FILTER_REJECT: number
  FILTER_SKIP: number
  SHOW_ALL: number
  SHOW_ELEMENT: number
  SHOW_TEXT: number
  SHOW_COMMENT: number
  SHOW_DOCUMENT: number
  SHOW_DOCUMENT_FRAGMENT: number
}

export const NodeFilter: NodeFilterConstants = {
  FILTER_ACCEPT: FILTER_ACCEPT,
  FILTER_REJECT: FILTER_REJECT,
  FILTER_SKIP: FILTER_SKIP,
  SHOW_ALL: SHOW_ALL,
  SHOW_ELEMENT: SHOW_ELEMENT,
  SHOW_TEXT: SHOW_TEXT,
  SHOW_COMMENT: SHOW_COMMENT,
  SHOW_DOCUMENT: SHOW_DOCUMENT,
  SHOW_DOCUMENT_FRAGMENT: SHOW_DOCUMENT_FRAGMENT,
}

function getNodeShowMask(node: VirtualNode): number {
  switch (node.nodeType) {
    case ELEMENT_NODE:
      return SHOW_ELEMENT
    case TEXT_NODE:
      return SHOW_TEXT
    case COMMENT_NODE:
      return SHOW_COMMENT
    case DOCUMENT_NODE:
      return SHOW_DOCUMENT
    case DOCUMENT_FRAGMENT_NODE:
      return SHOW_DOCUMENT_FRAGMENT
    default:
      return 0
  }
}

function getFilterCallback(filter: NodeFilterInput): ((node: VirtualNode) => number) | null {
  if (!filter) {
    return null
  }
  if (typeof filter === 'function') {
    return filter
  }
  return typeof filter.acceptNode === 'function' ? filter.acceptNode.bind(filter) : null
}

function evaluateNode(node: VirtualNode, whatToShow: number, filter: NodeFilterInput): number {
  const byType = whatToShow === SHOW_ALL || (whatToShow & getNodeShowMask(node)) !== 0
  if (!byType) {
    return FILTER_SKIP
  }

  const defaultResult = FILTER_ACCEPT
  const callback = getFilterCallback(filter)
  if (!callback) {
    return defaultResult
  }

  const result = callback(node)
  return result === FILTER_ACCEPT || result === FILTER_REJECT || result === FILTER_SKIP ? result : defaultResult
}

function collectAllNodes(root: VirtualNode): VirtualNode[] {
  const nodes: VirtualNode[] = []
  const visit = (node: VirtualNode): void => {
    nodes.push(node)
    for (const child of node.childNodes) {
      visit(child)
    }
  }
  visit(root)
  return nodes
}

function collectVisibleNodes(root: VirtualNode, whatToShow: number, filter: NodeFilterInput): VirtualNode[] {
  const nodes: VirtualNode[] = []
  const visit = (node: VirtualNode): void => {
    const result = evaluateNode(node, whatToShow, filter)
    if (result === FILTER_ACCEPT) {
      nodes.push(node)
    }
    if (result !== FILTER_REJECT) {
      for (const child of node.childNodes) {
        visit(child)
      }
    }
  }
  visit(root)
  return nodes
}

function findFirstVisible(node: VirtualNode, whatToShow: number, filter: NodeFilterInput): VirtualNode | null {
  const result = evaluateNode(node, whatToShow, filter)
  if (result === FILTER_ACCEPT) {
    return node
  }
  if (result === FILTER_REJECT) {
    return null
  }
  for (const child of node.childNodes) {
    const match = findFirstVisible(child, whatToShow, filter)
    if (match) {
      return match
    }
  }
  return null
}

function findLastVisible(node: VirtualNode, whatToShow: number, filter: NodeFilterInput): VirtualNode | null {
  const result = evaluateNode(node, whatToShow, filter)
  if (result !== FILTER_REJECT) {
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const match = findLastVisible(node.childNodes[i], whatToShow, filter)
      if (match) {
        return match
      }
    }
  }
  return result === FILTER_ACCEPT ? node : null
}

function isWithinRoot(node: VirtualNode | null, root: VirtualNode): boolean {
  let current = node
  while (current) {
    if (current === root) {
      return true
    }
    current = current.parentNode
  }
  return false
}

function getNodeLength(node: VirtualNode): number {
  if (node.nodeType === TEXT_NODE || node.nodeType === COMMENT_NODE) {
    return node.nodeValue?.length || 0
  }
  return node.childNodes.length
}

function getChildIndex(node: VirtualNode): number {
  if (!node.parentNode) {
    return 0
  }
  return node.parentNode.childNodes.indexOf(node)
}

function comparePoints(
  leftContainer: VirtualNode,
  leftOffset: number,
  rightContainer: VirtualNode,
  rightOffset: number,
): number {
  if (leftContainer === rightContainer) {
    return leftOffset === rightOffset ? 0 : leftOffset < rightOffset ? -1 : 1
  }

  const leftContainsRight = typeof (leftContainer as any).contains === 'function' && (leftContainer as any).contains(rightContainer)
  if (leftContainsRight) {
    let child = rightContainer
    while (child.parentNode !== leftContainer && child.parentNode) {
      child = child.parentNode
    }
    return leftOffset <= getChildIndex(child) ? -1 : 1
  }

  const rightContainsLeft = typeof (rightContainer as any).contains === 'function' && (rightContainer as any).contains(leftContainer)
  if (rightContainsLeft) {
    let child = leftContainer
    while (child.parentNode !== rightContainer && child.parentNode) {
      child = child.parentNode
    }
    return getChildIndex(child) < rightOffset ? -1 : 1
  }

  const position = (leftContainer as any).compareDocumentPosition?.(rightContainer)
  if ((position & DOCUMENT_POSITION_FOLLOWING) === DOCUMENT_POSITION_FOLLOWING) {
    return -1
  }
  if ((position & DOCUMENT_POSITION_CONTAINED_BY) === DOCUMENT_POSITION_CONTAINED_BY) {
    return -1
  }
  return 1
}

function getCommonAncestor(startContainer: VirtualNode, endContainer: VirtualNode): VirtualNode {
  const ancestors = new Set<VirtualNode>()
  let current: VirtualNode | null = startContainer
  while (current) {
    ancestors.add(current)
    current = current.parentNode
  }

  current = endContainer
  while (current) {
    if (ancestors.has(current)) {
      return current
    }
    current = current.parentNode
  }

  return startContainer
}

function getNextTraversalCandidate(current: VirtualNode, root: VirtualNode, skipChildren: boolean): VirtualNode | null {
  if (!skipChildren && current.childNodes.length > 0) {
    return current.childNodes[0]
  }

  let node: VirtualNode | null = current
  while (node && node !== root) {
    const parent: VirtualNode | null = node.parentNode
    if (!parent) {
      return null
    }
    const siblings = parent.childNodes
    const index = siblings.indexOf(node)
    if (index >= 0 && index + 1 < siblings.length) {
      return siblings[index + 1]
    }
    node = parent
  }

  return null
}

export class TreeWalker {
  readonly root: VirtualNode
  readonly whatToShow: number
  readonly filter: NodeFilterInput
  currentNode: VirtualNode

  constructor(root: VirtualNode, whatToShow: number = SHOW_ALL, filter: NodeFilterInput = null) {
    this.root = root
    this.whatToShow = whatToShow
    this.filter = filter
    this.currentNode = root
  }

  parentNode(): VirtualNode | null {
    let current = this.currentNode.parentNode
    while (current && isWithinRoot(current, this.root)) {
      if (evaluateNode(current, this.whatToShow, this.filter) === FILTER_ACCEPT) {
        this.currentNode = current
        return current
      }
      current = current.parentNode
    }
    return null
  }

  firstChild(): VirtualNode | null {
    for (const child of this.currentNode.childNodes) {
      const match = findFirstVisible(child, this.whatToShow, this.filter)
      if (match) {
        this.currentNode = match
        return match
      }
    }
    return null
  }

  lastChild(): VirtualNode | null {
    for (let i = this.currentNode.childNodes.length - 1; i >= 0; i--) {
      const match = findLastVisible(this.currentNode.childNodes[i], this.whatToShow, this.filter)
      if (match) {
        this.currentNode = match
        return match
      }
    }
    return null
  }

  previousSibling(): VirtualNode | null {
    if (!this.currentNode.parentNode) {
      return null
    }
    const siblings = this.currentNode.parentNode.childNodes
    const index = siblings.indexOf(this.currentNode)
    for (let i = index - 1; i >= 0; i--) {
      const match = findLastVisible(siblings[i], this.whatToShow, this.filter)
      if (match) {
        this.currentNode = match
        return match
      }
    }
    return null
  }

  nextSibling(): VirtualNode | null {
    if (!this.currentNode.parentNode) {
      return null
    }
    const siblings = this.currentNode.parentNode.childNodes
    const index = siblings.indexOf(this.currentNode)
    for (let i = index + 1; i < siblings.length; i++) {
      const match = findFirstVisible(siblings[i], this.whatToShow, this.filter)
      if (match) {
        this.currentNode = match
        return match
      }
    }
    return null
  }

  previousNode(): VirtualNode | null {
    const allNodes = collectAllNodes(this.root)
    const visible = new Set(collectVisibleNodes(this.root, this.whatToShow, this.filter))
    const index = allNodes.indexOf(this.currentNode)
    for (let i = index - 1; i >= 0; i--) {
      if (visible.has(allNodes[i])) {
        this.currentNode = allNodes[i]
        return allNodes[i]
      }
    }
    return null
  }

  nextNode(): VirtualNode | null {
    let candidate = getNextTraversalCandidate(this.currentNode, this.root, false)
    while (candidate) {
      const result = evaluateNode(candidate, this.whatToShow, this.filter)
      if (result === FILTER_ACCEPT) {
        this.currentNode = candidate
        return candidate
      }
      candidate = getNextTraversalCandidate(candidate, this.root, result === FILTER_REJECT)
    }
    return null
  }
}

export class NodeIterator {
  readonly root: VirtualNode
  readonly whatToShow: number
  readonly filter: NodeFilterInput
  private _cursor = -1

  constructor(root: VirtualNode, whatToShow: number = SHOW_ALL, filter: NodeFilterInput = null) {
    this.root = root
    this.whatToShow = whatToShow
    this.filter = filter
  }

  get referenceNode(): VirtualNode {
    const visible = collectVisibleNodes(this.root, this.whatToShow, this.filter)
    return this._cursor >= 0 ? (visible[Math.min(this._cursor, visible.length - 1)] ?? this.root) : this.root
  }

  get pointerBeforeReferenceNode(): boolean {
    return this._cursor < 0
  }

  nextNode(): VirtualNode | null {
    const visible = collectVisibleNodes(this.root, this.whatToShow, this.filter)
    if (this._cursor + 1 >= visible.length) {
      return null
    }
    this._cursor++
    return visible[this._cursor] ?? null
  }

  previousNode(): VirtualNode | null {
    const visible = collectVisibleNodes(this.root, this.whatToShow, this.filter)
    if (this._cursor < 0 || this._cursor >= visible.length) {
      return null
    }
    const node = visible[this._cursor] ?? null
    this._cursor--
    return node
  }

  detach(): void {}
}

export class Range {
  static readonly START_TO_START = 0
  static readonly START_TO_END = 1
  static readonly END_TO_END = 2
  static readonly END_TO_START = 3

  readonly START_TO_START: number = Range.START_TO_START
  readonly START_TO_END: number = Range.START_TO_END
  readonly END_TO_END: number = Range.END_TO_END
  readonly END_TO_START: number = Range.END_TO_START

  startContainer: VirtualNode
  startOffset: number
  endContainer: VirtualNode
  endOffset: number
  private _document: any

  constructor(document: any) {
    this._document = document
    const root = document.body || document.documentElement || document
    this.startContainer = root
    this.startOffset = 0
    this.endContainer = root
    this.endOffset = 0
  }

  get collapsed(): boolean {
    return this.startContainer === this.endContainer && this.startOffset === this.endOffset
  }

  get commonAncestorContainer(): VirtualNode {
    return getCommonAncestor(this.startContainer, this.endContainer)
  }

  setStart(node: VirtualNode, offset: number): void {
    this.startContainer = node
    this.startOffset = offset
    if (comparePoints(this.startContainer, this.startOffset, this.endContainer, this.endOffset) > 0) {
      this.endContainer = node
      this.endOffset = offset
    }
  }

  setEnd(node: VirtualNode, offset: number): void {
    this.endContainer = node
    this.endOffset = offset
    if (comparePoints(this.startContainer, this.startOffset, this.endContainer, this.endOffset) > 0) {
      this.startContainer = node
      this.startOffset = offset
    }
  }

  setStartBefore(node: VirtualNode): void {
    if (!node.parentNode) {
      return
    }
    this.setStart(node.parentNode, getChildIndex(node))
  }

  setStartAfter(node: VirtualNode): void {
    if (!node.parentNode) {
      return
    }
    this.setStart(node.parentNode, getChildIndex(node) + 1)
  }

  setEndBefore(node: VirtualNode): void {
    if (!node.parentNode) {
      return
    }
    this.setEnd(node.parentNode, getChildIndex(node))
  }

  setEndAfter(node: VirtualNode): void {
    if (!node.parentNode) {
      return
    }
    this.setEnd(node.parentNode, getChildIndex(node) + 1)
  }

  selectNode(node: VirtualNode): void {
    if (!node.parentNode) {
      return
    }
    const index = getChildIndex(node)
    this.startContainer = node.parentNode
    this.startOffset = index
    this.endContainer = node.parentNode
    this.endOffset = index + 1
  }

  selectNodeContents(node: VirtualNode): void {
    this.startContainer = node
    this.startOffset = 0
    this.endContainer = node
    this.endOffset = getNodeLength(node)
  }

  collapse(toStart = false): void {
    if (toStart) {
      this.endContainer = this.startContainer
      this.endOffset = this.startOffset
    }
    else {
      this.startContainer = this.endContainer
      this.startOffset = this.endOffset
    }
  }

  cloneRange(): Range {
    const range = new Range(this._document)
    range.startContainer = this.startContainer
    range.startOffset = this.startOffset
    range.endContainer = this.endContainer
    range.endOffset = this.endOffset
    return range
  }

  compareBoundaryPoints(how: number, sourceRange: Range): number {
    if (how === Range.START_TO_START) {
      return comparePoints(this.startContainer, this.startOffset, sourceRange.startContainer, sourceRange.startOffset)
    }
    if (how === Range.START_TO_END) {
      return comparePoints(this.startContainer, this.startOffset, sourceRange.endContainer, sourceRange.endOffset)
    }
    if (how === Range.END_TO_END) {
      return comparePoints(this.endContainer, this.endOffset, sourceRange.endContainer, sourceRange.endOffset)
    }
    return comparePoints(this.endContainer, this.endOffset, sourceRange.startContainer, sourceRange.startOffset)
  }

  private _removeContents(): void {
    if (this.collapsed) {
      return
    }

    if (this.startContainer === this.endContainer) {
      if (this.startContainer.nodeType === TEXT_NODE || this.startContainer.nodeType === COMMENT_NODE) {
        const value = this.startContainer.nodeValue || ''
        this.startContainer.nodeValue = `${value.slice(0, this.startOffset)}${value.slice(this.endOffset)}`
        this.collapse(true)
        return
      }

      const nodes = this.startContainer.childNodes.slice(this.startOffset, this.endOffset)
      for (const node of nodes) {
        ;(this.startContainer as any).removeChild(node)
      }
      this.setEnd(this.startContainer, this.startOffset)
      return
    }

    this.collapse(true)
  }

  cloneContents(): any {
    const fragment = this._document.createDocumentFragment()
    if (this.collapsed) {
      return fragment
    }

    if (this.startContainer === this.endContainer) {
      if (this.startContainer.nodeType === TEXT_NODE || this.startContainer.nodeType === COMMENT_NODE) {
        const text = (this.startContainer.nodeValue || '').slice(this.startOffset, this.endOffset)
        if (text) {
          fragment.appendChild(this._document.createTextNode(text))
        }
        return fragment
      }

      for (const child of this.startContainer.childNodes.slice(this.startOffset, this.endOffset)) {
        fragment.appendChild((child as any).cloneNode(true))
      }
      return fragment
    }

    const text = this.toString()
    if (text) {
      fragment.appendChild(this._document.createTextNode(text))
    }
    return fragment
  }

  deleteContents(): void {
    this._removeContents()
  }

  extractContents(): any {
    const fragment = this.cloneContents()
    this._removeContents()
    return fragment
  }

  insertNode(node: VirtualNode): void {
    if (this.startContainer.nodeType === TEXT_NODE && this.startContainer.parentNode) {
      const value = this.startContainer.nodeValue || ''
      const before = value.slice(0, this.startOffset)
      const after = value.slice(this.startOffset)
      this.startContainer.nodeValue = before
      const trailing = this._document.createTextNode(after)
      const parent = this.startContainer.parentNode as any
      const parentChildren = this.startContainer.parentNode.childNodes
      const startIndex = parentChildren.indexOf(this.startContainer)
      const reference = parentChildren[startIndex + 1] ?? null
      parent.insertBefore(node, reference)
      parent.insertBefore(trailing, reference)
      this.setStart(parent, getChildIndex(node))
      this.setEnd(parent, getChildIndex(node) + 1)
      return
    }

    const parent = this.startContainer as any
    const reference = this.startContainer.childNodes[this.startOffset] ?? null
    parent.insertBefore(node, reference)
    this.setStart(parent, this.startOffset)
    this.setEnd(parent, this.startOffset + 1)
  }

  toString(): string {
    if (this.collapsed) {
      return ''
    }

    if (this.startContainer === this.endContainer) {
      if (this.startContainer.nodeType === TEXT_NODE || this.startContainer.nodeType === COMMENT_NODE) {
        return (this.startContainer.nodeValue || '').slice(this.startOffset, this.endOffset)
      }
      return this.startContainer.childNodes.slice(this.startOffset, this.endOffset).map(node => node.textContent).join('')
    }

    return this.cloneContents().textContent || ''
  }
}
