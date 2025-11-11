import type { VirtualElement } from '../nodes/VirtualElement'

export interface ResizeObserverSize {
  inlineSize: number
  blockSize: number
}

export interface ResizeObserverEntry {
  target: VirtualElement
  contentRect: DOMRectReadOnly
  borderBoxSize: ReadonlyArray<ResizeObserverSize>
  contentBoxSize: ReadonlyArray<ResizeObserverSize>
  devicePixelContentBoxSize: ReadonlyArray<ResizeObserverSize>
}

export type ResizeObserverCallback = (
  entries: ResizeObserverEntry[],
  observer: ResizeObserver
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
 * ResizeObserver implementation
 * Note: This is a simplified implementation for testing
 * It simulates resize behavior without actual size calculations
 */
export class ResizeObserver {
  private _callback: ResizeObserverCallback
  private _observedElements = new Set<VirtualElement>()

  constructor(callback: ResizeObserverCallback) {
    this._callback = callback
  }

  observe(target: VirtualElement, _options?: { box?: 'content-box' | 'border-box' | 'device-pixel-content-box' }): void {
    if (this._observedElements.has(target))
      return

    this._observedElements.add(target)

    // Simulate resize notification asynchronously
    setTimeout(() => {
      if (this._observedElements.has(target)) {
        const entry = this._createEntry(target)
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

  private _createEntry(target: VirtualElement): ResizeObserverEntry {
    const rect = this._getContentRect(target)
    const size: ResizeObserverSize = {
      inlineSize: rect.width,
      blockSize: rect.height,
    }

    return {
      target,
      contentRect: rect,
      borderBoxSize: [size],
      contentBoxSize: [size],
      devicePixelContentBoxSize: [size],
    }
  }

  private _getContentRect(_element: VirtualElement): DOMRectReadOnly {
    // In a virtual DOM, we simulate a basic rect
    // In a real implementation, this would calculate actual sizes
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
}
