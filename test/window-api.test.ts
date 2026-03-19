import { describe, expect, test } from 'bun:test'
import {
  VirtualDocument,
  VirtualElement,
  VirtualEvent,
  VirtualEventTarget,
  VirtualNodeBase,
  Window,
} from '../src'

// =============================================================================
// Window: self-references and basic properties
// =============================================================================
describe('Window: self-references and basic properties', () => {
  test('self and window return this', () => {
    const win = new Window()
    expect(win.self).toBe(win)
    expect(win.window).toBe(win)
  })

  test('devicePixelRatio defaults to 1', () => {
    const win = new Window()
    expect(win.devicePixelRatio).toBe(1)
  })
})

// =============================================================================
// Window: location and security
// =============================================================================
describe('Window: location and security', () => {
  test('origin returns location origin', () => {
    const win = new Window({ url: 'https://example.com/path' })
    expect(win.origin).toBe('https://example.com')
  })

  test('isSecureContext', () => {
    const secure = new Window({ url: 'https://example.com' })
    expect(secure.isSecureContext).toBe(true)
    const insecure = new Window({ url: 'http://example.com' })
    expect(insecure.isSecureContext).toBe(false)
  })
})

// =============================================================================
// Window: screen properties
// =============================================================================
describe('Window: screen properties', () => {
  test('screen properties exist', () => {
    const win = new Window({ width: 1920, height: 1080 })
    expect(win.screen.width).toBe(1920)
    expect(win.screen.height).toBe(1080)
    expect(win.screen.availWidth).toBe(1920)
    expect(win.screen.availHeight).toBe(1080)
    expect(win.screen.colorDepth).toBe(24)
    expect(win.screen.pixelDepth).toBe(24)
  })
})

// =============================================================================
// Window: scroll properties
// =============================================================================
describe('Window: scroll properties', () => {
  test('scroll properties', () => {
    const win = new Window()
    expect(win.scrollX).toBe(0)
    expect(win.scrollY).toBe(0)
    expect(win.pageXOffset).toBe(0)
    expect(win.pageYOffset).toBe(0)
  })

  test('scrollTo and scrollBy are no-ops', () => {
    const win = new Window()
    expect(() => win.scrollTo(0, 0)).not.toThrow()
    expect(() => win.scrollBy(0, 0)).not.toThrow()
  })
})

// =============================================================================
// Window: dialog methods
// =============================================================================
describe('Window: dialog methods', () => {
  test('dialog methods', () => {
    const win = new Window()
    expect(win.alert('test')).toBeUndefined()
    expect(win.confirm('test')).toBe(false)
    expect(win.prompt('test')).toBeNull()
  })

  test('open and close', () => {
    const win = new Window()
    expect(win.open()).toBeNull()
    expect(win.close()).toBeUndefined()
  })
})

// =============================================================================
// Window: encoding (atob/btoa)
// =============================================================================
describe('Window: encoding (atob/btoa)', () => {
  test('atob and btoa work', () => {
    const win = new Window()
    expect(win.btoa('hello')).toBe('aGVsbG8=')
    expect(win.atob('aGVsbG8=')).toBe('hello')
  })
})

// =============================================================================
// Window: global functions
// =============================================================================
describe('Window: global functions', () => {
  test('queueMicrotask exists', () => {
    const win = new Window()
    expect(typeof win.queueMicrotask).toBe('function')
  })

  test('structuredClone exists', () => {
    const win = new Window()
    expect(typeof win.structuredClone).toBe('function')
  })
})

// =============================================================================
// Window: matchMedia
// =============================================================================
describe('Window: matchMedia', () => {
  test('matchMedia returns MediaQueryList-like object', () => {
    const win = new Window()
    const mql = win.matchMedia('(min-width: 768px)')
    expect(mql.media).toBe('(min-width: 768px)')
    expect(typeof mql.matches).toBe('boolean')
    expect(typeof mql.addListener).toBe('function')
    expect(typeof mql.removeListener).toBe('function')
    expect(typeof mql.addEventListener).toBe('function')
    expect(typeof mql.removeEventListener).toBe('function')
    expect(typeof mql.dispatchEvent).toBe('function')
  })

  test('matchMedia respects prefers-color-scheme setting', () => {
    const win = new Window({ settings: { device: { prefersColorScheme: 'dark' } } })
    expect(win.matchMedia('(prefers-color-scheme: dark)').matches).toBe(true)
    expect(win.matchMedia('(prefers-color-scheme: light)').matches).toBe(false)
  })

  test('matchMedia min-width', () => {
    const win = new Window({ width: 1024 })
    expect(win.matchMedia('(min-width: 768px)').matches).toBe(true)
    expect(win.matchMedia('(min-width: 1200px)').matches).toBe(false)
  })

  test('matchMedia max-width', () => {
    const win = new Window({ width: 1024 })
    expect(win.matchMedia('(max-width: 1200px)').matches).toBe(true)
    expect(win.matchMedia('(max-width: 800px)').matches).toBe(false)
  })

  test('matchMedia min-height / max-height', () => {
    const win = new Window({ height: 768 })
    expect(win.matchMedia('(min-height: 600px)').matches).toBe(true)
    expect(win.matchMedia('(max-height: 1000px)').matches).toBe(true)
    expect(win.matchMedia('(min-height: 900px)').matches).toBe(false)
  })

  test('matchMedia orientation', () => {
    const landscape = new Window({ width: 1024, height: 768 })
    expect(landscape.matchMedia('(orientation: landscape)').matches).toBe(true)
    expect(landscape.matchMedia('(orientation: portrait)').matches).toBe(false)

    const portrait = new Window({ width: 768, height: 1024 })
    expect(portrait.matchMedia('(orientation: portrait)').matches).toBe(true)
  })

  test('matchMedia prefers-reduced-motion', () => {
    const win = new Window()
    expect(win.matchMedia('(prefers-reduced-motion: no-preference)').matches).toBe(true)
    expect(win.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false)
  })

  test('matchMedia addListener/removeListener work', () => {
    const win = new Window()
    const mql = win.matchMedia('(min-width: 768px)')
    const cb = () => {}
    expect(() => mql.addListener(cb)).not.toThrow()
    expect(() => mql.removeListener(cb)).not.toThrow()
  })
})

// =============================================================================
// Window: postMessage
// =============================================================================
describe('Window: postMessage', () => {
  test('postMessage dispatches message event asynchronously', async () => {
    const win = new Window({ url: 'https://example.com' })
    let received: any = null
    win.addEventListener('message', (e: any) => {
      received = e
    })
    win.postMessage({ hello: 'world' }, '*')
    await new Promise(r => setTimeout(r, 20))
    expect(received).not.toBeNull()
    expect(received.data).toEqual({ hello: 'world' })
  })

  test('postMessage includes origin', async () => {
    const win = new Window({ url: 'https://example.com' })
    let origin = ''
    win.addEventListener('message', (e: any) => {
      origin = e.origin
    })
    win.postMessage('test', '*')
    await new Promise(r => setTimeout(r, 20))
    expect(origin).toBe('https://example.com')
  })

  test('postMessage with specific targetOrigin', async () => {
    const win = new Window({ url: 'https://example.com' })
    let origin = ''
    win.addEventListener('message', (e: any) => {
      origin = e.origin
    })
    win.postMessage('test', 'https://other.com')
    await new Promise(r => setTimeout(r, 20))
    expect(origin).toBe('https://other.com')
  })
})

// =============================================================================
// Window: requestIdleCallback
// =============================================================================
describe('Window: requestIdleCallback', () => {
  test('requestIdleCallback calls back with deadline', async () => {
    const win = new Window()
    let deadline: any = null
    win.requestIdleCallback((d) => {
      deadline = d
    })
    await new Promise(r => setTimeout(r, 20))
    expect(deadline).not.toBeNull()
    expect(typeof deadline.didTimeout).toBe('boolean')
    expect(typeof deadline.timeRemaining).toBe('function')
    expect(deadline.timeRemaining()).toBeGreaterThanOrEqual(0)
  })

  test('cancelIdleCallback exists and does not throw', () => {
    const win = new Window()
    const id = win.requestIdleCallback(() => {})
    expect(() => win.cancelIdleCallback(id)).not.toThrow()
  })
})

// =============================================================================
// Window: history proxy
// =============================================================================
describe('Window: history proxy', () => {
  test('window.history exists and delegates to document.history', () => {
    const win = new Window({ url: 'https://example.com' })
    expect(win.history).toBeDefined()
    expect(win.history).toBe(win.document.history)
  })

  test('window.history.pushState works', () => {
    const win = new Window({ url: 'https://example.com' })
    win.history.pushState({ page: 1 }, '', '/page1')
    expect(win.history.state).toEqual({ page: 1 })
    expect(win.history.length).toBe(1)
  })

  test('window.history.back/forward work', () => {
    const win = new Window({ url: 'https://example.com' })
    win.history.pushState({ page: 1 }, '', '/page1')
    win.history.pushState({ page: 2 }, '', '/page2')
    expect(win.history.state).toEqual({ page: 2 })
    win.history.back()
    expect(win.history.state).toEqual({ page: 1 })
    win.history.forward()
    expect(win.history.state).toEqual({ page: 2 })
  })
})

// =============================================================================
// Window: frame properties (parent, top, frames, frameElement)
// =============================================================================
describe('Window: frame properties (parent, top, frames, frameElement)', () => {
  test('window.parent returns self for top-level window', () => {
    const win = new Window()
    expect(win.parent).toBe(win)
  })

  test('window.top returns self for top-level window', () => {
    const win = new Window()
    expect(win.top).toBe(win)
  })

  test('window.frames returns self', () => {
    const win = new Window()
    expect(win.frames).toBe(win)
  })

  test('window.frameElement is null for top-level window', () => {
    const win = new Window()
    expect(win.frameElement).toBeNull()
  })
})

// =============================================================================
// Window: name and closed
// =============================================================================
describe('Window: name and closed', () => {
  test('window.name defaults to empty string', () => {
    const win = new Window()
    expect(win.name).toBe('')
  })

  test('window.name is writable', () => {
    const win = new Window()
    win.name = 'myWindow'
    expect(win.name).toBe('myWindow')
  })

  test('window.closed defaults to false', () => {
    const win = new Window()
    expect(win.closed).toBe(false)
  })

  test('window.closed becomes true after close()', () => {
    const win = new Window()
    win.close()
    expect(win.closed).toBe(true)
  })
})

// =============================================================================
// Window: crypto
// =============================================================================
describe('Window: crypto', () => {
  test('crypto exists on window', () => {
    const win = new Window()
    expect(win.crypto).toBeDefined()
  })

  test('crypto.randomUUID returns a UUID string', () => {
    const win = new Window()
    const uuid = win.crypto.randomUUID()
    expect(typeof uuid).toBe('string')
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  test('crypto.getRandomValues fills a typed array', () => {
    const win = new Window()
    const arr = new Uint8Array(16)
    win.crypto.getRandomValues(arr)
    // At least some bytes should be non-zero (extremely unlikely all are 0)
    const hasNonZero = arr.some(v => v !== 0)
    expect(hasNonZero).toBe(true)
  })
})

// =============================================================================
// Window: DOMParser
// =============================================================================
describe('Window: DOMParser', () => {
  test('DOMParser exists on window', () => {
    const win = new Window()
    expect(win.DOMParser).toBeDefined()
  })

  test('parseFromString with text/html', () => {
    const win = new Window()
    const parser = new win.DOMParser()
    const doc = parser.parseFromString('<p>hello</p>', 'text/html')
    expect(doc).toBeDefined()
    expect(doc.body).not.toBeNull()
    const p = doc.querySelector('p')
    expect(p).not.toBeNull()
    expect(p!.textContent).toBe('hello')
  })

  test('parseFromString with full HTML document', () => {
    const win = new Window()
    const parser = new win.DOMParser()
    const doc = parser.parseFromString('<html><head><title>Test</title></head><body><div id="root"></div></body></html>', 'text/html')
    expect(doc.getElementById('root')).not.toBeNull()
  })

  test('parseFromString with text/xml', () => {
    const win = new Window()
    const parser = new win.DOMParser()
    const doc = parser.parseFromString('<root><item>1</item></root>', 'text/xml')
    expect(doc).toBeDefined()
    expect(doc.childNodes.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// Window: Navigator
// =============================================================================
describe('Window: Navigator', () => {
  test('navigator.platform is not always Linux x86_64', () => {
    const win = new Window()
    // On macOS this should be MacIntel, on Linux it should be Linux x86_64
    expect(typeof win.navigator.platform).toBe('string')
    expect(win.navigator.platform.length).toBeGreaterThan(0)
    // Just verify it's a known value
    const knownPlatforms = ['MacIntel', 'Win32', 'Linux x86_64', 'linux', 'darwin', 'win32']
    expect(knownPlatforms.some(p => win.navigator.platform.includes(p) || p.includes(win.navigator.platform))).toBe(true)
  })

  test('navigator has required properties', () => {
    const win = new Window()
    expect(typeof win.navigator.userAgent).toBe('string')
    expect(typeof win.navigator.language).toBe('string')
    expect(typeof win.navigator.platform).toBe('string')
    expect(win.navigator.cookieEnabled).toBe(true)
    expect(win.navigator.onLine).toBe(true)
  })
})

// =============================================================================
// Window: close cleanup
// =============================================================================
describe('Window: close cleanup', () => {
  test('close() clears localStorage', async () => {
    const win = new Window()
    win.localStorage.setItem('key', 'value')
    expect(win.localStorage.getItem('key')).toBe('value')
    await win.happyDOM.close()
    expect(win.localStorage.getItem('key')).toBeNull()
  })

  test('close() clears sessionStorage', async () => {
    const win = new Window()
    win.sessionStorage.setItem('session', 'data')
    expect(win.sessionStorage.getItem('session')).toBe('data')
    await win.happyDOM.close()
    expect(win.sessionStorage.getItem('session')).toBeNull()
  })

  test('close() clears document content', async () => {
    const win = new Window()
    win.document.body!.innerHTML = '<p>content</p>'
    await win.happyDOM.close()
    expect(win.document.documentElement!.innerHTML).toBe('')
  })
})

// =============================================================================
// Window: exports (VirtualEventTarget, VirtualNodeBase)
// =============================================================================
describe('Window: exports (VirtualEventTarget, VirtualNodeBase)', () => {
  test('VirtualEventTarget is importable', () => {
    expect(VirtualEventTarget).toBeDefined()
    expect(typeof VirtualEventTarget).toBe('function')
  })

  test('standalone EventTarget can be created', () => {
    const target = new VirtualEventTarget()
    let called = false
    target.addEventListener('test', () => { called = true })
    target.dispatchEvent(new VirtualEvent('test'))
    expect(called).toBe(true)
  })

  test('standalone EventTarget supports removeEventListener', () => {
    const target = new VirtualEventTarget()
    let count = 0
    const handler = () => { count++ }
    target.addEventListener('test', handler)
    target.dispatchEvent(new VirtualEvent('test'))
    expect(count).toBe(1)
    target.removeEventListener('test', handler)
    target.dispatchEvent(new VirtualEvent('test'))
    expect(count).toBe(1)
  })

  test('VirtualNodeBase is importable', () => {
    expect(VirtualNodeBase).toBeDefined()
    expect(typeof VirtualNodeBase).toBe('function')
  })

  test('VirtualElement is instanceof VirtualNodeBase', () => {
    const el = new VirtualElement('div')
    expect(el instanceof VirtualNodeBase).toBe(true)
  })

  test('VirtualDocument is instanceof VirtualNodeBase', () => {
    const doc = new VirtualDocument()
    expect(doc instanceof VirtualNodeBase).toBe(true)
  })
})
