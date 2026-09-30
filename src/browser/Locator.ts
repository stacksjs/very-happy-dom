/**
 * Locators: a description of how to find elements, resolved on every use.
 *
 * The selector-string methods on `BrowserPage` look an element up and act on it
 * immediately, so nothing can be stored, chained, filtered or re-queried. A
 * locator holds the *query* instead of the element, which is what makes
 * `const save = page.getByRole('button', { name: 'Save' })` usable across a
 * change to the DOM.
 *
 * Playwright's locator actions auto-wait for actionability, and so do these
 * (#1604). "No real browser, so nothing is async" was never true: timers fire,
 * `fetch` settles, microtasks drain, `MutationObserver` runs, custom elements
 * upgrade. Anything rendered in response to one of those is invisible to a
 * query that looks exactly once, which is what these used to do.
 *
 * Reads stay one-shot. `count()` and `textContent()` answer about now, as they
 * do in Playwright, because a retrying `count()` would make the assertions
 * built on top of it wait twice over.
 *
 * What a wait here cannot check is Playwright's other two conditions: stable
 * (not mid-animation) and receives-events (not covered by another element).
 * Both need a layout pass, and pretending to check them would be worse than
 * saying plainly that they are skipped.
 */

import { accessibleName, computeRole, headingLevel } from '../aria/roles'
import { isExposedToAria } from '../aria/visibility'
import { waitUntil } from './waiting'

/** Returns the current matches, re-evaluated on each call. */
type Resolver = () => any[]

export interface GetByRoleOptions {
  name?: string | RegExp
  exact?: boolean
  /** Match elements the accessibility tree excludes. Off, as in Playwright. */
  includeHidden?: boolean
  checked?: boolean
  disabled?: boolean
  selected?: boolean
  expanded?: boolean
  level?: number
}

export interface GetByTextOptions {
  exact?: boolean
  /** Match elements the accessibility tree excludes. Off, as in Playwright. */
  includeHidden?: boolean
}

export interface FilterOptions {
  hasText?: string | RegExp
  hasNotText?: string | RegExp
}

/**
 * What a wait is waiting for.
 *
 * `attached` and `visible` are about one element arriving; `detached` and
 * `hidden` are about it going away, which is the state a closing modal or a
 * finished spinner passes through.
 */
export type WaitForState = 'attached' | 'detached' | 'visible' | 'hidden'

export interface WaitForOptions {
  /** Defaults to `visible`, as in Playwright. */
  state?: WaitForState
  timeout?: number
}

/** Every action takes a timeout, falling back to the page's default. */
export interface ActionOptions {
  timeout?: number
}

/** @internal Collapse whitespace, the way Playwright compares rendered text. */
export function normalize(value: string | null | undefined): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * Compare a candidate against a matcher.
 *
 * A string is a substring match after whitespace normalisation unless `exact`,
 * which is Playwright's behaviour and what makes `getByText('Save')` find
 * "Save changes". A RegExp is always used as written.
 *
 * @internal Shared with the web-first matchers, so `toContainText` and
 * `getByText` cannot disagree about what "contains" means.
 */
export function matchesText(candidate: string, expected: string | RegExp, exact = false): boolean {
  if (expected instanceof RegExp)
    return expected.test(candidate)

  const target = normalize(expected)
  return exact ? candidate === target : candidate.toLowerCase().includes(target.toLowerCase())
}

export class Locator {
  /** @internal */
  constructor(
    private _page: any,
    private _resolver: Resolver,
    private _description: string,
  ) {}

  /** How this locator would be described in an error. */
  toString(): string {
    return this._description
  }

  // ---------------------------------------------------------------- resolution

  /** Every current match. */
  private _all(): any[] {
    return this._resolver()
  }

  /**
   * The single match, for an action or a single-valued read.
   *
   * Playwright's strictness: more than one match is an error rather than a
   * silent pick of the first, because that silence is how a test ends up
   * asserting against the wrong element. Use `first()`, `last()` or `nth()` to
   * say which one you meant.
   */
  private _one(): any {
    const matches = this._all()

    if (matches.length === 0)
      throw new Error(`No element matches ${this._description}`)

    if (matches.length > 1)
      throw new Error(this._ambiguous(matches.length))

    return matches[0]
  }

  /** The strictness error, worded the same wherever it is raised. */
  private _ambiguous(count: number): string {
    return `${count} elements match ${this._description}; use first(), last() or nth() to choose one`
  }

  /** The caller's timeout, or the page's default. */
  private _timeoutMs(timeout?: number): number {
    return timeout ?? this._page._defaultTimeoutMs()
  }

  /**
   * Resolve a single element, waiting for it to arrive and, when asked, to be
   * rendered.
   *
   * Ambiguity is not waited out. Two matches is a fact about the query rather
   * than a state the DOM will grow out of, so it throws at once — waiting would
   * spend the whole timeout to report a problem that was already certain.
   */
  private async _waitForOne(
    state: 'attached' | 'visible',
    options: { timeout?: number, enabled?: boolean, action?: string } = {},
  ): Promise<any> {
    const goal = options.action ? `be actionable for ${options.action}()` : `be ${state}`

    return waitUntil(
      () => {
        const matches = this._all()

        if (matches.length > 1)
          throw new Error(this._ambiguous(matches.length))

        if (matches.length === 0)
          return { done: false, reason: 'no element matched' }

        const element = matches[0]

        if (state === 'visible' && !this._page._isRendered(element))
          return { done: false, reason: 'an element matched, but it was hidden' }

        if (options.enabled && element.disabled === true)
          return { done: false, reason: 'an element matched, but it was disabled' }

        return { done: true, value: element }
      },
      {
        timeout: this._timeoutMs(options.timeout),
        describe: reason => `Timed out waiting for ${this._description} to ${goal}: ${reason}`,
      },
    )
  }

  /**
   * The element an action should act on: present, rendered and not disabled.
   *
   * Editability is deliberately not part of the wait. Playwright checks it for
   * `fill`, but a readonly input here is a fact about the markup rather than a
   * state that resolves itself, so waiting on it would only delay the error.
   */
  private async _actionTarget(action: string, timeout?: number): Promise<any> {
    return this._waitForOne('visible', { timeout, enabled: true, action })
  }

  /**
   * Wait for the matches to reach `state`, or throw.
   *
   * The negative states are not strict. An absence has no single element to be
   * strict about — two hidden copies are as gone as one — and a strictness
   * error while waiting for something to disappear would be perverse.
   */
  async waitFor(options: WaitForOptions = {}): Promise<void> {
    const state = options.state ?? 'visible'

    if (state === 'attached' || state === 'visible') {
      await this._waitForOne(state, { timeout: options.timeout })
      return
    }

    await waitUntil<undefined>(
      () => {
        const matches = this._all()

        if (state === 'detached') {
          return matches.length === 0
            ? { done: true, value: undefined }
            : { done: false, reason: `${matches.length} element(s) were still attached` }
        }

        const shown = matches.filter(element => this._page._isRendered(element))
        return shown.length === 0
          ? { done: true, value: undefined }
          : { done: false, reason: `${shown.length} element(s) were still visible` }
      },
      {
        timeout: this._timeoutMs(options.timeout),
        describe: reason => `Timed out waiting for ${this._description} to be ${state}: ${reason}`,
      },
    )
  }

  /**
   * The resolved element, as an escape hatch into the DOM.
   *
   * Waits for it to be attached, but not for it to be visible: this is the hook
   * people reach for to inspect markup that is deliberately hidden.
   */
  async elementHandle(options: ActionOptions = {}): Promise<any> {
    return this._waitForOne('attached', { timeout: options.timeout })
  }

  /**
   * Every resolved element, right now.
   *
   * One-shot, like `count()`: this is a question about the current DOM, and
   * Playwright's `all()` does not wait either.
   */
  async elementHandles(): Promise<any[]> {
    return this._all()
  }

  // ------------------------------------------------------------------ chaining

  /** Narrow to descendants matching a CSS selector. */
  locator(selector: string): Locator {
    return new Locator(
      this._page,
      () => this._all().flatMap(element => Array.from(element.querySelectorAll?.(selector) ?? [])),
      `${this._description} >> ${selector}`,
    )
  }

  /** Keep only matches that satisfy the given text conditions. */
  filter(options: FilterOptions): Locator {
    return new Locator(
      this._page,
      () => this._all().filter((element) => {
        const text = normalize(element.textContent)
        if (options.hasText !== undefined && !matchesText(text, options.hasText))
          return false
        if (options.hasNotText !== undefined && matchesText(text, options.hasNotText))
          return false
        return true
      }),
      `${this._description} (filtered)`,
    )
  }

  /** The nth match, counting from zero; a negative index counts from the end. */
  nth(index: number): Locator {
    return new Locator(
      this._page,
      () => {
        const matches = this._all()
        const resolved = index < 0 ? matches.length + index : index
        const match = matches[resolved]
        return match ? [match] : []
      },
      `${this._description} >> nth=${index}`,
    )
  }

  first(): Locator {
    return this.nth(0)
  }

  last(): Locator {
    return this.nth(-1)
  }

  /** How many elements currently match. */
  async count(): Promise<number> {
    return this._all().length
  }

  /** One locator per current match, each pinned to its index. */
  async all(): Promise<Locator[]> {
    return this._all().map((_, index) => this.nth(index))
  }

  // ------------------------------------------------------- scoped role queries

  getByRole(role: string, options: GetByRoleOptions = {}): Locator {
    return new Locator(
      this._page,
      () => this._all().flatMap(root => byRole(root, role, options)),
      `${this._description} >> role=${role}`,
    )
  }

  getByText(text: string | RegExp, options: GetByTextOptions = {}): Locator {
    return new Locator(
      this._page,
      () => this._all().flatMap(root => byText(root, text, options)),
      `${this._description} >> text=${String(text)}`,
    )
  }

  getByLabel(text: string | RegExp, options: GetByTextOptions = {}): Locator {
    return new Locator(
      this._page,
      () => this._all().flatMap(root => byLabel(root, text, options)),
      `${this._description} >> label=${String(text)}`,
    )
  }

  getByPlaceholder(text: string | RegExp, options: GetByTextOptions = {}): Locator {
    return new Locator(
      this._page,
      () => this._all().flatMap(root => byAttribute(root, 'placeholder', text, options)),
      `${this._description} >> placeholder=${String(text)}`,
    )
  }

  getByAltText(text: string | RegExp, options: GetByTextOptions = {}): Locator {
    return new Locator(
      this._page,
      () => this._all().flatMap(root => byAttribute(root, 'alt', text, options)),
      `${this._description} >> alt=${String(text)}`,
    )
  }

  getByTitle(text: string | RegExp, options: GetByTextOptions = {}): Locator {
    return new Locator(
      this._page,
      () => this._all().flatMap(root => byAttribute(root, 'title', text, options)),
      `${this._description} >> title=${String(text)}`,
    )
  }

  getByTestId(testId: string | RegExp): Locator {
    return new Locator(
      this._page,
      () => this._all().flatMap(root => byAttribute(root, this._page._testIdAttribute(), testId, { exact: true })),
      `${this._description} >> testId=${String(testId)}`,
    )
  }

  // ------------------------------------------------------------------- reading

  async textContent(): Promise<string | null> {
    return this._one().textContent ?? null
  }

  async innerText(): Promise<string> {
    return String(this._one().innerText ?? '')
  }

  async innerHTML(): Promise<string> {
    return String(this._one().innerHTML ?? '')
  }

  async inputValue(): Promise<string> {
    return String(this._one().value ?? '')
  }

  async getAttribute(name: string): Promise<string | null> {
    return this._one().getAttribute?.(name) ?? null
  }

  /**
   * Every match's raw `textContent`, in document order.
   *
   * Raw: no trimming and no whitespace collapsing, which is what `textContent`
   * means. `allInnerTexts()` is the rendered-text counterpart.
   */
  async allTextContents(): Promise<string[]> {
    return this._all().map(element => String(element.textContent ?? ''))
  }

  /**
   * Every match's `innerText`, in document order.
   *
   * Rendered text, so a `display: none` or `visibility: hidden` subtree is left
   * out and the ends are trimmed — which is the difference from
   * `allTextContents()`.
   *
   * Returned exactly as `innerText` gives it, including the fact that this
   * implementation does not collapse interior runs of whitespace the way a
   * browser does. Normalising here would make `allInnerTexts()` disagree with
   * `innerText()` about the same element, and two APIs answering the same
   * question differently is a worse bug than one that is imprecise.
   */
  async allInnerTexts(): Promise<string[]> {
    return this._all().map(element => String(element.innerText ?? ''))
  }

  /** The role this element carries, explicit or implicit. */
  async ariaRole(): Promise<string | null> {
    return computeRole(this._one())
  }

  /** The name a screen reader would announce. */
  async accessibleName(): Promise<string> {
    return accessibleName(this._one())
  }

  // --------------------------------------------------------------------- state

  /**
   * Whether the element would be visible.
   *
   * False when nothing matches, matching `isVisible`'s contract on the page:
   * it is usually asked of something that may legitimately be absent.
   */
  async isVisible(): Promise<boolean> {
    const matches = this._all()
    if (matches.length === 0)
      return false
    return this._page._isRendered(matches[0])
  }

  async isHidden(): Promise<boolean> {
    return !(await this.isVisible())
  }

  async isChecked(): Promise<boolean> {
    return this._one().checked === true
  }

  async isEnabled(): Promise<boolean> {
    return this._one().disabled !== true
  }

  async isDisabled(): Promise<boolean> {
    return this._one().disabled === true
  }

  async isEditable(): Promise<boolean> {
    const element = this._one()
    if (element.isContentEditable === true)
      return true
    const tag = element.tagName
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT')
      return false
    return element.disabled !== true && element.readOnly !== true
  }

  // ------------------------------------------------------------------- actions

  async click(options: ActionOptions = {}): Promise<void> {
    this._press(await this._actionTarget('click', options.timeout))
  }

  /**
   * Focus, then click.
   *
   * Shared with `check`/`uncheck` so they act on the element they already
   * resolved, rather than re-resolving through `click()` and giving the DOM a
   * chance to change between the decision and the act.
   */
  private _press(element: any): void {
    element.focus?.()
    element.click?.()
  }

  /** Waits for the element to be attached, not for it to be visible. */
  async focus(options: ActionOptions = {}): Promise<void> {
    (await this._waitForOne('attached', { timeout: options.timeout })).focus?.()
  }

  async blur(options: ActionOptions = {}): Promise<void> {
    (await this._waitForOne('attached', { timeout: options.timeout })).blur?.()
  }

  async hover(options: ActionOptions = {}): Promise<void> {
    await this._page._hoverElement(await this._actionTarget('hover', options.timeout))
  }

  async fill(value: string, options: ActionOptions = {}): Promise<void> {
    await this._page._fillElement(await this._actionTarget('fill', options.timeout), value)
  }

  async type(text: string, options: { delay?: number, timeout?: number } = {}): Promise<void> {
    await this._page._typeIntoElement(await this._actionTarget('type', options.timeout), text, options)
  }

  /** Tick a checkbox or radio, doing nothing when it is already ticked. */
  async check(options: ActionOptions = {}): Promise<void> {
    const element = await this._actionTarget('check', options.timeout)
    if (element.checked !== true)
      this._press(element)
  }

  /** Untick a checkbox, doing nothing when it is already clear. */
  async uncheck(options: ActionOptions = {}): Promise<void> {
    const element = await this._actionTarget('uncheck', options.timeout)
    if (element.checked === true)
      this._press(element)
  }

  // ---------------------------------------------------------------- evaluating

  /**
   * Run `fn` against the single match, which arrives as its first argument.
   *
   * Strict, and waits for the element to be attached — the same terms as
   * `elementHandle()`, since this is the same question with the round trip
   * folded in. Not waited for visibility: reading an attribute off deliberately
   * hidden markup is a fair thing to want.
   *
   * The element is the real node, not a copy, so mutating it through here
   * changes the document.
   *
   * `fn` is recompiled against the frame's window and therefore cannot see its
   * closure, as in Playwright. Anything it needs goes through `arg`.
   */
  async evaluate(
    fn: string | ((element: any, arg?: any) => any),
    arg?: any,
    options: ActionOptions = {},
  ): Promise<any> {
    const element = await this._waitForOne('attached', { timeout: options.timeout })
    return this._page._evaluateWith(fn, [element, arg])
  }

  /**
   * Run `fn` against every current match, which arrives as an array.
   *
   * Deliberately neither strict nor waiting: many matches is the expected case,
   * and none is a legitimate answer of `[]` rather than something to wait for.
   * That is Playwright's split between `evaluate` and `evaluateAll`.
   */
  async evaluateAll(
    fn: string | ((elements: any[], arg?: any) => any),
    arg?: any,
  ): Promise<any> {
    return this._page._evaluateWith(fn, [this._all(), arg])
  }
}

// ---------------------------------------------------------------------- helpers

function descendants(root: any): any[] {
  return Array.from(root.querySelectorAll?.('*') ?? [])
}

/** Elements under `root` carrying `role`, narrowed by the options given. */
export function byRole(root: any, role: string, options: GetByRoleOptions = {}): any[] {
  return descendants(root).filter((element) => {
    // A closed modal or an inactive tab panel leaves its markup behind. Role
    // queries read the accessibility tree, which does not include it (#1601).
    if (!options.includeHidden && !isExposedToAria(element))
      return false

    if (computeRole(element) !== role)
      return false

    if (options.name !== undefined && !matchesText(accessibleName(element), options.name, options.exact))
      return false

    if (options.checked !== undefined && (element.checked === true) !== options.checked)
      return false

    if (options.disabled !== undefined && (element.disabled === true) !== options.disabled)
      return false

    if (options.selected !== undefined && (element.selected === true) !== options.selected)
      return false

    if (options.expanded !== undefined && (element.getAttribute?.('aria-expanded') === 'true') !== options.expanded)
      return false

    if (options.level !== undefined && headingLevel(element) !== options.level)
      return false

    return true
  })
}

/**
 * Elements whose own text matches.
 *
 * Only the innermost matches are kept: every ancestor of a match also contains
 * the text, and returning all of them would make `getByText` ambiguous for
 * almost any markup.
 */
export function byText(root: any, text: string | RegExp, options: GetByTextOptions = {}): any[] {
  const matches = descendants(root)
    .filter(element => options.includeHidden || isExposedToAria(element))
    .filter(element => matchesText(normalize(element.textContent), text, options.exact))
  return matches.filter(element => !matches.some(other => other !== element && element.contains?.(other)))
}

/** Form controls labelled by matching text. */
export function byLabel(root: any, text: string | RegExp, options: GetByTextOptions = {}): any[] {
  return descendants(root).filter((element) => {
    if (!options.includeHidden && !isExposedToAria(element))
      return false

    const tag = element.tagName
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT' && element.getAttribute?.('role') === null)
      return false

    const named = accessibleName(element)
    return named !== '' && matchesText(named, text, options.exact)
  })
}

/** Elements whose attribute matches. */
export function byAttribute(root: any, attribute: string, text: string | RegExp, options: GetByTextOptions = {}): any[] {
  return descendants(root).filter((element) => {
    if (!options.includeHidden && !isExposedToAria(element))
      return false

    const value = element.getAttribute?.(attribute)
    return value !== null && value !== undefined && matchesText(normalize(value), text, options.exact)
  })
}
