/**
 * Drop-in compatibility tests for happy-dom and jsdom migration surfaces.
 * Covers: JSDOM class + VirtualConsole + CookieJar, the /register preload,
 * document.parentWindow alias, scroll state, BroadcastChannel, MessageChannel,
 * PerformanceObserver, IndexedDB shape, EventSource feature-detection,
 * navigator.permissions + sendBeacon.
 */

import { describe, expect, it } from 'bun:test'
import {
  BroadcastChannel,
  ClipboardItem,
  CookieJar,
  EventSource,
  IDBFactory,
  IDBOpenDBRequest,
  JSDOM,
  MessageChannel,
  PerformanceObserver,
  ResourceLoader,
  StorageManager,
  VirtualConsole,
  Window,
} from '../src'
import { CSS } from '../src/css/CSSOM'

describe('Compat: JSDOM class', () => {
  it('constructs from an HTML string and exposes window', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head><title>Hi</title></head><body><h1>Hello</h1></body></html>')
    expect(dom.window).toBeInstanceOf(Window)
    expect(dom.window.document.title).toBe('Hi')
    expect(dom.window.document.querySelector('h1')?.textContent).toBe('Hello')
  })

  it('defaults to about:blank', () => {
    const dom = new JSDOM()
    expect(dom.window.location.href).toBe('about:blank')
  })

  it('respects url option and exposes it via window.location', () => {
    const dom = new JSDOM('<p>x</p>', { url: 'https://example.com/path?q=1' })
    expect(dom.window.location.href).toBe('https://example.com/path?q=1')
    expect(dom.window.location.hostname).toBe('example.com')
  })

  it('serialize() returns the full document HTML', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><p>X</p></body></html>')
    const out = dom.serialize()
    expect(out).toContain('<!DOCTYPE html>')
    expect(out).toContain('<p>X</p>')
  })

  it('reconfigure() swaps the URL', () => {
    const dom = new JSDOM('', { url: 'https://a.test/' })
    dom.reconfigure({ url: 'https://b.test/' })
    expect(dom.window.location.href).toBe('https://b.test/')
  })

  it('JSDOM.fragment returns a DocumentFragment', () => {
    const frag = JSDOM.fragment('<span>a</span><span>b</span>')
    expect(frag).toBeDefined()
    expect((frag as any).childNodes.length).toBe(2)
  })

  it('JSDOM.fromURL pulls HTML over fetch', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => new Response('<!DOCTYPE html><html><body><h2>from-url</h2></body></html>', {
        headers: { 'content-type': 'text/html' },
      }),
    })
    try {
      const dom = await JSDOM.fromURL(`http://localhost:${server.port}/`)
      expect(dom.window.document.querySelector('h2')?.textContent).toBe('from-url')
    }
    finally {
      server.stop(true)
    }
  })

  it('JSDOM.fromFile reads local HTML', async () => {
    const path = `/tmp/very-happy-dom-compat-${Date.now()}.html`
    await Bun.write(path, '<!DOCTYPE html><html><body><em>from-file</em></body></html>')
    const dom = await JSDOM.fromFile(path)
    expect(dom.window.document.querySelector('em')?.textContent).toBe('from-file')
  })

  it('beforeParse hook runs before HTML is applied', () => {
    const calls: string[] = []
    const dom = new JSDOM('<body><p>p</p></body>', {
      beforeParse: (win) => {
        calls.push('before')
        // body should still be empty at this point
        expect(win.document.body?.textContent ?? '').toBe('')
      },
    })
    expect(calls).toEqual(['before'])
    expect(dom.window.document.body?.textContent).toContain('p')
  })

  it('nodeLocation returns null when locations are not tracked', () => {
    const dom = new JSDOM('<p>x</p>')
    expect(dom.nodeLocation(dom.window.document.body)).toBeNull()
  })
})

describe('Compat: VirtualConsole', () => {
  it('captures window.console calls', () => {
    const vc = new VirtualConsole()
    const logs: unknown[][] = []
    vc.on('log', (...args) => logs.push(args))
    vc.on('error', (...args) => logs.push(['err', ...args]))

    const dom = new JSDOM('', { virtualConsole: vc })
    dom.window.console.log('hello', 1)
    dom.window.console.error('boom')

    expect(logs[0]).toEqual(['hello', 1])
    expect(logs[1]).toEqual(['err', 'boom'])
  })

  it('sendTo forwards to a real console', () => {
    const vc = new VirtualConsole()
    const seen: unknown[] = []
    const fake = {
      log: (...args: unknown[]) => seen.push(args),
    } as unknown as Console
    vc.sendTo(fake)
    vc.emit('log', 'x')
    expect(seen[0]).toEqual(['x'])
  })

  it('off and removeAllListeners', () => {
    const vc = new VirtualConsole()
    const cb = () => {}
    vc.on('log', cb)
    expect(vc.listeners('log')).toHaveLength(1)
    vc.off('log', cb)
    expect(vc.listeners('log')).toHaveLength(0)
    vc.on('log', cb)
    vc.on('warn', cb)
    vc.removeAllListeners()
    expect(vc.listeners('log')).toHaveLength(0)
    expect(vc.listeners('warn')).toHaveLength(0)
  })
})

describe('Compat: CookieJar', () => {
  it('setCookie + getCookieString round-trip', async () => {
    const jar = new CookieJar()
    await jar.setCookie('session=abc; Path=/', 'https://example.com/')
    const str = await jar.getCookieString('https://example.com/')
    expect(str).toContain('session=abc')
  })

  it('JSDOM exposes cookieJar', () => {
    const dom = new JSDOM()
    expect(dom.cookieJar).toBeInstanceOf(CookieJar)
  })
})

describe('Compat: ResourceLoader', () => {
  it('can be subclassed and overridden', async () => {
    let hit = ''
    class Custom extends ResourceLoader {
      fetch(url: string) {
        hit = url
        return Promise.resolve(Buffer.from('ok'))
      }
    }
    const loader = new Custom({ userAgent: 'x' })
    const buf = await loader.fetch('https://x.test/')
    expect(hit).toBe('https://x.test/')
    expect(buf?.toString()).toBe('ok')
  })
})

describe('Compat: document.parentWindow', () => {
  it('aliases defaultView', () => {
    const dom = new JSDOM()
    expect(dom.window.document.parentWindow).toBe(dom.window)
  })
})

describe('Compat: scroll state', () => {
  it('window.scrollTo updates scrollX/scrollY', () => {
    const w = new Window()
    w.scrollTo(10, 20)
    expect(w.scrollX).toBe(10)
    expect(w.scrollY).toBe(20)
    w.scrollTo({ left: 5, top: 7 })
    expect(w.scrollX).toBe(5)
    expect(w.scrollY).toBe(7)
  })

  it('window.scrollBy adds to current offsets', () => {
    const w = new Window()
    w.scrollTo(10, 10)
    w.scrollBy(5, 5)
    expect(w.scrollX).toBe(15)
    expect(w.scrollY).toBe(15)
    w.scrollBy({ left: -3, top: -4 })
    expect(w.scrollX).toBe(12)
    expect(w.scrollY).toBe(11)
  })
})

describe('Compat: BroadcastChannel', () => {
  it('broadcasts to peers with the same name', async () => {
    const a = new BroadcastChannel('test-room')
    const b = new BroadcastChannel('test-room')
    const received = new Promise<any>((resolve) => {
      b.onmessage = (event: any) => resolve(event.data)
    })
    a.postMessage({ hello: 'world' })
    expect(await received).toEqual({ hello: 'world' })
    a.close()
    b.close()
  })

  it('does not deliver to the sender', async () => {
    const a = new BroadcastChannel('echo-suppress')
    let selfHit = false
    a.onmessage = () => { selfHit = true }
    a.postMessage('hi')
    await new Promise(r => setTimeout(r, 10))
    expect(selfHit).toBe(false)
    a.close()
  })
})

describe('Compat: MessageChannel', () => {
  it('delivers from port1 to port2', async () => {
    const ch = new MessageChannel()
    const received = new Promise<any>((resolve) => {
      ch.port2.onmessage = (event: any) => resolve(event.data)
    })
    ch.port1.postMessage(42)
    expect(await received).toBe(42)
  })
})

describe('Compat: PerformanceObserver', () => {
  it('has the expected static shape', () => {
    expect(Array.isArray(PerformanceObserver.supportedEntryTypes)).toBe(true)
    expect(PerformanceObserver.supportedEntryTypes).toContain('mark')
  })

  it('observe/disconnect do not throw', () => {
    const obs = new PerformanceObserver(() => {})
    obs.observe({ entryTypes: ['mark', 'measure'] })
    obs.disconnect()
    expect(obs.takeRecords()).toEqual([])
  })
})

describe('Compat: IndexedDB', () => {
  it('window.indexedDB exposes an IDBFactory', () => {
    const w = new Window()
    expect(w.indexedDB).toBeInstanceOf(IDBFactory)
  })

  it('open returns an IDBOpenDBRequest that fires upgradeneeded + success', async () => {
    const w = new Window()
    const req = w.indexedDB.open('db1', 1)
    expect(req).toBeInstanceOf(IDBOpenDBRequest)
    const upgraded = await new Promise<boolean>((resolve) => {
      req.onupgradeneeded = () => { resolve(true) }
      setTimeout(() => resolve(false), 100)
    })
    expect(upgraded).toBe(true)
  })

  it('stores + retrieves data in an object store', async () => {
    const w = new Window()
    const req = w.indexedDB.open('db2', 1)
    await new Promise<void>((resolve) => {
      req.onupgradeneeded = () => {
        const db = req.result as any
        db.createObjectStore('items', { keyPath: 'id' })
      }
      req.onsuccess = () => resolve()
    })
    const db = req.result as any
    const tx = db.transaction('items', 'readwrite')
    const store = tx.objectStore('items')
    const addReq = store.put({ id: 'k1', value: 42 })
    await new Promise(r => addReq.addEventListener('success', r))
    const getReq = store.get('k1')
    const value = await new Promise<any>((resolve) => {
      getReq.addEventListener('success', () => resolve(getReq.result))
    })
    expect(value).toEqual({ id: 'k1', value: 42 })
  })
})

describe('Compat: navigator.permissions + sendBeacon', () => {
  it('permissions.query resolves to granted', async () => {
    const w = new Window()
    const status = await w.navigator.permissions.query({ name: 'geolocation' })
    expect(status.state).toBe('granted')
    expect(status.name).toBe('geolocation')
  })

  it('sendBeacon returns true and fires fetch', async () => {
    const w = new Window()
    let hitCount = 0
    const server = Bun.serve({
      port: 0,
      fetch: () => { hitCount++; return new Response('ok') },
    })
    try {
      const ok = w.navigator.sendBeacon(`http://localhost:${server.port}/beacon`, 'payload')
      expect(ok).toBe(true)
      // fetch is async and keepalive, give it a tick
      await new Promise(r => setTimeout(r, 100))
      expect(hitCount).toBeGreaterThan(0)
    }
    finally {
      server.stop(true)
    }
  })
})

describe('Compat: EventSource', () => {
  it('has the standard readyState constants', () => {
    expect(EventSource.CONNECTING).toBe(0)
    expect(EventSource.OPEN).toBe(1)
    expect(EventSource.CLOSED).toBe(2)
  })

  it('receives data frames from an SSE server', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: hello\n\n'))
            setTimeout(() => {
              controller.enqueue(new TextEncoder().encode('event: ping\ndata: world\n\n'))
              controller.close()
            }, 20)
          },
        })
        return new Response(stream, { headers: { 'content-type': 'text/event-stream' } })
      },
    })

    try {
      const url = `http://localhost:${server.port}/stream`
      const es = new EventSource(url)
      const received: Array<{ type: string, data: string }> = []
      await new Promise<void>((resolve) => {
        es.onmessage = (e: any) => {
          received.push({ type: 'message', data: e.data })
          if (received.length >= 1) {
            // also wait for the ping
          }
        }
        es.addEventListener('ping', (e: any) => {
          received.push({ type: 'ping', data: e.data })
          es.close()
          resolve()
        })
        setTimeout(() => { es.close(); resolve() }, 1000)
      })
      expect(received.some(r => r.type === 'message' && r.data === 'hello')).toBe(true)
    }
    finally {
      server.stop(true)
    }
  }, 5000)
})

describe('Compat: HTMLMediaElement', () => {
  it('play() returns a promise and fires play event', async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><audio></audio></body></html>')
    const audio = dom.window.document.querySelector('audio') as any
    let playFired = false
    audio.addEventListener('play', () => { playFired = true })
    const result = audio.play()
    expect(result).toBeInstanceOf(Promise)
    await result
    expect(audio.paused).toBe(false)
    // play event is queued via microtask
    await Promise.resolve()
    expect(playFired).toBe(true)
  })

  it('pause() marks the element paused', async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><video></video></body></html>')
    const video = dom.window.document.querySelector('video') as any
    await video.play()
    video.pause()
    expect(video.paused).toBe(true)
  })

  it('muted and volume have live setters', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><audio></audio></body></html>')
    const audio = dom.window.document.querySelector('audio') as any
    audio.volume = 0.25
    audio.muted = true
    expect(audio.volume).toBe(0.25)
    expect(audio.muted).toBe(true)
  })

  it('canPlayType returns "maybe"', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><video></video></body></html>')
    const video = dom.window.document.querySelector('video') as any
    expect(video.canPlayType('video/mp4')).toBe('maybe')
  })
})

describe('Compat: ClipboardItem + navigator.storage', () => {
  it('ClipboardItem exposes types and getType', async () => {
    const item = new ClipboardItem({ 'text/plain': 'hello' })
    expect(item.types).toEqual(['text/plain'])
    const blob = await item.getType('text/plain')
    expect(await blob.text()).toBe('hello')
  })

  it('navigator.storage.estimate returns a plausible shape', async () => {
    const w = new Window()
    expect(w.navigator.storage).toBeInstanceOf(StorageManager)
    const est = await w.navigator.storage.estimate()
    expect(typeof est.usage).toBe('number')
    expect(typeof est.quota).toBe('number')
  })
})

describe('Compat: CSS.supports', () => {
  it('rejects clearly malformed declarations', () => {
    expect(CSS.supports('bad#prop', 'value')).toBe(false)
    expect(CSS.supports('color', '')).toBe(false)
  })

  it('accepts valid declarations', () => {
    expect(CSS.supports('display', 'grid')).toBe(true)
    expect(CSS.supports('color', '#fff')).toBe(true)
    expect(CSS.supports('margin', '10px 20px 30px 40px')).toBe(true)
  })

  it('1-arg form handles not()', () => {
    expect(CSS.supports('not (display: grid)')).toBe(false)
  })
})

describe('Compat: getComputedStyle defaults', () => {
  it('returns display default per tag', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id=d></div><span id=s></span></body></html>')
    const div = dom.window.document.getElementById('d') as any
    const span = dom.window.document.getElementById('s') as any
    expect(dom.window.getComputedStyle(div).display).toBe('block')
    expect(dom.window.getComputedStyle(span).display).toBe('inline')
  })

  it('returns sensible visual defaults', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><p id=p></p></body></html>')
    const p = dom.window.document.getElementById('p') as any
    const cs = dom.window.getComputedStyle(p)
    expect(cs.visibility).toBe('visible')
    expect(cs.opacity).toBe('1')
    expect(cs.position).toBe('static')
    expect(cs.fontSize).toBe('16px')
  })
})

describe('Compat: FormData from form', () => {
  it('populates from form fields', () => {
    const dom = new JSDOM(`
      <form id=f>
        <input name=username value="alice">
        <input name=skip disabled value="x">
        <input type=checkbox name=terms checked>
        <input type=checkbox name=other>
        <select name=role><option selected value=admin>Admin</option><option value=user>User</option></select>
      </form>
    `)
    const form = dom.window.document.getElementById('f') as any
    const fd = new dom.window.FormData(form)
    expect(fd.get('username')).toBe('alice')
    expect(fd.get('skip')).toBeNull()
    expect(fd.get('terms')).toBe('on')
    expect(fd.get('other')).toBeNull()
    expect(fd.get('role')).toBe('admin')
  })
})

describe('Compat: scrollIntoView + element scroll state', () => {
  it('scrollIntoView resets scroll state and dispatches event', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id=d></div></body></html>')
    const div = dom.window.document.getElementById('d') as any
    let fired = false
    div.addEventListener('scroll', () => { fired = true })
    div.scrollIntoView()
    expect(fired).toBe(true)
    expect(div.scrollTop).toBe(0)
  })

  it('element.scrollTo updates state and fires event', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id=d></div></body></html>')
    const div = dom.window.document.getElementById('d') as any
    let fired = false
    div.addEventListener('scroll', () => { fired = true })
    div.scrollTo(15, 25)
    expect(div.scrollLeft).toBe(15)
    expect(div.scrollTop).toBe(25)
    expect(fired).toBe(true)
  })
})

describe('Compat: readyState lifecycle', () => {
  it('transitions loading → interactive → complete and fires DOMContentLoaded + load', async () => {
    const events: string[] = []
    const dom = new JSDOM('<!DOCTYPE html><html><body><p>x</p></body></html>')
    dom.window.document.addEventListener('DOMContentLoaded', () => {
      events.push(`DCL@${dom.window.document.readyState}`)
    })
    dom.window.addEventListener('load', () => {
      events.push(`load@${dom.window.document.readyState}`)
    })
    await new Promise(r => setTimeout(r, 10))
    expect(events).toEqual(['DCL@interactive', 'load@complete'])
    expect(dom.window.document.readyState).toBe('complete')
  })
})

describe('Compat: runScripts', () => {
  it('runScripts="dangerously" executes inline <script> tags', async () => {
    const dom = new JSDOM(
      '<!DOCTYPE html><html><body><div id=out></div><script>document.getElementById("out").textContent = "from-script"</script></body></html>',
      { runScripts: 'dangerously' },
    )
    // Scripts execute synchronously during construction
    expect(dom.window.document.getElementById('out')?.textContent).toBe('from-script')
  })

  it('runScripts="outside-only" exposes window.eval', () => {
    const dom = new JSDOM('', { runScripts: 'outside-only' })
    expect(typeof (dom.window as any).eval).toBe('function')
    expect(typeof (dom.window as any).Function).toBe('function')
  })

  it('default (no runScripts) leaves scripts untouched', () => {
    const dom = new JSDOM(
      '<!DOCTYPE html><html><body><div id=out></div><script>document.getElementById("out").textContent = "ran"</script></body></html>',
    )
    expect(dom.window.document.getElementById('out')?.textContent).toBe('')
  })
})

describe('Compat: VirtualConsole.jsdomError', () => {
  it('captures window error events', () => {
    const vc = new VirtualConsole()
    const errors: unknown[] = []
    vc.on('jsdomError', (err: unknown) => errors.push(err))

    const dom = new JSDOM('', { virtualConsole: vc })
    const err = new Error('boom')
    const event = new (dom.window.ErrorEvent as any)('error', { error: err, message: 'boom' })
    dom.window.dispatchEvent(event)
    expect(errors).toContain(err)
  })
})

describe('Compat: /register entry point', () => {
  it('register module applies window/document globals', async () => {
    // Delay import so the test file itself doesn't pollute the suite's globals.
    const before = 'window' in globalThis
    if (before) return // already installed — no-op test
    await import('../src/register')
    expect('window' in globalThis).toBe(true)
    expect('document' in globalThis).toBe(true)
    // Clean up for the rest of the test run.
    const { GlobalRegistrator } = await import('../src/window/GlobalRegistrator')
    GlobalRegistrator.unregister()
  })
})
