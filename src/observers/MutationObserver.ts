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

function isObservedWithinScope(target: VirtualNode, observedTarget: VirtualNode, subtree: boolean): boolean {
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

/**
 * MutationObserver implementation
 */
export class MutationObserver {
  private static _observers = new Set<MutationObserver>()
  private _callback: MutationCallback
  private _records: MutationRecord[] = []
  private _observations = new Map<VirtualNode, MutationObserverInit>()
  private _scheduled = false

  constructor(callback: MutationCallback) {
    this._callback = callback
  }

  observe(target: VirtualNode, options: MutationObserverInit = {}): void {
    this._observations.set(target, { ...options })
    MutationObserver._observers.add(this)
  }

  disconnect(): void {
    this._observations.clear()
    MutationObserver._observers.delete(this)
    this._records = []
    this._scheduled = false
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
    })
  }

  static _queueMutationRecord(record: MutationRecord): void {
    for (const observer of MutationObserver._observers) {
      for (const [observedTarget, options] of observer._observations) {
        if (!isObservedWithinScope(record.target, observedTarget, options.subtree === true)) {
          continue
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
