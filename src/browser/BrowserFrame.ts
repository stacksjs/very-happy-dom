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
    // For now, this is a no-op
    // In a full implementation, this would wait for resources, scripts, etc.
  }

  /**
   * Waits for navigation to complete after a link click or redirect
   */
  async waitForNavigation(): Promise<void> {
    // For now, this is a no-op
    // In a full implementation, this would wait for the new page to load
  }

  /**
   * Aborts all ongoing operations
   */
  async abort(): Promise<void> {
    // For now, this is a no-op
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
    if (typeof code === 'function') {
      // eslint-disable-next-line no-new-func
      const runner = new Function('window', 'document', 'arg', `with (window) { return (${code.toString()})(arg) }`)
      return runner(this.window, this.document, arg)
    }

    // eslint-disable-next-line no-new-func
    const runner = new Function('window', 'document', 'arg', `with (window) { return (${code}) }`)
    const result = runner(this.window, this.document, arg)

    // A string may itself be a function expression, which Playwright allows;
    // an expression that merely evaluates to a value is returned as-is.
    return typeof result === 'function' ? result(arg) : result
  }

  /**
   * Navigates the frame to a URL
   */
  async goto(url: string): Promise<Response | null> {
    this.url = url
    // In a real implementation, this would fetch the URL and load content
    // For now, just update the URL
    return null
  }

  /**
   * Navigates back in history
   */
  async goBack(): Promise<Response | null> {
    // For now, this is a no-op
    return null
  }

  /**
   * Navigates forward in history
   */
  async goForward(): Promise<Response | null> {
    // For now, this is a no-op
    return null
  }

  /**
   * Navigates by a number of steps in history
   */
  async goSteps(_steps: number): Promise<Response | null> {
    // For now, this is a no-op
    return null
  }

  /**
   * Reloads the frame
   */
  async reload(): Promise<Response | null> {
    // For now, this is a no-op
    return null
  }
}
