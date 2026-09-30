import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'

// =============================================================================
// Routing and explicit interception share one mechanism, and neither may switch
// it off on the other's behalf (#1613).
//
// `setRequestInterception(false)` used to call the interceptor's `clear()`,
// dropping every handler including the one that drives routing — while the flag
// guarding reinstallation stayed set. So `route()` went on accepting handlers,
// returning normally, and nothing ever consulted them.
//
// The silence was the damage. The request was not blocked, it *escaped*: a test
// meaning to mock an endpoint reached the real one, which is a connection error
// in CI and a quiet pass against live data on a machine with network access.
// =============================================================================

let browser: Browser
let page: any
/** The real fetch, captured before any page can override it. */
let pristine: typeof globalThis.fetch

beforeEach(() => {
  pristine = globalThis.fetch
  browser = new Browser()
  page = browser.newPage()
  page.setDefaultTimeout(300)
})

afterEach(async () => {
  await page.unroute?.()
  await page.setRequestInterception?.(false)
  globalThis.fetch = pristine
})

/** Answer a pattern with a fixed body. */
function serve(pattern: string, body: string): void {
  page.route(pattern, (route: any) => route.fulfill({ status: 200, body, contentType: 'text/plain' }))
}

const text = (url: string) => fetch(url).then(r => r.text()).catch((error: Error) => `THREW: ${error.message}`)

describe('a route registered after interception is disabled', () => {
  test('still intercepts', async () => {
    // The reproduction. This used to answer with a connection error, because
    // the request went to the real network.
    serve('https://a.test/**', 'first')
    expect(await text('https://a.test/x')).toBe('first')

    await page.setRequestInterception(false)

    serve('https://a.test/**', 'second')
    expect(await text('https://a.test/y')).toBe('second')
  })

  test('routes registered before the disable keep working', async () => {
    serve('https://a.test/**', 'before')

    await page.setRequestInterception(false)

    // Disabling explicit interception is not a reason to forget a live route.
    expect(await text('https://a.test/z')).toBe('before')
  })
})

describe('disabling still disables, when nothing else needs it', () => {
  test('the fetch override comes off once no route is left', async () => {
    serve('https://a.test/**', 'served')
    expect(globalThis.fetch).not.toBe(pristine)

    await page.unroute()
    await page.setRequestInterception(false)

    // The part a test's teardown depends on: other files' requests must not
    // keep arriving at a page that is finished with.
    expect(globalThis.fetch).toBe(pristine)
  })

  test('unroute alone takes the override off', async () => {
    serve('https://a.test/**', 'served')
    expect(globalThis.fetch).not.toBe(pristine)

    await page.unroute()

    // No setRequestInterception(false) here on purpose. Nothing ever asked for
    // explicit interception, so dropping the last route is reason enough — and
    // a caller who only ever used route() should not have to know the other
    // method exists to clean up after themselves.
    expect(globalThis.fetch).toBe(pristine)
  })

  test('explicit interception stops reporting requests once turned off', async () => {
    // Observable without the network: interception is what emits `request`.
    const seen: string[] = []
    page.on('request', (request: any) => seen.push(request.url))

    await page.setRequestInterception(true)
    serve('https://a.test/**', 'ok')
    await text('https://a.test/while-on')
    expect(seen).toEqual(['https://a.test/while-on'])

    await page.unroute()
    await page.setRequestInterception(false)
    await text('https://a.test/while-off')

    // Nothing new: the fetch is the real one again, so it is not reported.
    expect(seen).toEqual(['https://a.test/while-on'])
  })

  test('a route alone keeps the override installed after a disable', async () => {
    serve('https://a.test/**', 'ok')
    await page.setRequestInterception(false)

    expect(globalThis.fetch).not.toBe(pristine)
  })

  test('unroute leaves the override on while another route remains', async () => {
    const first = (route: any) => route.fulfill({ status: 200, body: 'one', contentType: 'text/plain' })
    page.route('https://a.test/one', first)
    serve('https://a.test/two', 'two')

    await page.unroute('https://a.test/one', first)

    expect(await text('https://a.test/two')).toBe('two')
  })
})

describe('context routes count as a reason to intercept', () => {
  test('a context route survives a page disabling interception', async () => {
    const context = browser.newIncognitoContext()
    const scoped: any = context.newPage()
    await context.route('https://ctx.test/**', (route: any) =>
      route.fulfill({ status: 200, body: 'from context', contentType: 'text/plain' }))

    await scoped.setRequestInterception(false)

    expect(await text('https://ctx.test/a')).toBe('from context')
    await context.unroute()
    await scoped.setRequestInterception(false)
  })

  test('removing the last context route takes the override off its pages', async () => {
    const context = browser.newIncognitoContext()
    context.newPage()
    await context.route('https://ctx.test/**', (route: any) => route.fulfill({ status: 200, body: 'x' }))
    expect(globalThis.fetch).not.toBe(pristine)

    await context.unroute()

    // The mirror of route(): a page left intercepting for a route nobody holds
    // is the same leak in the other direction.
    expect(globalThis.fetch).toBe(pristine)
  })
})
