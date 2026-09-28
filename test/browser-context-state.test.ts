/**
 * BrowserContext state.
 *
 * Added for #1593: a context was only a grouping of pages. Each document built
 * its own cookie jar and each window its own storage, so a cookie set by one
 * page was invisible to a sibling in the same context — which no browser does.
 * A context is meant to be the isolation boundary: its pages behave like tabs
 * in one profile.
 */

import { describe, expect, test } from 'bun:test'
import { Browser } from '../src'

const ORIGIN = 'https://example.com/'

/** A context with `count` pages, all pointed at the same origin. */
function contextWith(count: number, url = ORIGIN) {
  const context = new Browser().newIncognitoContext() as any
  const pages = Array.from({ length: count }, () => {
    const page = context.newPage() as any
    page.url = url
    return page
  })
  return { context, pages }
}

describe('cookies belong to the context', () => {
  test('a sibling page sees a cookie set by another', () => {
    const { pages } = contextWith(2)

    pages[0].mainFrame.document.cookie = 'session=abc'

    expect(pages[1].mainFrame.document.cookie).toContain('session=abc')
  })

  test('another context sees nothing', () => {
    const browser = new Browser()
    const first = browser.newIncognitoContext() as any
    const second = browser.newIncognitoContext() as any
    const a = first.newPage() as any
    const b = second.newPage() as any
    a.url = ORIGIN
    b.url = ORIGIN

    a.mainFrame.document.cookie = 'session=abc'

    expect(b.mainFrame.document.cookie).toBe('')
  })

  test('cookies() reports the jar, and addCookies seeds it', async () => {
    const { context } = contextWith(0)

    await context.addCookies([{ key: 'a', value: '1', domain: 'example.com', path: '/' }])

    expect((await context.cookies()).map((c: any) => `${c.key}=${c.value}`)).toEqual(['a=1'])
  })

  test('clearCookies empties it', async () => {
    const { context } = contextWith(0)
    await context.addCookies([{ key: 'a', value: '1', domain: 'example.com', path: '/' }])

    await context.clearCookies()

    expect(await context.cookies()).toEqual([])
  })

  test('a seeded cookie is readable by a page', async () => {
    const { context } = contextWith(0)
    await context.addCookies([{ key: 'seeded', value: 'yes', domain: 'example.com', path: '/' }])

    const page = context.newPage() as any
    page.url = ORIGIN

    expect(page.mainFrame.document.cookie).toContain('seeded=yes')
  })
})

describe('localStorage is shared per origin', () => {
  test('a sibling page on the same origin shares it', () => {
    const { pages } = contextWith(2)

    pages[0].mainFrame.window.localStorage.setItem('k', 'v')

    expect(pages[1].mainFrame.window.localStorage.getItem('k')).toBe('v')
  })

  test('a different origin is partitioned', () => {
    const { context, pages } = contextWith(1)
    pages[0].mainFrame.window.localStorage.setItem('k', 'v')

    const elsewhere = context.newPage() as any
    elsewhere.url = 'https://other.test/'

    expect(elsewhere.mainFrame.window.localStorage.getItem('k')).toBeNull()
  })

  test('navigating to another origin swaps the store', () => {
    const { pages } = contextWith(1)
    pages[0].mainFrame.window.localStorage.setItem('k', 'v')

    pages[0].url = 'https://other.test/'
    expect(pages[0].mainFrame.window.localStorage.getItem('k')).toBeNull()

    // Returning to the first origin finds its entries again.
    pages[0].url = ORIGIN
    expect(pages[0].mainFrame.window.localStorage.getItem('k')).toBe('v')
  })

  test('sessionStorage stays per page, as it is per tab in a browser', () => {
    const { pages } = contextWith(2)

    pages[0].mainFrame.window.sessionStorage.setItem('s', '1')

    expect(pages[1].mainFrame.window.sessionStorage.getItem('s')).toBeNull()
  })

  test('another context does not share storage', () => {
    const browser = new Browser()
    const first = browser.newIncognitoContext() as any
    const second = browser.newIncognitoContext() as any
    const a = first.newPage() as any
    const b = second.newPage() as any
    a.url = ORIGIN
    b.url = ORIGIN

    a.mainFrame.window.localStorage.setItem('k', 'v')

    expect(b.mainFrame.window.localStorage.getItem('k')).toBeNull()
  })
})

describe('storageState', () => {
  test('captures cookies and per-origin localStorage', async () => {
    const { context, pages } = contextWith(1)
    pages[0].mainFrame.document.cookie = 'session=secret'
    pages[0].mainFrame.window.localStorage.setItem('token', 'jwt-123')

    const state = await context.storageState()

    expect(state.cookies.some((c: any) => c.key === 'session')).toBe(true)
    expect(state.origins).toEqual([
      { origin: 'https://example.com', localStorage: [{ name: 'token', value: 'jwt-123' }] },
    ])
  })

  test('round-trips into a fresh context, which is the auth-reuse case', async () => {
    const browser = new Browser()
    const signedIn = browser.newIncognitoContext() as any
    const page = signedIn.newPage() as any
    page.url = ORIGIN
    page.mainFrame.document.cookie = 'session=secret'
    page.mainFrame.window.localStorage.setItem('token', 'jwt-123')

    const state = await signedIn.storageState()

    const fresh = browser.newIncognitoContext() as any
    await fresh.restoreStorageState(state)
    const restored = fresh.newPage() as any
    restored.url = ORIGIN

    expect(restored.mainFrame.document.cookie).toContain('session=secret')
    expect(restored.mainFrame.window.localStorage.getItem('token')).toBe('jwt-123')
  })

  test('leaves out an origin-less page and an empty store', async () => {
    const { context } = contextWith(0)
    const blank = context.newPage() as any
    blank.mainFrame.window.localStorage.setItem('x', '1')

    // about:blank has no origin to key storage by, so it is not something a
    // restore could meaningfully apply.
    expect((await context.storageState()).origins).toEqual([])
  })

  test('closing a context drops its state', async () => {
    const { context, pages } = contextWith(1)
    pages[0].mainFrame.document.cookie = 'session=abc'
    pages[0].mainFrame.window.localStorage.setItem('k', 'v')

    await context.close()

    const state = await context.storageState()
    expect(state.cookies).toEqual([])
    expect(state.origins).toEqual([])
  })
})
