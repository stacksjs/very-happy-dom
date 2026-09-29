import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'

// =============================================================================
// Every advertised page event actually fires (#1602).
//
// `PageEventType` offered six names. Three of them — console, response and
// error — had emitters with no callers anywhere in src/, so `page.on()`
// accepted the handler, returned normally, and never ran it.
//
// The silence is the problem. Code that waits for one of these does not fail,
// it hangs until a timeout and reports as a timeout, which sends whoever is
// debugging it looking in the wrong place. A test asserting "the page logged
// no errors" passed unconditionally: no events, no errors, nothing checked.
// =============================================================================

let page: any

beforeEach(() => {
  page = new Browser().newPage()
})

afterEach(async () => {
  // Request interception and routes are installed process-wide. Left behind,
  // they answer other test files' fetches and break them a long way from here.
  await page.unroute?.()
  await page.setRequestInterception?.(false)
})

/** Serve a page without touching the network. */
function serve(html: string, status = 200): void {
  page.route('https://example.com/**', (route: any) => route.fulfill({ status, body: html, contentType: 'text/html' }))
}

describe('page console events', () => {
  test('a log from page code reaches page.on(console)', async () => {
    const seen: Array<{ type: string, text: any }> = []
    page.on('console', (event: any) => seen.push({ type: event.type, text: event.args?.[0] ?? event.text }))

    page.mainFrame.window.console.log('hello from the page')

    expect(seen).toHaveLength(1)
    expect(seen[0].type).toBe('log')
    expect(seen[0].text).toBe('hello from the page')
  })

  test('warn and error carry their own type', async () => {
    const types: string[] = []
    page.on('console', (event: any) => types.push(event.type))

    page.mainFrame.window.console.warn('careful')
    page.mainFrame.window.console.error('broken')

    expect(types).toEqual(['warn', 'error'])
  })

  test('the message still reaches the underlying console', async () => {
    // Forwarding must not swallow output: a test that reads stdout, or a
    // developer watching a run, should still see what the page logged.
    const underlying: any[] = []
    const frameWindow = page.mainFrame.window as any
    const real = frameWindow.console
    frameWindow.console = { ...real, log: (...args: any[]) => underlying.push(args[0]) }
    page._installConsoleForwarding?.()

    frameWindow.console.log('passed through')

    expect(underlying).toEqual(['passed through'])
  })
})

describe('page response events', () => {
  test('a navigation reports its response', async () => {
    serve('<!DOCTYPE html><html><body><h1>Hi</h1></body></html>')
    const seen: any[] = []
    page.on('response', (response: any) => seen.push(response))

    await page.goto('https://example.com/page')

    expect(seen).toHaveLength(1)
    expect(seen[0].status).toBe(200)
    expect(seen[0].url).toContain('example.com/page')
  })

  test('a non-200 is still reported, not only the happy path', async () => {
    serve('<!DOCTYPE html><html><body>gone</body></html>', 404)
    const statuses: number[] = []
    page.on('response', (response: any) => statuses.push(response.status))

    await page.goto('https://example.com/missing')

    expect(statuses).toEqual([404])
  })
})

describe('page error events', () => {
  test('a failed navigation reports an error', async () => {
    page.route('https://example.com/**', (route: any) => route.abort())
    const errors: Error[] = []
    page.on('error', (error: Error) => errors.push(error))

    await page.goto('https://example.com/broken').catch(() => {})

    expect(errors).toHaveLength(1)
    expect(errors[0]).toBeInstanceOf(Error)
  })
})

describe('the events that already worked still do', () => {
  test('domcontentloaded then load, in that order', async () => {
    serve('<!DOCTYPE html><html><body>ok</body></html>')
    const order: string[] = []
    page.on('domcontentloaded', () => order.push('domcontentloaded'))
    page.on('load', () => order.push('load'))

    await page.goto('https://example.com/')

    expect(order).toEqual(['domcontentloaded', 'load'])
  })
})

describe('every advertised event is reachable', () => {
  test('no name in PageEventType is a silent no-op', async () => {
    // The guard the issue asks for: this is how console, response and error
    // came to have emitters with no callers. If a future change drops the only
    // caller of one, this fails rather than going quiet.
    const fired = new Set<string>()
    for (const event of ['console', 'request', 'response', 'error', 'load', 'domcontentloaded'])
      page.on(event, () => fired.add(event))

    await page.setRequestInterception(true)
    serve('<!DOCTYPE html><html><body>ok</body></html>')

    page.mainFrame.window.console.log('a log')
    await page.goto('https://example.com/')

    const failing = page.route('https://example.com/**', (route: any) => route.abort())
    await Promise.resolve(failing)
    await page.goto('https://example.com/fails').catch(() => {})

    expect([...fired].sort()).toEqual(
      ['console', 'domcontentloaded', 'error', 'load', 'request', 'response'],
    )
  })
})
