import { ELEMENT_NODE, type VirtualNode } from '../nodes/VirtualNode'

function getObservedAttributes(node: any): string[] {
  const ctor = node?.constructor as { observedAttributes?: string[] } | undefined
  if (!ctor || !Array.isArray(ctor.observedAttributes)) {
    return []
  }
  return ctor.observedAttributes.map(name => `${name}`.toLowerCase())
}

function getInternalShadowRoot(node: VirtualNode): VirtualNode | null {
  return (node as any)._getInternalShadowRoot?.() ?? null
}

function getTemplateContent(node: VirtualNode): VirtualNode | null {
  return (node as any).tagName === 'TEMPLATE' ? ((node as any).content ?? null) : null
}

function visitConnectedElementSubtree(node: VirtualNode, visitor: (node: any) => void): void {
  if (node.nodeType === ELEMENT_NODE) {
    visitor(node)
  }

  const shadowRoot = getInternalShadowRoot(node)
  if (shadowRoot) {
    visitConnectedElementSubtree(shadowRoot, visitor)
  }

  if (getTemplateContent(node)) {
    return
  }

  for (const child of node.childNodes) {
    visitConnectedElementSubtree(child, visitor)
  }
}

function visitOwnedElementSubtree(node: VirtualNode, visitor: (node: any) => void): void {
  if (node.nodeType === ELEMENT_NODE) {
    visitor(node)
  }

  const shadowRoot = getInternalShadowRoot(node)
  if (shadowRoot) {
    visitOwnedElementSubtree(shadowRoot, visitor)
  }

  const templateContent = getTemplateContent(node)
  if (templateContent) {
    visitOwnedElementSubtree(templateContent, visitor)
    return
  }

  for (const child of node.childNodes) {
    visitOwnedElementSubtree(child, visitor)
  }
}

export function invokeConnectedCallback(node: VirtualNode): void {
  visitConnectedElementSubtree(node, (element) => {
    if (typeof element.connectedCallback === 'function' && element.isConnected) {
      element.connectedCallback()
    }
  })
}

export function invokeDisconnectedCallback(node: VirtualNode): void {
  visitConnectedElementSubtree(node, (element) => {
    if (typeof element.disconnectedCallback === 'function') {
      element.disconnectedCallback()
    }
  })
}

export function invokeAdoptedCallback(node: VirtualNode, oldDocument: any, newDocument: any): void {
  if (!oldDocument || !newDocument || oldDocument === newDocument) {
    return
  }

  visitOwnedElementSubtree(node, (element) => {
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
