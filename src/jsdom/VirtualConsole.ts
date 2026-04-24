/**
 * VirtualConsole
 * jsdom-compatible console capture. Events emitted by window.console go
 * through `emit(method, ...args)`. Install listeners with `on()`, or forward
 * to a real console via `sendTo()`.
 */

type ConsoleMethod =
  | 'log' | 'info' | 'warn' | 'error' | 'debug'
  | 'dir' | 'dirxml' | 'trace' | 'table'
  | 'group' | 'groupCollapsed' | 'groupEnd'
  | 'time' | 'timeEnd' | 'timeLog'
  | 'count' | 'countReset' | 'assert' | 'clear'
  | 'jsdomError'

// eslint-disable-next-line pickier/no-unused-vars
export type VirtualConsoleListener = (...args: any[]) => void

export interface VirtualConsoleSendToOptions {
  omitJSDOMErrors?: boolean
}

const CONSOLE_METHODS: readonly ConsoleMethod[] = [
  'log', 'info', 'warn', 'error', 'debug',
  'dir', 'dirxml', 'trace', 'table',
  'group', 'groupCollapsed', 'groupEnd',
  'time', 'timeEnd', 'timeLog',
  'count', 'countReset', 'assert', 'clear',
]

export class VirtualConsole {
  private _listeners: Map<string, Set<VirtualConsoleListener>> = new Map()
  private _sinks: Array<{ target: Console, options: VirtualConsoleSendToOptions }> = []

  on(method: string, listener: VirtualConsoleListener): this {
    let set = this._listeners.get(method)
    if (!set) {
      set = new Set()
      this._listeners.set(method, set)
    }
    set.add(listener)
    return this
  }

  off(method: string, listener: VirtualConsoleListener): this {
    this._listeners.get(method)?.delete(listener)
    return this
  }

  removeAllListeners(method?: string): this {
    if (method)
      this._listeners.delete(method)
    else
      this._listeners.clear()
    return this
  }

  listeners(method: string): VirtualConsoleListener[] {
    return Array.from(this._listeners.get(method) ?? [])
  }

  emit(method: string, ...args: any[]): boolean {
    const set = this._listeners.get(method)
    let hadListener = false
    if (set && set.size > 0) {
      hadListener = true
      for (const listener of set) {
        try { listener(...args) }
        catch {}
      }
    }

    for (const sink of this._sinks) {
      if (method === 'jsdomError' && sink.options.omitJSDOMErrors)
        continue
      const fn = (sink.target as unknown as Record<string, unknown>)[method]
      if (typeof fn === 'function')
        (fn as (...args: unknown[]) => unknown).apply(sink.target, args)
    }

    return hadListener
  }

  sendTo(anyConsole: Console, options: VirtualConsoleSendToOptions = {}): this {
    this._sinks.push({ target: anyConsole, options })
    return this
  }

  /**
   * Build a Console-like object that forwards every call into `emit`.
   * Used by the JSDOM constructor to install a per-window console.
   *
   * @internal
   */
  _asConsole(): Console {
    const self = this
    const obj: Record<string, (...args: unknown[]) => void> = {}
    for (const method of CONSOLE_METHODS) {
      obj[method] = (...args: unknown[]): void => {
        self.emit(method, ...args)
      }
    }
    return obj as unknown as Console
  }
}
