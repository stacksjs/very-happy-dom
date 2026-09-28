import type { Browser } from './Browser'
import type { ICookie } from './CookieContainer'
import { BrowserPage } from './BrowserPage'
import { CookieContainer } from './CookieContainer'
import type { RouteHandler, RoutePattern } from '../network/routing'
import { createStorage, type Storage } from '../storage/Storage'
import { RouteRegistry } from '../network/routing'

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
  /** @internal Routes applying to every page in this context. */
  _routeRegistry: RouteRegistry = new RouteRegistry()

  /**
   * Emulation the context applies to every page in it, present and future.
   *
   * Held here rather than pushed once, so a page created later starts with the
   * same environment as its siblings.
   */
  private _permissions: string[] | null = null
  private _geolocation: { latitude: number, longitude: number, accuracy?: number } | null = null
  private _offline = false
  private _extraHeaders: Record<string, string> = {}
  private _initScripts: Array<string | ((...args: any[]) => any)> = []
  private _defaultTimeout: number | null = null

  constructor(browser: Browser) {
    this._browser = browser
    this.cookieContainer = new CookieContainer()
  }


  /**
   * Grant these permissions and no others.
   *
   * Until this is called a query answers `granted`, which is the permissive
   * default for feature detection. Calling it switches to the explicit set, so
   * anything ungranted becomes `prompt` — which is what lets a test assert the
   * unhappy path.
   */
  async grantPermissions(permissions: string[], _options: { origin?: string } = {}): Promise<void> {
    this._permissions = [...(this._permissions ?? []), ...permissions]
    this._applyToPages()
  }

  /** Revoke every grant, leaving nothing granted. */
  async clearPermissions(): Promise<void> {
    this._permissions = []
    this._applyToPages()
  }

  /** The position `navigator.geolocation` reports; null restores the default. */
  async setGeolocation(geolocation: { latitude: number, longitude: number, accuracy?: number } | null): Promise<void> {
    this._geolocation = geolocation
    this._applyToPages()
  }

  /**
   * Take the context offline.
   *
   * `navigator.onLine` flips and a navigation fails, which is what offline
   * handling in an application actually branches on. An arbitrary `fetch` made
   * by page code is *not* blocked — interception is what would be needed for
   * that, and silently swapping it here would fight with `route()`.
   */
  async setOffline(offline: boolean): Promise<void> {
    this._offline = offline
    this._applyToPages()
  }

  /** Headers added to requests this context navigates with. */
  async setExtraHTTPHeaders(headers: Record<string, string>): Promise<void> {
    this._extraHeaders = { ...headers }
  }

  /**
   * Evaluate `script` in every page of this context, on creation and after each
   * navigation, before the page's own code would run.
   *
   * The usual reason is to plant a stub or a flag the page reads on startup.
   */
  async addInitScript(script: string | ((...args: any[]) => any)): Promise<void> {
    this._initScripts.push(script)
    for (const page of this._pages)
      (page as any)._runInitScripts?.()
  }

  /** Default timeout for the `waitFor*` family in this context's pages. */
  setDefaultTimeout(timeout: number): void {
    this._defaultTimeout = timeout
  }

  /** @internal The emulation a frame should adopt. */
  _emulation(): {
    permissions: string[] | null
    geolocation: { latitude: number, longitude: number, accuracy?: number } | null
    offline: boolean
  } {
    return { permissions: this._permissions, geolocation: this._geolocation, offline: this._offline }
  }

  /** @internal Headers to merge into a navigation request. */
  _extraHTTPHeaders(): Record<string, string> {
    return this._extraHeaders
  }

  /** @internal Scripts to evaluate in a fresh document. */
  _initScriptSources(): Array<string | ((...args: any[]) => any)> {
    return this._initScripts
  }

  /** @internal The configured default timeout, if any. */
  _timeout(): number | null {
    return this._defaultTimeout
  }

  /** Push the current emulation onto every page's frames. */
  private _applyToPages(): void {
    for (const page of this._pages)
      (page as any)._applyEmulation?.()
  }

  /**
   * Handle matching requests for every page in this context, present and
   * future.
   *
   * A page's own routes are tried first, then these, so a page can override the
   * context for a URL without unregistering anything.
   */
  async route(url: RoutePattern, handler: RouteHandler): Promise<void> {
    this._routeRegistry.add(url, handler)
    // Pages created before this call have no interceptor installed yet.
    for (const page of this._pages)
      (page as any)._ensureRouting?.()
  }

  /** Remove context routes for `url`, or just the one using `handler`. */
  async unroute(url?: RoutePattern, handler?: RouteHandler): Promise<void> {
    this._routeRegistry.remove(url, handler)
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
    // Inherit whatever routing the context already declared, then its
    // environment, so a page starts up matching its siblings.
    const created = page as any
    if (this._routeRegistry.size > 0)
      created._ensureRouting?.()
    created._applyEmulation?.()
    created._runInitScripts?.()
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
