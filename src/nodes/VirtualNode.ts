export type NodeType = 'element' | 'text' | 'comment' | 'document'

export interface VirtualNode {
  nodeType: NodeType
  nodeName: string
  nodeValue: string | null
  attributes: Map<string, string>
  children: VirtualNode[]
  parentNode: VirtualNode | null
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
