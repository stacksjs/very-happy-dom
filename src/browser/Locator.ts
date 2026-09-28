/**
 * Locators: a description of how to find elements, resolved on every use.
 *
 * The selector-string methods on `BrowserPage` look an element up and act on it
 * immediately, so nothing can be stored, chained, filtered or re-queried. A
 * locator holds the *query* instead of the element, which is what makes
 * `const save = page.getByRole('button', { name: 'Save' })` usable across a
 * change to the DOM.
 *
 * Playwright's locator actions auto-wait for actionability. There is no
 * rendering loop to wait on here, so resolution happens at call time and a
 * miss is an immediate, named error rather than a timeout.
 */

import { accessibleName, computeRole, headingLevel } from '../aria/roles'

/** Returns the current matches, re-evaluated on each call. */
type Resolver = () => any[]

export interface GetByRoleOptions {
  name?: string | RegExp
  exact?: boolean
  checked?: boolean
  disabled?: boolean
  selected?: boolean
  expanded?: boolean
  level?: number
}

export interface GetByTextOptions {
  exact?: boolean
}

export interface FilterOptions {
  hasText?: string | RegExp
  hasNotText?: string | RegExp
}

function normalize(value: string | null | undefined): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * Compare a candidate against a matcher.
 *
 * A string is a substring match after whitespace normalisation unless `exact`,
 * which is Playwright's behaviour and what makes `getByText('Save')` find
 * "Save changes". A RegExp is always used as written.
 */
function matchesText(candidate: string, expected: string | RegExp, exact = false): boolean {
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
      throw new Error(`${matches.length} elements match ${this._description}; use first(), last() or nth() to choose one`)

    return matches[0]
  }

  /** The resolved element, as an escape hatch into the DOM. */
  async elementHandle(): Promise<any> {
    return this._one()
  }

  /** Every resolved element. */
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

  async click(): Promise<void> {
    const element = this._one()
    element.focus?.()
    element.click?.()
  }

  async focus(): Promise<void> {
    this._one().focus?.()
  }

  async blur(): Promise<void> {
    this._one().blur?.()
  }

  async hover(): Promise<void> {
    await this._page._hoverElement(this._one())
  }

  async fill(value: string): Promise<void> {
    await this._page._fillElement(this._one(), value)
  }

  async type(text: string, options: { delay?: number } = {}): Promise<void> {
    await this._page._typeIntoElement(this._one(), text, options)
  }

  /** Tick a checkbox or radio, doing nothing when it is already ticked. */
  async check(): Promise<void> {
    const element = this._one()
    if (element.checked !== true)
      await this.click()
  }

  /** Untick a checkbox, doing nothing when it is already clear. */
  async uncheck(): Promise<void> {
    const element = this._one()
    if (element.checked === true)
      await this.click()
  }
}

// ---------------------------------------------------------------------- helpers

function descendants(root: any): any[] {
  return Array.from(root.querySelectorAll?.('*') ?? [])
}

/** Elements under `root` carrying `role`, narrowed by the options given. */
export function byRole(root: any, role: string, options: GetByRoleOptions = {}): any[] {
  return descendants(root).filter((element) => {
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
  const matches = descendants(root).filter(element => matchesText(normalize(element.textContent), text, options.exact))
  return matches.filter(element => !matches.some(other => other !== element && element.contains?.(other)))
}

/** Form controls labelled by matching text. */
export function byLabel(root: any, text: string | RegExp, options: GetByTextOptions = {}): any[] {
  return descendants(root).filter((element) => {
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
    const value = element.getAttribute?.(attribute)
    return value !== null && value !== undefined && matchesText(normalize(value), text, options.exact)
  })
}
