import { VirtualEvent } from '../events/VirtualEvent'
import { ELEMENT_NODE, TEXT_NODE, type VirtualNode } from '../nodes/VirtualNode'

const assignedNodesBySlot = new WeakMap<object, VirtualNode[]>()
const pendingSlots = new WeakSet<object>()

function isShadowRoot(node: any): boolean {
  return node?.nodeType === 11 && node?.nodeName === '#shadow-root' && Boolean(node.host)
}

function findShadowRoot(node: any): any | null {
  let current = node
  while (current) {
    if (isShadowRoot(current)) {
      return current
    }
    current = current.parentNode
  }
  return null
}

function slotsForHost(host: any): any[] {
  const shadowRoot = host?._getInternalShadowRoot?.()
  return shadowRoot?.querySelectorAll?.('slot') ?? []
}

function sameNodes(left: VirtualNode[], right: VirtualNode[]): boolean {
  return left.length === right.length && left.every((node, index) => node === right[index])
}

function scheduleSlotChange(slot: any): void {
  if (pendingSlots.has(slot)) {
    return
  }

  pendingSlots.add(slot)
  queueMicrotask(() => {
    pendingSlots.delete(slot)
    const previous = assignedNodesBySlot.get(slot) ?? []
    const current = getAssignedNodes(slot)
    assignedNodesBySlot.set(slot, current)
    if (!sameNodes(previous, current)) {
      slot.dispatchEvent(new VirtualEvent('slotchange'))
    }
  })
}

export function getAssignedNodes(slot: any, options: { flatten?: boolean } = {}): VirtualNode[] {
  const shadowRoot = findShadowRoot(slot)
  if (!shadowRoot) {
    return []
  }

  const slotName = slot.getAttribute?.('name') ?? ''
  const matchingSlot = slotsForHost(shadowRoot.host)
    .find(candidate => (candidate.getAttribute?.('name') ?? '') === slotName)
  if (matchingSlot !== slot) {
    return []
  }

  const assigned = (shadowRoot.host?.childNodes ?? []).filter((node: any) => {
    if (node.nodeType !== ELEMENT_NODE && node.nodeType !== TEXT_NODE) {
      return false
    }
    const assignedName = node.nodeType === ELEMENT_NODE ? (node.getAttribute?.('slot') ?? '') : ''
    return assignedName === slotName
  }) as VirtualNode[]

  if (!options.flatten) {
    return assigned
  }

  const flattened = assigned.length > 0 ? assigned : (slot.childNodes ?? [])
  return flattened.flatMap((node: any) => {
    if (node?.tagName === 'SLOT' && typeof node.assignedNodes === 'function') {
      return node.assignedNodes({ flatten: true })
    }
    return [node]
  })
}

export function getAssignedElements(slot: any, options: { flatten?: boolean } = {}): any[] {
  return getAssignedNodes(slot, options).filter(node => node.nodeType === ELEMENT_NODE)
}

export function notifySlotAssignmentChange(node: any): void {
  const directHost = node?._getInternalShadowRoot?.() ? node : null
  const shadowRoot = isShadowRoot(node) ? node : findShadowRoot(node)
  const parentHost = node?.parentNode?._getInternalShadowRoot?.() ? node.parentNode : null
  const host = directHost ?? shadowRoot?.host ?? parentHost

  if (!host) {
    return
  }

  for (const slot of slotsForHost(host)) {
    scheduleSlotChange(slot)
  }
}
