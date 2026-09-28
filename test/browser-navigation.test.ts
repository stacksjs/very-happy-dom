/**
 * Main-frame navigation.
 *
 * Regression guard for #1586: `goto()` assigned the URL and returned null, so
 * nothing was requested, the document was never replaced, and every element
 * lookup afterwards resolved against whatever had been there before.
 * `reload`, `goBack`, `goForward`, `goSteps` and `waitForNavigation` were
 * no-ops too.
 *
 * Scripts are deliberately still not executed — see the last describe block.
 */

import { afterEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src'

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

/** Serve `html` for every request, recording the URLs asked for. */
function serve(html: string | ((url: string) => string), contentType = 'text/html') {
  const requested: string[] = []
  globalThis.fetch = (async (input: any) => {
    const url = String(input)
    requested.push(url)
    const body = typeof html === 'function' ? html(url) : html
    return new Response(body, { headers: { 'content-type': contentType } })
  }) as any
  return requested
}

function page() {
  return new Browser().newPage() as any
}

describe('goto', () => {
  test('requests the URL and returns the response', async () => {
    const requested = serve('<h1>Loaded</h1>')
    const subject = page()

    const response = await subject.goto('https://example.test/demo')

    expect(requested).toEqual(['https://example.test/demo'])
    expect(response).not.toBeNull()
    expect(response.status).toBe(200)
  })

  test('populates the document from the response', async () => {
    serve('<h1>Loaded</h1>')
    const subject = page()

    await subject.goto('https://example.test/demo')

    expect(subject.mainFrame.document.querySelector('h1').textContent).toBe('Loaded')
  })

  test('updates the URL and the window location together', async () => {
    serve('<p>x</p>')
    const subject = page()

    await subject.goto('https://example.test/dir/page?q=1')

    expect(subject.url).toBe('https://example.test/dir/page?q=1')
    expect(subject.mainFrame.window.location.pathname).toBe('/dir/page')
    expect(subject.mainFrame.window.location.search).toBe('?q=1')
  })

  test('resolves a relative URL against the current one', async () => {
    const requested = serve('<p>x</p>')
    const subject = page()

    await subject.goto('https://example.test/dir/page')
    await subject.goto('/other')

    expect(requested[1]).toBe('https://example.test/other')
  })

  test('replaces the previous document rather than appending to it', async () => {
    serve(url => (url.endsWith('/a') ? '<h1>A</h1>' : '<h1>B</h1>'))
    const subject = page()

    await subject.goto('https://example.test/a')
    await subject.goto('https://example.test/b')

    expect(subject.mainFrame.document.querySelectorAll('h1')).toHaveLength(1)
    expect(subject.mainFrame.document.querySelector('h1').textContent).toBe('B')
  })

  test('a non-network target gets a blank document and no response', async () => {
    const subject = page()

    const response = await subject.goto('about:blank')

    expect(response).toBeNull()
    expect(subject.url).toBe('about:blank')
  })

  test('a non-HTML response still navigates but is not parsed as markup', async () => {
    serve('{"a":1}', 'application/json')
    const subject = page()

    const response = await subject.goto('https://example.test/data.json')

    expect(response.status).toBe(200)
    // The document is left empty, but still structured: a browser always has a
    // body, and code appending to it after a navigation must not hit null.
    expect(subject.mainFrame.document.body).not.toBeNull()
    expect(subject.mainFrame.document.body.innerHTML).toBe('')
  })

  test('the document URL follows a redirect to where it landed', async () => {
    globalThis.fetch = (async () => {
      // A Response carrying a different url is what fetch reports after a
      // redirect chain.
      const response = new Response('<p>x</p>', { headers: { 'content-type': 'text/html' } })
      Object.defineProperty(response, 'url', { value: 'https://example.test/final' })
      return response
    }) as any
    const subject = page()

    await subject.goto('https://example.test/start')

    expect(subject.url).toBe('https://example.test/final')
  })
})

describe('lifecycle', () => {
  test('emits domcontentloaded then load', async () => {
    serve('<p>x</p>')
    const subject = page()
    const order: string[] = []
    subject.on('domcontentloaded', () => order.push('domcontentloaded'))
    subject.on('load', () => order.push('load'))

    await subject.goto('https://example.test/')

    expect(order).toEqual(['domcontentloaded', 'load'])
  })

  test('readyState settles at complete', async () => {
    serve('<p>x</p>')
    const subject = page()

    await subject.goto('https://example.test/')

    expect(subject.mainFrame.document.readyState).toBe('complete')
  })

  test('waitForNavigation resolves when one completes', async () => {
    serve('<h1>arrived</h1>')
    const subject = page()

    const waiting = subject.waitForNavigation()
    await subject.goto('https://example.test/x')
    await waiting

    expect(subject.mainFrame.document.querySelector('h1').textContent).toBe('arrived')
  })

  test('abort releases a pending navigation wait rather than hanging', async () => {
    const subject = page()

    const waiting = subject.waitForNavigation()
    await subject.abort()

    // An aborted navigation is never going to arrive; a caller awaiting it must
    // not be stuck on a promise that cannot settle.
    await waiting
  })
})

describe('history', () => {
  test('goBack and goForward move through it, re-rendering each entry', async () => {
    serve(url => `<h1>${url}</h1>`)
    const subject = page()

    await subject.goto('https://example.test/a')
    await subject.goto('https://example.test/b')

    await subject.goBack()
    expect(subject.url).toBe('https://example.test/a')
    expect(subject.mainFrame.document.querySelector('h1').textContent).toBe('https://example.test/a')

    await subject.goForward()
    expect(subject.url).toBe('https://example.test/b')
  })

  test('stepping past either end does nothing and returns null', async () => {
    serve('<p>x</p>')
    const subject = page()
    await subject.goto('https://example.test/a')

    expect(await subject.goForward()).toBeNull()
    await subject.goBack()
    expect(await subject.goBack()).toBeNull()
    expect(subject.url).toBe('about:blank')
  })

  test('a new navigation discards the forward entries', async () => {
    serve('<p>x</p>')
    const subject = page()
    await subject.goto('https://example.test/a')
    await subject.goto('https://example.test/b')
    await subject.goBack()

    await subject.goto('https://example.test/c')

    expect(await subject.goForward()).toBeNull()
    expect(subject.url).toBe('https://example.test/c')
  })

  test('reload re-requests the current URL and stays there', async () => {
    const requested = serve('<p>x</p>')
    const subject = page()
    await subject.goto('https://example.test/a')
    const before = requested.length

    await subject.reload()

    expect(requested.length).toBe(before + 1)
    expect(subject.url).toBe('https://example.test/a')
  })
})

describe('navigation goes through the request pipeline', () => {
  test('a route can serve a navigation', async () => {
    const subject = page()
    await subject.route('**/routed', (route: any) =>
      route.fulfill({ body: '<h1>from route</h1>', contentType: 'text/html' }))

    await subject.goto('https://example.test/routed')

    expect(subject.mainFrame.document.querySelector('h1').textContent).toBe('from route')
    await subject.unroute()
  })
})

describe('scripts are not executed, by design', () => {
  test('an inline script does not run and an external one is not fetched', async () => {
    const requested = serve('<body><script src="/app.js"></script><script>globalThis.__ran = true</script><p>markup</p></body>')
    const subject = page()

    await subject.goto('https://example.test/')

    // The markup parses; the scripts do not run. A document arrives inert, so
    // nothing hydrates — assertions needing that belong in a real browser.
    expect(subject.mainFrame.document.querySelector('p').textContent).toBe('markup')
    expect((globalThis as any).__ran).toBeUndefined()
    expect(requested).toEqual(['https://example.test/'])
  })
})
