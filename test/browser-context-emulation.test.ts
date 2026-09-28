/**
 * BrowserContext emulation.
 *
 * Completes #1593: the ownership half (cookies, per-origin storage,
 * storageState) landed in e6e05e4; these are the knobs that were left. Each one
 * is held on the context rather than pushed once, so a page created later starts
 * in the same environment as its siblings.
 */

import { afterEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src'

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

function serveHtml(html = '<p>x</p>') {
  const requests: Array<Record<string, string> | undefined> = []
  globalThis.fetch = (async (_url: any, init: any) => {
    requests.push(init?.headers)
    return new Response(html, { headers: { 'content-type': 'text/html' } })
  }) as any
  return requests
}

function context() {
  return new Browser().newIncognitoContext() as any
}

function navigatorOf(page: any) {
  return page.mainFrame.window.navigator
}

describe('permissions', () => {
  test('every query is granted until something says otherwise', async () => {
    // The permissive default is what feature-detecting code expects, and what
    // this has always done.
    const page = context().newPage()

    expect((await navigatorOf(page).permissions.query({ name: 'geolocation' })).state).toBe('granted')
  })

  test('granting switches to an explicit set', async () => {
    const subject = context()
    const page = subject.newPage()

    await subject.grantPermissions(['geolocation'])

    expect((await navigatorOf(page).permissions.query({ name: 'geolocation' })).state).toBe('granted')
    // Anything ungranted is now prompt, which is what lets a test assert the
    // unhappy path.
    expect((await navigatorOf(page).permissions.query({ name: 'camera' })).state).toBe('prompt')
  })

  test('clearing leaves nothing granted', async () => {
    const subject = context()
    const page = subject.newPage()
    await subject.grantPermissions(['geolocation'])

    await subject.clearPermissions()

    expect((await navigatorOf(page).permissions.query({ name: 'geolocation' })).state).toBe('prompt')
  })

  test('a page created afterwards inherits the grants', async () => {
    const subject = context()
    await subject.grantPermissions(['notifications'])

    const later = subject.newPage()

    expect((await navigatorOf(later).permissions.query({ name: 'notifications' })).state).toBe('granted')
    expect((await navigatorOf(later).permissions.query({ name: 'camera' })).state).toBe('prompt')
  })
})

describe('geolocation', () => {
  function readPosition(page: any): Promise<any> {
    return new Promise(resolve =>
      navigatorOf(page).geolocation.getCurrentPosition((position: any) => resolve(position.coords)))
  }

  test('reports the configured position', async () => {
    const subject = context()
    const page = subject.newPage()

    await subject.setGeolocation({ latitude: 51.5, longitude: -0.12, accuracy: 5 })

    const coords = await readPosition(page)
    expect(coords.latitude).toBe(51.5)
    expect(coords.longitude).toBe(-0.12)
    expect(coords.accuracy).toBe(5)
  })

  test('null restores the stand-in default', async () => {
    const subject = context()
    const page = subject.newPage()
    await subject.setGeolocation({ latitude: 51.5, longitude: -0.12 })

    await subject.setGeolocation(null)

    expect((await readPosition(page)).latitude).toBe(37.7749)
  })

  test('a page created afterwards inherits it', async () => {
    const subject = context()
    await subject.setGeolocation({ latitude: 1, longitude: 2 })

    const later = subject.newPage()

    expect((await readPosition(later)).latitude).toBe(1)
  })
})

describe('offline', () => {
  test('flips navigator.onLine', async () => {
    const subject = context()
    const page = subject.newPage()
    expect(navigatorOf(page).onLine).toBe(true)

    await subject.setOffline(true)
    expect(navigatorOf(page).onLine).toBe(false)

    await subject.setOffline(false)
    expect(navigatorOf(page).onLine).toBe(true)
  })

  test('a navigation fails while offline and works again after', async () => {
    serveHtml()
    const subject = context()
    const page = subject.newPage()
    await subject.setOffline(true)

    // Offline is what application code branches on, so this has to fail rather
    // than quietly succeed.
    await expect(page.goto('https://example.test/')).rejects.toThrow('ERR_INTERNET_DISCONNECTED')

    await subject.setOffline(false)
    expect((await page.goto('https://example.test/'))!.status).toBe(200)
  })
})

describe('extra HTTP headers', () => {
  test('are sent with a navigation', async () => {
    const requests = serveHtml()
    const subject = context()
    const page = subject.newPage()

    await subject.setExtraHTTPHeaders({ 'x-trace': 'abc' })
    await page.goto('https://example.test/')

    expect(requests[0]?.['x-trace']).toBe('abc')
  })
})

describe('init scripts', () => {
  test('run at page creation and again after each navigation', async () => {
    serveHtml('<p>markup</p>')
    const subject = context()
    await subject.addInitScript(() => {
      ;(window as any).__flag = 'planted'
    })

    const page = subject.newPage()
    expect(page.mainFrame.window.__flag).toBe('planted')

    await page.goto('https://example.test/')
    expect(page.mainFrame.window.__flag).toBe('planted')
    expect(page.mainFrame.document.querySelector('p').textContent).toBe('markup')
  })

  test('one that throws does not take the page with it', async () => {
    serveHtml('<p>ok</p>')
    const subject = context()
    await subject.addInitScript(() => {
      throw new Error('boom')
    })
    const page = subject.newPage()

    await page.goto('https://example.test/')

    expect(page.mainFrame.document.querySelector('p').textContent).toBe('ok')
  })

  test('registering one reaches pages that already exist', async () => {
    const subject = context()
    const page = subject.newPage()

    await subject.addInitScript(() => {
      ;(window as any).__late = true
    })

    expect(page.mainFrame.window.__late).toBe(true)
  })
})

describe('default timeout', () => {
  test('the context default applies to waitFor*', async () => {
    const subject = context()
    subject.setDefaultTimeout(40)
    const page = subject.newPage()

    const started = performance.now()
    await page.waitForSelector('#never')

    // Without the default this would sit for the built-in 30 seconds.
    expect(performance.now() - started).toBeLessThan(1000)
  })

  test('a page default overrides the context', async () => {
    const subject = context()
    subject.setDefaultTimeout(30_000)
    const page = subject.newPage()
    page.setDefaultTimeout(40)

    const started = performance.now()
    await page.waitForSelector('#never')

    expect(performance.now() - started).toBeLessThan(1000)
  })
})
