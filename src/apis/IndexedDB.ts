/**
 * IndexedDB (in-memory stub)
 * Sufficient surface for feature detection and basic library initialization.
 * Data persistence within a single Window instance is supported; cross-window
 * isolation is intentional.
 */

import { VirtualEventTarget } from '../events/VirtualEventTarget'
import { VirtualEvent } from '../events/VirtualEvent'

type IDBKey = string | number | Date | ArrayBuffer | Uint8Array | IDBKey[]

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
    })
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
    const req = new IDBRequest()
    req._resolve(this._data.get(String(key)))
    return req
  }

  getAll(): IDBRequest {
    const req = new IDBRequest()
    req._resolve(Array.from(this._data.values()))
    return req
  }

  delete(key: IDBKey): IDBRequest {
    const req = new IDBRequest()
    this._data.delete(String(key))
    req._resolve(undefined)
    return req
  }

  clear(): IDBRequest {
    const req = new IDBRequest()
    this._data.clear()
    req._resolve(undefined)
    return req
  }

  count(): IDBRequest {
    const req = new IDBRequest()
    req._resolve(this._data.size)
    return req
  }

  createIndex(): never {
    throw new Error('IDBObjectStore.createIndex not supported in the stub')
  }

  private _put(value: unknown, key: IDBKey | undefined, failIfExists: boolean): IDBRequest {
    const req = new IDBRequest()
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

    this._data.set(resolvedKey, value)
    req._resolve(resolvedKey)
    return req
  }
}

export interface IDBObjectStoreParameters {
  keyPath?: string | string[] | null
  autoIncrement?: boolean
}

export class IDBTransaction extends VirtualEventTarget {
  readonly mode: IDBTransactionMode
  readonly objectStoreNames: string[]
  readonly db: IDBDatabase
  readonly error: DOMException | null = null
  // eslint-disable-next-line pickier/no-unused-vars
  oncomplete: ((event: Event) => void) | null = null
  // eslint-disable-next-line pickier/no-unused-vars
  onabort: ((event: Event) => void) | null = null
  // eslint-disable-next-line pickier/no-unused-vars
  onerror: ((event: Event) => void) | null = null

  constructor(db: IDBDatabase, storeNames: string[], mode: IDBTransactionMode) {
    super()
    this.db = db
    this.objectStoreNames = storeNames
    this.mode = mode
    queueMicrotask(() => {
      const event = new VirtualEvent('complete') as unknown as Event
      try { this.oncomplete?.(event) }
      catch {}
      this.dispatchEvent(event)
    })
  }

  objectStore(name: string): IDBObjectStore {
    const store = this.db._getStore(name)
    if (!store)
      throw new DOMException(`No object store named "${name}"`, 'NotFoundError')
    return store
  }

  abort(): void {
    const event = new VirtualEvent('abort') as unknown as Event
    try { this.onabort?.(event) }
    catch {}
    this.dispatchEvent(event)
  }
}

export type IDBTransactionMode = 'readonly' | 'readwrite' | 'versionchange'

export class IDBDatabase extends VirtualEventTarget {
  readonly name: string
  readonly version: number
  readonly objectStoreNames: string[] = []
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
        try {
          req.onupgradeneeded?.(event)
        }
        catch {}
        req.dispatchEvent(event)
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
