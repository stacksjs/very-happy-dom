import { ELEMENT_NODE, type VirtualNode } from '../nodes/VirtualNode'

function getObservedAttributes(node: any): string[] {
  const ctor = node?.constructor as { observedAttributes?: string[] } | undefined
  if (!ctor || !Array.isArray(ctor.observedAttributes)) {
    return []
  }
  return ctor.observedAttributes.map(name => `${name}`.toLowerCase())
}

function visitElementSubtree(node: VirtualNode, visitor: (node: any) => void): void {
  if (node.nodeType === ELEMENT_NODE) {
    visitor(node)
  }

  for (const child of node.childNodes) {
    visitElementSubtree(child, visitor)
  }
}

export function invokeConnectedCallback(node: VirtualNode): void {
  visitElementSubtree(node, (element) => {
    if (typeof element.connectedCallback === 'function' && element.isConnected) {
      element.connectedCallback()
    }
  })
}

export function invokeDisconnectedCallback(node: VirtualNode): void {
  visitElementSubtree(node, (element) => {
    if (typeof element.disconnectedCallback === 'function') {
      element.disconnectedCallback()
    }
  })
}

export function invokeAdoptedCallback(node: VirtualNode, oldDocument: any, newDocument: any): void {
  if (!oldDocument || !newDocument || oldDocument === newDocument) {
    return
  }

  visitElementSubtree(node, (element) => {
    if (typeof element.adoptedCallback === 'function') {
      element.adoptedCallback()
    }
  })
}

export function invokeAttributeChangedCallback(
  node: any,
  name: string,
  oldValue: string | null,
  newValue: string | null,
): void {
  if (typeof node?.attributeChangedCallback !== 'function') {
    return
  }

  if (oldValue === newValue) {
    return
  }

  if (!getObservedAttributes(node).includes(name.toLowerCase())) {
    return
  }

  node.attributeChangedCallback(name, oldValue, newValue)
}
