/**
 * Storage implementation for localStorage and sessionStorage
 * Compatible with Web Storage API
 */
export class Storage {
  private _data: Map<string, string> = new Map()

  get length(): number {
    return this._data.size
  }

  key(index: number): string | null {
    const keys = Array.from(this._data.keys())
    return keys[index] ?? null
  }

  getItem(key: string): string | null {
    return this._data.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this._data.set(key, String(value))
  }

  removeItem(key: string): void {
    this._data.delete(key)
  }

  clear(): void {
    this._data.clear()
  }

  // Allow bracket notation access
  [key: string]: any
}

// Create Proxy to support bracket notation
export function createStorage(): Storage {
  const storage = new Storage()

  return new Proxy(storage, {
    get(target, prop: string) {
      // Handle Storage methods and properties
      if (prop in target || typeof prop === 'symbol') {
        return (target as any)[prop]
      }
      // Handle bracket notation for keys
      return target.getItem(prop)
    },
    set(target, prop: string, value: any) {
      if (prop in target) {
        (target as any)[prop] = value
        return true
      }
      // Handle bracket notation for keys
      target.setItem(prop, value)
      return true
    },
    deleteProperty(target, prop: string) {
      target.removeItem(prop)
      return true
    },
    has(target, prop: string) {
      return prop in target || target.getItem(prop) !== null
    },
  })
}
