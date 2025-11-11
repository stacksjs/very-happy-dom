/**
 * TimerManager handles setTimeout, setInterval, and requestAnimationFrame
 * Tracks pending timers for waitUntilComplete() integration
 */
export class TimerManager {
  private _timeouts = new Map<number, NodeJS.Timeout>()
  private _intervals = new Map<number, NodeJS.Timeout>()
  private _animationFrames = new Map<number, NodeJS.Timeout>()
  private _nextId = 1
  private _aborted = false

  setTimeout(callback: (...args: any[]) => void, delay: number = 0, ...args: any[]): number {
    if (this._aborted)
      return -1

    const id = this._nextId++
    const timeout = globalThis.setTimeout(() => {
      this._timeouts.delete(id)
      if (!this._aborted) {
        callback(...args)
      }
    }, delay)

    this._timeouts.set(id, timeout)
    return id
  }

  clearTimeout(id: number): void {
    const timeout = this._timeouts.get(id)
    if (timeout) {
      globalThis.clearTimeout(timeout)
      this._timeouts.delete(id)
    }
  }

  setInterval(callback: (...args: any[]) => void, delay: number = 0, ...args: any[]): number {
    if (this._aborted)
      return -1

    const id = this._nextId++
    const interval = globalThis.setInterval(() => {
      if (!this._aborted) {
        callback(...args)
      }
    }, delay)

    this._intervals.set(id, interval)
    return id
  }

  clearInterval(id: number): void {
    const interval = this._intervals.get(id)
    if (interval) {
      globalThis.clearInterval(interval)
      this._intervals.delete(id)
    }
  }

  requestAnimationFrame(callback: (time: number) => void): number {
    if (this._aborted)
      return -1

    const id = this._nextId++
    // RAF fires after ~16ms (60fps)
    const timeout = globalThis.setTimeout(() => {
      this._animationFrames.delete(id)
      if (!this._aborted) {
        callback(Date.now())
      }
    }, 16)

    this._animationFrames.set(id, timeout)
    return id
  }

  cancelAnimationFrame(id: number): void {
    const timeout = this._animationFrames.get(id)
    if (timeout) {
      globalThis.clearTimeout(timeout)
      this._animationFrames.delete(id)
    }
  }

  /**
   * Check if there are any pending timers
   */
  hasPendingTimers(): boolean {
    return this._timeouts.size > 0 || this._animationFrames.size > 0
  }

  /**
   * Wait for all pending timers to complete (not intervals)
   */
  async waitForTimers(): Promise<void> {
    // Wait until there are no pending timeouts or animation frames
    // Note: intervals are not awaited as they run indefinitely
    while (this._timeouts.size > 0 || this._animationFrames.size > 0) {
      await new Promise(resolve => globalThis.setTimeout(resolve, 10))
    }
  }

  /**
   * Clear all timers
   */
  clearAll(): void {
    // Clear timeouts
    for (const timeout of this._timeouts.values()) {
      globalThis.clearTimeout(timeout)
    }
    this._timeouts.clear()

    // Clear intervals
    for (const interval of this._intervals.values()) {
      globalThis.clearInterval(interval)
    }
    this._intervals.clear()

    // Clear animation frames
    for (const timeout of this._animationFrames.values()) {
      globalThis.clearTimeout(timeout)
    }
    this._animationFrames.clear()
  }

  /**
   * Mark as aborted (prevents new timers and callbacks)
   */
  abort(): void {
    this._aborted = true
    this.clearAll()
  }
}
