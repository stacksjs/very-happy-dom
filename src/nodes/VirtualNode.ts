export type NodeType = 1 | 3 | 8 | 9 | 11
import { VirtualEventTarget } from '../events/VirtualEventTarget'

export const ELEMENT_NODE = 1
export const TEXT_NODE = 3
export const COMMENT_NODE = 8
export const DOCUMENT_NODE = 9
export const DOCUMENT_FRAGMENT_NODE = 11
export const DOCUMENT_POSITION_DISCONNECTED = 0x01
export const DOCUMENT_POSITION_PRECEDING = 0x02
export const DOCUMENT_POSITION_FOLLOWING = 0x04
export const DOCUMENT_POSITION_CONTAINS = 0x08
export const DOCUMENT_POSITION_CONTAINED_BY = 0x10
export const DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 0x20

export type NodeKind = 'element' | 'text' | 'comment' | 'document' | 'document-fragment'

export interface VirtualNode {
  nodeType: NodeType
  nodeKind: NodeKind
  nodeName: string
  nodeValue: string | null
  attributes: Map<string, string>
  childNodes: VirtualNode[]
  readonly children: VirtualNode[]
  parentNode: VirtualNode | null
  ownerDocument: any
  readonly isConnected: boolean
  textContent: string
  getRootNode?: (options?: { composed?: boolean }) => VirtualNode
}

export interface EventListenerOptions {
  capture?: boolean
  once?: boolean
  passive?: boolean
  signal?: AbortSignal
}

export interface EventListener {
  listener: (event: any) => void
  options: EventListenerOptions
}

export interface Location {
  href: string
  protocol: string
  host: string
  hostname: string
  port: string
  pathname: string
  search: string
  hash: string
  origin: string
  assign: (url: string) => void
  replace: (url: string) => void
  reload: () => void
}

export interface HistoryState {
  state: any
  title: string
  url: string
}

export interface History {
  readonly length: number
  readonly state: any
  pushState: (state: any, title: string, url?: string) => void
  replaceState: (state: any, title: string, url?: string) => void
  back: () => void
  forward: () => void
  go: (delta: number) => void
}

export function isElementNode(node: VirtualNode | null | undefined): boolean {
  return node?.nodeType === ELEMENT_NODE
}

export function isTextNode(node: VirtualNode | null | undefined): boolean {
  return node?.nodeType === TEXT_NODE
}

export function isCommentNode(node: VirtualNode | null | undefined): boolean {
  return node?.nodeType === COMMENT_NODE
}

export function isDocumentNode(node: VirtualNode | null | undefined): boolean {
  return node?.nodeType === DOCUMENT_NODE
}

export function isDocumentFragmentNode(node: VirtualNode | null | undefined): boolean {
  return node?.nodeType === DOCUMENT_FRAGMENT_NODE
}

function createTextNodeForContext(context: VirtualNode, value: string): VirtualNode {
  const ownerDocument = context.nodeType === DOCUMENT_NODE ? context : context.ownerDocument
  const textNode = ownerDocument?.createTextNode?.(`${value}`)
  if (textNode) {
    return textNode
  }

  // eslint-disable-next-line ts/no-require-imports
  const { VirtualTextNode } = require('./VirtualTextNode')
  const fallback = new VirtualTextNode(`${value}`)
  fallback.ownerDocument = ownerDocument ?? null
  return fallback
}

function createFragmentForContext(context: VirtualNode): any {
  const ownerDocument = context.nodeType === DOCUMENT_NODE ? context : context.ownerDocument
  const fragment = ownerDocument?.createDocumentFragment?.()
  if (fragment) {
    return fragment
  }

  // eslint-disable-next-line ts/no-require-imports
  const { VirtualDocumentFragment } = require('./VirtualDocumentFragment')
  const fallback = new VirtualDocumentFragment()
  fallback.ownerDocument = ownerDocument ?? null
  return fallback
}

function normalizeNodeInputs(context: VirtualNode, nodes: Array<VirtualNode | string>): VirtualNode[] {
  return nodes.map(node => typeof node === 'string' ? createTextNodeForContext(context, node) : node)
}

function nodesAreEqual(left: VirtualNode | null | undefined, right: VirtualNode | null | undefined): boolean {
  if (left === right) {
    return true
  }
  if (!left || !right) {
    return false
  }
  if (left.nodeType !== right.nodeType || left.nodeName !== right.nodeName || left.nodeValue !== right.nodeValue) {
    return false
  }
  if (left.attributes.size !== right.attributes.size) {
    return false
  }
  for (const [name, value] of left.attributes) {
    if (right.attributes.get(name) !== value) {
      return false
    }
  }
  if (left.childNodes.length !== right.childNodes.length) {
    return false
  }
  for (let i = 0; i < left.childNodes.length; i++) {
    if (!nodesAreEqual(left.childNodes[i], right.childNodes[i])) {
      return false
    }
  }
  return true
}

export abstract class VirtualNodeBase extends VirtualEventTarget implements VirtualNode {
  abstract nodeType: NodeType
  abstract nodeKind: NodeKind
  abstract nodeName: string
  readonly ELEMENT_NODE: typeof ELEMENT_NODE = ELEMENT_NODE
  readonly TEXT_NODE: typeof TEXT_NODE = TEXT_NODE
  readonly COMMENT_NODE: typeof COMMENT_NODE = COMMENT_NODE
  readonly DOCUMENT_NODE: typeof DOCUMENT_NODE = DOCUMENT_NODE
  readonly DOCUMENT_FRAGMENT_NODE: typeof DOCUMENT_FRAGMENT_NODE = DOCUMENT_FRAGMENT_NODE
  readonly DOCUMENT_POSITION_DISCONNECTED: typeof DOCUMENT_POSITION_DISCONNECTED = DOCUMENT_POSITION_DISCONNECTED
  readonly DOCUMENT_POSITION_PRECEDING: typeof DOCUMENT_POSITION_PRECEDING = DOCUMENT_POSITION_PRECEDING
  readonly DOCUMENT_POSITION_FOLLOWING: typeof DOCUMENT_POSITION_FOLLOWING = DOCUMENT_POSITION_FOLLOWING
  readonly DOCUMENT_POSITION_CONTAINS: typeof DOCUMENT_POSITION_CONTAINS = DOCUMENT_POSITION_CONTAINS
  readonly DOCUMENT_POSITION_CONTAINED_BY: typeof DOCUMENT_POSITION_CONTAINED_BY = DOCUMENT_POSITION_CONTAINED_BY
  readonly DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: typeof DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC
  nodeValue: string | null = null
  attributes: Map<string, string> = new Map<string, string>()
  childNodes: VirtualNode[] = []
  parentNode: VirtualNode | null = null
  ownerDocument: any = null
  abstract get textContent(): string
  abstract set textContent(value: string)

  get children(): VirtualNode[] {
    const cn = this.childNodes
    const result: VirtualNode[] = []
    for (let i = 0; i < cn.length; i++) {
      if (cn[i].nodeType === ELEMENT_NODE) result.push(cn[i])
    }
    return result
  }

  get firstElementChild(): VirtualNode | null {
    return this.childNodes.find(child => child.nodeType === ELEMENT_NODE) ?? null
  }

  get lastElementChild(): VirtualNode | null {
    for (let i = this.childNodes.length - 1; i >= 0; i--) {
      if (this.childNodes[i].nodeType === ELEMENT_NODE) {
        return this.childNodes[i]
      }
    }
    return null
  }

  get childElementCount(): number {
    let count = 0
    for (const child of this.childNodes) {
      if (child.nodeType === ELEMENT_NODE) count++
    }
    return count
  }

  get firstChild(): VirtualNode | null {
    return this.childNodes[0] ?? null
  }

  get lastChild(): VirtualNode | null {
    return this.childNodes.length > 0 ? this.childNodes[this.childNodes.length - 1] : null
  }

  get previousSibling(): VirtualNode | null {
    if (!this.parentNode) return null
    const siblings = this.parentNode.childNodes
    for (let i = 0; i < siblings.length; i++) {
      if (siblings[i] === this) {
        return i > 0 ? siblings[i - 1] : null
      }
    }
    return null
  }

  get nextSibling(): VirtualNode | null {
    if (!this.parentNode) return null
    const siblings = this.parentNode.childNodes
    for (let i = 0; i < siblings.length; i++) {
      if (siblings[i] === this) {
        return i < siblings.length - 1 ? siblings[i + 1] : null
      }
    }
    return null
  }

  get parentElement(): VirtualNode | null {
    return isElementNode(this.parentNode) ? this.parentNode : null
  }

  get isConnected(): boolean {
    let current: VirtualNode | null = this
    while (current) {
      if (current.nodeType === DOCUMENT_NODE) {
        return true
      }
      current = current.parentNode
    }
    return false
  }

  hasChildNodes(): boolean {
    return this.childNodes.length > 0
  }

  get baseURI(): string {
    return this.ownerDocument?.baseURI || ''
  }

  append(...nodes: Array<VirtualNode | string>): void {
    const parent = this as any
    if (typeof parent.appendChild !== 'function') {
      throw new Error('This node type does not support append()')
    }

    const normalized = normalizeNodeInputs(this, nodes)
    if (normalized.length === 0) {
      return
    }
    if (normalized.length === 1) {
      parent.appendChild(normalized[0])
      return
    }

    const fragment = createFragmentForContext(this)
    for (const node of normalized) {
      fragment.appendChild(node)
    }
    parent.appendChild(fragment)
  }

  prepend(...nodes: Array<VirtualNode | string>): void {
    const parent = this as any
    if (typeof parent.insertBefore !== 'function') {
      throw new Error('This node type does not support prepend()')
    }

    const normalized = normalizeNodeInputs(this, nodes)
    if (normalized.length === 0) {
      return
    }
    if (normalized.length === 1) {
      parent.insertBefore(normalized[0], this.firstChild ?? null)
      return
    }

    const fragment = createFragmentForContext(this)
    for (const node of normalized) {
      fragment.appendChild(node)
    }
    parent.insertBefore(fragment, this.firstChild ?? null)
  }

  before(...nodes: Array<VirtualNode | string>): void {
    if (!this.parentNode) {
      return
    }

    const parent = this.parentNode as any
    const normalized = normalizeNodeInputs(this.parentNode, nodes)
    if (normalized.length === 0) {
      return
    }
    if (normalized.length === 1) {
      parent.insertBefore(normalized[0], this)
      return
    }

    const fragment = createFragmentForContext(this.parentNode)
    for (const node of normalized) {
      fragment.appendChild(node)
    }
    parent.insertBefore(fragment, this)
  }

  after(...nodes: Array<VirtualNode | string>): void {
    if (!this.parentNode) {
      return
    }

    const parent = this.parentNode as any
    const referenceNode = this.nextSibling
    const normalized = normalizeNodeInputs(this.parentNode, nodes)
    if (normalized.length === 0) {
      return
    }
    if (normalized.length === 1) {
      parent.insertBefore(normalized[0], referenceNode ?? null)
      return
    }

    const fragment = createFragmentForContext(this.parentNode)
    for (const node of normalized) {
      fragment.appendChild(node)
    }
    parent.insertBefore(fragment, referenceNode ?? null)
  }

  replaceWith(...nodes: Array<VirtualNode | string>): void {
    if (!this.parentNode) {
      return
    }

    const parent = this.parentNode as any
    const normalized = normalizeNodeInputs(this.parentNode, nodes)
    if (normalized.length === 0) {
      parent.removeChild(this)
      return
    }
    if (normalized.length === 1) {
      parent.replaceChild(normalized[0], this)
      return
    }

    const fragment = createFragmentForContext(this.parentNode)
    for (const node of normalized) {
      fragment.appendChild(node)
    }
    parent.replaceChild(fragment, this)
  }

  remove(): void {
    if (this.parentNode) {
      // eslint-disable-next-line max-statements-per-line
      ;(this.parentNode as any).removeChild(this)
    }
  }

  replaceChildren(...nodes: Array<VirtualNode | string>): void {
    const parent = this as any
    if (typeof parent.removeChild !== 'function' || typeof parent.appendChild !== 'function') {
      throw new Error('This node type does not support replaceChildren()')
    }

    while (this.childNodes.length > 0) {
      parent.removeChild(this.childNodes[this.childNodes.length - 1])
    }
    for (const node of nodes) {
      if (typeof node === 'string') {
        parent.appendChild(createTextNodeForContext(this, node))
      }
      else {
        parent.appendChild(node)
      }
    }
  }

  isSameNode(other: VirtualNode | null): boolean {
    return this === other
  }

  isEqualNode(other: VirtualNode | null): boolean {
    return nodesAreEqual(this, other)
  }

  getRootNode(options: { composed?: boolean } = {}): VirtualNode {
    let current: VirtualNode = this
    let root: VirtualNode = this

    while (current.parentNode) {
      const parent = current.parentNode
      root = parent
      if (parent.nodeType === DOCUMENT_FRAGMENT_NODE && (parent as any).host && options.composed !== true) {
        return parent
      }
      current = parent
    }

    return root
  }

  contains(other: VirtualNode | null): boolean {
    if (!other) {
      return false
    }
    let current: VirtualNode | null = other
    while (current) {
      if (current === this) {
        return true
      }
      current = current.parentNode
    }
    return false
  }

  normalize(): void {
    let index = 0
    while (index < this.childNodes.length) {
      const child = this.childNodes[index]
      if (child.nodeType === TEXT_NODE) {
        let text = child.nodeValue || ''
        const nextIndex = index + 1
        while (nextIndex < this.childNodes.length && this.childNodes[nextIndex].nodeType === TEXT_NODE) {
          text += this.childNodes[nextIndex].nodeValue || ''
          this.childNodes.splice(nextIndex, 1)
        }
        if (text === '') {
          this.childNodes.splice(index, 1)
          child.parentNode = null
          continue
        }
        child.nodeValue = text
      }
      else if (typeof (child as VirtualNodeBase).normalize === 'function') {
        // eslint-disable-next-line max-statements-per-line
        ;(child as VirtualNodeBase).normalize()
      }
      index++
    }
  }

  compareDocumentPosition(other: VirtualNode): number {
    if (other === this) {
      return 0
    }

    const thisRoot = this._virtualRootNode(this)
    const otherRoot = this._virtualRootNode(other)
    if (thisRoot !== otherRoot) {
      return DOCUMENT_POSITION_DISCONNECTED | DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC
    }

    if (this !== other && this.contains(other)) {
      return DOCUMENT_POSITION_CONTAINS | DOCUMENT_POSITION_PRECEDING
    }

    if (other !== this && this._virtualNodeContains(other, this)) {
      return DOCUMENT_POSITION_CONTAINED_BY | DOCUMENT_POSITION_FOLLOWING
    }

    const order = this._virtualDocumentOrder(thisRoot)
    return order.indexOf(this) < order.indexOf(other)
      ? DOCUMENT_POSITION_FOLLOWING
      : DOCUMENT_POSITION_PRECEDING
  }

  protected _getEventParent(): VirtualEventTarget | null {
    if (this.parentNode) {
      return this.parentNode as unknown as VirtualEventTarget
    }
    if (this.nodeType === DOCUMENT_NODE) {
      return ((this as any).defaultView ?? null) as VirtualEventTarget | null
    }
    return null
  }

  private _virtualRootNode(node: VirtualNode): VirtualNode {
    let root = node
    while (root.parentNode) {
      root = root.parentNode
    }
    return root
  }

  private _virtualNodeContains(parent: VirtualNode, target: VirtualNode): boolean {
    return parent !== target && typeof (parent as VirtualNodeBase).contains === 'function'
      ? (parent as VirtualNodeBase).contains(target)
      : false
  }

  private _virtualDocumentOrder(root: VirtualNode): VirtualNode[] {
    const ordered: VirtualNode[] = []
    const visit = (node: VirtualNode): void => {
      ordered.push(node)
      for (const child of node.childNodes) {
        visit(child)
      }
    }
    visit(root)
    return ordered
  }
}
