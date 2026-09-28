import type { RequestInterceptionHandler } from '../network/RequestInterceptor'
import type { BrowserContext } from './BrowserContext'
import { Buffer } from 'node:buffer'
import type { Route, RouteHandler, RoutePattern, RouteRequest } from '../network/routing'
import { RequestInterceptor } from '../network/RequestInterceptor'
import type { GetByRoleOptions, GetByTextOptions } from './Locator'
import { RouteRegistry } from '../network/routing'
import { byAttribute, byLabel, byRole, byText, Locator } from './Locator'
import { BrowserFrame } from './BrowserFrame'

export interface IBrowserPageViewport {
  width: number
  height: number
}

export type PageEventType = 'console' | 'request' | 'response' | 'error' | 'load' | 'domcontentloaded'
// eslint-disable-next-line pickier/no-unused-vars
export type PageEventHandler = (event: any) => void

/**
 * BrowserPage represents a browser page (tab or popup window)
 * Compatible with Happy DOM's BrowserPage API
 */
export class BrowserPage {
  public mainFrame: BrowserFrame
  public console: Console
  // eslint-disable-next-line pickier/no-unused-vars
  public virtualConsolePrinter: ((type: string, ...args: any[]) => void) | null = null

  private _context: BrowserContext
  private _viewport: IBrowserPageViewport
  private _frames: BrowserFrame[] = []
  private _eventListeners = new Map<PageEventType, Set<PageEventHandler>>()
  private _requestInterceptor = new RequestInterceptor()
  private _routes = new RouteRegistry()
  private _routingInstalled = false

  constructor(context: BrowserContext) {
    this._context = context
    this._viewport = { width: 1024, height: 768 }
    // Inherit the browser's console so `new Browser({ console })` reaches pages
    // and, through them, each frame's Window.
    this.console = context?.browser?.console ?? globalThis.console

    // Create main frame
    this.mainFrame = new BrowserFrame(this)
    this._frames.push(this.mainFrame)
  }

  /**
   * Owner context
   */
  get context(): BrowserContext {
    return this._context
  }

  /**
   * Viewport settings
   */
  get viewport(): IBrowserPageViewport {
    return this._viewport
  }

  /**
   * All frames associated with the page
   */
  get frames(): BrowserFrame[] {
    return this._frames
  }

  /**
   * Page content HTML
   */
  get content(): string {
    return this.mainFrame.content
  }

  set content(html: string) {
    this.mainFrame.content = html
  }

  /**
   * Page URL
   */
  get url(): string {
    return this.mainFrame.url
  }

  set url(url: string) {
    this.mainFrame.url = url
  }

  /**
   * Closes the page
   */
  async close(): Promise<void> {
    await this.abort()
    // Remove from context
    this._context._removePage(this)
  }

  /**
   * Waits for all ongoing operations to complete
   */
  async waitUntilComplete(): Promise<void> {
    await Promise.all(this._frames.map(frame => frame.waitUntilComplete()))
  }

  /**
   * Waits for navigation to complete
   */
  async waitForNavigation(): Promise<void> {
    await this.mainFrame.waitForNavigation()
  }

  /**
   * Aborts all ongoing operations
   */
  async abort(): Promise<void> {
    await Promise.all(this._frames.map(frame => frame.abort()))
  }

  /**
   * Evaluates code in the page's context
   */
  evaluate(code: string | ((...args: any[]) => any), arg?: any): any {
    return this.mainFrame.evaluate(code, arg)
  }

  /**
   * Sets the viewport
   */
  setViewport(viewport: IBrowserPageViewport): void {
    this._viewport = { ...viewport }

    // Each frame owns a real Window, so the new size has to reach them or
    // `innerWidth` and width media queries would keep reporting the old one.
    for (const frame of this._frames) {
      frame.setViewport(this._viewport)
    }
  }

  /**
   * Navigates the main frame to a URL
   */
  async goto(url: string, options: { referer?: string } = {}): Promise<Response | null> {
    return await this.mainFrame.goto(url, options)
  }

  /**
   * Navigates back in the main frame's history
   */
  async goBack(): Promise<Response | null> {
    return await this.mainFrame.goBack()
  }

  /**
   * Navigates forward in the main frame's history
   */
  async goForward(): Promise<Response | null> {
    return await this.mainFrame.goForward()
  }

  /**
   * Navigates by steps in the main frame's history
   */
  async goSteps(steps: number): Promise<Response | null> {
    return await this.mainFrame.goSteps(steps)
  }

  /**
   * Reloads the page
   */
  async reload(): Promise<Response | null> {
    return await this.mainFrame.reload()
  }

  /**
   * Waits for a selector to appear in the DOM
   */
  async waitForSelector(
    selector: string,
    options: { timeout?: number, visible?: boolean } = {},
  ): Promise<any | null> {
    const { timeout = 30000, visible = false } = options
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const element = this.mainFrame.document.querySelector(selector)

      if (element) {
        if (!visible || (element as any).isVisible?.()) {
          return element
        }
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return null
  }

  /**
   * Waits for a function to return a truthy value
   */
  async waitForFunction(
    // eslint-disable-next-line pickier/no-unused-vars
    fn: ((...args: any[]) => any) | string,
    options: { timeout?: number, polling?: number | 'raf' } = {},
  ): Promise<any> {
    const { timeout = 30000, polling = 100 } = options
    const startTime = Date.now()
    const pollInterval = polling === 'raf' ? 16 : polling

    while (Date.now() - startTime < timeout) {
      const result = this.evaluate(fn)

      if (result) {
        return result
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    throw new Error(`waitForFunction timed out after ${timeout}ms`)
  }

  /**
   * Waits for a specified amount of time
   */
  async waitForTimeout(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms))
  }

  /** Resolve a selector against the main frame, or fail loudly. */
  private _element(selector: string): any {
    const element = this.mainFrame.document.querySelector(selector)
    if (!element)
      throw new Error(`Element not found: ${selector}`)
    return element
  }

  /** Whether typing into this element should go to `value` rather than text. */
  private _isValueField(element: any): boolean {
    return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA'
  }

  /** Read what the user would see in the field. */
  private _readField(element: any): string {
    // `value` is a property, distinct from the `value` attribute — which is
    // only the field's default. Reading the attribute misses everything typed
    // or assigned since, which is what made typing stop working after a
    // programmatic assignment.
    return this._isValueField(element) ? String(element.value ?? '') : String(element.textContent ?? '')
  }

  private _writeField(element: any, value: string): void {
    if (this._isValueField(element))
      element.value = value
    else
      element.textContent = value
  }

  private _dispatch(element: any, type: string, Ctor: string, init: Record<string, unknown> = {}): void {
    const window = this.mainFrame.window as any
    const Constructor = window[Ctor] ?? window.Event
    element.dispatchEvent?.(new Constructor(type, { bubbles: true, ...init }))
  }

  /**
   * Clicks an element matching the selector.
   *
   * Focuses first, as a real click does, so a handler reading
   * `document.activeElement` sees the element it was invoked on.
   */
  async click(selector: string, options: { delay?: number, button?: 'left' | 'right' | 'middle' } = {}): Promise<void> {
    const element = this._element(selector)

    if (options.delay)
      await this.waitForTimeout(options.delay)

    element.focus?.()
    element.click?.()
  }

  /**
   * Types text into an element, one character at a time.
   *
   * This used to write the `value` *attribute* and dispatch nothing, so the
   * field appeared to change while `element.value` did not and no listener
   * ran — reactive forms never saw the input. It now focuses the target and
   * emits the browser's sequence per character: keydown, beforeinput, the
   * value change, input, keyup.
   */
  async type(selector: string, text: string, options: { delay?: number } = {}): Promise<void> {
    await this._typeIntoElement(this._element(selector), text, options)
  }

  /** @internal Shared by `type()` and `Locator.type()`. */
  async _typeIntoElement(element: any, text: string, options: { delay?: number } = {}): Promise<void> {
    const delay = options.delay || 0

    element.focus?.()

    for (const char of text) {
      this._dispatch(element, 'keydown', 'KeyboardEvent', { key: char })
      this._dispatch(element, 'beforeinput', 'InputEvent', { data: char, inputType: 'insertText' })

      this._writeField(element, this._readField(element) + char)

      this._dispatch(element, 'input', 'InputEvent', { data: char, inputType: 'insertText' })
      this._dispatch(element, 'keyup', 'KeyboardEvent', { key: char })

      if (delay > 0)
        await this.waitForTimeout(delay)
    }
  }

  /**
   * Replaces an element's value in one step, as Playwright's `fill` does.
   *
   * Cheaper than `type()` when the individual keystrokes do not matter: one
   * `input` rather than a sequence per character. `change` follows, which is
   * what a field committed by the user would also emit.
   */
  async fill(selector: string, value: string): Promise<void> {
    await this._fillElement(this._element(selector), value)
  }

  /** @internal Shared by `fill()` and `Locator.fill()`. */
  async _fillElement(element: any, value: string): Promise<void> {
    element.focus?.()
    this._dispatch(element, 'beforeinput', 'InputEvent', { data: value, inputType: 'insertReplacementText' })
    this._writeField(element, value)
    this._dispatch(element, 'input', 'InputEvent', { data: value, inputType: 'insertReplacementText' })
    this._dispatch(element, 'change', 'Event')
  }

  /**
   * Focuses an element.
   *
   * Previously this only dispatched a `focus` event, leaving
   * `document.activeElement` untouched, so anything reading it disagreed with
   * the event that had just fired.
   */
  async focus(selector: string): Promise<void> {
    this._element(selector).focus?.()
  }

  /** Blurs an element. */
  async blur(selector: string): Promise<void> {
    this._element(selector).blur?.()
  }

  /**
   * Hovers over an element
   */
  async hover(selector: string): Promise<void> {
    await this._hoverElement(this._element(selector))
  }

  /** @internal Shared by `hover()` and `Locator.hover()`. */
  async _hoverElement(element: any): Promise<void> {
    // `mouseover` bubbles and is what delegated handlers listen for;
    // `mouseenter` does not bubble, matching the platform.
    this._dispatch(element, 'mouseover', 'MouseEvent')
    element.dispatchEvent?.(new ((this.mainFrame.window as any).MouseEvent ?? (this.mainFrame.window as any).Event)('mouseenter', { bubbles: false }))
  }

  /**
   * Keyboard actions, delivered to whatever currently has focus.
   *
   * These used to dispatch on the document regardless of focus, and inserted
   * no text, so `keyboard.type()` moved no characters into any field.
   */
  get keyboard(): {
    press: (key: string, options?: { delay?: number }) => Promise<void>
    type: (text: string, options?: { delay?: number }) => Promise<void>
  } {
    return {
      press: async (key: string, options: { delay?: number } = {}): Promise<void> => {
        const { delay = 0 } = options
        const document = this.mainFrame.document as any
        // Keyboard input goes to the focused element, and only falls back to
        // the document when nothing has focus.
        const target = document.activeElement ?? document

        this._dispatch(target, 'keydown', 'KeyboardEvent', { key })

        const editable = target !== document && (this._isValueField(target) || target.isContentEditable)
        if (editable && key.length === 1) {
          this._dispatch(target, 'beforeinput', 'InputEvent', { data: key, inputType: 'insertText' })
          this._writeField(target, this._readField(target) + key)
          this._dispatch(target, 'input', 'InputEvent', { data: key, inputType: 'insertText' })
        }
        else if (editable && key === 'Backspace') {
          const current = this._readField(target)
          if (current.length > 0) {
            this._dispatch(target, 'beforeinput', 'InputEvent', { inputType: 'deleteContentBackward' })
            this._writeField(target, current.slice(0, -1))
            this._dispatch(target, 'input', 'InputEvent', { inputType: 'deleteContentBackward' })
          }
        }

        if (delay > 0)
          await this.waitForTimeout(delay)

        this._dispatch(target, 'keyup', 'KeyboardEvent', { key })
      },

      type: async (text: string, options: { delay?: number } = {}): Promise<void> => {
        for (const char of text)
          await this.keyboard.press(char, options)
      },
    }
  }

  /**
   * Mouse actions.
   *
   * There is no layout, so a coordinate cannot be resolved to an element:
   * these dispatch on the document with the coordinates attached. Use
   * `click(selector)` to act on a specific element.
   */
  get mouse(): {
    click: (x: number, y: number, options?: { button?: 'left' | 'right' | 'middle', delay?: number }) => Promise<void>
    move: (x: number, y: number) => Promise<void>
  } {
    return {
      click: async (x: number, y: number, options: { button?: 'left' | 'right' | 'middle', delay?: number } = {}): Promise<void> => {
        const { delay = 0 } = options
        const document = this.mainFrame.document as any

        this._dispatch(document, 'mousedown', 'MouseEvent', { clientX: x, clientY: y })
        this._dispatch(document, 'mouseup', 'MouseEvent', { clientX: x, clientY: y })
        this._dispatch(document, 'click', 'MouseEvent', { clientX: x, clientY: y })

        if (delay > 0)
          await this.waitForTimeout(delay)
      },

      move: async (x: number, y: number): Promise<void> => {
        this._dispatch(this.mainFrame.document as any, 'mousemove', 'MouseEvent', { clientX: x, clientY: y })
      },
    }
  }

  /**
   * The attribute `getByTestId` looks at. Configurable, as Playwright allows.
   */
  private _testId = 'data-testid'

  /** Change the attribute `getByTestId` matches on. */
  setTestIdAttribute(name: string): void {
    this._testId = name
  }

  /** @internal */
  _testIdAttribute(): string {
    return this._testId
  }

  /** The document a locator resolves against. */
  private _locatorRoot(): any {
    return this.mainFrame.document
  }

  /**
   * A locator for a CSS selector.
   *
   * Resolved on each use rather than at creation, so it survives the DOM
   * changing underneath it — which is the point of holding a query instead of
   * an element.
   */
  locator(selector: string): Locator {
    return new Locator(
      this,
      () => Array.from(this._locatorRoot().querySelectorAll?.(selector) ?? []),
      `locator(${JSON.stringify(selector)})`,
    )
  }

  /** Elements by ARIA role, optionally narrowed by accessible name and state. */
  getByRole(role: string, options: GetByRoleOptions = {}): Locator {
    return new Locator(
      this,
      () => byRole(this._locatorRoot(), role, options),
      `getByRole(${JSON.stringify(role)})`,
    )
  }

  /** Elements by their own text. */
  getByText(text: string | RegExp, options: GetByTextOptions = {}): Locator {
    return new Locator(
      this,
      () => byText(this._locatorRoot(), text, options),
      `getByText(${String(text)})`,
    )
  }

  /** Form controls by their label, including `aria-label` and `aria-labelledby`. */
  getByLabel(text: string | RegExp, options: GetByTextOptions = {}): Locator {
    return new Locator(
      this,
      () => byLabel(this._locatorRoot(), text, options),
      `getByLabel(${String(text)})`,
    )
  }

  /** Fields by placeholder. */
  getByPlaceholder(text: string | RegExp, options: GetByTextOptions = {}): Locator {
    return new Locator(
      this,
      () => byAttribute(this._locatorRoot(), 'placeholder', text, options),
      `getByPlaceholder(${String(text)})`,
    )
  }

  /** Images by alt text. */
  getByAltText(text: string | RegExp, options: GetByTextOptions = {}): Locator {
    return new Locator(
      this,
      () => byAttribute(this._locatorRoot(), 'alt', text, options),
      `getByAltText(${String(text)})`,
    )
  }

  /** Elements by title attribute. */
  getByTitle(text: string | RegExp, options: GetByTextOptions = {}): Locator {
    return new Locator(
      this,
      () => byAttribute(this._locatorRoot(), 'title', text, options),
      `getByTitle(${String(text)})`,
    )
  }

  /** Elements by test id, matched exactly. */
  getByTestId(testId: string | RegExp): Locator {
    return new Locator(
      this,
      () => byAttribute(this._locatorRoot(), this._testId, testId, { exact: true }),
      `getByTestId(${String(testId)})`,
    )
  }

  /**
   * Read the page's title.
   */
  async title(): Promise<string> {
    return this.mainFrame.document.title ?? ''
  }

  /** The element's `textContent`. */
  async textContent(selector: string): Promise<string | null> {
    return this._element(selector).textContent ?? null
  }

  /** The element's rendered text. */
  async innerText(selector: string): Promise<string> {
    return String(this._element(selector).innerText ?? '')
  }

  /** The element's markup. */
  async innerHTML(selector: string): Promise<string> {
    return String(this._element(selector).innerHTML ?? '')
  }

  /**
   * The current value of a form field.
   *
   * Reads the `value` property, so it reflects what was typed or assigned
   * rather than the `value` attribute's default.
   */
  async inputValue(selector: string): Promise<string> {
    const element = this._element(selector)
    const tag = element.tagName

    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT')
      throw new Error(`Not a form field: ${selector} is <${String(tag).toLowerCase()}>`)

    return String(element.value ?? '')
  }

  /** An attribute, or null when it is absent. */
  async getAttribute(selector: string, name: string): Promise<string | null> {
    return this._element(selector).getAttribute?.(name) ?? null
  }

  /**
   * Whether the element would be visible.
   *
   * Resolved from the cascade, so a class that sets `display: none` counts —
   * not only an inline style. There is still no layout, so this cannot account
   * for zero-size, clipped or off-screen elements the way a browser does; it
   * answers "is this element and its ancestry displayed", which is what a test
   * asking "did the panel open" actually means.
   *
   * Returns false for a selector that matches nothing, as Playwright does,
   * rather than throwing — `isVisible` is usually asked of something that may
   * legitimately be absent.
   */
  async isVisible(selector: string): Promise<boolean> {
    const element = this.mainFrame.document.querySelector(selector) as any
    if (!element)
      return false

    return this._isRendered(element)
  }

  /** The inverse of {@link isVisible}. */
  async isHidden(selector: string): Promise<boolean> {
    return !(await this.isVisible(selector))
  }

  /** Whether a checkbox or radio is checked. */
  async isChecked(selector: string): Promise<boolean> {
    return this._element(selector).checked === true
  }

  /** Whether the control accepts interaction. */
  async isEnabled(selector: string): Promise<boolean> {
    return this._element(selector).disabled !== true
  }

  /** The inverse of {@link isEnabled}. */
  async isDisabled(selector: string): Promise<boolean> {
    return this._element(selector).disabled === true
  }

  /**
   * Whether the element's content can be edited: an enabled, writable form
   * field, or anything marked `contenteditable`.
   */
  async isEditable(selector: string): Promise<boolean> {
    const element = this._element(selector)

    if (element.isContentEditable === true)
      return true

    const tag = element.tagName
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT')
      return false

    return element.disabled !== true && element.readOnly !== true
  }

  /** Walk the ancestry for anything that would stop the element rendering. */
  private _isRendered(element: any): boolean {
    // A detached subtree renders nothing, whatever its styles say.
    if (element.isConnected === false)
      return false

    const window = this.mainFrame.window as any

    for (let node = element; node && node.nodeType === 1; node = node.parentNode) {
      if (node.hasAttribute?.('hidden'))
        return false

      const style = window.getComputedStyle(node)
      if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse')
        return false
    }

    return true
  }

  /**
   * Event emitter methods
   */
  on(event: PageEventType, handler: PageEventHandler): void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set())
    }
    this._eventListeners.get(event)!.add(handler)
  }

  off(event: PageEventType, handler: PageEventHandler): void {
    const handlers = this._eventListeners.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  emit(event: PageEventType, data: any): void {
    const handlers = this._eventListeners.get(event)
    if (handlers) {
      for (const handler of handlers) {
        handler(data)
      }
    }

    // Also call virtualConsolePrinter if it's a console event
    if (event === 'console' && this.virtualConsolePrinter) {
      this.virtualConsolePrinter(data.type, ...data.args)
    }
  }

  /**
   * Internal method to emit console events
   * @internal
   */
  _emitConsole(type: string, ...args: any[]): void {
    this.emit('console', { type, args })
  }

  /**
   * Internal method to emit request events
   * @internal
   */
  _emitRequest(request: any): void {
    this.emit('request', request)
  }

  /**
   * Internal method to emit response events
   * @internal
   */
  _emitResponse(response: any): void {
    this.emit('response', response)
  }

  /**
   * Internal method to emit error events
   * @internal
   */
  _emitError(error: Error): void {
    this.emit('error', error)
  }

  /**
   * Drag and drop simulation
   */
  async dragAndDrop(
    source: string,
    target: string,
    options: { delay?: number } = {},
  ): Promise<void> {
    const sourceElement = this.mainFrame.document.querySelector(source)
    const targetElement = this.mainFrame.document.querySelector(target)

    if (!sourceElement || !targetElement) {
      throw new Error('Source or target element not found')
    }

    // Dispatch drag events
    const dragStartEvent = new (this.mainFrame.window as any).Event('dragstart', { bubbles: true })
    // eslint-disable-next-line max-statements-per-line
    ;(sourceElement as any).dispatchEvent?.(dragStartEvent)

    if (options.delay) {
      await this.waitForTimeout(options.delay)
    }

    const dropEvent = new (this.mainFrame.window as any).Event('drop', { bubbles: true })
    // eslint-disable-next-line max-statements-per-line
    ;(targetElement as any).dispatchEvent?.(dropEvent)

    const dragEndEvent = new (this.mainFrame.window as any).Event('dragend', { bubbles: true })
    // eslint-disable-next-line max-statements-per-line
    ;(sourceElement as any).dispatchEvent?.(dragEndEvent)
  }

  /**
   * Handle requests matching `url` without touching the network.
   *
   * Registering a route enables interception on its own — there is no separate
   * `setRequestInterception(true)` step — and requests matching no route pass
   * through untouched, so a route cannot accidentally stall unrelated traffic
   * the way a bare `page.on('request')` handler can.
   *
   * `url` is a glob, a RegExp, or a predicate over the URL. The most recently
   * registered matching route runs first, and `route.fallback()` hands off to
   * the next one.
   */
  async route(url: RoutePattern, handler: RouteHandler): Promise<void> {
    this._routes.add(url, handler)
    this._installRouting()
  }

  /** Remove routes for `url`, or just the one using `handler`. */
  async unroute(url?: RoutePattern, handler?: RouteHandler): Promise<void> {
    this._routes.remove(url, handler)
  }

  /**
   * Install the single interceptor handler that drives routing.
   *
   * Done once and left in place: it is a no-op for a request no route matches,
   * so keeping it costs nothing and avoids tearing interception down while
   * another route is still registered.
   */
  private _installRouting(): void {
    if (this._routingInstalled)
      return
    this._routingInstalled = true

    this._requestInterceptor.enable()
    this._requestInterceptor.addHandler(async (request) => {
      await this._runRoutes(request)
    })
  }

  /** @internal Let a context enable routing on a page created before its route. */
  _ensureRouting(): void {
    this._installRouting()
  }

  /** Page routes take precedence, then the context's. */
  private _matchingRoutes(url: string): Array<{ handler: RouteHandler }> {
    const contextRoutes = (this._context as any)?._routeRegistry?.matching?.(url) ?? []
    return [...this._routes.matching(url), ...contextRoutes]
  }

  private async _runRoutes(request: any): Promise<void> {
    const candidates = this._matchingRoutes(request.url)
    if (candidates.length === 0)
      return

    const snapshot: RouteRequest = {
      url: request.url,
      method: request.method,
      headers: { ...request.headers },
      postData: request.postData ?? null,
      resourceType: request.resourceType ?? 'fetch',
    }

    for (const candidate of candidates) {
      let fellBack = false

      const route: Route = {
        request: () => snapshot,

        fulfill: async (options = {}) => {
          const isJson = options.json !== undefined
          const body = isJson ? JSON.stringify(options.json) : (options.body ?? '')
          const contentType = options.contentType ?? (isJson ? 'application/json' : undefined)

          request.respond({
            status: options.status ?? 200,
            headers: { ...(contentType ? { 'content-type': contentType } : {}), ...options.headers },
            body,
          })
        },

        abort: async (errorCode = 'failed') => {
          request.abort(errorCode)
        },

        continue: async (overrides = {}) => {
          request.continue(overrides)
        },

        fetch: async () => {
          // Perform the request as it stands, so a handler can rewrite the
          // response rather than only the request.
          return await fetch(snapshot.url, {
            method: snapshot.method,
            headers: snapshot.headers,
            body: snapshot.postData ?? undefined,
          })
        },

        fallback: async () => {
          fellBack = true
        },
      }

      await candidate.handler(route, snapshot)

      if (!fellBack)
        return
    }

    // Every matching route fell back, so the request goes through untouched.
  }

  /**
   * Enable or disable request interception
   */
  async setRequestInterception(enabled: boolean): Promise<void> {
    if (enabled) {
      this._requestInterceptor.enable()

      // Add default handler to emit events
      const handler: RequestInterceptionHandler = (request) => {
        this._emitRequest(request)
      }
      this._requestInterceptor.addHandler(handler)
    }
    else {
      this._requestInterceptor.disable()
      this._requestInterceptor.clear()
    }
  }

  /**
   * Takes a screenshot of the page.
   *
   * By default this returns a simple SVG representation of the DOM (virtual).
   * Pass `useWebView: true` to route through Bun.WebView for a real
   * browser-rendered capture — requires a Bun version that ships WebView.
   *
   * When `useWebView` is active and the page has a real URL, the WebView
   * navigates to it directly (preserving asset resolution); otherwise it
   * loads the rendered HTML as a data URL with optional css/baseUrl/fonts
   * injection, and the page's `virtualConsolePrinter` is wired through.
   */
  async screenshot(options: {
    type?: 'png' | 'jpeg' | 'webp'
    quality?: number
    fullPage?: boolean
    clip?: { x: number, y: number, width: number, height: number }
    omitBackground?: boolean
    encoding?: 'base64' | 'binary'
    useWebView?: boolean | {
      backend?: 'webkit' | 'chrome'
      waitFor?: number
      timeout?: number
      css?: string
      baseUrl?: string
      fonts?: Array<{ family: string, url: string, weight?: string, style?: string }>
      // eslint-disable-next-line pickier/no-unused-vars
      console?: true | ((event: unknown) => void)
    }
  } = {}): Promise<string | Buffer> {
    const {
      type = 'png',
      quality = 100,
      fullPage: _fullPage = false,
      encoding = 'binary',
      useWebView,
    } = options

    if (useWebView) {
      const { WebViewCapture } = await import('../screenshot/webview')
      const overrides = typeof useWebView === 'object' ? useWebView : {}

      // Forward the page's virtualConsolePrinter when the caller has not
      // supplied their own console hook. Reshape `(type, ...args) => void`
      // into the event-callback shape Bun.WebView expects.
      const printer = this.virtualConsolePrinter
      const consoleHook = overrides.console
        ?? (printer
          ? (event: unknown) => {
              const e = event as { type?: string, args?: unknown[] } | undefined
              printer(e?.type ?? 'log', ...(e?.args ?? [event]))
            }
          : undefined)

      const capture = new WebViewCapture()
      try {
        const pageUrl = this._realPageUrl()
        const opts = {
          width: this._viewport.width,
          height: this._viewport.height,
          format: type,
          quality,
          encoding: encoding === 'base64' ? ('base64' as const) : ('buffer' as const),
          ...overrides,
          console: consoleHook,
        }
        const shot = pageUrl
          ? await capture.captureUrl(pageUrl, opts)
          : await capture.captureHtml(this.content, opts)
        return shot as string | Buffer
      }
      finally {
        capture.dispose()
      }
    }

    // Virtual-DOM fallback: emit an SVG snapshot of the HTML.
    const html = this.content
    const svg = this._generateSVG(html)

    if (encoding === 'base64') {
      return Buffer.from(svg).toString('base64')
    }

    return Buffer.from(svg)
  }

  private _realPageUrl(): string | null {
    const url = this.url
    if (!url || url === 'about:blank' || url.startsWith('data:'))
      return null
    return /^[a-z][\w+.-]*:/i.test(url) ? url : null
  }

  /**
   * Generates a PDF of the page
   * Note: In virtual DOM, this generates a simple PDF-like representation
   */
  async pdf(options: {
    path?: string
    scale?: number
    displayHeaderFooter?: boolean
    headerTemplate?: string
    footerTemplate?: string
    printBackground?: boolean
    landscape?: boolean
    pageRanges?: string
    format?: 'Letter' | 'Legal' | 'Tabloid' | 'Ledger' | 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6'
    width?: string | number
    height?: string | number
    margin?: {
      top?: string | number
      right?: string | number
      bottom?: string | number
      left?: string | number
    }
    preferCSSPageSize?: boolean
  } = {}): Promise<Buffer> {
    const {
      scale: _scale = 1,
      displayHeaderFooter: _displayHeaderFooter = false,
      printBackground: _printBackground = false,
      landscape: _landscape = false,
      format: _format = 'A4',
    } = options

    // Generate a simple PDF representation
    const html = this.content
    const pdf = this._generatePDF(html)

    return Buffer.from(pdf)
  }

  private _generateSVG(html: string): string {
    const width = this._viewport.width
    const height = this._viewport.height

    // Simple SVG representation
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml">
      <pre style="font-family: monospace; font-size: 12px; padding: 10px;">${this._escapeXML(html.substring(0, 500))}</pre>
    </div>
  </foreignObject>
</svg>`
  }

  private _generatePDF(html: string): string {
    const _title = this.mainFrame.document.title || 'Document'

    // Simple PDF-like text representation
    return `%PDF-1.4
% VeryHappyDOM Generated PDF
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Count 1
/Kids [3 0 R]
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length ${html.length}
>>
stream
${html}
endstream
endobj

xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${284 + html.length}
%%EOF`
  }

  /* eslint-disable max-statements-per-line */
  private _escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
  /* eslint-enable max-statements-per-line */
}
