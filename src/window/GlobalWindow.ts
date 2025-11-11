import type { WindowOptions } from './Window'
import { Window } from './Window'

/**
 * GlobalWindow represents a window instance running in the global scope
 * instead of an isolated VM context
 *
 * This is useful for setting up a test environment in its own Node process
 * Compatible with Happy DOM's GlobalWindow API
 */
export class GlobalWindow extends Window {
  constructor(options: WindowOptions = {}) {
    super(options)

    // In a real implementation, this would set up global scope bindings
    // For now, we just create a standard Window
  }

  /**
   * Sets a property on the global scope
   */
  setGlobal(key: string, value: any): void {
    ;(globalThis as any)[key] = value
  }

  /**
   * Gets a property from the global scope
   */
  getGlobal(key: string): any {
    return (globalThis as any)[key]
  }

  /**
   * Cleans up global scope
   */
  async close(): Promise<void> {
    await this.happyDOM.close()
  }
}
