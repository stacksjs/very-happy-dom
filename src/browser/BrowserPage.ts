import { isChecked } from '../aria/state'
import { isRendered } from '../aria/visibility'
import type { RequestInterceptionHandler } from '../network/RequestInterceptor'
import type { BrowserContext } from './BrowserContext'
import { Buffer } from 'node:buffer'
import type { Route, RouteHandler, RoutePattern, RouteRequest } from '../network/routing'
import { RequestInterceptor } from '../network/RequestInterceptor'
import type { GetByRoleOptions, GetByTextOptions, WaitForState } from './Locator'
import { matchesPattern, RouteRegistry } from '../network/routing'
import { byAttribute, byLabel, byRole, byText, Locator } from './Locator'
import { BrowserFrame } from './BrowserFrame'
import { canonicalModifier, codeFor, modifierFlagFor, parseCombination, shiftKeyValue } from './keys'
import { TimeoutError, waitUntil } from './waiting'

export interface IBrowserPageViewport {
  width: number
  height: number
}

export type PageEventType = 'console' | 'request' | 'response' | 'error' | 'load' | 'domcontentloaded'
// eslint-disable-next-line pickier/no-unused-vars
export type PageEventHandler = (event: any) => void

/**
 * Which event to settle on.
 *
 * A string is a Playwright glob and a RegExp is used as written, both against
 * the URL. A function receives the event itself — the `Response` or the request
 * — rather than its URL, so it can look at the status too. That is Playwright's
 * split, and it is why this cannot simply be a `RoutePattern`, whose function
 * form takes a URL.
 */
// eslint-disable-next-line pickier/no-unused-vars
export type EventTarget<T = any> = string | RegExp | ((event: T) => boolean)

export interface WaitForEventOptions {
  /** Which occurrence to settle on. Without one, the first event wins. */
  // eslint-disable-next-line pickier/no-unused-vars
  predicate?: (event: any) => boolean
  timeout?: number
}

/** The load states this page can actually report. */
export type LoadState = 'load' | 'domcontentloaded'

/** How a caller can name an `<option>`: by value, label, index, or bare value. */
export type SelectOptionValue = string | { value?: string, label?: string, index?: number }

/** A file to attach: a path on disk, or bytes with a name. */
export type InputFile = string | { name: string, mimeType?: string, buffer: Uint8Array | ArrayBuffer | string }

/**
 * Whether an `<option>` answers to what the caller asked for.
 *
 * `label` falls back to the option's text, because `HTMLOptionElement.label` and
 * `.text` are not implemented here — reading `textContent` is what makes
 * `{ label: 'Alpha' }` work at all.
 */
function matchesOption(option: any, index: number, want: SelectOptionValue): boolean {
  if (typeof want === 'string')
    return String(option.value ?? '') === want

  if (want.index !== undefined)
    return index === want.index

  if (want.value !== undefined)
    return String(option.value ?? '') === want.value

  if (want.label !== undefined) {
    const label = option.getAttribute?.('label') ?? option.textContent ?? ''
    return String(label).replace(/\s+/g, ' ').trim() === want.label
  }

  return false
}

/**
 * Marks a response that has already been reported, so the interceptor and a
 * navigation can both announce without the page seeing it twice.
 */
const ANNOUNCED = Symbol('very-happy-dom.responseAnnounced')

/**
 * Whether an event satisfies a target.
 *
 * A function sees the event; a string or RegExp is matched against its URL
 * through the same `matchesPattern` the routes use, so a glob cannot mean one
 * thing to `route()` and another to `waitForResponse()`.
 */
function matchesTarget(target: EventTarget, event: any): boolean {
  if (typeof target === 'function')
    return target(event) === true

  return matchesPattern(target, String(event?.url ?? ''))
}

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
  /** Modifiers currently held down, so a later press reports them. */
  private _heldModifiers = new Set<string>()
  /** Whether `setRequestInterception(true)` asked for interception in its own right. */
  private _explicitInterception = false
  /** The one handler that drives routing, held so it can be taken off again. */
  private _routingHandler: RequestInterceptionHandler = async (request) => {
    await this._runRoutes(request)
  }
  private _routes = new RouteRegistry()
  private _routingInstalled = false
  private _defaultTimeout: number | null = null

  constructor(context: BrowserContext) {
    this._context = context
    this._viewport = { width: 1024, height: 768 }
    // Inherit the browser's console so `new Browser({ console })` reaches pages
    // and, through them, each frame's Window.
    this.console = context?.browser?.console ?? globalThis.console

    // Create main frame
    this.mainFrame = new BrowserFrame(this)
    this._frames.push(this.mainFrame)

    // Registered once here rather than in the two places that enable
    // interception, so `route()` and `setRequestInterception(true)` both report
    // their traffic and neither can register it twice. Observers rather than
    // handlers, because `setRequestInterception(false)` clears handlers — a
    // reporting handler would be dropped and never come back.
    this._requestInterceptor.addRequestObserver((request) => {
      this._emitRequest(request)
    })
    this._requestInterceptor.addResponseObserver((response) => {
      this._emitResponse(response)
    })
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
  /** @internal Evaluate against the main frame with an explicit argument list. */
  _evaluateWith(code: string | ((...args: any[]) => any), args: any[]): any {
    return (this.mainFrame as any)._evaluateWith(code, args)
  }

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

  /** @internal Push the context's emulation onto every frame. */
  _applyEmulation(): void {
    for (const frame of this._frames)
      (frame as any)._applyEmulation?.()
  }

  /** @internal Evaluate the context's init scripts in every frame. */
  _runInitScripts(): void {
    for (const frame of this._frames)
      (frame as any)._runInitScripts?.()
  }

  /**
   * Default timeout for the `waitFor*` family, falling back to the context's
   * and then to 30 seconds.
   */
  setDefaultTimeout(timeout: number): void {
    this._defaultTimeout = timeout
  }

  /** @internal The timeout a `waitFor*` call should use when given none. */
  _defaultTimeoutMs(): number {
    return this._defaultTimeout ?? (this._context as any)?._timeout?.() ?? 30000
  }

  /**
   * Wait for a selector to reach a state, and answer with the element.
   *
   * This used to answer a timeout with `null`, while `waitForFunction` twenty
   * lines below threw — two functions side by side disagreeing about what a
   * timeout is, so whichever one a reader learned first was wrong about the
   * other (#1605).
   *
   * The `null` was the worse half. `const row = await page.waitForSelector('.row')`
   * followed by `row.click()` reported `null is not an object`, pointing at the
   * click, with the selector, the timeout and the wait nowhere in the message.
   *
   * `null` now means only one thing: the element is legitimately not there, for
   * the `detached` and `hidden` states that were waiting for exactly that.
   */
  async waitForSelector(
    selector: string,
    options: { timeout?: number, state?: WaitForState, visible?: boolean } = {},
  ): Promise<any | null> {
    // `visible: true` predates the `state` option and still means what it said.
    const state: WaitForState = options.state ?? (options.visible ? 'visible' : 'attached')
    const timeout = options.timeout ?? this._defaultTimeoutMs()

    return waitUntil<any | null>(
      () => {
        const element = this.mainFrame.document.querySelector(selector) as any

        if (state === 'detached') {
          return element
            ? { done: false, reason: 'the element was still attached' }
            : { done: true, value: null }
        }

        if (state === 'hidden') {
          if (!element)
            return { done: true, value: null }

          return this._isRendered(element)
            ? { done: false, reason: 'the element was still visible' }
            : { done: true, value: element }
        }

        if (!element)
          return { done: false, reason: 'no element matched' }

        if (state === 'visible' && !this._isRendered(element))
          return { done: false, reason: 'an element matched, but it was hidden' }

        return { done: true, value: element }
      },
      {
        timeout,
        describe: reason => `Timed out ${timeout}ms waiting for selector ${JSON.stringify(selector)} to be ${state}: ${reason}`,
      },
    )
  }

  /**
   * Wait for a function to return something truthy, and answer with it.
   *
   * Throws a `TimeoutError` now rather than a bare `Error`, so a caller can catch
   * a timeout without matching on the message — and so this and
   * `waitForSelector` raise the same type.
   */
  async waitForFunction(
    // eslint-disable-next-line pickier/no-unused-vars
    fn: ((...args: any[]) => any) | string,
    options: { timeout?: number, polling?: number | 'raf' } = {},
  ): Promise<any> {
    const timeout = options.timeout ?? this._defaultTimeoutMs()

    return waitUntil<any>(
      () => {
        const result = this.evaluate(fn)
        return result
          ? { done: true, value: result }
          : { done: false, reason: `it last returned ${JSON.stringify(result) ?? String(result)}` }
      },
      {
        timeout,
        describe: reason => `Timed out ${timeout}ms waiting for the function to return a truthy value: ${reason}`,
      },
    )
  }

  /**
   * Waits for a specified amount of time
   */
  async waitForTimeout(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Settle on the next matching page event (#1606).
   *
   * The events already fired; what was missing was a promise to await on one.
   * Registering a handler and hoping means guessing how long to wait, and
   * guessing wrong fails in both directions — too short and it flakes, too long
   * and every test pays for it.
   *
   * Subscribe *before* the action that triggers the event, which is what the
   * documented shape does:
   *
   *     const [response] = await Promise.all([
   *       page.waitForResponse('** /api/trails'),
   *       page.getByRole('button', { name: 'Search' }).click(),
   *     ])
   *
   * There is no replay of events that already fired, as in Playwright. It
   * matters more here, because `goto()` emits synchronously and returns, so the
   * window between the action and the subscription is zero rather than a
   * process boundary. Waiting after the fact therefore times out — and the
   * message says so rather than leaving a bare "timed out" to be puzzled over.
   */
  async waitForEvent(
    event: PageEventType,
    optionsOrPredicate: WaitForEventOptions | ((event: any) => boolean) = {},
  ): Promise<any> {
    const options = typeof optionsOrPredicate === 'function'
      ? { predicate: optionsOrPredicate }
      : optionsOrPredicate
    const timeout = options.timeout ?? this._defaultTimeoutMs()

    let settle: (value: any) => void
    let fail: (error: Error) => void
    const landed = new Promise<any>((resolve, reject) => {
      settle = resolve
      fail = reject
    })

    let seen = 0
    const handler = (data: any): void => {
      seen++
      try {
        if (options.predicate && !options.predicate(data))
          return
      }
      catch (error) {
        // A throwing predicate is the caller's bug, and hiding it behind a
        // timeout would send them looking in the wrong place.
        fail(error instanceof Error ? error : new Error(String(error)))
        return
      }

      settle(data)
    }

    this.on(event, handler)
    const expiry = setTimeout(() => {
      // How many went past matters: none at all is a different problem from
      // several that the predicate turned down.
      const saw = seen === 0
        ? `no ${event} event fired`
        : `${seen} ${event} event(s) fired, none matched`
      fail(new TimeoutError(
        `Timed out ${timeout}ms waiting for a ${event} event: ${saw}. `
        + 'Subscribe before the action that triggers it — '
        + 'await Promise.all([page.waitForEvent(...), action()]) — as an event that has already fired is not replayed.',
      ))
    }, timeout)

    try {
      return await landed
    }
    finally {
      // Both paths, always. A handler left behind answers later tests' events
      // and breaks them a long way from here.
      clearTimeout(expiry)
      this.off(event, handler)
    }
  }

  /**
   * Settle on the next matching response.
   *
   * The event carries the `Response` itself, so a predicate reads `url` and
   * `status` as properties rather than as Playwright's accessor calls.
   */
  async waitForResponse(
    urlOrPredicate: EventTarget,
    options: { timeout?: number } = {},
  ): Promise<any> {
    return this.waitForEvent('response', {
      timeout: options.timeout,
      predicate: response => matchesTarget(urlOrPredicate, response),
    })
  }

  /**
   * Settle on the next matching request.
   *
   * Requests are only reported while interception is on, which `page.route()`
   * turns on as a side effect and `setRequestInterception(true)` turns on
   * directly. Without either, nothing is emitted and this can only time out —
   * so it says as much rather than leaving a bare timeout to be puzzled over.
   */
  async waitForRequest(
    urlOrPredicate: EventTarget,
    options: { timeout?: number } = {},
  ): Promise<any> {
    if (!this._requestInterceptor.enabled) {
      throw new Error(
        'waitForRequest() needs request interception, which nothing has turned on. '
        + 'Call page.route(...) or page.setRequestInterception(true) first — without it no request event is ever emitted.',
      )
    }

    return this.waitForEvent('request', {
      timeout: options.timeout,
      predicate: request => matchesTarget(urlOrPredicate, request),
    })
  }

  /**
   * Wait for the document to reach a load state, or return at once if it has.
   *
   * Returning at once is the point: this is usually called after a navigation
   * that has already finished, and waiting for an event that fired a moment ago
   * would hang for the whole timeout.
   *
   * `networkidle` is deliberately not accepted. Nothing here tracks in-flight
   * requests, so it could only ever be a lie, and a name that throws is better
   * than one that resolves immediately and means nothing.
   */
  async waitForLoadState(state: LoadState = 'load', options: { timeout?: number } = {}): Promise<void> {
    if (state !== 'load' && state !== 'domcontentloaded') {
      throw new Error(
        `waitForLoadState('${String(state)}') is not supported: only 'load' and 'domcontentloaded' can be reported. `
        + 'Nothing tracks in-flight requests, so there is no honest answer for networkidle.',
      )
    }

    const reached = state === 'load'
      ? ['complete']
      : ['interactive', 'complete']

    if (reached.includes(String((this.mainFrame.document as any).readyState)))
      return

    await this.waitForEvent(state, { timeout: options.timeout })
  }

  /**
   * Wait for the page's URL to match, or return at once if it already does.
   *
   * Polled rather than driven off an event, because `pushState` and
   * `replaceState` move the URL without a navigation, and a test asserting on a
   * client-side route change has no event to hang off.
   */
  async waitForURL(urlOrPredicate: EventTarget<string>, options: { timeout?: number } = {}): Promise<void> {
    await waitUntil<undefined>(
      () => {
        const url = this.url
        const matched = typeof urlOrPredicate === 'function'
          ? urlOrPredicate(url) === true
          : matchesPattern(urlOrPredicate, url)

        return matched
          ? { done: true, value: undefined }
          : { done: false, reason: `the URL was ${JSON.stringify(url)}` }
      },
      {
        timeout: options.timeout ?? this._defaultTimeoutMs(),
        describe: reason => `Timed out waiting for the URL to match ${String(urlOrPredicate)}: ${reason}`,
      },
    )
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
  /**
   * @internal Select options on a `<select>` and report what ended up chosen.
   *
   * Setting `select.value` directly does not fire `change`, so a component
   * listening for it never updates and the test passes against a DOM the
   * application never saw. That is the whole reason this exists rather than
   * leaving callers to assign the property (#1608).
   */
  async _selectOptions(element: any, wanted: SelectOptionValue[]): Promise<string[]> {
    const tag = String(element.tagName ?? '').toUpperCase()
    if (tag !== 'SELECT')
      throw new Error(`selectOption() expects a <select>, not <${tag.toLowerCase() || 'unknown'}>`)

    if (wanted.length > 1 && !element.hasAttribute?.('multiple')) {
      // Silently taking the last would leave the test asserting against a
      // selection it never asked for.
      throw new Error(
        `selectOption() was given ${wanted.length} values, but this <select> is not multiple. `
        + 'Add the multiple attribute, or pass one value.',
      )
    }

    const options: any[] = Array.from(element.querySelectorAll?.('option') ?? [])

    for (const option of options)
      option.selected = false

    const chosen: any[] = []
    for (const want of wanted) {
      const match = options.find((option, index) => matchesOption(option, index, want))
      if (!match)
        throw new Error(`selectOption() found no <option> matching ${JSON.stringify(want)}`)

      match.selected = true
      chosen.push(match)
    }

    element.focus?.()
    this._dispatch(element, 'input', 'InputEvent', { inputType: 'insertReplacementText' })
    this._dispatch(element, 'change', 'Event')

    return chosen.map(option => String(option.value ?? ''))
  }

  /**
   * @internal Attach files to an `<input type=file>` and announce the change.
   *
   * Assigning to `input.files` needs a `FileList`, which is why Playwright has a
   * method for this at all. A string is read from disk, as Playwright does; an
   * object is built in memory, which is what a test usually wants.
   */
  async _setInputFiles(element: any, files: InputFile[]): Promise<void> {
    const tag = String(element.tagName ?? '').toUpperCase()
    const type = String(element.getAttribute?.('type') ?? '').toLowerCase()
    if (tag !== 'INPUT' || type !== 'file')
      throw new Error(`setInputFiles() expects an <input type="file">, not <${tag.toLowerCase() || 'unknown'} type="${type}">`)

    if (files.length > 1 && !element.hasAttribute?.('multiple')) {
      throw new Error(
        `setInputFiles() was given ${files.length} files, but this input is not multiple. `
        + 'Add the multiple attribute, or pass one file.',
      )
    }

    const window = this.mainFrame.window as any
    const built: any[] = []

    for (const file of files) {
      if (typeof file === 'string') {
        const handle = Bun.file(file)
        const bytes = new Uint8Array(await handle.arrayBuffer())
        built.push(new window.File([bytes], file.split('/').pop() ?? file, { type: handle.type || '' }))
        continue
      }

      built.push(new window.File([file.buffer], file.name, { type: file.mimeType ?? '' }))
    }

    element.files = new window.FileList(built)

    element.focus?.()
    this._dispatch(element, 'input', 'InputEvent', { inputType: 'insertReplacementText' })
    this._dispatch(element, 'change', 'Event')
  }

  /**
   * @internal Two clicks and the `dblclick` a browser adds on top.
   *
   * The extra event is the part two `click()` calls does not give, and it is the
   * one a double-click handler listens for.
   */
  async _dblclickElement(element: any): Promise<void> {
    element.focus?.()
    element.click?.()
    element.click?.()
    this._dispatch(element, 'dblclick', 'MouseEvent', { detail: 2 })
  }

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
  /** Choose options on a `<select>` found by selector. */
  async selectOption(
    selector: string,
    values: SelectOptionValue | SelectOptionValue[] | null,
  ): Promise<string[]> {
    const wanted = values === null ? [] : (Array.isArray(values) ? values : [values])
    return this._selectOptions(this._element(selector), wanted)
  }

  /** Attach files to an `<input type=file>` found by selector. */
  async setInputFiles(selector: string, files: InputFile | InputFile[] | null): Promise<void> {
    const wanted = files === null ? [] : (Array.isArray(files) ? files : [files])
    await this._setInputFiles(this._element(selector), wanted)
  }

  /** Focus the element and press a key, or a `Modifier+Key` combination. */
  async press(selector: string, key: string, options: { delay?: number } = {}): Promise<void> {
    this._element(selector).focus?.()
    await this.keyboard.press(key, options)
  }

  /** Empty a field. */
  async clear(selector: string): Promise<void> {
    await this._fillElement(this._element(selector), '')
  }

  /** Two clicks, plus the `dblclick` event. */
  async dblclick(selector: string): Promise<void> {
    await this._dblclickElement(this._element(selector))
  }

  /** Tick a checkbox or radio, doing nothing when it is already ticked. */
  async check(selector: string): Promise<void> {
    const element = this._element(selector)
    if (!isChecked(element)) {
      element.focus?.()
      element.click?.()
    }
  }

  /** Untick a checkbox, doing nothing when it is already clear. */
  async uncheck(selector: string): Promise<void> {
    const element = this._element(selector)
    if (isChecked(element)) {
      element.focus?.()
      element.click?.()
    }
  }

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
    down: (key: string) => Promise<void>
    up: (key: string) => Promise<void>
    type: (text: string, options?: { delay?: number }) => Promise<void>
  } {
    return {
      /**
       * Press a key, or a `Modifier+Key` combination.
       *
       * Composed from `down`/`up` rather than dispatching its own events, so a
       * combination and a held modifier cannot disagree about what a press looks
       * like. Modifiers go down in the order given and come up in reverse, which
       * is what a browser does.
       */
      press: async (combination: string, options: { delay?: number } = {}): Promise<void> => {
        const { delay = 0 } = options
        const { held, key } = parseCombination(combination)

        for (const modifier of held)
          await this.keyboard.down(modifier)

        await this.keyboard.down(key)

        if (delay > 0)
          await this.waitForTimeout(delay)

        await this.keyboard.up(key)

        for (const modifier of [...held].reverse())
          await this.keyboard.up(modifier)
      },

      /** Hold a key down, so later presses see it. */
      down: async (key: string): Promise<void> => {
        const modifier = canonicalModifier(key)
        if (modifier)
          this._heldModifiers.add(modifier)

        const resolved = modifier ?? key
        const target = this._keyboardTarget()
        this._dispatchKey(target, 'keydown', resolved)

        if (modifier)
          return

        this._insertForKey(target, resolved)
      },

      /** Release a key. */
      up: async (key: string): Promise<void> => {
        const modifier = canonicalModifier(key)
        // Cleared before the event, so releasing Control reports ctrlKey false
        // on its own keyup, as a browser does.
        if (modifier)
          this._heldModifiers.delete(modifier)

        this._dispatchKey(this._keyboardTarget(), 'keyup', modifier ?? key)
      },

      type: async (text: string, options: { delay?: number } = {}): Promise<void> => {
        for (const char of text)
          await this.keyboard.press(char, options)
      },
    }
  }

  /**
   * Where keyboard input goes: the focused element, or the document when nothing
   * has focus.
   */
  private _keyboardTarget(): any {
    const document = this.mainFrame.document as any
    return document.activeElement ?? document
  }

  /** The modifier flags currently held, as a `KeyboardEvent` init. */
  private _modifierState(): Record<string, boolean> {
    const state: Record<string, boolean> = { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false }
    for (const modifier of this._heldModifiers) {
      const flag = modifierFlagFor(modifier)
      if (flag)
        state[flag] = true
    }
    return state
  }

  /** A keyboard event carrying the held modifiers and the key's `code`. */
  private _dispatchKey(target: any, type: 'keydown' | 'keyup', key: string): void {
    const resolved = shiftKeyValue(key, this._heldModifiers.has('Shift'))
    this._dispatch(target, type, 'KeyboardEvent', {
      key: resolved,
      code: codeFor(key),
      ...this._modifierState(),
    })
  }

  /**
   * Write the key's text into an editable target, if it produces any.
   *
   * A modified key does not: `Control+a` selects, it does not type an "a". Shift
   * is the exception, because shifting is how a capital is produced in the first
   * place.
   */
  private _insertForKey(target: any, key: string): void {
    const document = this.mainFrame.document as any
    const editable = target !== document && (this._isValueField(target) || target.isContentEditable)
    if (!editable)
      return

    const held = this._modifierState()
    if (held.ctrlKey || held.altKey || held.metaKey)
      return

    const text = shiftKeyValue(key, held.shiftKey)

    if (text.length === 1) {
      this._dispatch(target, 'beforeinput', 'InputEvent', { data: text, inputType: 'insertText' })
      this._writeField(target, this._readField(target) + text)
      this._dispatch(target, 'input', 'InputEvent', { data: text, inputType: 'insertText' })
      return
    }

    if (key === 'Backspace') {
      const current = this._readField(target)
      if (current.length === 0)
        return
      this._dispatch(target, 'beforeinput', 'InputEvent', { inputType: 'deleteContentBackward' })
      this._writeField(target, current.slice(0, -1))
      this._dispatch(target, 'input', 'InputEvent', { inputType: 'deleteContentBackward' })
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
  /**
   * Run `fn` against the first element matching `selector`.
   *
   * The discouraged form, kept for ports: it takes the first match rather than
   * refusing an ambiguous selector, which is exactly the silence
   * `locator().evaluate()` exists to avoid. Prefer that.
   */
  async $eval(selector: string, fn: string | ((element: any, arg?: any) => any), arg?: any): Promise<any> {
    return this.locator(selector).first().evaluate(fn, arg)
  }

  /** Run `fn` against every element matching `selector`, as an array. */
  async $$eval(selector: string, fn: string | ((elements: any[], arg?: any) => any), arg?: any): Promise<any> {
    return this.locator(selector).evaluateAll(fn, arg)
  }

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
    return isChecked(this._element(selector))
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

    // Shared with the locator queries, so "hidden" has one definition here.
    // Deliberately not the aria variant: an aria-hidden element is painted,
    // so it is visible even though a role query skips it (#1601).
    return isRendered(element)
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
   * Report a response — once per response.
   *
   * @internal
   *
   * A navigation whose request went through interception has two announcers
   * with equal claim: the interceptor that produced the response, and the
   * navigation that then used it. Keyed on the response object itself, so
   * neither has to know the other exists and a third caller cannot double up
   * either.
   */
  _emitResponse(response: any): void {
    if (response !== null && typeof response === 'object') {
      if ((response as any)[ANNOUNCED] === true)
        return

      try {
        Object.defineProperty(response, ANNOUNCED, { value: true, configurable: true })
      }
      catch {
        // A sealed response cannot be marked. Reporting it twice is a smaller
        // problem than not reporting it at all.
      }
    }

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
    this._syncInterception()
  }

  /** Remove routes for `url`, or just the one using `handler`. */
  async unroute(url?: RoutePattern, handler?: RouteHandler): Promise<void> {
    this._routes.remove(url, handler)
    // With nothing left to match, the fetch override has no reason to stay
    // installed — and a test's teardown depends on it actually coming off.
    this._syncInterception()
  }

  /**
   * @internal Reconcile after a context's routes changed.
   *
   * A context route is served by its pages' interceptors, so a page created
   * before the route — or left holding the last one after an `unroute` — has to
   * be told to look again.
   */
  _syncRouting(): void {
    this._syncInterception()
  }

  /** Whether any route, this page's or its context's, could match. */
  private _hasRoutes(): boolean {
    const contextRoutes = (this._context as any)?._routeRegistry?.size ?? 0
    return this._routes.size > 0 || contextRoutes > 0
  }

  /**
   * Bring the fetch override in line with what is actually needed.
   *
   * Routes and explicit interception are separate features sharing one
   * mechanism, and either alone is reason enough to intercept — so neither may
   * switch it off on its own. That was the bug (#1613):
   * `setRequestInterception(false)` cleared every handler, taking routing's with
   * it, while `_routingInstalled` stayed set and guarded it from ever being
   * reinstalled. `route()` went on accepting handlers that nothing consulted,
   * and the request escaped to the real network.
   *
   * Derived from the registries rather than tracked in a second flag, because a
   * flag beside the thing it describes is what drifted in the first place.
   */
  private _syncInterception(): void {
    if (!this._explicitInterception && !this._hasRoutes()) {
      this._requestInterceptor.disable()
      // Only what was added here. `clear()` would take anything else with it,
      // which is how this went wrong.
      this._requestInterceptor.removeHandler(this._routingHandler)
      this._routingInstalled = false
      return
    }

    if (!this._routingInstalled) {
      this._routingInstalled = true
      this._requestInterceptor.addHandler(this._routingHandler)
    }

    this._requestInterceptor.enable()
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
    // Records the intent and lets the reconciler decide. Turning this off no
    // longer dismantles routing: a registered route keeps the override
    // installed on its own account (#1613).
    //
    // Reporting is wired to the interceptor's observers in the constructor, so
    // this no longer adds a handler of its own either. It used to, which meant
    // `route()` alone enabled interception without ever reporting a request,
    // and using both reported every request twice.
    this._explicitInterception = enabled
    this._syncInterception()
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
