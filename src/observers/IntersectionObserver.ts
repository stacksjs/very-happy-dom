import type { VirtualElement } from '../nodes/VirtualElement'

export interface IntersectionObserverInit {
  root?: VirtualElement | null
  rootMargin?: string
  threshold?: number | number[]
}

export interface IntersectionObserverEntry {
  boundingClientRect: DOMRectReadOnly
  intersectionRatio: number
  intersectionRect: DOMRectReadOnly
  isIntersecting: boolean
  rootBounds: DOMRectReadOnly | null
  target: VirtualElement
  time: number
}

export type IntersectionObserverCallback = (
  entries: IntersectionObserverEntry[],
  observer: IntersectionObserver
) => void

interface DOMRectReadOnly {
  x: number
  y: number
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * IntersectionObserver implementation
 * Note: This is a simplified implementation for testing
 * It simulates intersection behavior without actual viewport calculations
 */
export class IntersectionObserver {
  public root: VirtualElement | null
  public rootMargin: string
  public thresholds: number[]

  private _callback: IntersectionObserverCallback
  private _observedElements = new Set<VirtualElement>()

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this._callback = callback
    this.root = options.root || null
    this.rootMargin = options.rootMargin || '0px'

    // Normalize threshold to array
    if (options.threshold === undefined) {
      this.thresholds = [0]
    }
    else if (Array.isArray(options.threshold)) {
      this.thresholds = options.threshold
    }
    else {
      this.thresholds = [options.threshold]
    }
  }

  observe(target: VirtualElement): void {
    if (this._observedElements.has(target))
      return

    this._observedElements.add(target)

    // Simulate intersection check asynchronously
    setTimeout(() => {
      if (this._observedElements.has(target)) {
        const entry = this._createEntry(target, true)
        this._callback([entry], this)
      }
    }, 0)
  }

  unobserve(target: VirtualElement): void {
    this._observedElements.delete(target)
  }

  disconnect(): void {
    this._observedElements.clear()
  }

  takeRecords(): IntersectionObserverEntry[] {
    // In a full implementation, this would return pending entries
    return []
  }

  private _createEntry(target: VirtualElement, isIntersecting: boolean): IntersectionObserverEntry {
    const rect = this._getBoundingClientRect(target)

    return {
      boundingClientRect: rect,
      intersectionRatio: isIntersecting ? 1 : 0,
      intersectionRect: isIntersecting ? rect : this._createEmptyRect(),
      isIntersecting,
      rootBounds: this.root ? this._getBoundingClientRect(this.root) : null,
      target,
      time: Date.now(),
    }
  }

  private _getBoundingClientRect(_element: VirtualElement): DOMRectReadOnly {
    // In a virtual DOM, we simulate a basic rect
    // In a real implementation, this would calculate actual positions
    return {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      right: 100,
      bottom: 100,
      left: 0,
    }
  }

  private _createEmptyRect(): DOMRectReadOnly {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    }
  }
}
