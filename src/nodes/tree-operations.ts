import { MutationObserver } from '../observers/MutationObserver'
import { COMMENT_NODE, DOCUMENT_FRAGMENT_NODE, DOCUMENT_NODE, TEXT_NODE, type VirtualNode } from './VirtualNode'

interface VirtualParentNode extends VirtualNode {
  childNodes: VirtualNode[]
  ownerDocument: any
}

function queueChildListMutation(
  target: VirtualParentNode,
  addedNodes: VirtualNode[],
  removedNodes: VirtualNode[],
  previousSibling: VirtualNode | null,
  nextSibling: VirtualNode | null,
): void {
  if (addedNodes.length === 0 && removedNodes.length === 0) {
    return
  }

  MutationObserver._queueMutationRecord({
    type: 'childList',
    target,
    addedNodes,
    removedNodes,
    previousSibling,
    nextSibling,
    attributeName: null,
    attributeNamespace: null,
    oldValue: null,
  })
}

function getOwnerDocumentForChild(parent: VirtualParentNode): any {
  return parent.nodeType === DOCUMENT_NODE ? parent : parent.ownerDocument
}

export function setOwnerDocumentRecursive(node: VirtualNode, ownerDocument: any): void {
  if (node.nodeType !== DOCUMENT_NODE) {
    ;(node as any).ownerDocument = ownerDocument
  }

  for (const child of node.childNodes) {
    setOwnerDocumentRecursive(child, ownerDocument)
  }
}

export function nodeContains(ancestor: VirtualNode, target: VirtualNode): boolean {
  let current: VirtualNode | null = target
  while (current) {
    if (current === ancestor) {
      return true
    }
    current = current.parentNode
  }
  return false
}

export function detachNode(node: VirtualNode): void {
  if (!node.parentNode) {
    return
  }

  const siblings = node.parentNode.childNodes
  const index = siblings.indexOf(node)
  if (index !== -1) {
    siblings.splice(index, 1)
  }
  node.parentNode = null
}

function normalizeInsertedNodes(parent: VirtualParentNode, node: VirtualNode): VirtualNode[] {
  if (node === parent || nodeContains(node, parent)) {
    throw new Error('The new child element contains the parent')
  }

  if (node.nodeType === DOCUMENT_FRAGMENT_NODE) {
    const fragmentChildren = [...node.childNodes]
    node.childNodes = []
    for (const child of fragmentChildren) {
      detachNode(child)
      child.parentNode = parent
      setOwnerDocumentRecursive(child, getOwnerDocumentForChild(parent))
    }
    return fragmentChildren
  }

  detachNode(node)
  node.parentNode = parent
  setOwnerDocumentRecursive(node, getOwnerDocumentForChild(parent))
  return [node]
}

export function appendNode(parent: VirtualParentNode, node: VirtualNode): VirtualNode {
  const normalized = normalizeInsertedNodes(parent, node)
  const previousSibling = parent.childNodes.length > 0 ? parent.childNodes[parent.childNodes.length - 1] : null
  parent.childNodes.push(...normalized)
  queueChildListMutation(parent, normalized, [], previousSibling, null)
  return node
}

export function insertNodeBefore(parent: VirtualParentNode, node: VirtualNode, referenceNode: VirtualNode | null): VirtualNode {
  if (referenceNode === null) {
    return appendNode(parent, node)
  }

  const index = parent.childNodes.indexOf(referenceNode)
  if (index === -1) {
    throw new Error('Reference node not found')
  }

  const normalized = normalizeInsertedNodes(parent, node)
  const previousSibling = index > 0 ? parent.childNodes[index - 1] : null
  parent.childNodes.splice(index, 0, ...normalized)
  queueChildListMutation(parent, normalized, [], previousSibling, referenceNode)
  return node
}

export function removeNode(parent: VirtualParentNode, child: VirtualNode): VirtualNode {
  const index = parent.childNodes.indexOf(child)
  if (index === -1) {
    throw new Error('Child node not found')
  }

  const previousSibling = index > 0 ? parent.childNodes[index - 1] : null
  const nextSibling = index < parent.childNodes.length - 1 ? parent.childNodes[index + 1] : null
  parent.childNodes.splice(index, 1)
  child.parentNode = null
  queueChildListMutation(parent, [], [child], previousSibling, nextSibling)
  return child
}

export function replaceNode(parent: VirtualParentNode, node: VirtualNode, oldNode: VirtualNode): VirtualNode {
  const index = parent.childNodes.indexOf(oldNode)
  if (index === -1) {
    throw new Error('Old node not found')
  }

  const normalized = normalizeInsertedNodes(parent, node)
  const previousSibling = index > 0 ? parent.childNodes[index - 1] : null
  const nextSibling = index < parent.childNodes.length - 1 ? parent.childNodes[index + 1] : null
  parent.childNodes.splice(index, 1, ...normalized)
  oldNode.parentNode = null
  queueChildListMutation(parent, normalized, [oldNode], previousSibling, nextSibling)
  return oldNode
}

export function cloneNodeShallow(node: VirtualNode): VirtualNode {
  const clone = (node as any).cloneNode?.(false)
  if (clone) {
    return clone
  }

  if (node.nodeType === TEXT_NODE || node.nodeType === COMMENT_NODE) {
    return { ...(node as any), parentNode: null, childNodes: [] }
  }

  return { ...(node as any), parentNode: null, childNodes: [] }
}

export function getNodeTextContent(node: VirtualNode): string {
  if (node.nodeType === TEXT_NODE) {
    return node.nodeValue || ''
  }

  if (node.nodeType === COMMENT_NODE) {
    return ''
  }

  let text = ''
  for (const child of node.childNodes) {
    text += getNodeTextContent(child)
  }
  return text
}
