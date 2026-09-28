/**
 * IndexedDB (in-memory stub)
 * Sufficient surface for feature detection and basic library initialization.
 * Data persistence within a single Window instance is supported; cross-window
 * isolation is intentional.
 */

import { VirtualEventTarget } from '../events/VirtualEventTarget'
import { VirtualEvent } from '../events/VirtualEvent'

type IDBKey = string | number | Date | ArrayBuffer | Uint8Array | IDBKey[]

/**
 * `objectStoreNames` is a `DOMStringList` in the spec, not an array. Upgrade
 * handlers routinely guard with `.contains(name)`; on a plain Array that is
 * `undefined`, and calling it threw a TypeError that `open()` used to swallow,
 * leaving a database with no object stores at all.
 */
export class DOMStringList extends Array<string> {
  contains(value: string): boolean {
    return this.includes(value)
  }

  item(index: number): string | null {
    return this[index] ?? null
  }
}

export class IDBRequest extends VirtualEventTarget {
  result: unknown = undefined
  error: DOMException | null = null
  source: unknown = null
  transaction: IDBTransaction | null = null
  readyState: 'pending' | 'done' = 'pending'
  // eslint-disable-next-line pickier/no-unused-vars
  onsuccess: ((event: Event) => void) | null = null
  // eslint-disable-next-line pickier/no-unused-vars
  onerror: ((event: Event) => void) | null = null

  /** @internal */
  _resolve(result: unknown): void {
    this.result = result
    this.readyState = 'done'
    queueMicrotask(() => {
      const event = new VirtualEvent('success') as unknown as Event
      try { this.onsuccess?.(event) }
      catch {}
      this.dispatchEvent(event)
      // After the handlers, so a handler that aborts is seen before the
      // transaction considers itself complete.
      this._notifyTransaction()
    })
  }

  /** @internal */
  _reject(error: DOMException): void {
    this.error = error
    this.readyState = 'done'
    queueMicrotask(() => {
      const event = new VirtualEvent('error') as unknown as Event
      try { this.onerror?.(event) }
      catch {}
      this.dispatchEvent(event)
      this._notifyTransaction()
    })
  }

  /** Tell the owning transaction this request is no longer in flight. */
  private _notifyTransaction(): void {
    const owner = this.transaction as unknown as { _settled?: () => void } | null
    owner?._settled?.()
  }
}

export class IDBOpenDBRequest extends IDBRequest {
  // eslint-disable-next-line pickier/no-unused-vars
  onupgradeneeded: ((event: Event) => void) | null = null
  // eslint-disable-next-line pickier/no-unused-vars
  onblocked: ((event: Event) => void) | null = null
}

export class IDBObjectStore {
  readonly name: string
  readonly keyPath: string | string[] | null
  readonly autoIncrement: boolean
  readonly indexNames: string[] = []
  /** The transaction this store was reached through, as the spec exposes. */
  transaction: IDBTransaction | null = null
  private _data: Map<string, unknown> = new Map()
  private _autoKey = 1

  constructor(name: string, options: IDBObjectStoreParameters = {}) {
    this.name = name
    this.keyPath = options.keyPath ?? null
    this.autoIncrement = options.autoIncrement === true
  }

  add(value: unknown, key?: IDBKey): IDBRequest {
    return this._put(value, key, true)
  }

  put(value: unknown, key?: IDBKey): IDBRequest {
    return this._put(value, key, false)
  }

  get(key: IDBKey): IDBRequest {
    const req = this._request()
    req._resolve(this._data.get(String(key)))
    return req
  }

  getAll(): IDBRequest {
    const req = this._request()
    req._resolve(Array.from(this._data.values()))
    return req
  }

  delete(key: IDBKey): IDBRequest {
    const req = this._request()
    this._beforeWrite()
    this._data.delete(String(key))
    req._resolve(undefined)
    return req
  }

  clear(): IDBRequest {
    const req = this._request()
    this._beforeWrite()
    this._data.clear()
    req._resolve(undefined)
    return req
  }

  count(): IDBRequest {
    const req = this._request()
    req._resolve(this._data.size)
    return req
  }

  createIndex(): never {
    throw new Error('IDBObjectStore.createIndex not supported in the stub')
  }

  private _put(value: unknown, key: IDBKey | undefined, failIfExists: boolean): IDBRequest {
    const req = this._request()
    let resolvedKey: string
    if (key !== undefined) {
      resolvedKey = String(key)
    }
    else if (this.keyPath && typeof value === 'object' && value !== null) {
      const path = Array.isArray(this.keyPath) ? this.keyPath[0] : this.keyPath
      resolvedKey = String((value as Record<string, unknown>)[path])
    }
    else if (this.autoIncrement) {
      resolvedKey = String(this._autoKey++)
    }
    else {
      req._reject(new DOMException('No key specified', 'DataError'))
      return req
    }

    if (failIfExists && this._data.has(resolvedKey)) {
      req._reject(new DOMException('Key already exists', 'ConstraintError'))
      return req
    }

    this._beforeWrite()
    this._data.set(resolvedKey, value)
    req._resolve(resolvedKey)
    return req
  }

  /** A request bound to this store's transaction, so completion waits for it. */
  private _request(): IDBRequest {
    const req = new IDBRequest()
    req.source = this
    req.transaction = this.transaction
    this.transaction?._pending(1)
    return req
  }

  /** Let the transaction capture an undo point before the first write. */
  private _beforeWrite(): void {
    this.transaction?._noteWrite(this)
  }

  /** @internal Snapshot for rollback. */
  _snapshot(): { data: Map<string, unknown>, autoKey: number } {
    return { data: new Map(this._data), autoKey: this._autoKey }
  }

  /** @internal Restore a snapshot taken before this transaction's writes. */
  _restore(snapshot: { data: Map<string, unknown>, autoKey: number }): void {
    this._data = new Map(snapshot.data)
    this._autoKey = snapshot.autoKey
  }
}

export interface IDBObjectStoreParameters {
  keyPath?: string | string[] | null
  autoIncrement?: boolean
}

export class IDBTransaction extends VirtualEventTarget {
  readonly mode: IDBTransactionMode
  readonly objectStoreNames: DOMStringList
  readonly db: IDBDatabase
  readonly error: DOMException | null = null
  // eslint-disable-next-line pickier/no-unused-vars
  oncomplete: ((event: Event) => void) | null = null
  // eslint-disable-next-line pickier/no-unused-vars
  onabort: ((event: Event) => void) | null = null
  // eslint-disable-next-line pickier/no-unused-vars
  onerror: ((event: Event) => void) | null = null

  /**
   * Undo points, captured before this transaction's first write to each store.
   * A snapshot of an in-memory Map is cheap and cannot drift out of step with
   * the operations the way a replayed per-operation undo log can.
   */
  private _snapshots = new Map<IDBObjectStore, { data: Map<string, unknown>, autoKey: number }>()
  private _outstanding = 0
  private _settledOnce = false
  private _done = false
  private _didAbort = false

  constructor(db: IDBDatabase, storeNames: string[], mode: IDBTransactionMode) {
    super()
    this.db = db
    this.objectStoreNames = new DOMStringList(...storeNames)
    this.mode = mode
    // `complete` used to fire from here unconditionally, which put it ahead of
    // every request's `success` and fired even for an aborted transaction.
    queueMicrotask(() => {
      this._settledOnce = true
      this._maybeComplete()
    })
  }

  objectStore(name: string): IDBObjectStore {
    const store = this.db._getStore(name)
    if (!store)
      throw new DOMException(`No object store named "${name}"`, 'NotFoundError')
    // The store is shared by the database; reaching it through a transaction is
    // what ties its writes to this one.
    store.transaction = this
    return store
  }

  /**
   * Discard every write this transaction made, then fire `abort`.
   *
   * Previously this fired the event and left the data in place, so a rolled
   * back write stayed readable — the opposite of what a browser does.
   */
  abort(): void {
    if (this._done)
      return
    this._done = true
    this._didAbort = true

    for (const [store, snapshot] of this._snapshots)
      store._restore(snapshot)
    this._snapshots.clear()

    const event = new VirtualEvent('abort') as unknown as Event
    try { this.onabort?.(event) }
    catch {}
    this.dispatchEvent(event)
  }

  /** @internal Capture an undo point the first time a store is written. */
  _noteWrite(store: IDBObjectStore): void {
    if (this.mode === 'readonly' || this._done || this._snapshots.has(store))
      return
    this._snapshots.set(store, store._snapshot())
  }

  /** @internal Count a request in flight. */
  _pending(delta: number): void {
    this._outstanding += delta
  }

  /** @internal A request finished; completion may now be due. */
  _settled(): void {
    this._outstanding--
    queueMicrotask(() => this._maybeComplete())
  }

  private _maybeComplete(): void {
    // Wait for the first drain and for every request to have settled, so
    // `success` always precedes `complete`.
    if (this._done || !this._settledOnce || this._outstanding > 0)
      return
    this._done = true
    this._snapshots.clear()

    const event = new VirtualEvent('complete') as unknown as Event
    try { this.oncomplete?.(event) }
    catch {}
    this.dispatchEvent(event)
  }

  /** Whether this transaction was rolled back. */
  get aborted(): boolean {
    return this._didAbort
  }
}

export type IDBTransactionMode = 'readonly' | 'readwrite' | 'versionchange'

export class IDBDatabase extends VirtualEventTarget {
  readonly name: string
  readonly version: number
  readonly objectStoreNames: DOMStringList = new DOMStringList()
  private _stores: Map<string, IDBObjectStore> = new Map()

  // eslint-disable-next-line pickier/no-unused-vars
  onabort: ((event: Event) => void) | null = null
  // eslint-disable-next-line pickier/no-unused-vars
  onclose: ((event: Event) => void) | null = null
  // eslint-disable-next-line pickier/no-unused-vars
  onerror: ((event: Event) => void) | null = null
  // eslint-disable-next-line pickier/no-unused-vars
  onversionchange: ((event: Event) => void) | null = null

  constructor(name: string, version: number) {
    super()
    this.name = name
    this.version = version
  }

  createObjectStore(name: string, options?: IDBObjectStoreParameters): IDBObjectStore {
    const store = new IDBObjectStore(name, options)
    this._stores.set(name, store)
    this.objectStoreNames.push(name)
    return store
  }

  deleteObjectStore(name: string): void {
    this._stores.delete(name)
    const idx = this.objectStoreNames.indexOf(name)
    if (idx >= 0)
      this.objectStoreNames.splice(idx, 1)
  }

  transaction(storeNames: string | string[], mode: IDBTransactionMode = 'readonly'): IDBTransaction {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames]
    return new IDBTransaction(this, names, mode)
  }

  close(): void {}

  /** @internal */
  _getStore(name: string): IDBObjectStore | undefined {
    return this._stores.get(name)
  }
}

export class IDBFactory {
  private _dbs: Map<string, IDBDatabase> = new Map()

  open(name: string, version: number = 1): IDBOpenDBRequest {
    const req = new IDBOpenDBRequest()
    const existing = this._dbs.get(name)
    const needsUpgrade = !existing || existing.version < version
    const db = existing ?? new IDBDatabase(name, version)
    this._dbs.set(name, db)

    if (needsUpgrade) {
      queueMicrotask(() => {
        const event = new VirtualEvent('upgradeneeded') as unknown as Event & { oldVersion: number, newVersion: number }
        const patched = event as unknown as { oldVersion: number, newVersion: number }
        patched.oldVersion = existing?.version ?? 0
        patched.newVersion = version
        req.result = db
        // A throwing upgrade handler used to be swallowed here, so `open()`
        // resolved with a database that had none of the stores it declared.
        try {
          req.onupgradeneeded?.(event)
          req.dispatchEvent(event)
        }
        catch (error) {
          req._reject(error instanceof DOMException
            ? error
            : new DOMException(String((error as Error)?.message ?? error), 'AbortError'))
          return
        }
        req._resolve(db)
      })
    }
    else {
      req._resolve(db)
    }
    return req
  }

  deleteDatabase(name: string): IDBOpenDBRequest {
    const req = new IDBOpenDBRequest()
    this._dbs.delete(name)
    req._resolve(undefined)
    return req
  }

  databases(): Promise<Array<{ name: string, version: number }>> {
    return Promise.resolve(Array.from(this._dbs.values()).map(db => ({ name: db.name, version: db.version })))
  }

  cmp(a: IDBKey, b: IDBKey): number {
    const sa = String(a)
    const sb = String(b)
    return sa < sb ? -1 : sa > sb ? 1 : 0
  }
}

export function createIndexedDB(): IDBFactory {
  return new IDBFactory()
}
