/**
 * PerformanceObserver
 * Minimal stub that accepts `observe`/`disconnect`/`takeRecords` and honors
 * `supportedEntryTypes`. The existing Performance implementation does not
 * emit entries via push, so the observer fires no callbacks in practice
 * but passes feature detection.
 */

export interface PerformanceObserverInit {
  entryTypes?: string[]
  type?: string
  buffered?: boolean
}

export interface PerformanceObserverEntryList {
  // eslint-disable-next-line pickier/no-unused-vars
  getEntries: () => PerformanceEntry[]
  // eslint-disable-next-line pickier/no-unused-vars
  getEntriesByType: (type: string) => PerformanceEntry[]
  // eslint-disable-next-line pickier/no-unused-vars
  getEntriesByName: (name: string, type?: string) => PerformanceEntry[]
}

// eslint-disable-next-line pickier/no-unused-vars
export type PerformanceObserverCallback = (list: PerformanceObserverEntryList, observer: PerformanceObserver) => void

const SUPPORTED: readonly string[] = Object.freeze([
  'mark', 'measure', 'resource', 'navigation',
  'paint', 'longtask', 'element', 'event',
])

export class PerformanceObserver {
  static readonly supportedEntryTypes: readonly string[] = SUPPORTED

  private _callback: PerformanceObserverCallback
  private _types: Set<string> = new Set()
  private _records: PerformanceEntry[] = []

  constructor(callback: PerformanceObserverCallback) {
    this._callback = callback
  }

  observe(options: PerformanceObserverInit = {}): void {
    if (options.entryTypes)
      for (const t of options.entryTypes) this._types.add(t)
    else if (options.type)
      this._types.add(options.type)
  }

  disconnect(): void {
    this._types.clear()
    this._records = []
  }

  takeRecords(): PerformanceEntry[] {
    const out = this._records
    this._records = []
    return out
  }

  /** @internal — used by Performance to push entries to observers */
  _push(entry: PerformanceEntry): void {
    if (!this._types.has(entry.entryType))
      return
    this._records.push(entry)
    const list: PerformanceObserverEntryList = {
      getEntries: () => this._records.slice(),
      getEntriesByType: (type: string) => this._records.filter(e => e.entryType === type),
      getEntriesByName: (name: string, type?: string) => this._records.filter(
        e => e.name === name && (!type || e.entryType === type),
      ),
    }
    try { this._callback(list, this) }
    catch {}
  }
}
