import type { Browser } from './Browser'
import type { ICookie } from './CookieContainer'
import { BrowserPage } from './BrowserPage'
import { CookieContainer } from './CookieContainer'
import { createStorage, type Storage } from '../storage/Storage'

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
  /**
   * localStorage is partitioned by origin and shared by every page in the
   * context, the way one browser profile behaves. `sessionStorage` is not here
   * on purpose: in a browser it belongs to the tab.
   */
  private _originStorage: Map<string, Storage> = new Map()

  constructor(browser: Browser) {
    this._browser = browser
    this.cookieContainer = new CookieContainer()
  }


  /**
   * Cookies visible in this context, optionally narrowed to given URLs.
   *
   * The jar belongs to the context, so a cookie set by one page is readable by
   * its siblings and invisible to another context.
   */
  async cookies(urls?: string | string[]): Promise<ICookie[]> {
    if (urls === undefined) {
      // No URL to scope by: report the whole jar. `getCookies` matches against
      // a URL and cannot answer this.
      return this.cookieContainer.getAllCookies()
    }

    const list = Array.isArray(urls) ? urls : [urls]
    const seen = new Set<string>()
    const collected: ICookie[] = []

    for (const url of list) {
      for (const cookie of this.cookieContainer.getCookies(url)) {
        const identity = `${cookie.key}\u0000${cookie.domain ?? ''}\u0000${cookie.path ?? ''}`
        if (seen.has(identity))
          continue
        seen.add(identity)
        collected.push(cookie)
      }
    }

    return collected
  }

  /** Seed cookies, as `storageState` restores them. */
  async addCookies(cookies: ICookie[]): Promise<void> {
    this.cookieContainer.addCookies(cookies)
  }

  /** Empty the jar for every page in this context. */
  async clearCookies(): Promise<void> {
    this.cookieContainer.clearCookies()
  }

  /**
   * A snapshot of the context's cookies and per-origin localStorage.
   *
   * This is how an authenticated session gets reused: capture it once after
   * signing in, then hand it back to a later context rather than repeating the
   * sign-in. Restore with {@link addCookies} and {@link restoreStorageState}.
   */
  async storageState(): Promise<{
    cookies: ICookie[]
    origins: Array<{ origin: string, localStorage: Array<{ name: string, value: string }> }>
  }> {
    const origins: Array<{ origin: string, localStorage: Array<{ name: string, value: string }> }> = []

    for (const [origin, store] of this._originStorage) {
      // `about:blank` has no origin to key storage by, and an empty store is
      // noise in a snapshot meant to be handed back.
      if (!origin || origin === 'null' || store.length === 0)
        continue

      const entries: Array<{ name: string, value: string }> = []
      for (let index = 0; index < store.length; index++) {
        const name = store.key(index)
        if (name !== null)
          entries.push({ name, value: store.getItem(name) ?? '' })
      }
      origins.push({ origin, localStorage: entries })
    }

    return { cookies: await this.cookies(), origins }
  }

  /** Apply a previously captured {@link storageState}. */
  async restoreStorageState(state: {
    cookies?: ICookie[]
    origins?: Array<{ origin: string, localStorage?: Array<{ name: string, value: string }> }>
  }): Promise<void> {
    if (state.cookies?.length)
      this.cookieContainer.addCookies(state.cookies)

    for (const entry of state.origins ?? []) {
      const store = this._storageForOrigin(entry.origin)
      for (const item of entry.localStorage ?? [])
        store.setItem(item.name, item.value)
    }
  }

  /**
   * @internal The localStorage shared by pages on `origin`.
   *
   * Frames call this on construction and whenever their origin changes.
   */
  _storageForOrigin(origin: string): Storage {
    const key = origin || 'null'
    let store = this._originStorage.get(key)
    if (!store) {
      store = createStorage()
      this._originStorage.set(key, store)
    }
    return store
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
    this._originStorage.clear()
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
