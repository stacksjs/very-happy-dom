/**
 * Web-first assertions: matchers that retry until the expectation holds (#1603).
 *
 *     import 'very-happy-dom/matchers'
 *
 *     await expect(page.getByRole('alert')).toContainText('Saved')
 *
 * The one-shot rewrite —
 *
 *     expect(await page.getByRole('alert').textContent()).toContain('Saved')
 *
 * — is not merely uglier, it asserts something weaker. It samples once, so
 * anything that appears after a `fetch` settles, a microtask drains or a custom
 * element upgrades is a coin flip, and it fails in the direction that hurts: a
 * race that passes locally is exactly the test that goes flaky in CI.
 *
 * The messages differ too. A matcher can say which element it was looking at
 * and what it last saw; `expect(false).toBe(true)` cannot.
 *
 * `bun:test` has `expect.extend` but no `expect.poll`, so the retrying lives
 * here. Importing this module registers the matchers; nothing else is needed,
 * and `bun:test`'s own matchers are untouched.
 */

import type { Locator } from './browser/Locator'
import { expect } from 'bun:test'
import { checkedState } from './aria/state'
import { matchesText, normalize } from './browser/Locator'
import { POLL_INTERVAL_MS } from './browser/waiting'

/**
 * Raised by a judge when the element is the wrong kind of thing for the matcher.
 *
 * Not a state the DOM will grow out of, so it is thrown rather than polled — the
 * same reasoning that makes a strictness violation immediate. Without it, asking
 * a `<div>` whether it is checked would spend the whole timeout and then report
 * that it was not, which is true and useless.
 */
class NotApplicable extends Error {}

/** What one look at the subject found. */
interface Judgement {
  /** Whether the expectation holds right now, before `.not` is considered. */
  pass: boolean
  /** What was actually there, for the failure message. */
  actual: string
}

type Judge = () => Judgement | Promise<Judgement>

export interface MatcherResult {
  pass: boolean
  message: () => string
}

/** Bun hands the matcher its own context; this is the part used here. */
export interface MatcherContext {
  isNot: boolean
}

export interface AssertionOptions {
  timeout?: number
}

const DEFAULT_TIMEOUT_MS = 30_000

// --------------------------------------------------------------------- polling

/**
 * Re-check until the expectation as written holds, or the timeout expires.
 *
 * `isNot` inverts the *goal*, not the result. `.not.toBeVisible()` has to wait
 * for the element to become hidden; waiting for it to be visible and then
 * reporting the opposite would make every negated assertion pass instantly
 * against markup that is about to appear.
 */
async function settle(
  judge: Judge,
  options: { isNot: boolean, timeout: number },
): Promise<Judgement & { timedOut: boolean }> {
  const deadline = Date.now() + options.timeout
  let last: Judgement = { pass: false, actual: 'nothing was observed' }

  for (;;) {
    last = await judge()

    if (last.pass !== options.isNot)
      return { ...last, timedOut: false }

    const left = deadline - Date.now()
    if (left <= 0) {
      // A zero timeout means "check once", so calling that a timeout would
      // misdescribe it: nothing was ever waited for.
      return { ...last, timedOut: options.timeout > 0 }
    }

    await new Promise(resolve => setTimeout(resolve, Math.min(POLL_INTERVAL_MS, left)))
  }
}

/**
 * The failure message.
 *
 * Bun already prefixes its own `expect(received).toBeVisible(expected)` line,
 * so this is the body: what was being looked at, what was wanted, what was
 * there. The timeout is named because "timed out after 30000ms" and "checked
 * once and it was wrong" are different problems.
 */
function describe(
  subject: string,
  expectation: string,
  result: Judgement & { timedOut: boolean },
  options: { isNot: boolean, timeout: number },
): string {
  const heading = result.timedOut
    ? `Timed out ${options.timeout}ms waiting for the expectation to hold`
    : 'The expectation did not hold'

  return [
    heading,
    '',
    `Locator:  ${subject}`,
    `Expected: ${options.isNot ? 'not ' : ''}${expectation}`,
    `Received: ${result.actual}`,
  ].join('\n')
}

/** Run a judge to a verdict and shape it the way `expect.extend` wants. */
async function assertThat(
  context: MatcherContext,
  subject: { toString: () => string },
  expectation: string,
  timeout: number,
  judge: Judge,
): Promise<MatcherResult> {
  const options = { isNot: context.isNot === true, timeout }
  const result = await settle(judge, options)

  return {
    pass: result.pass,
    message: () => describe(String(subject), expectation, result, options),
  }
}

// -------------------------------------------------------------------- subjects

/**
 * The page behind a locator, and the locator's own default timeout.
 *
 * Reaching for `_page` is the same package-internal access `Locator` already
 * makes on `BrowserPage._isRendered`; keeping it here avoids widening the
 * public API for the sake of the matchers.
 */
function pageOf(locator: any): any {
  return locator?._page
}

function timeoutOf(subject: any, given?: number): number {
  if (given !== undefined)
    return given

  const page = pageOf(subject) ?? subject
  return page?._defaultTimeoutMs?.() ?? DEFAULT_TIMEOUT_MS
}

/** A `Locator` in all but the import: duck-typed, so dist and src both pass. */
function asLocator(received: any, matcher: string): any {
  const usable = received !== null
    && typeof received === 'object'
    && typeof received.elementHandles === 'function'
    && typeof received.count === 'function'

  if (!usable) {
    throw new TypeError(
      `${matcher}() expects a Locator, not ${kindOf(received)}. `
      + `Pass the locator itself — expect(page.getByRole('button')).${matcher}() — rather than an awaited read of it.`,
    )
  }

  return received
}

/** A `BrowserPage`, for the matchers that ask about the page rather than an element. */
function asPage(received: any, matcher: string): any {
  const usable = received !== null
    && typeof received === 'object'
    && typeof received.title === 'function'
    && 'url' in received

  if (!usable)
    throw new TypeError(`${matcher}() expects a BrowserPage, not ${kindOf(received)}.`)

  return received
}

function kindOf(value: unknown): string {
  if (value === null)
    return 'null'
  if (typeof value === 'string')
    return `the string ${JSON.stringify(value)}`
  if (typeof value !== 'object')
    return `a ${typeof value}`
  return (value as any).constructor?.name ?? 'an object'
}

// ----------------------------------------------------------- element judgement

/**
 * Judge the single element a locator resolves to.
 *
 * Strictness is checked first and thrown rather than polled, for the reason the
 * locator actions do the same: two matches is a fact about the query, not a
 * state the DOM will grow out of.
 *
 * No match is *not* an error here — it is "not yet", which is what lets
 * `toBeVisible()` wait for something to render and `.not.toBeVisible()` succeed
 * against something that was never there.
 */
function onElement(locator: any, judge: (element: any) => Judgement | Promise<Judgement>): Judge {
  return async () => {
    const elements: any[] = await locator.elementHandles()

    if (elements.length > 1) {
      throw new Error(
        `${elements.length} elements match ${locator}; use first(), last() or nth() to choose one`,
      )
    }

    if (elements.length === 0)
      return { pass: false, actual: 'no element matched' }

    try {
      return await judge(elements[0])
    }
    catch (error) {
      if (error instanceof NotApplicable)
        throw error

      // The DOM moved between resolving and reading. That is not an answer, so
      // keep polling rather than reporting a read failure as a wrong value.
      return { pass: false, actual: 'the element changed while it was being read' }
    }
  }
}

/** A judgement from a boolean state, worded for the message either way. */
function state(pass: boolean, whenTrue: string, whenFalse: string): Judgement {
  return { pass, actual: pass ? whenTrue : whenFalse }
}

/** Compare one string against a string-or-RegExp expectation. */
function compare(candidate: string, expected: string | RegExp, exact: boolean): Judgement {
  return { pass: matchesText(candidate, expected, exact), actual: JSON.stringify(candidate) }
}

/** Compare a list of strings pairwise, for the array forms of the text matchers. */
function compareAll(candidates: string[], expected: Array<string | RegExp>, exact: boolean): Judgement {
  const pass = candidates.length === expected.length
    && candidates.every((candidate, index) => matchesText(candidate, expected[index], exact))

  return { pass, actual: JSON.stringify(candidates) }
}

/** The rendered text of an element, as `toHaveText` compares it. */
function textOf(element: any, useInnerText: boolean): string {
  return normalize(useInnerText ? element.innerText : element.textContent)
}

function expectationFor(expected: string | RegExp | Array<string | RegExp>, verb: string): string {
  return `${verb} ${JSON.stringify(expected instanceof RegExp ? String(expected) : expected)}`
}

// -------------------------------------------------------------------- matchers

/**
 * The matchers, exported so they can be registered by hand. Importing this
 * module registers them already; this is for anyone who would rather be
 * explicit about it.
 */
export const matchers = {
  async toBeAttached(this: MatcherContext, received: unknown, options: AssertionOptions = {}): Promise<MatcherResult> {
    const locator = asLocator(received, 'toBeAttached')
    return assertThat(this, locator, 'attached', timeoutOf(locator, options.timeout), async () => {
      const count = await locator.count()
      return state(count > 0, `${count} element(s) attached`, 'no element matched')
    })
  },

  async toBeVisible(this: MatcherContext, received: unknown, options: AssertionOptions = {}): Promise<MatcherResult> {
    const locator = asLocator(received, 'toBeVisible')
    const page = pageOf(locator)
    return assertThat(this, locator, 'visible', timeoutOf(locator, options.timeout), onElement(
      locator,
      element => state(page._isRendered(element), 'visible', 'hidden'),
    ))
  },

  async toBeHidden(this: MatcherContext, received: unknown, options: AssertionOptions = {}): Promise<MatcherResult> {
    const locator = asLocator(received, 'toBeHidden')
    const page = pageOf(locator)
    // Absent counts as hidden, as it does in Playwright, so this cannot be
    // written as the negation of `toBeVisible` on a resolved element.
    return assertThat(this, locator, 'hidden', timeoutOf(locator, options.timeout), async () => {
      const elements: any[] = await locator.elementHandles()
      const shown = elements.filter(element => page._isRendered(element))
      return state(shown.length === 0, 'hidden or absent', `${shown.length} element(s) visible`)
    })
  },

  /**
   * Is any part of the element inside the viewport?
   *
   * Withheld until there was a layout pass. Every box sat at the origin then,
   * so this could only ever answer "yes" — a silent pass wearing an
   * assertion's clothes. Positions are computed now, so the question has an
   * answer.
   *
   * `ratio` asks for a minimum fraction of the element's area to be visible,
   * as Playwright's does.
   */
  async toBeInViewport(this: MatcherContext, received: unknown, options: AssertionOptions & { ratio?: number } = {}): Promise<MatcherResult> {
    const locator = asLocator(received, 'toBeInViewport')
    const page = pageOf(locator)
    const wanted = options.ratio ?? 0

    return assertThat(this, locator, 'in viewport', timeoutOf(locator, options.timeout), onElement(
      locator,
      (element) => {
        if (!page._isRendered(element))
          return state(false, '', 'not rendered')

        const box = element.getBoundingClientRect()
        const view = element.ownerDocument?.defaultView
        const width = typeof view?.innerWidth === 'number' ? view.innerWidth : 1024
        const height = typeof view?.innerHeight === 'number' ? view.innerHeight : 768

        const overlapWidth = Math.min(box.right, width) - Math.max(box.left, 0)
        const overlapHeight = Math.min(box.bottom, height) - Math.max(box.top, 0)

        if (overlapWidth <= 0 || overlapHeight <= 0)
          return state(false, '', `outside the ${width}x${height} viewport`)

        const area = box.width * box.height
        // A zero-area box that overlaps at all counts as in view; there is no
        // fraction of nothing to compare against a ratio.
        const ratio = area === 0 ? 1 : (overlapWidth * overlapHeight) / area

        return state(
          ratio > 0 && ratio >= wanted,
          `in viewport (${Math.round(ratio * 100)}% visible)`,
          `only ${Math.round(ratio * 100)}% visible, wanted ${Math.round(wanted * 100)}%`,
        )
      },
    ))
  },

  async toHaveCount(this: MatcherContext, received: unknown, expected: number, options: AssertionOptions = {}): Promise<MatcherResult> {
    // Deliberately not strict: the count is the question.
    const locator = asLocator(received, 'toHaveCount')
    return assertThat(this, locator, `a count of ${expected}`, timeoutOf(locator, options.timeout), async () => {
      const count = await locator.count()
      return { pass: count === expected, actual: `a count of ${count}` }
    })
  },

  async toHaveText(
    this: MatcherContext,
    received: unknown,
    expected: string | RegExp | Array<string | RegExp>,
    options: AssertionOptions & { useInnerText?: boolean } = {},
  ): Promise<MatcherResult> {
    const locator = asLocator(received, 'toHaveText')
    const inner = options.useInnerText === true
    // Whole-string, whitespace-normalised, as in Playwright. `toContainText` is
    // the substring one.
    return assertThat(this, locator, expectationFor(expected, 'the text'), timeoutOf(locator, options.timeout), () =>
      Array.isArray(expected)
        ? locator.elementHandles().then((els: any[]) => compareAll(els.map(el => textOf(el, inner)), expected, true))
        : onElement(locator, element => compare(textOf(element, inner), expected, true))())
  },

  async toContainText(
    this: MatcherContext,
    received: unknown,
    expected: string | RegExp | Array<string | RegExp>,
    options: AssertionOptions & { useInnerText?: boolean } = {},
  ): Promise<MatcherResult> {
    const locator = asLocator(received, 'toContainText')
    const inner = options.useInnerText === true
    return assertThat(this, locator, expectationFor(expected, 'text containing'), timeoutOf(locator, options.timeout), () =>
      Array.isArray(expected)
        ? locator.elementHandles().then((els: any[]) => compareAll(els.map(el => textOf(el, inner)), expected, false))
        : onElement(locator, element => compare(textOf(element, inner), expected, false))())
  },

  async toHaveValue(this: MatcherContext, received: unknown, expected: string | RegExp, options: AssertionOptions = {}): Promise<MatcherResult> {
    const locator = asLocator(received, 'toHaveValue')
    return assertThat(this, locator, expectationFor(expected, 'the value'), timeoutOf(locator, options.timeout), onElement(
      locator,
      element => compare(String(element.value ?? ''), expected, true),
    ))
  },

  async toHaveAttribute(
    this: MatcherContext,
    received: unknown,
    name: string,
    expected?: string | RegExp | AssertionOptions,
    options: AssertionOptions = {},
  ): Promise<MatcherResult> {
    const locator = asLocator(received, 'toHaveAttribute')
    // The two-argument form asks only about presence, so a trailing options
    // object must not be mistaken for an expected value.
    const wantsValue = typeof expected === 'string' || expected instanceof RegExp
    const settings = wantsValue ? options : ((expected as AssertionOptions) ?? {})
    const expectation = wantsValue
      ? `${name}=${JSON.stringify(expected instanceof RegExp ? String(expected) : expected)}`
      : `the attribute ${name}`

    return assertThat(this, locator, expectation, timeoutOf(locator, settings.timeout), onElement(
      locator,
      (element) => {
        const value = element.getAttribute?.(name) ?? null

        if (!wantsValue)
          return state(value !== null, `${name}=${JSON.stringify(value)}`, `no ${name} attribute`)

        if (value === null)
          return { pass: false, actual: `no ${name} attribute` }

        return compare(String(value), expected as string | RegExp, true)
      },
    ))
  },

  async toHaveClass(
    this: MatcherContext,
    received: unknown,
    expected: string | RegExp | Array<string | RegExp>,
    options: AssertionOptions = {},
  ): Promise<MatcherResult> {
    const locator = asLocator(received, 'toHaveClass')
    // Playwright compares the whole `class` attribute for a string, which
    // surprises people expecting "has this class". A RegExp is the way to ask
    // for one of several.
    return assertThat(this, locator, expectationFor(expected, 'the class'), timeoutOf(locator, options.timeout), () =>
      Array.isArray(expected)
        ? locator.elementHandles().then((els: any[]) => compareAll(els.map(el => normalize(el.className)), expected, true))
        : onElement(locator, element => compare(normalize(element.className), expected, true))())
  },

  async toBeEnabled(this: MatcherContext, received: unknown, options: AssertionOptions = {}): Promise<MatcherResult> {
    const locator = asLocator(received, 'toBeEnabled')
    return assertThat(this, locator, 'enabled', timeoutOf(locator, options.timeout), onElement(
      locator,
      element => state(element.disabled !== true, 'enabled', 'disabled'),
    ))
  },

  async toBeDisabled(this: MatcherContext, received: unknown, options: AssertionOptions = {}): Promise<MatcherResult> {
    const locator = asLocator(received, 'toBeDisabled')
    return assertThat(this, locator, 'disabled', timeoutOf(locator, options.timeout), onElement(
      locator,
      element => state(element.disabled === true, 'disabled', 'enabled'),
    ))
  },

  async toBeChecked(
    this: MatcherContext,
    received: unknown,
    options: AssertionOptions & { checked?: boolean, indeterminate?: boolean } = {},
  ): Promise<MatcherResult> {
    const locator = asLocator(received, 'toBeChecked')
    const wantsMixed = options.indeterminate === true
    const wanted = options.checked ?? true
    const expectation = wantsMixed ? 'indeterminate' : (wanted ? 'checked' : 'unchecked')

    return assertThat(this, locator, expectation, timeoutOf(locator, options.timeout), onElement(
      locator,
      (element) => {
        // Reads `aria-checked` as well as the native property, so a design
        // system's role="checkbox" is answered truthfully (#1616).
        const actual = checkedState(element)

        if (actual === undefined) {
          // Refused rather than answered `false`. A `.not.toBeChecked()` that
          // passes against a plain <div> is the unconditional pass this matcher
          // exists to stop, only moved somewhere harder to notice.
          throw new NotApplicable(
            `toBeChecked() expects a checkbox, radio or switch. ${locator} resolved to an element with no checked state — `
            + 'a custom control needs role="checkbox" (or radio/switch) for aria-checked to mean anything.',
          )
        }

        const label = actual === 'mixed' ? 'indeterminate' : (actual ? 'checked' : 'unchecked')

        return wantsMixed
          ? { pass: actual === 'mixed', actual: label }
          : { pass: (actual === true) === wanted, actual: label }
      },
    ))
  },

  async toBeEditable(this: MatcherContext, received: unknown, options: AssertionOptions = {}): Promise<MatcherResult> {
    const locator = asLocator(received, 'toBeEditable')
    return assertThat(this, locator, 'editable', timeoutOf(locator, options.timeout), onElement(
      locator,
      // Asked of the locator rather than reimplemented, so "editable" keeps one
      // definition. Safe here because strictness has already been checked.
      async () => state(await locator.isEditable(), 'editable', 'not editable'),
    ))
  },

  async toBeFocused(this: MatcherContext, received: unknown, options: AssertionOptions = {}): Promise<MatcherResult> {
    const locator = asLocator(received, 'toBeFocused')
    return assertThat(this, locator, 'focused', timeoutOf(locator, options.timeout), onElement(
      locator,
      element => state(element.ownerDocument?.activeElement === element, 'focused', 'not focused'),
    ))
  },

  async toBeEmpty(this: MatcherContext, received: unknown, options: AssertionOptions = {}): Promise<MatcherResult> {
    const locator = asLocator(received, 'toBeEmpty')
    return assertThat(this, locator, 'empty', timeoutOf(locator, options.timeout), onElement(
      locator,
      (element) => {
        const empty = normalize(element.textContent) === '' && (element.children?.length ?? 0) === 0
        return state(empty, 'empty', `${JSON.stringify(normalize(element.textContent))} and ${element.children?.length ?? 0} child element(s)`)
      },
    ))
  },

  async toHaveRole(this: MatcherContext, received: unknown, expected: string, options: AssertionOptions = {}): Promise<MatcherResult> {
    const locator = asLocator(received, 'toHaveRole')
    // The thing `getByRole` queries on, which is what makes a failing role query
    // diagnosable: "nothing matched" says nothing about why.
    return assertThat(this, locator, `the role ${JSON.stringify(expected)}`, timeoutOf(locator, options.timeout), onElement(
      locator,
      async () => {
        const role = await locator.ariaRole()
        return { pass: role === expected, actual: role === null ? 'no role' : JSON.stringify(role) }
      },
    ))
  },

  async toHaveAccessibleName(
    this: MatcherContext,
    received: unknown,
    expected: string | RegExp,
    options: AssertionOptions & { exact?: boolean } = {},
  ): Promise<MatcherResult> {
    const locator = asLocator(received, 'toHaveAccessibleName')
    return assertThat(this, locator, expectationFor(expected, 'the accessible name'), timeoutOf(locator, options.timeout), onElement(
      locator,
      async () => compare(await locator.accessibleName(), expected, options.exact !== false),
    ))
  },

  async toHaveAccessibleDescription(
    this: MatcherContext,
    received: unknown,
    expected: string | RegExp,
    options: AssertionOptions & { exact?: boolean } = {},
  ): Promise<MatcherResult> {
    const locator = asLocator(received, 'toHaveAccessibleDescription')
    return assertThat(this, locator, expectationFor(expected, 'the accessible description'), timeoutOf(locator, options.timeout), onElement(
      locator,
      async () => compare(await locator.accessibleDescription(), expected, options.exact !== false),
    ))
  },

  async toHaveCSS(
    this: MatcherContext,
    received: unknown,
    name: string,
    expected: string | RegExp,
    options: AssertionOptions = {},
  ): Promise<MatcherResult> {
    const locator = asLocator(received, 'toHaveCSS')
    const page = pageOf(locator)

    return assertThat(this, locator, `${name}=${JSON.stringify(expected instanceof RegExp ? String(expected) : expected)}`, timeoutOf(locator, options.timeout), onElement(
      locator,
      (element) => {
        const view = element.ownerDocument?.defaultView ?? page?.mainFrame?.window
        const resolved = String(view?.getComputedStyle?.(element)?.getPropertyValue?.(name) ?? '')
        const judged = compare(resolved, expected, true)

        // Values are compared as the engine reports them. `'red'` against a
        // computed `'rgb(255, 0, 0)'` has to fail rather than be normalised into
        // passing, and saying so here saves the puzzling.
        if (!judged.pass && typeof expected === 'string' && resolved !== '') {
          return { pass: false, actual: `${judged.actual} (compared as written; computed values are not normalised)` }
        }

        return judged
      },
    ))
  },

  async toHaveId(this: MatcherContext, received: unknown, expected: string | RegExp, options: AssertionOptions = {}): Promise<MatcherResult> {
    const locator = asLocator(received, 'toHaveId')
    return assertThat(this, locator, expectationFor(expected, 'the id'), timeoutOf(locator, options.timeout), onElement(
      locator,
      element => compare(String(element.getAttribute?.('id') ?? ''), expected, true),
    ))
  },

  async toHaveJSProperty(
    this: MatcherContext,
    received: unknown,
    name: string,
    expected: unknown,
    options: AssertionOptions = {},
  ): Promise<MatcherResult> {
    const locator = asLocator(received, 'toHaveJSProperty')
    return assertThat(this, locator, `${name} === ${JSON.stringify(expected)}`, timeoutOf(locator, options.timeout), onElement(
      locator,
      (element) => {
        // Reached by path, so `validity.valid` works as it does in Playwright.
        const actual = name.split('.').reduce<any>((value, key) => value?.[key], element)
        return { pass: Object.is(actual, expected), actual: JSON.stringify(actual) ?? String(actual) }
      },
    ))
  },

  async toHaveValues(
    this: MatcherContext,
    received: unknown,
    expected: Array<string | RegExp>,
    options: AssertionOptions = {},
  ): Promise<MatcherResult> {
    const locator = asLocator(received, 'toHaveValues')
    // Worth having now that `selectOption` exists to set the state (#1608).
    return assertThat(this, locator, expectationFor(expected, 'the selected values'), timeoutOf(locator, options.timeout), onElement(
      locator,
      async () => compareAll(await locator.selectedValues(), expected, true),
    ))
  },

  async toHaveURL(this: MatcherContext, received: unknown, expected: string | RegExp, options: AssertionOptions = {}): Promise<MatcherResult> {
    const page = asPage(received, 'toHaveURL')
    return assertThat(this, { toString: () => 'the page' }, expectationFor(expected, 'the URL'), timeoutOf(page, options.timeout), () =>
      compare(String(page.url ?? ''), expected, true))
  },

  async toHaveTitle(this: MatcherContext, received: unknown, expected: string | RegExp, options: AssertionOptions = {}): Promise<MatcherResult> {
    const page = asPage(received, 'toHaveTitle')
    return assertThat(this, { toString: () => 'the page' }, expectationFor(expected, 'the title'), timeoutOf(page, options.timeout), async () =>
      compare(normalize(await page.title()), expected, true))
  },
}

expect.extend(matchers as any)

// Give TypeScript the same surface the runtime just gained.
declare module 'bun:test' {
  interface Matchers<T = unknown> {
    /** The locator resolves to at least one element in the DOM. */
    toBeAttached: (options?: AssertionOptions) => Promise<void>
    /** The element is painted: no `display: none`, `visibility: hidden` or `hidden`. */
    toBeVisible: (options?: AssertionOptions) => Promise<void>
    toBeInViewport: (options?: AssertionOptions & { ratio?: number }) => Promise<void>
    /** The element is not painted, or is not there at all. */
    toBeHidden: (options?: AssertionOptions) => Promise<void>
    /** How many elements the locator resolves to. Not strict. */
    toHaveCount: (expected: number, options?: AssertionOptions) => Promise<void>
    /** The whole rendered text, whitespace-normalised. */
    toHaveText: (
      expected: string | RegExp | Array<string | RegExp>,
      options?: AssertionOptions & { useInnerText?: boolean },
    ) => Promise<void>
    /** Part of the rendered text, whitespace-normalised. */
    toContainText: (
      expected: string | RegExp | Array<string | RegExp>,
      options?: AssertionOptions & { useInnerText?: boolean },
    ) => Promise<void>
    toHaveValue: (expected: string | RegExp, options?: AssertionOptions) => Promise<void>
    /** With a value, the attribute equals it; with the name alone, it is present. */
    toHaveAttribute: (
      name: string,
      expected?: string | RegExp | AssertionOptions,
      options?: AssertionOptions,
    ) => Promise<void>
    /** The whole `class` attribute for a string; use a RegExp to ask about one class. */
    toHaveClass: (
      expected: string | RegExp | Array<string | RegExp>,
      options?: AssertionOptions,
    ) => Promise<void>
    toBeEnabled: (options?: AssertionOptions) => Promise<void>
    toBeDisabled: (options?: AssertionOptions) => Promise<void>
    toBeChecked: (options?: AssertionOptions & { checked?: boolean, indeterminate?: boolean }) => Promise<void>
    toBeEditable: (options?: AssertionOptions) => Promise<void>
    toBeFocused: (options?: AssertionOptions) => Promise<void>
    /** No text and no child elements. */
    toBeEmpty: (options?: AssertionOptions) => Promise<void>
    /** The computed role, which is what `getByRole` queries on. */
    toHaveRole: (expected: string, options?: AssertionOptions) => Promise<void>
    toHaveAccessibleName: (
      expected: string | RegExp,
      options?: AssertionOptions & { exact?: boolean },
    ) => Promise<void>
    toHaveAccessibleDescription: (
      expected: string | RegExp,
      options?: AssertionOptions & { exact?: boolean },
    ) => Promise<void>
    /** Compared as the engine reports it: `'red'` will not match `'rgb(255, 0, 0)'`. */
    toHaveCSS: (name: string, expected: string | RegExp, options?: AssertionOptions) => Promise<void>
    toHaveId: (expected: string | RegExp, options?: AssertionOptions) => Promise<void>
    /** A property, reachable by path — `validity.valid` works. */
    toHaveJSProperty: (name: string, expected: unknown, options?: AssertionOptions) => Promise<void>
    /** Every selected value of a `<select multiple>`. */
    toHaveValues: (expected: Array<string | RegExp>, options?: AssertionOptions) => Promise<void>
    /** Asked of a page, not a locator. */
    toHaveURL: (expected: string | RegExp, options?: AssertionOptions) => Promise<void>
    /** Asked of a page, not a locator. */
    toHaveTitle: (expected: string | RegExp, options?: AssertionOptions) => Promise<void>
  }
}

export type { Locator }
