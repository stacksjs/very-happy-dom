/**
 * URL-pattern request routing.
 *
 * Added for #1594: interception existed only in the Puppeteer shape — a single
 * `page.on('request')` handler seeing every request, so each handler had to
 * pattern-match by hand and remember to continue what it did not care about, or
 * the request hung. `route()` scopes a handler to the URLs it is about.
 *
 * Both surfaces are kept: the Puppeteer-style path is the happy-dom-compatible
 * one, and removing it would be a breaking change.
 */

import { afterEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src'
import { globToRegExp, matchesPattern } from '../src/network/routing'

const originalFetch = globalThis.fetch

afterEach(() => {
  // Interception replaces global fetch, so restore it between tests.
  globalThis.fetch = originalFetch
})

function page() {
  return new Browser().newPage() as any
}

describe('glob patterns', () => {
  test('a single star stops at a path separator', () => {
    expect(globToRegExp('/api/*').test('/api/users')).toBe(true)
    expect(globToRegExp('/api/*').test('/api/users/1')).toBe(false)
  })

  test('a double star crosses separators', () => {
    expect(globToRegExp('/api/**').test('/api/users/1')).toBe(true)
  })

  test('regex metacharacters in the glob stay literal', () => {
    expect(globToRegExp('/a.b').test('/a.b')).toBe(true)
    expect(globToRegExp('/a.b').test('/axb')).toBe(false)
  })

  test('matchesPattern accepts a glob, a RegExp and a predicate', () => {
    expect(matchesPattern('**/api/**', 'https://x.test/api/a')).toBe(true)
    expect(matchesPattern(/\.png$/, 'https://x.test/a.png')).toBe(true)
    expect(matchesPattern((url: string) => url.includes('needle'), 'https://x.test/needle')).toBe(true)
    expect(matchesPattern('**/api/**', 'https://x.test/other')).toBe(false)
  })
})

describe('page.route', () => {
  test('fulfills a matching request without enabling interception separately', async () => {
    const subject = page()
    await subject.route('**/api/**', async (route: any) => {
      await route.fulfill({ status: 201, json: { mocked: true } })
    })

    const response = await fetch('https://example.test/api/thing')

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ mocked: true })
    expect(response.headers.get('content-type')).toBe('application/json')
  })

  test('a body and explicit headers are passed through', async () => {
    const subject = page()
    await subject.route('**/text', (route: any) => route.fulfill({ body: 'hi', headers: { 'x-custom': 'y' } }))

    const response = await fetch('https://example.test/text')

    expect(await response.text()).toBe('hi')
    expect(response.headers.get('x-custom')).toBe('y')
  })

  test('a RegExp route can abort', async () => {
    const subject = page()
    await subject.route(/\.png$/, (route: any) => route.abort())

    await expect(fetch('https://example.test/a.png')).rejects.toThrow()
  })

  test('a predicate route matches on the URL', async () => {
    const subject = page()
    await subject.route((url: string) => url.includes('needle'), (route: any) => route.fulfill({ body: 'found' }))

    expect(await (await fetch('https://x.test/needle/1')).text()).toBe('found')
  })

  test('the handler receives the request', async () => {
    const subject = page()
    let seen: any = null
    await subject.route('**/probe', (route: any, request: any) => {
      seen = request
      return route.fulfill({ body: 'ok' })
    })

    await fetch('https://x.test/probe', { method: 'POST', body: 'hello', headers: { 'x-a': '1' } })

    expect(seen.url).toBe('https://x.test/probe')
    expect(seen.method).toBe('POST')
    expect(seen.postData).toBe('hello')
    expect(seen.headers['x-a']).toBe('1')
    expect(seen.resourceType).toBe('fetch')
  })
})

describe('route precedence', () => {
  test('the most recently registered route runs first', async () => {
    const subject = page()
    const order: string[] = []
    await subject.route('**/a', (route: any) => {
      order.push('first')
      return route.fulfill({ body: 'first' })
    })
    await subject.route('**/a', (route: any) => {
      order.push('second')
      return route.fulfill({ body: 'second' })
    })

    expect(await (await fetch('https://x.test/a')).text()).toBe('second')
    expect(order).toEqual(['second'])
  })

  test('fallback hands off to the next matching route', async () => {
    const subject = page()
    const order: string[] = []
    await subject.route('**/a', (route: any) => {
      order.push('older')
      return route.fulfill({ body: 'older' })
    })
    await subject.route('**/a', async (route: any) => {
      order.push('newer')
      await route.fallback()
    })

    expect(await (await fetch('https://x.test/a')).text()).toBe('older')
    expect(order).toEqual(['newer', 'older'])
  })
})

describe('unroute', () => {
  test('removes a route by pattern and handler', async () => {
    const subject = page()
    const handler = (route: any) => route.fulfill({ body: 'mock' })
    await subject.route('**/gone', handler)
    expect(await (await fetch('https://x.test/gone')).text()).toBe('mock')

    await subject.unroute('**/gone', handler)

    // With nothing matching, the request is no longer fulfilled from the route.
    await expect(fetch('https://x.test/gone')).rejects.toThrow()
  })

  test('removes every route when called bare', async () => {
    const subject = page()
    await subject.route('**/a', (route: any) => route.fulfill({ body: 'a' }))
    await subject.route('**/b', (route: any) => route.fulfill({ body: 'b' }))

    await subject.unroute()

    await expect(fetch('https://x.test/a')).rejects.toThrow()
  })
})

describe('context.route', () => {
  test('applies to a page created afterwards', async () => {
    const context = new Browser().newIncognitoContext() as any
    await context.route('**/shared', (route: any) => route.fulfill({ body: 'from-context' }))

    context.newPage()

    expect(await (await fetch('https://x.test/shared')).text()).toBe('from-context')
  })

  test('applies to a page created beforehand', async () => {
    const context = new Browser().newIncognitoContext() as any
    context.newPage()

    await context.route('**/shared', (route: any) => route.fulfill({ body: 'from-context' }))

    expect(await (await fetch('https://x.test/shared')).text()).toBe('from-context')
  })

  test('a page route takes precedence over the context', async () => {
    const context = new Browser().newIncognitoContext() as any
    await context.route('**/shared', (route: any) => route.fulfill({ body: 'from-context' }))
    const subject = context.newPage()

    await subject.route('**/shared', (route: any) => route.fulfill({ body: 'from-page' }))

    expect(await (await fetch('https://x.test/shared')).text()).toBe('from-page')
  })
})

describe('the Puppeteer-style surface still works', () => {
  test('page.on(request) with setRequestInterception', async () => {
    const subject = page()
    let saw = ''
    subject.on('request', (request: any) => {
      saw = request.url
      request.respond({ status: 200, body: 'legacy' })
    })
    await subject.setRequestInterception(true)

    const response = await fetch('https://example.test/api/x')

    expect(await response.text()).toBe('legacy')
    expect(saw).toBe('https://example.test/api/x')
  })

  test('a route and a legacy handler coexist', async () => {
    const subject = page()
    const order: string[] = []
    subject.on('request', (request: any) => {
      order.push('legacy')
      request.continue()
    })
    await subject.setRequestInterception(true)
    await subject.route('**/both', (route: any) => {
      order.push('route')
      return route.fulfill({ body: 'routed' })
    })

    expect(await (await fetch('https://x.test/both')).text()).toBe('routed')
    expect(order).toEqual(['legacy', 'route'])
  })
})
