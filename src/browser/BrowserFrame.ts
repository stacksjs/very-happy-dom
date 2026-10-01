import type { VirtualDocument } from '../nodes/VirtualDocument'
import type { BrowserPage } from './BrowserPage'
import { Window } from '../window/Window'

const INITIAL_FRAME_URL = 'about:blank'

/**
 * BrowserFrame represents a browser frame
 * Compatible with Happy DOM's BrowserFrame API
 */
export class BrowserFrame {
  /**
   * The frame's browsing context. This is a real `Window`, so page code and
   * `evaluate()` see storage, timers, observers, `navigator`, `matchMedia` and
   * `getComputedStyle` rather than a hand-built stand-in.
   */
  public window: Window
  public document: VirtualDocument

  private _page: BrowserPage
  private _parentFrame: BrowserFrame | null = null
  private _childFrames: BrowserFrame[] = []
  private _content: string = ''
  /**
   * Session history for this frame, as URLs, with the index of the current
   * entry. `goBack`/`goForward` move the index; a fresh navigation truncates
   * anything ahead of it, the way a browser discards the forward stack.
   */
  private _history: string[] = [INITIAL_FRAME_URL]
  private _historyIndex = 0
  private _navigations: Array<() => void> = []

  /** The device settings the browser started with, for `emulateMedia(null)`. */
  private _deviceBaseline: Record<string, any> = {}

  constructor(page: BrowserPage, parentFrame: BrowserFrame | null = null) {
    this._page = page
    this._parentFrame = parentFrame

    const { width, height } = page.viewport

    this.window = new Window({
      url: INITIAL_FRAME_URL,
      width,
      height,
      console: page.console,
      settings: page.context?.browser?.settings,
    })

    // What the browser's own settings established, kept so `emulateMedia(null)`
    // has something to restore to. Without it, dropping an override would leave
    // the last emulated value in place and `null` would mean nothing.
    this._deviceBaseline = { ...((this.window as any)._settings?.device ?? {}) }

    this._forwardConsole()
    this._installDialogs()

    // The window owns its document — don't build a second one alongside it, or
    // `frame.document` and `frame.window.document` would diverge.
    this.document = this.window.document

    this._adoptContextState()
  }

  /**
   * Share the browsing context's cookies and per-origin localStorage.
   *
   * A context is the isolation boundary: its pages behave like tabs in one
   * profile, so a cookie or a localStorage entry written by one is visible to
   * the others, while a different context sees neither. Without this the
   * document built its own jar and the window its own storage, so sibling pages
   * were isolated from each other — which no browser does.
   *
   * `sessionStorage` is deliberately left per-frame: in a browser it is scoped
   * to the tab, not the profile.
   */
  private _adoptContextState(): void {
    const context = this._page.context as any
    if (!context)
      return

    if (context.cookieContainer)
      (this.document as any)._setCookieContainer?.(context.cookieContainer)

    this._syncOriginStorage()
  }

  /** Point `localStorage` at the context's store for this frame's origin. */
  private _syncOriginStorage(): void {
    const context = this._page.context as any
    const store = context?._storageForOrigin?.(this.window.location.origin)
    if (store)
      (this.window as any).localStorage = store
  }

  /**
   * Adopt the context's emulation: permissions, geolocation and online state.
   *
   * Applied on creation and whenever the context changes, so a page created
   * later starts in the same environment as its siblings.
   */
  _applyEmulation(): void {
    const context = this._page.context as any
    const emulation = context?._emulation?.()
    if (!emulation)
      return

    const navigator = (this.window as any).navigator

    if (emulation.permissions !== null) {
      navigator?.permissions?._clearGrants?.()
      navigator?.permissions?._grant?.(emulation.permissions)
    }

    navigator?.geolocation?._setPosition?.(emulation.geolocation)

    if (navigator)
      navigator.onLine = !emulation.offline

    // The window's device settings are what `_mediaContext()` reads, so writing
    // them here is what makes both `matchMedia` and the cascade see the change
    // on a page that is already open (#1611).
    const device = (this.window as any)._settings?.device
    if (device && emulation.media) {
      // An override where there is one, the browser's own setting where there is
      // not — so `emulateMedia({ colorScheme: null })` restores rather than
      // leaving the last emulated value in place.
      const baseline = this._deviceBaseline
      device.prefersColorScheme = emulation.media.colorScheme ?? baseline.prefersColorScheme ?? 'light'
      device.prefersReducedMotion = emulation.media.reducedMotion ?? baseline.prefersReducedMotion ?? 'no-preference'
      device.forcedColors = emulation.media.forcedColors ?? baseline.forcedColors ?? 'none'
      device.mediaType = emulation.media.type ?? baseline.mediaType ?? 'screen'
    }
  }

  /** Evaluate the context's init scripts in this frame. */
  _runInitScripts(): void {
    const context = this._page.context as any
    for (const script of context?._initScriptSources?.() ?? []) {
      try {
        this.evaluate(script as any)
      }
      catch {
        // An init script that throws must not take the navigation with it —
        // the page still loads, as it would in a browser.
      }
    }
  }

  /**
   * Child frames
   */
  get childFrames(): BrowserFrame[] {
    return this._childFrames
  }

  /**
   * Parent frame
   */
  get parentFrame(): BrowserFrame | null {
    return this._parentFrame
  }

  /**
   * Owner page
   */
  get page(): BrowserPage {
    return this._page
  }

  /**
   * Get or set the document content HTML
   */
  get content(): string {
    return this.document.documentElement?.outerHTML || ''
  }

  set content(html: string) {
    this._content = html
    this.document.documentElement!.innerHTML = html
  }

  /**
   * Get or set the URL without navigating
   */
  get url(): string {
    return this.window.location.href
  }

  set url(url: string) {
    // `setURL` keeps the window's real `Location` coherent — every part
    // (`pathname`, `search`, `origin`, …) updates together, where the previous
    // stub replaced `location` with a two-property object.
    this.window.happyDOM.setURL(url)
    // localStorage is partitioned by origin, so moving origin means a
    // different store — as it would in a browser.
    this._syncOriginStorage()
  }

  /**
   * Resizes the frame's browsing context, so width/height media queries and
   * `innerWidth`/`innerHeight` follow the page's viewport.
   */
  setViewport(viewport: { width?: number, height?: number }): void {
    this.window.happyDOM.setViewport(viewport)
  }

  /**
   * Waits for all ongoing operations to complete
   */
  async waitUntilComplete(): Promise<void> {
    // The window owns the timers, so draining them is what "settled" means
    // here. There are no external resources in flight to wait on: a navigation
    // resolves once its main response is parsed.
    await this.window.happyDOM.waitUntilComplete()
  }

  /**
   * Waits for navigation to complete after a link click or redirect
   */
  async waitForNavigation(): Promise<void> {
    // Resolves on the next navigation that completes, so a caller can start it
    // and await the arrival separately — the shape Playwright uses for a click
    // that triggers a load.
    await new Promise<void>((resolve) => {
      this._navigations.push(resolve)
    })
  }

  /** Wake everything waiting on a navigation. */
  private _announceNavigation(): void {
    const waiting = this._navigations
    this._navigations = []
    for (const resolve of waiting)
      resolve()
  }

  /**
   * Aborts all ongoing operations
   */
  async abort(): Promise<void> {
    // The window owns the pending work, so cancelling it is what aborting the
    // frame means. Anything waiting on a navigation is released rather than
    // left hanging: an aborted navigation is never going to arrive, and a
    // caller that awaited it should not be stuck on a promise that cannot
    // settle. It resolves rather than rejects, which is the contract callers
    // here already rely on.
    await this.window.happyDOM.abort()
    this._announceNavigation()
  }

  /**
   * Evaluates code in the frame's context.
   *
   * Both forms resolve `window`, `document` and the window's other globals from
   * this frame through `with (window)`, the same mechanism the jsdom script
   * runner uses. A string used to go through the host `eval()`, where those
   * names were whatever the module scope happened to have — usually nothing —
   * so `evaluate('document.title')` threw `document is not defined`.
   *
   * `arg` is forwarded to the page function. It was previously accepted by
   * callers and dropped, so a function expecting a value silently received
   * `undefined`.
   *
   * The value is returned directly rather than wrapped in a promise. That
   * composes with `await` either way — `await evaluate(async () => 7)` still
   * yields 7 — whereas returning a promise would break callers that read the
   * result directly.
   */
  evaluate(code: string | ((...args: any[]) => any), arg?: any): any {
    return this._evaluateWith(code, [arg])
  }

  /**
   * @internal Evaluate against this frame with an explicit argument list.
   *
   * `evaluate()` passes exactly one argument, which is Playwright's shape for a
   * page. A locator's callback takes two — the element, then the caller's arg —
   * so the list has to be open-ended rather than special-cased per call site.
   *
   * The function is recompiled through `new Function` with `with (window)`, so a
   * bare `document` resolves against this frame rather than the outer scope.
   * That also means the callback loses its closure, as it does in Playwright,
   * where the function crosses a process boundary. Deliberately kept: a callback
   * that could see its closure here and not there would let a test pass locally
   * and fail once ported, which is the wrong way round for a library whose point
   * is that specs move between the two.
   */
  _evaluateWith(code: string | ((...args: any[]) => any), args: any[]): any {
    if (typeof code === 'function') {
      // eslint-disable-next-line no-new-func
      const runner = new Function('window', 'document', 'args', `with (window) { return (${code.toString()})(...args) }`)
      return runner(this.window, this.document, args)
    }

    // eslint-disable-next-line no-new-func
    const runner = new Function('window', 'document', 'args', `with (window) { return (${code}) }`)
    const result = runner(this.window, this.document, args)

    // A string may itself be a function expression, which Playwright allows;
    // an expression that merely evaluates to a value is returned as-is.
    return typeof result === 'function' ? result(...args) : result
  }

  /**
   * Replace the document with `html`, as `page.setContent()` does.
   *
   * Goes through the same `_commit` a navigation uses, rather than assigning
   * `body.innerHTML`, which is what the reach-through looked like before (#1610).
   * Two consequences follow from that and are the reason it matters: a full
   * document string lands where it belongs, `<head>` included, and the document
   * is *replaced* rather than having its body filled — so `head` and `body` are
   * rebuilt instead of going stale, which was the bug behind #1595.
   *
   * The URL is left alone. Setting content is not navigating, and rewriting the
   * URL would make `toHaveURL` disagree with where the page actually is.
   */
  setContent(html: string): void {
    this._commit(this.url, html, false)
  }

  /**
   * Navigates the frame to a URL
   */
  /**
   * Navigates the frame to a URL.
   *
   * This used to assign `this.url` and return null, so the document was never
   * replaced and every element lookup afterwards resolved against whatever was
   * there before.
   *
   * It now requests the URL through `fetch`, which means page routes and
   * request interception apply to a navigation as they do to any other request,
   * parses an HTML response into a fresh document, and returns the
   * main-resource `Response`. A non-network target such as `about:blank` gets a
   * blank document and returns null, as there is no response to report.
   *
   * What it deliberately does not do is run the page's scripts. External
   * `<script src>` is not fetched and inline module code is not evaluated, so a
   * document arrives parsed but inert: no framework boots and nothing hydrates.
   * Assertions that depend on client-side rendering belong in a real browser.
   */
  async goto(url: string, options: { referer?: string } = {}): Promise<Response | null> {
    return await this._navigate(this._resolve(url), { push: true, referer: options.referer })
  }

  /** Re-request the current URL, replacing the document. */
  async reload(): Promise<Response | null> {
    return await this._navigate(this.url, { push: false })
  }

  /** Step back through session history. */
  async goBack(): Promise<Response | null> {
    return await this.goSteps(-1)
  }

  /** Step forward through session history. */
  async goForward(): Promise<Response | null> {
    return await this.goSteps(1)
  }

  /**
   * Move `steps` through session history.
   *
   * Returns null when there is nowhere to go, which is also what a browser does
   * — the navigation simply does not happen.
   */
  async goSteps(steps: number): Promise<Response | null> {
    const target = this._historyIndex + steps
    if (steps === 0 || target < 0 || target >= this._history.length)
      return null

    this._historyIndex = target
    return await this._navigate(this._history[target], { push: false })
  }

  /** Resolve a possibly relative URL against where the frame currently is. */
  private _resolve(url: string): string {
    try {
      return new URL(url, this.url === INITIAL_FRAME_URL ? undefined : this.url).href
    }
    catch {
      // Not resolvable — hand it on unchanged and let the fetch report it.
      return url
    }
  }

  /** Whether a URL is something we can actually request. */
  private _isFetchable(url: string): boolean {
    return /^https?:/i.test(url)
  }

  /**
   * Send this frame's console output to the page as `console` events, while
   * still letting it through to the console underneath.
   *
   * The window's console is the host's by default, so page output went
   * straight to stdout and `page.on('console')` never ran (#1602).
   */
  /**
   * Route the window's dialog functions through the page.
   *
   * Installed on the frame's window rather than built into `Window`, the same way
   * the console is forwarded: a standalone `new Window()` keeps its stubs, which
   * are the right answer when there is no page to ask (#1612).
   */
  private _installDialogs(): void {
    const window = this.window as any
    const page = this._page

    window.alert = (message?: string): void => {
      // Nothing to return, but it is reported, so a test can assert an alert
      // happened — which was impossible when this was a bare no-op.
      page._requestDialog('alert', String(message ?? ''))
    }

    window.confirm = (message?: string): boolean => {
      return page._requestDialog('confirm', String(message ?? '')).accepted
    }

    window.prompt = (message?: string, defaultValue?: string): string | null => {
      const fallback = defaultValue === undefined ? '' : String(defaultValue)
      const outcome = page._requestDialog('prompt', String(message ?? ''), fallback)
      return outcome.accepted ? (outcome.text ?? fallback) : null
    }
  }

  private _forwardConsole(): void {
    const window = this.window as any
    const underlying = window.console
    if (!underlying)
      return

    const page = this._page
    const forwarding: any = Object.create(underlying)

    for (const method of ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const) {
      forwarding[method] = (...args: any[]): void => {
        page._emitConsole(method, ...args)
        underlying[method]?.(...args)
      }
    }

    window.console = forwarding
  }

  private async _navigate(
    url: string,
    options: { push: boolean, referer?: string },
  ): Promise<Response | null> {
    if (!this._isFetchable(url)) {
      // about:blank and friends: a fresh empty document, and no response.
      this._commit(url, '', options.push)
      return null
    }

    const context = this._page.context as any
    if (context?._emulation?.().offline) {
      // Offline is what application code branches on, so a navigation has to
      // fail rather than quietly succeed.
      const offline = new Error(`net::ERR_INTERNET_DISCONNECTED at ${url}`)
      this._page._emitError(offline)
      throw offline
    }

    let response: Response
    try {
      response = await fetch(url, {
        headers: {
          ...(context?._extraHTTPHeaders?.() ?? {}),
          ...(options.referer ? { referer: options.referer } : {}),
        },
      })
    }
    catch (error) {
      // A navigation that never arrives is a page error. Reported before the
      // throw so a listener sees it even though the caller also gets it.
      this._page._emitError(error instanceof Error ? error : new Error(String(error)))
      throw error
    }

    const contentType = response.headers.get('content-type') ?? ''
    // A redirect chain ends somewhere else; the document's URL is where it
    // actually landed.
    const landedAt = response.url || url

    // A response built by route.fulfill() carries no url, so a listener could
    // not tell which request it answered. Filled in rather than left blank;
    // a real fetch already reports its own and is left alone.
    if (!response.url) {
      Object.defineProperty(response, 'url', { value: landedAt, configurable: true })
    }

    this._page._emitResponse(response)

    // Only markup is parsed into the document. Anything else still navigates
    // and still returns its response, but leaves the document empty rather
    // than rendering bytes as HTML.
    const isMarkup = contentType === '' || /\b(?:html|xml)\b/i.test(contentType)
    const body = isMarkup ? await response.clone().text() : ''

    this._commit(landedAt, body, options.push)

    return response
  }

  /**
   * Give fragment markup the head/body structure a parsed document has.
   *
   * A browser parsing `<h1>Hi</h1>` yields
   * `<html><head></head><body><h1>Hi</h1></body></html>`. Assigning the
   * fragment directly would leave `documentElement` with only the `h1`, and
   * since `head` and `body` are derived from its children both would be null —
   * so `document.body.appendChild(...)` would fail after a perfectly ordinary
   * navigation.
   */
  /**
   * Attributes on the document's own `<html>` tag, which assigning to
   * `documentElement.innerHTML` cannot carry.
   *
   * `lang` is the one that matters: it is on nearly every real document, it is
   * what a screen reader reads to pick a voice, and it was silently lost — so a
   * test asserting the page declares a language failed against a page that does.
   */
  private _documentElementAttributes(html: string): Array<[string, string]> {
    const opening = /<html\b([^>]*)>/i.exec(html.replace(/^\s*<!doctype[^>]*>/i, ''))
    if (!opening)
      return []

    const attributes: Array<[string, string]> = []
    for (const match of opening[1].matchAll(/([a-z_:][\w:.-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/gi))
      attributes.push([match[1], match[2] ?? match[3] ?? match[4] ?? ''])

    return attributes
  }

  private _asDocumentMarkup(html: string): string {
    // A doctype is a prologue, not a node `documentElement` can hold.
    let markup = html.replace(/^\s*<!doctype[^>]*>/i, '').trim()

    // `documentElement` *is* the <html>, so a full document's own wrapper has to
    // come off. Assigning it whole nested an <html> inside the <html>, and the
    // result was a document whose elements existed — `body.innerHTML` showed
    // them — but which `document.querySelector` could not reach. A navigation
    // to any full document without a doctype landed in that state, so this is a
    // `goto` fix as much as a `setContent` one.
    const wrapped = /^<html\b[^>]*>([\s\S]*)<\/html\s*>$/i.exec(markup)
    if (wrapped)
      markup = wrapped[1]

    if (/<(?:html|body|head)\b/i.test(markup))
      return markup

    return `<head></head><body>${markup}</body>`
  }

  /**
   * Install a document and settle the frame on `url`.
   *
   * `readyState` walks loading → interactive → complete with the page's
   * `domcontentloaded` and `load` events in between, so a caller sees the same
   * ordering it would in a browser.
   */
  private _commit(url: string, html: string, push: boolean): void {
    const document = this.document as any

    document.readyState = 'loading'

    this.url = url

    if (push) {
      // A new navigation discards whatever was ahead in history.
      this._history = [...this._history.slice(0, this._historyIndex + 1), url]
      this._historyIndex = this._history.length - 1
    }
    else {
      this._history[this._historyIndex] = url
    }

    // Replace the document's contents wholesale. `head` and `body` are derived
    // from documentElement, so they follow this rather than going stale.
    document.documentElement.innerHTML = this._asDocumentMarkup(html)

    // Carried over separately, since an innerHTML assignment cannot set them.
    for (const [name, value] of this._documentElementAttributes(html))
      document.documentElement.setAttribute?.(name, value)
    this._content = html

    // Init scripts run against the fresh document, before the page's own code
    // would have, which is the point of registering one.
    this._runInitScripts()

    document.readyState = 'interactive'
    this._page.emit('domcontentloaded', this._page)
    document.dispatchEvent?.(new (this.window as any).Event('DOMContentLoaded', { bubbles: true }))

    document.readyState = 'complete'
    this._page.emit('load', this._page)
    this.window.dispatchEvent?.(new (this.window as any).Event('load'))

    this._announceNavigation()
  }
}
