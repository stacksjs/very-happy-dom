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
  private _pendingEntries: IntersectionObserverEntry[] = []

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

    // Queue entry for takeRecords and deliver via callback asynchronously
    const entry = this._createEntry(target, true)
    this._pendingEntries.push(entry)
    setTimeout(() => {
      if (this._observedElements.has(target)) {
        // Remove this specific entry from pending (if not already taken)
        const idx = this._pendingEntries.indexOf(entry)
        if (idx !== -1) {
          this._pendingEntries.splice(idx, 1)
        }
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
    const entries = this._pendingEntries.splice(0)
    return entries
  }

  private _createEntry(target: VirtualElement, isIntersecting: boolean): IntersectionObserverEntry {
    const rect = this._getBoundingClientRect(target)
    const rootBounds = this._rootRect(target)
    const overlap = this._intersectionOf(rect, rootBounds)

    return {
      boundingClientRect: rect,
      // The caller's flag still decides whether this counts as an
      // intersection — that is the observer's own bookkeeping — but the
      // geometry describing it is measured rather than assumed.
      intersectionRatio: isIntersecting ? overlap.ratio : 0,
      intersectionRect: isIntersecting ? overlap.rect : this._createEmptyRect(),
      isIntersecting,
      rootBounds: this.root ? rootBounds : null,
      target,
      time: Date.now(),
    }
  }

  /**
   * The target's real box.
   *
   * This used to invent a 100x100 rect at the origin for every element, so an
   * entry's geometry said nothing about the element it described. The layout
   * pass answers it now; an element with no box reports an empty rect.
   */
  private _getBoundingClientRect(element: VirtualElement): DOMRectReadOnly {
    const rect = element?.getBoundingClientRect?.()
    if (!rect)
      return this._createEmptyRect()

    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
    }
  }

  /**
   * How much of the target's box lies inside the root's.
   *
   * Reported as 0 or 1 before, from the flag the caller passed in, because
   * there was no geometry to compare. The root is the viewport when none was
   * given.
   */
  private _intersectionOf(target: DOMRectReadOnly, root: DOMRectReadOnly | null): { ratio: number, rect: DOMRectReadOnly } {
    if (!root || target.width === 0 || target.height === 0)
      return { ratio: 0, rect: this._createEmptyRect() }

    const left = Math.max(target.left, root.left)
    const right = Math.min(target.right, root.right)
    const top = Math.max(target.top, root.top)
    const bottom = Math.min(target.bottom, root.bottom)

    if (right <= left || bottom <= top)
      return { ratio: 0, rect: this._createEmptyRect() }

    const width = right - left
    const height = bottom - top

    return {
      ratio: (width * height) / (target.width * target.height),
      rect: { x: left, y: top, width, height, top, right, bottom, left },
    }
  }

  /** The root's box, or the viewport's when the root is the document. */
  private _rootRect(target: VirtualElement): DOMRectReadOnly | null {
    if (this.root)
      return this._getBoundingClientRect(this.root)

    const view = (target as any)?.ownerDocument?.defaultView
    const width = typeof view?.innerWidth === 'number' ? view.innerWidth : 1024
    const height = typeof view?.innerHeight === 'number' ? view.innerHeight : 768

    return { x: 0, y: 0, width, height, top: 0, right: width, bottom: height, left: 0 }
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
