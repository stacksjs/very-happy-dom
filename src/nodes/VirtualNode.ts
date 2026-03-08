export type NodeType = 1 | 3 | 8 | 9 | 11
import { VirtualEventTarget } from '../events/VirtualEventTarget'

export const ELEMENT_NODE = 1
export const TEXT_NODE = 3
export const COMMENT_NODE = 8
export const DOCUMENT_NODE = 9
export const DOCUMENT_FRAGMENT_NODE = 11

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
}

export interface EventListenerOptions {
  capture?: boolean
  once?: boolean
  passive?: boolean
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

export abstract class VirtualNodeBase extends VirtualEventTarget implements VirtualNode {
  abstract nodeType: NodeType
  abstract nodeKind: NodeKind
  abstract nodeName: string
  nodeValue: string | null = null
  attributes: Map<string, string> = new Map<string, string>()
  childNodes: VirtualNode[] = []
  parentNode: VirtualNode | null = null
  ownerDocument: any = null
  abstract get textContent(): string
  abstract set textContent(value: string)

  get children(): VirtualNode[] {
    return this.childNodes.filter(child => child.nodeType === ELEMENT_NODE)
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

  protected _getEventParent(): VirtualEventTarget | null {
    if (this.parentNode) {
      return this.parentNode as unknown as VirtualEventTarget
    }
    if (this.nodeType === DOCUMENT_NODE) {
      return ((this as any).defaultView ?? null) as VirtualEventTarget | null
    }
    return null
  }
}
