import type { IBrowserSettings, IOptionalBrowserSettings } from '../window/Window'
import type { BrowserPage } from './BrowserPage'
import { BrowserContext } from './BrowserContext'

export interface BrowserOptions {
  settings?: IOptionalBrowserSettings
  console?: Console
}

/**
 * Browser represents an instance of a VeryHappyDOM browser
 * Compatible with Happy DOM's Browser API
 */
export class Browser {
  public console: Console
  public defaultContext: BrowserContext

  private _contexts: BrowserContext[] = []
  private _settings: IBrowserSettings

  constructor(options: BrowserOptions = {}) {
    const { settings = {}, console: consoleInstance } = options

    this.console = consoleInstance || globalThis.console

    // Initialize settings with defaults
    this._settings = {
      navigator: {
        userAgent: settings.navigator?.userAgent || 'Mozilla/5.0 (X11; Linux x64) AppleWebKit/537.36 (KHTML, like Gecko) VeryHappyDOM/1.0.0',
      },
      device: {
        prefersColorScheme: settings.device?.prefersColorScheme || 'light',
      },
    }

    // Create default context
    this.defaultContext = new BrowserContext(this)
    this._contexts.push(this.defaultContext)
  }

  /**
   * Browser contexts
   */
  get contexts(): BrowserContext[] {
    return this._contexts
  }

  /**
   * Browser settings (can be modified at runtime)
   */
  get settings(): IBrowserSettings {
    return this._settings
  }

  /**
   * Closes the browser and all contexts
   */
  async close(): Promise<void> {
    await Promise.all(this._contexts.map(context => context.close()))
    this._contexts = []
  }

  /**
   * Waits for all ongoing operations to complete
   */
  async waitUntilComplete(): Promise<void> {
    await Promise.all(this._contexts.map(context => context.waitUntilComplete()))
  }

  /**
   * Aborts all ongoing operations
   */
  async abort(): Promise<void> {
    await Promise.all(this._contexts.map(context => context.abort()))
  }

  /**
   * Creates a new incognito context (isolated from default context)
   */
  newIncognitoContext(): BrowserContext {
    const context = new BrowserContext(this)
    this._contexts.push(context)
    return context
  }

  /**
   * Creates a new page in the default context
   */
  newPage(): BrowserPage {
    return this.defaultContext.newPage()
  }
}
