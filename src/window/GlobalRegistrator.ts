import type { WindowOptions } from './Window'
import { Window } from './Window'

const SKIP_KEYS = new Set([
  'constructor', 'prototype', '__proto__', 'globalThis', 'global',
  'self', 'window', 'parent', 'top', 'frames',
])

// Keys that must reflect the Window instance even if the host runtime
// already defines them (Bun exposes some of these — navigator, performance,
// fetch — and tests expect the Window's versions to win).
const OVERRIDE_KEYS = new Set([
  'navigator', 'localStorage', 'sessionStorage',
  'location', 'history',
  'innerWidth', 'innerHeight', 'outerWidth', 'outerHeight',
  'devicePixelRatio', 'scrollX', 'scrollY', 'pageXOffset', 'pageYOffset',
  'matchMedia', 'getComputedStyle', 'getSelection',
  'customElements', 'indexedDB',
  'addEventListener', 'removeEventListener', 'dispatchEvent',
  'postMessage', 'alert', 'confirm', 'prompt',
  'scrollTo', 'scroll', 'scrollBy',
  'requestAnimationFrame', 'cancelAnimationFrame',
  'requestIdleCallback', 'cancelIdleCallback',
  'BroadcastChannel', 'MessageChannel', 'MessagePort',
  'EventSource', 'PerformanceObserver',
  'MutationObserver', 'IntersectionObserver', 'ResizeObserver',
  'CustomElementRegistry', 'HTMLElement',
  'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent',
  'FocusEvent', 'InputEvent', 'SubmitEvent', 'PointerEvent',
  'TouchEvent', 'WheelEvent', 'DragEvent', 'ClipboardEvent',
  'AnimationEvent', 'TransitionEvent',
  'ProgressEvent', 'MessageEvent', 'CloseEvent',
  'StorageEvent', 'PopStateEvent', 'HashChangeEvent',
  'ErrorEvent', 'MediaQueryListEvent', 'CompositionEvent',
  'Document', 'Element', 'Node', 'Text', 'Comment',
  'DocumentFragment', 'HTMLTemplateElement', 'SVGElement',
  'NodeFilter', 'NodeIterator', 'TreeWalker', 'Range', 'Selection',
  'DOMParser', 'XMLSerializer',
  'XMLHttpRequest', 'WebSocket',
  'File', 'FileReader', 'FileList',
  'HTMLCanvasElement', 'CanvasRenderingContext2D',
  'Image', 'Audio',
  'IDBFactory', 'IDBDatabase', 'IDBObjectStore',
  'IDBTransaction', 'IDBRequest', 'IDBOpenDBRequest',
  'Notification', 'DataTransfer',
])

let registeredWindow: Window | null = null
const registeredKeys: string[] = []

// When a Window instance method (e.g. getComputedStyle) or accessor gets
// copied to globalThis, calling it as a free function loses its `this`.
// Re-bind method descriptors and wrap accessors so `this` is the Window.
function bindDescriptor(descriptor: PropertyDescriptor, thisArg: object): PropertyDescriptor {
  if (typeof descriptor.value === 'function') {
    return {
      ...descriptor,
      value: descriptor.value.bind(thisArg),
    }
  }
  if (typeof descriptor.get === 'function' || typeof descriptor.set === 'function') {
    const result: PropertyDescriptor = {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
    }
    if (descriptor.get)
      result.get = descriptor.get.bind(thisArg)
    if (descriptor.set)
      result.set = descriptor.set.bind(thisArg)
    return result
  }
  return descriptor
}

export class GlobalRegistrator {
  static register(options: WindowOptions = {}): void {
    if (registeredWindow) {
      throw new Error('GlobalRegistrator: already registered. Call unregister() first.')
    }

    const win = new Window(options)
    registeredWindow = win

    for (const key of Object.getOwnPropertyNames(win)) {
      if (SKIP_KEYS.has(key)) continue
      if (key in globalThis && !OVERRIDE_KEYS.has(key)) continue

      const descriptor = Object.getOwnPropertyDescriptor(win, key)
      if (!descriptor) continue

      Object.defineProperty(globalThis, key, {
        ...bindDescriptor(descriptor, win),
        configurable: true,
      })
      registeredKeys.push(key)
    }

    const proto = Object.getPrototypeOf(win)
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (SKIP_KEYS.has(key)) continue
      if (key in globalThis && !OVERRIDE_KEYS.has(key)) continue

      const descriptor = Object.getOwnPropertyDescriptor(proto, key)
      if (!descriptor) continue

      Object.defineProperty(globalThis, key, {
        ...bindDescriptor(descriptor, win),
        configurable: true,
      })
      registeredKeys.push(key)
    }

    Object.defineProperty(globalThis, 'window', {
      value: win,
      writable: true,
      configurable: true,
    })
    registeredKeys.push('window')

    Object.defineProperty(globalThis, 'document', {
      value: win.document,
      writable: true,
      configurable: true,
    })
    registeredKeys.push('document')
  }

  static unregister(): void {
    if (!registeredWindow) return

    for (const key of registeredKeys) {
      try {
        // eslint-disable-next-line ts/no-dynamic-delete
        delete (globalThis as any)[key]
      }
      catch {}
    }

    registeredKeys.length = 0
    registeredWindow = null
  }
}
