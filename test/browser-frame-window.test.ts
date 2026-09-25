/**
 * BrowserFrame browsing contexts.
 *
 * Regression guard for #1590: a frame's `window` used to be a three-property
 * object literal (`document`, a two-key `location`, `Event`) cast through
 * `as any` to satisfy the *global* DOM `Window` type. Nothing else a browsing
 * context provides was present — no storage, timers, observers, `navigator`,
 * `matchMedia` or `getComputedStyle` — and `location` had `href` and
 * `toString` only. Frames now own a real `Window`.
 */

import { describe, expect, test } from 'bun:test'
import { Browser, Window } from '../src'

function mainFrame() {
  const browser = new Browser()
  const page = browser.newPage()
  return { browser, page, frame: page.mainFrame as any }
}

describe('BrowserFrame owns a real Window', () => {
  test('frame.window is a Window instance', () => {
    const { frame } = mainFrame()

    expect(frame.window).toBeInstanceOf(Window)
  })

  test('frame.document is the window document, not a second one', () => {
    const { frame } = mainFrame()

    expect(frame.window.document).toBe(frame.document)
  })

  test('the browsing-context globals are present', () => {
    const { frame } = mainFrame()
    const win = frame.window

    // These were all undefined on the old stub.
    expect(typeof win.localStorage).toBe('object')
    expect(typeof win.sessionStorage).toBe('object')
    expect(typeof win.navigator).toBe('object')
    expect(typeof win.setTimeout).toBe('function')
    expect(typeof win.requestAnimationFrame).toBe('function')
    expect(typeof win.getComputedStyle).toBe('function')
    expect(typeof win.matchMedia).toBe('function')
    expect(typeof win.addEventListener).toBe('function')
    expect(typeof win.MutationObserver).toBe('function')
    expect(typeof win.IntersectionObserver).toBe('function')
    expect(typeof win.ResizeObserver).toBe('function')
    expect(typeof win.fetch).toBe('function')
    expect(typeof win.happyDOM).toBe('object')
  })

  test('storage in the frame actually works', () => {
    const { frame } = mainFrame()

    frame.window.localStorage.setItem('k', 'v')
    expect(frame.window.localStorage.getItem('k')).toBe('v')
  })

  test('storage is isolated between frames', () => {
    const a = mainFrame()
    const b = mainFrame()

    a.frame.window.localStorage.setItem('k', 'a')

    expect(a.frame.window.localStorage.getItem('k')).toBe('a')
    expect(b.frame.window.localStorage.getItem('k')).toBeNull()
  })

  test('getComputedStyle resolves against the frame document', () => {
    const { frame } = mainFrame()
    const el = frame.document.createElement('div')
    el.style.color = 'red'
    frame.document.body.appendChild(el)

    expect(frame.window.getComputedStyle(el).getPropertyValue('color')).toBe('red')
  })

  test('events dispatch through the frame window', () => {
    const { frame } = mainFrame()
    let seen = 0

    frame.window.addEventListener('custom', () => seen++)
    frame.window.dispatchEvent(new frame.window.Event('custom'))

    expect(seen).toBe(1)
  })
})

describe('BrowserFrame location', () => {
  test('is a real Location, not an href/toString pair', () => {
    const { frame } = mainFrame()
    frame.url = 'https://example.test/a/b?x=1#frag'

    const { location } = frame.window
    expect(location.href).toBe('https://example.test/a/b?x=1#frag')
    expect(location.pathname).toBe('/a/b')
    expect(location.search).toBe('?x=1')
    expect(location.hash).toBe('#frag')
    expect(location.origin).toBe('https://example.test')
    expect(location.protocol).toBe('https:')
    expect(location.host).toBe('example.test')
  })

  test('frame.url reads back from the window location', () => {
    const { frame } = mainFrame()
    frame.url = 'https://example.test/page'

    expect(frame.url).toBe('https://example.test/page')
    expect(frame.url).toBe(frame.window.location.href)
  })

  test('the URL is serialized, so a bare origin gains its path', () => {
    const { frame } = mainFrame()
    frame.url = 'https://example.test'

    // Matches `new URL()` and `new Window({ url })`. The old stub echoed the
    // raw string back unchanged.
    expect(frame.url).toBe('https://example.test/')
  })

  test('starts at about:blank', () => {
    const { frame } = mainFrame()

    expect(frame.url).toBe('about:blank')
  })
})

describe('BrowserFrame viewport and settings', () => {
  test('the frame window adopts the page viewport', () => {
    const { page, frame } = mainFrame()

    expect(frame.window.innerWidth).toBe(page.viewport.width)
    expect(frame.window.innerHeight).toBe(page.viewport.height)
  })

  test('page.setViewport reaches the frame window', () => {
    const { page, frame } = mainFrame()

    page.setViewport({ width: 375, height: 812 })

    expect(frame.window.innerWidth).toBe(375)
    expect(frame.window.innerHeight).toBe(812)
    expect(frame.window.matchMedia('(max-width: 480px)').matches).toBe(true)
  })

  test('browser settings reach the frame window', () => {
    const browser = new Browser({
      settings: {
        navigator: { userAgent: 'FrameUA/1.0' },
        device: { prefersColorScheme: 'dark' },
      },
    })
    const frame = browser.newPage().mainFrame as any

    expect(frame.window.navigator.userAgent).toBe('FrameUA/1.0')
    expect(frame.window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(true)
  })

  test('the browser console reaches the frame window', () => {
    const lines: string[] = []
    const browser = new Browser({
      console: { ...console, log: (...args: unknown[]) => lines.push(args.join(' ')) } as Console,
    })
    const page = browser.newPage()
    const frame = page.mainFrame as any

    frame.window.console.log('from the frame')

    expect(page.console).toBe(browser.console)
    expect(frame.window.console).toBe(browser.console)
    expect(lines).toEqual(['from the frame'])
  })
})

describe('BrowserFrame content', () => {
  test('content round-trips through the real document', () => {
    const { frame } = mainFrame()
    frame.content = '<body><h1>Hi</h1></body>'

    expect(frame.document.querySelector('h1').textContent).toBe('Hi')
    expect(frame.content).toContain('<h1>Hi</h1>')
  })

  test('elements created in the frame belong to the frame document', () => {
    const { frame } = mainFrame()
    const el = frame.document.createElement('div')

    expect(el.ownerDocument).toBe(frame.document)
  })
})
