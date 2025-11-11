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

export type MutationCallback = (mutations: MutationRecord[], observer: MutationObserver) => void

/**
 * MutationObserver implementation
 * Note: This is a simplified implementation for testing
 * It doesn't actually observe live changes, but provides the API
 */
export class MutationObserver {
  private _callback: MutationCallback
  private _records: MutationRecord[] = []
  private _observing = false

  constructor(callback: MutationCallback) {
    this._callback = callback
  }

  observe(_target: VirtualNode, _options: MutationObserverInit = {}): void {
    this._observing = true
    // In a full implementation, this would hook into DOM mutation events
    // For now, it's a no-op that provides the API
  }

  disconnect(): void {
    this._observing = false
    this._records = []
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
    if (!this._observing)
      return

    this._records.push(record)

    // Call callback asynchronously
    setTimeout(() => {
      if (this._records.length > 0) {
        const records = this.takeRecords()
        this._callback(records, this)
      }
    }, 0)
  }
}
