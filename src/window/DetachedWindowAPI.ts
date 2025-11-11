import type { IBrowserSettings, Window } from './Window'

/**
 * DetachedWindowAPI provides an API for communicating with a detached Window
 * A Window is considered detached when created directly (e.g. new Window())
 * instead of through the Browser API
 */
export class DetachedWindowAPI {
  private _window: Window
  private _pendingOperations: Set<Promise<any>> = new Set()
  private _aborted = false

  constructor(window: Window) {
    this._window = window
  }

  /**
   * Browser settings that can be modified at runtime
   */
  get settings(): IBrowserSettings {
    return this._window.settings
  }

  /**
   * Closes the window and cleans up resources
   */
  async close(): Promise<void> {
    await this.abort()
    // Clear document
    this._window.document.documentElement!.innerHTML = ''
  }

  /**
   * Waits for all ongoing operations to complete
   * This includes loading resources, executing scripts, timers, etc.
   */
  async waitUntilComplete(): Promise<void> {
    // Wait for pending operations
    if (this._pendingOperations.size > 0) {
      await Promise.all(Array.from(this._pendingOperations))
    }

    // Wait for pending timers
    const timerManager = (this._window as any)._getTimerManager?.()
    if (timerManager) {
      await timerManager.waitForTimers()
    }
  }

  /**
   * Aborts all ongoing operations
   */
  async abort(): Promise<void> {
    this._aborted = true
    this._pendingOperations.clear()

    // Abort timers
    const timerManager = (this._window as any)._getTimerManager?.()
    if (timerManager) {
      timerManager.abort()
    }
  }

  /**
   * Sets the URL without navigating the browser
   */
  setURL(url: string): void {
    this._window.location = url
  }

  /**
   * Sets the viewport size
   */
  setViewport(options: { width?: number, height?: number }): void {
    if (options.width !== undefined) {
      (this._window as any)._width = options.width
    }
    if (options.height !== undefined) {
      (this._window as any)._height = options.height
    }
  }

  /**
   * Registers a pending operation to track
   * @internal
   */
  _trackOperation(operation: Promise<any>): void {
    this._pendingOperations.add(operation)
    operation.finally(() => {
      this._pendingOperations.delete(operation)
    })
  }

  /**
   * Check if operations are aborted
   * @internal
   */
  _isAborted(): boolean {
    return this._aborted
  }
}
