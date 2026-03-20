import { nodeContains } from '../nodes/tree-operations'
import type { VirtualNode } from '../nodes/VirtualNode'

export interface MutationObserverInit {
  childList?: boolean
  attributes?: boolean
  characterData?: boolean
  subtree?: boolean
  attributeOldValue?: boolean
  characterDataOldValue?: boolean
  attributeFilter?: string[]
}

export interface MutationRecord {
  type: 'childList' | 'attributes' | 'characterData'
  target: VirtualNode
  addedNodes: VirtualNode[]
  removedNodes: VirtualNode[]
  previousSibling: VirtualNode | null
  nextSibling: VirtualNode | null
  attributeName: string | null
  attributeNamespace: string | null
  oldValue: string | null
}

// eslint-disable-next-line pickier/no-unused-vars
export type MutationCallback = (mutations: MutationRecord[], observer: MutationObserver) => void

function isObservedWithinScope(target: VirtualNode, observedTarget: VirtualNode, subtree: boolean, transientRoots: Set<VirtualNode>): boolean {
  if (target === observedTarget) {
    return true
  }

  if (!subtree) {
    return false
  }

  let current: VirtualNode | null = target.parentNode
  while (current) {
    if (current === observedTarget) {
      return true
    }
    current = current.parentNode
  }

  for (const transientRoot of transientRoots) {
    if (target === transientRoot || nodeContains(transientRoot, target)) {
      return true
    }
  }

  return false
}

function shouldReceiveRecord(record: MutationRecord, options: MutationObserverInit): boolean {
  if (record.type === 'childList') {
    return options.childList === true
  }
  if (record.type === 'attributes') {
    if (options.attributes !== true) {
      return false
    }
    if (options.attributeFilter && record.attributeName) {
      return options.attributeFilter.map(name => name.toLowerCase()).includes(record.attributeName.toLowerCase())
    }
    return true
  }
  if (record.type === 'characterData') {
    return options.characterData === true
  }
  return false
}

function normalizeObserveOptions(options: MutationObserverInit): MutationObserverInit {
  const normalized: MutationObserverInit = { ...options }

  if (normalized.attributeOldValue === true || normalized.attributeFilter) {
    if (normalized.attributes === false) {
      throw new TypeError('Failed to execute observe: attributeOldValue/attributeFilter requires attributes to be true')
    }
    normalized.attributes = true
  }

  if (normalized.characterDataOldValue === true) {
    if (normalized.characterData === false) {
      throw new TypeError('Failed to execute observe: characterDataOldValue requires characterData to be true')
    }
    normalized.characterData = true
  }

  if (normalized.childList !== true && normalized.attributes !== true && normalized.characterData !== true) {
    throw new TypeError('Failed to execute observe: at least one of childList, attributes, or characterData must be true')
  }

  return normalized
}

/**
 * MutationObserver implementation
 */
export class MutationObserver {
  private static _observers = new Set<MutationObserver>()
  private _callback: MutationCallback
  private _records: MutationRecord[] = []
  private _observations = new Map<VirtualNode, MutationObserverInit>()
  private _scheduled = false
  private _transientRoots = new Set<VirtualNode>()

  constructor(callback: MutationCallback) {
    this._callback = callback
  }

  observe(target: VirtualNode, options: MutationObserverInit = {}): void {
    const normalized = normalizeObserveOptions(options)
    const existing = this._observations.get(target)
    if (existing) {
      // Per DOM spec, merge options: later observe() calls extend existing filters
      const merged: MutationObserverInit = { ...existing, ...normalized }
      // Merge attributeFilter arrays
      if (existing.attributeFilter && normalized.attributeFilter) {
        const combined = new Set([...existing.attributeFilter, ...normalized.attributeFilter])
        merged.attributeFilter = Array.from(combined)
      }
      this._observations.set(target, merged)
    }
    else {
      this._observations.set(target, normalized)
    }
    MutationObserver._observers.add(this)
  }

  disconnect(): void {
    this._observations.clear()
    MutationObserver._observers.delete(this)
    this._records = []
    this._scheduled = false
    this._transientRoots.clear()
  }

  takeRecords(): MutationRecord[] {
    const records = this._records
    this._records = []
    return records
  }

  /**
   * Internal method to add a mutation record
   * @internal
   */
  _addRecord(record: MutationRecord): void {
    this._records.push(record)
    if (this._scheduled)
      return

    this._scheduled = true
    queueMicrotask(() => {
      this._scheduled = false
      if (this._records.length > 0) {
        const records = this.takeRecords()
        this._callback(records, this)
      }
      this._transientRoots.clear()
    })
  }

  static _queueMutationRecord(record: MutationRecord): void {
    if (MutationObserver._observers.size === 0) return
    for (const observer of MutationObserver._observers) {
      for (const [observedTarget, options] of observer._observations) {
        const withinScope = isObservedWithinScope(record.target, observedTarget, options.subtree === true, observer._transientRoots)
        if (!withinScope) {
          continue
        }

        if (record.type === 'childList' && record.removedNodes.length > 0 && options.subtree === true) {
          for (const removedNode of record.removedNodes) {
            observer._transientRoots.add(removedNode)
          }
        }

        if (!shouldReceiveRecord(record, options)) {
          continue
        }

        observer._addRecord({
          ...record,
          oldValue: record.type === 'attributes'
            ? (options.attributeOldValue ? record.oldValue : null)
            : record.type === 'characterData'
              ? (options.characterDataOldValue ? record.oldValue : null)
              : null,
        })
      }
    }
  }
}
