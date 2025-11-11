import type { Browser } from './Browser'
import { BrowserPage } from './BrowserPage'
import { CookieContainer } from './CookieContainer'

/**
 * BrowserContext represents a context where data such as cache and cookies
 * can be shared between its pages
 * Compatible with Happy DOM's BrowserContext API
 */
export class BrowserContext {
  public cookieContainer: CookieContainer
  public responseCache: Map<string, Response> = new Map()
  public preflightResponseCache: Map<string, Response> = new Map()

  private _browser: Browser
  private _pages: BrowserPage[] = []

  constructor(browser: Browser) {
    this._browser = browser
    this.cookieContainer = new CookieContainer()
  }

  /**
   * Pages in this context
   */
  get pages(): BrowserPage[] {
    return this._pages
  }

  /**
   * Owner browser
   */
  get browser(): Browser {
    return this._browser
  }

  /**
   * Closes the context and all its pages
   */
  async close(): Promise<void> {
    await Promise.all(this._pages.map(page => page.close()))
    this._pages = []
    this.cookieContainer.clearCookies()
    this.responseCache.clear()
    this.preflightResponseCache.clear()
  }

  /**
   * Waits for all ongoing operations to complete
   */
  async waitUntilComplete(): Promise<void> {
    await Promise.all(this._pages.map(page => page.waitUntilComplete()))
  }

  /**
   * Aborts all ongoing operations
   */
  async abort(): Promise<void> {
    await Promise.all(this._pages.map(page => page.abort()))
  }

  /**
   * Creates a new page in this context
   */
  newPage(): BrowserPage {
    const page = new BrowserPage(this)
    this._pages.push(page)
    return page
  }

  /**
   * Removes a page from this context
   * @internal
   */
  _removePage(page: BrowserPage): void {
    const index = this._pages.indexOf(page)
    if (index !== -1) {
      this._pages.splice(index, 1)
    }
  }
}
