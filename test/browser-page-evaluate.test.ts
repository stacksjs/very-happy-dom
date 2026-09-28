/**
 * BrowserPage/BrowserFrame evaluate().
 *
 * Regression guard for #1587: a string ran through the host `eval()`, where
 * `document` and `window` were whatever the module scope happened to have —
 * usually nothing — so `evaluate('document.title')` threw
 * `document is not defined`. A second argument was accepted by callers and then
 * dropped, so a page function expecting a value silently received `undefined`.
 */

import { describe, expect, test } from 'bun:test'
import { Browser } from '../src'

function page() {
  const browser = new Browser()
  const created = browser.newPage() as any
  created.content = '<head><title>Page title</title></head><body><h1>Hi</h1></body>'
  return created
}

describe('evaluate resolves the frame realm', () => {
  test('a string expression sees the frame document', () => {
    expect(page().evaluate('document.title')).toBe('Page title')
  })

  test('a string expression can query the frame DOM', () => {
    expect(page().evaluate("document.querySelector('h1').textContent")).toBe('Hi')
  })

  test('a plain expression still evaluates', () => {
    expect(page().evaluate('1 + 1')).toBe(2)
  })

  test('a function sees the frame document', () => {
    expect(page().evaluate(() => document.querySelector('h1')!.textContent)).toBe('Hi')
  })

  test('window and document are this frame, not another realm', () => {
    const subject = page()

    expect(subject.evaluate(() => window)).toBe(subject.mainFrame.window)
    expect(subject.evaluate(() => document)).toBe(subject.mainFrame.document)
  })

  test('bare window globals resolve', () => {
    const subject = page()

    // `with (window)` is what puts these in scope; without it only the
    // `window`/`document` parameters were reachable.
    expect(subject.evaluate('innerWidth')).toBe(subject.viewport.width)
    expect(subject.evaluate(() => {
      localStorage.setItem('k', 'v')
      return localStorage.getItem('k')
    })).toBe('v')
    expect(subject.evaluate(() => typeof navigator.userAgent)).toBe('string')
    expect(subject.evaluate(() => matchMedia('(min-width: 768px)').matches)).toBe(true)
  })

  test('globalThis is NOT the frame window', () => {
    // A documented limitation rather than an oversight: the page function runs
    // through `with (window)` in the host realm, so bare names resolve against
    // the frame while `globalThis` stays the host's. Playwright runs in real
    // page context, where the two agree. Code under test that reaches for
    // `globalThis.document` will not see the frame.
    const subject = page()

    expect(subject.evaluate(() => globalThis === (window as any))).toBe(false)
    expect(subject.evaluate(() => (globalThis as any).document)).toBeUndefined()
  })
})

describe('evaluate forwards an argument', () => {
  test('a number reaches the page function', () => {
    expect(page().evaluate((value: number) => value + 1, 41)).toBe(42)
  })

  test('an object reaches the page function', () => {
    expect(page().evaluate((input: { a: number, b: number }) => input.a + input.b, { a: 1, b: 2 })).toBe(3)
  })

  test('a string function expression receives it too', () => {
    expect(page().evaluate('(value) => value * 2', 21)).toBe(42)
  })

  test('omitting it leaves the parameter undefined', () => {
    expect(page().evaluate((value: unknown) => value === undefined)).toBe(true)
  })
})

describe('evaluate return values', () => {
  test('a string that is a function expression is invoked', () => {
    expect(page().evaluate('() => 7')).toBe(7)
  })

  test('arrays and objects come back intact', () => {
    expect(page().evaluate(() => [1, 2, 3])).toEqual([1, 2, 3])
    expect(page().evaluate(() => ({ ok: true }))).toEqual({ ok: true })
  })

  test('the result composes with await, so an async page function resolves', async () => {
    // The value is returned directly rather than wrapped in a promise, which
    // keeps callers that read it synchronously working while still allowing
    // `await` on an async page function.
    expect(await page().evaluate(async () => 7)).toBe(7)
  })
})

describe('BrowserPage delegates to the main frame', () => {
  test('the argument survives the delegation', () => {
    expect(page().evaluate((value: number) => value - 1, 43)).toBe(42)
  })

  test('page and frame evaluate in the same realm', () => {
    const subject = page()

    expect(subject.evaluate(() => document))
      .toBe(subject.mainFrame.evaluate(() => document))
  })
})
