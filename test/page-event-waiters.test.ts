import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'
import { TimeoutError } from '../src/browser/waiting'

// =============================================================================
// Waiting on a page event (#1606).
//
// The events fired; nothing returned a promise to await on one. Registering a
// handler and hoping means guessing how long to wait, and guessing wrong fails
// in both directions: too short flakes, too long makes every test pay.
//
// The half that mattered most was missing entirely. `response` was only emitted
// for a navigation, so a `waitForResponse` after a button click — which is what
// almost every real use is — would have waited for something that never came.
// Intercepted requests now report their responses too.
// =============================================================================

let page: any
let document: any

beforeEach(() => {
  page = new Browser().newPage()
  document = page.mainFrame.window.document
  page.setDefaultTimeout(400)
})

afterEach(async () => {
  // Routes and interception are installed on the global fetch. Left behind,
  // they answer other test files' requests and break them a long way from here.
  await page.unroute?.()
  await page.setRequestInterception?.(false)
})

/** Answer a URL pattern without touching the network. */
function serve(pattern: string, body: string, status = 200, contentType = 'application/json'): void {
  page.route(pattern, (route: any) => route.fulfill({ status, body, contentType }))
}

describe('waitForResponse', () => {
  test('the documented Promise.all shape resolves with the response', async () => {
    serve('https://api.test/trails*', JSON.stringify({ trails: ['Ridge', 'Gorge'] }))

    const [response] = await Promise.all([
      page.waitForResponse('https://api.test/trails*'),
      // The action, started after the wait is already subscribed.
      fetch('https://api.test/trails?area=north'),
    ])

    expect(response.status).toBe(200)
    // The body must still be readable: a response whose stream was consumed on
    // the way to the listener would be useless to the caller.
    expect((await response.clone().json()).trails).toEqual(['Ridge', 'Gorge'])
  })

  test('a page-code fetch reports its response, not only a navigation', async () => {
    // The case the feature exists for. Before this, `response` was emitted in
    // BrowserFrame._navigate and nowhere else.
    serve('https://api.test/save', JSON.stringify({ saved: true }))

    const [response] = await Promise.all([
      page.waitForResponse('https://api.test/save'),
      fetch('https://api.test/save', { method: 'POST' }),
    ])

    expect((await response.clone().json()).saved).toBe(true)
  })

  test('the predicate sees a URL, even on a fulfilled response', async () => {
    // A Response built from a body carries no url of its own, so this is the
    // part a URL predicate depends on (#1602).
    serve('https://api.test/one', '{}')

    const [response] = await Promise.all([
      page.waitForResponse((r: any) => r.url.endsWith('/one') && r.status === 200),
      fetch('https://api.test/one'),
    ])

    expect(response.url).toBe('https://api.test/one')
  })

  test('a glob, a RegExp and a predicate all select', async () => {
    serve('https://api.test/**', '{"ok":true}')

    const byGlob = Promise.all([page.waitForResponse('https://api.test/a/**'), fetch('https://api.test/a/b')])
    expect((await byGlob)[0].url).toBe('https://api.test/a/b')

    const byRegExp = Promise.all([page.waitForResponse(/\/c$/), fetch('https://api.test/c')])
    expect((await byRegExp)[0].url).toBe('https://api.test/c')

    const byPredicate = Promise.all([page.waitForResponse((r: any) => r.status === 200), fetch('https://api.test/d')])
    expect((await byPredicate)[0].status).toBe(200)
  })

  test('a non-matching response is skipped, and the count is reported', async () => {
    serve('https://api.test/**', '{}')

    const waiting = page.waitForResponse('https://api.test/wanted', { timeout: 120 })
    await fetch('https://api.test/other')
    await fetch('https://api.test/another')

    const failure = await waiting.catch((error: Error) => error)
    expect(failure).toBeInstanceOf(TimeoutError)
    // "none fired" and "two fired and neither matched" are different bugs.
    expect(failure.message).toContain('2 response event(s) fired, none matched')
  })

  test('a navigation reports exactly one response, not two', async () => {
    // With routes installed, a navigation's fetch passes through interception,
    // so the interceptor and the navigation both have claim to announce it.
    serve('https://example.test/**', '<html><body>ok</body></html>', 200, 'text/html')
    const seen: any[] = []
    page.on('response', (response: any) => seen.push(response))

    await page.goto('https://example.test/page')

    expect(seen).toHaveLength(1)
    expect(seen[0].url).toContain('example.test/page')
  })
})

describe('waitForRequest', () => {
  test('resolves on the matching request', async () => {
    serve('https://api.test/**', '{}')

    const [request] = await Promise.all([
      page.waitForRequest('https://api.test/submit'),
      fetch('https://api.test/submit', { method: 'POST' }),
    ])

    expect(request.method).toBe('POST')
    expect(request.url).toBe('https://api.test/submit')
  })

  test('the request is reported before a slow route decides', async () => {
    // Playwright reports a request when it starts, not when routing finishes.
    // Announcing after the handlers would push the event behind whatever a
    // route awaits, so a short-timeout wait would fail for the wrong reason.
    const order: string[] = []
    page.route('https://api.test/**', async (route: any) => {
      await new Promise(resolve => setTimeout(resolve, 40))
      order.push('route')
      await route.fulfill({ status: 200, body: '{}' })
    })
    page.on('request', () => order.push('request'))

    await fetch('https://api.test/slow')

    expect(order).toEqual(['request', 'route'])
  })

  test('a request a route aborts is still reported', async () => {
    // The attempt happened either way, which is why the request is announced
    // before the handlers get a say rather than after.
    page.route('https://api.test/**', (route: any) => route.abort())

    const [request] = await Promise.all([
      page.waitForRequest('https://api.test/doomed'),
      fetch('https://api.test/doomed').catch(() => null),
    ])

    expect(request.url).toBe('https://api.test/doomed')
  })

  test('without interception it says so instead of timing out', async () => {
    // Nothing emits a request event until interception is on, so a bare timeout
    // would send whoever hit it looking at their predicate.
    await expect(page.waitForRequest('https://api.test/**'))
      .rejects
      .toThrow(/needs request interception/)
  })
})

describe('waitForLoadState', () => {
  test('returns at once for a state already reached', async () => {
    serve('https://example.test/**', '<html><body>ok</body></html>', 200, 'text/html')
    await page.goto('https://example.test/')

    // The usual call site: after a navigation that already finished. Waiting
    // for an event that fired a moment ago would hang for the whole timeout.
    const started = Date.now()
    await page.waitForLoadState('load')
    await page.waitForLoadState('domcontentloaded')
    expect(Date.now() - started).toBeLessThan(50)
  })

  test('waits when the state has not been reached', async () => {
    serve('https://example.test/**', '<html><body>ok</body></html>', 200, 'text/html')

    const [, response] = await Promise.all([
      page.waitForLoadState('load'),
      page.goto('https://example.test/late'),
    ])

    expect(response.status).toBe(200)
    expect(document.readyState).toBe('complete')
  })

  test('networkidle is refused rather than faked', async () => {
    // Nothing tracks in-flight requests, so it could only ever be a lie.
    expect(() => page.waitForLoadState('networkidle')).toThrow(/not supported/)
  })
})

describe('waitForURL', () => {
  test('returns at once when the URL already matches', async () => {
    serve('https://example.test/**', '<html><body>ok</body></html>', 200, 'text/html')
    await page.goto('https://example.test/trails')

    const started = Date.now()
    await page.waitForURL('**/trails')
    expect(Date.now() - started).toBeLessThan(50)
  })

  test('picks up a pushState, which fires no load event', async () => {
    // Polled rather than event-driven for exactly this: a client-side route
    // change moves the URL with nothing to hang a listener off.
    serve('https://example.test/**', '<html><body>ok</body></html>', 200, 'text/html')
    await page.goto('https://example.test/')
    setTimeout(() => { page.mainFrame.url = 'https://example.test/trails/42' }, 20)

    await expect(page.waitForURL(/\/trails\/\d+$/)).resolves.toBeUndefined()
  })

  test('a timeout says what the URL actually was', async () => {
    const failure = await page.waitForURL('**/nowhere', { timeout: 60 }).catch((error: Error) => error)

    expect(failure).toBeInstanceOf(TimeoutError)
    expect(failure.message).toContain('the URL was')
  })
})

describe('waitForEvent, the primitive', () => {
  test('settles on any advertised event', async () => {
    const [event] = await Promise.all([
      page.waitForEvent('console'),
      Promise.resolve().then(() => page.mainFrame.window.console.log('from the page')),
    ])

    expect(event.type).toBe('log')
    expect(event.args[0]).toBe('from the page')
  })

  test('a bare predicate is accepted in place of options', async () => {
    const [event] = await Promise.all([
      page.waitForEvent('console', (e: any) => e.type === 'warn'),
      Promise.resolve().then(() => {
        page.mainFrame.window.console.log('ignored')
        page.mainFrame.window.console.warn('wanted')
      }),
    ])

    expect(event.args[0]).toBe('wanted')
  })

  test('a throwing predicate surfaces rather than becoming a timeout', async () => {
    // The caller's bug. Hiding it behind a timeout would send them looking at
    // the event that never arrived instead of the line that threw.
    const waiting = page.waitForEvent('console', () => {
      throw new Error('predicate exploded')
    })
    Promise.resolve().then(() => page.mainFrame.window.console.log('x'))

    await expect(waiting).rejects.toThrow('predicate exploded')
  })

  test('the handler is removed on both paths', async () => {
    // A handler left behind answers later tests' events. This is the guard.
    const count = (): number => (page as any)._eventListeners.get('console')?.size ?? 0
    expect(count()).toBe(0)

    await Promise.all([
      page.waitForEvent('console'),
      Promise.resolve().then(() => page.mainFrame.window.console.log('a')),
    ])
    expect(count()).toBe(0)

    await page.waitForEvent('console', { timeout: 30 }).catch(() => {})
    expect(count()).toBe(0)
  })

  test('an event that already fired is not replayed, and the message explains', async () => {
    // Playwright's contract, and it bites harder here: goto() emits
    // synchronously and returns, so the window between action and subscription
    // is zero rather than a process boundary.
    serve('https://example.test/**', '<html><body>ok</body></html>', 200, 'text/html')
    await page.goto('https://example.test/')

    const failure = await page.waitForResponse('https://example.test/**', { timeout: 60 })
      .catch((error: Error) => error)

    expect(failure).toBeInstanceOf(TimeoutError)
    expect(failure.message).toContain('Subscribe before the action')
  })
})
