/**
 * Real-world drop-in compatibility suite.
 *
 * This file exercises the exact usage patterns that existing happy-dom and
 * jsdom test suites rely on, in addition to common Testing Library flows.
 * A failure here means drop-in migration would break — so every test is
 * phrased as code a downstream project would actually write.
 */

import { describe, expect, it } from 'bun:test'
import { JSDOM, VirtualConsole, Window } from '../src'

// ---------------------------------------------------------------------------
// jsdom migration patterns
// ---------------------------------------------------------------------------

describe('jsdom patterns: destructuring and shape', () => {
  it('const { window } = new JSDOM(html)', () => {
    const { window } = new JSDOM('<!DOCTYPE html><html><body><p>destructured</p></body></html>')
    expect(window.document.querySelector('p')?.textContent).toBe('destructured')
  })

  it('window.document mirrors expected globals', () => {
    const { window } = new JSDOM()
    for (const key of ['document', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage']) {
      expect((window as any)[key]).toBeDefined()
    }
  })

  it('document.body, document.head, document.documentElement exist after parse', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head><title>t</title></head><body><main></main></body></html>')
    expect(dom.window.document.head?.querySelector('title')?.textContent).toBe('t')
    expect(dom.window.document.body?.querySelector('main')).toBeDefined()
    expect(dom.window.document.documentElement).toBeDefined()
  })

  it('serialize output round-trips through a fresh JSDOM', () => {
    const html = '<!DOCTYPE html><html><head></head><body><p>hello</p></body></html>'
    const dom = new JSDOM(html)
    const serialized = dom.serialize()
    const again = new JSDOM(serialized)
    expect(again.window.document.querySelector('p')?.textContent).toBe('hello')
  })

  it('reconfigure({ url }) updates location', () => {
    const dom = new JSDOM('', { url: 'https://first.example/' })
    dom.reconfigure({ url: 'https://second.example/about' })
    expect(dom.window.location.href).toBe('https://second.example/about')
    expect(dom.window.location.pathname).toBe('/about')
  })
})

describe('jsdom patterns: VirtualConsole capture', () => {
  it('captures log lines emitted by scripts', () => {
    const vc = new VirtualConsole()
    const lines: unknown[][] = []
    vc.on('log', (...args) => lines.push(args))
    vc.on('error', (...args) => lines.push(['error', ...args]))

    const dom = new JSDOM(
      '<!DOCTYPE html><html><body><script>console.log("from-script", 1, 2); console.error("oops")</script></body></html>',
      { virtualConsole: vc, runScripts: 'dangerously' },
    )
    expect(dom.window).toBeDefined() // silence unused warning
    expect(lines).toEqual([['from-script', 1, 2], ['error', 'oops']])
  })

  it('sendTo forwards to a real console-like sink', () => {
    const vc = new VirtualConsole()
    const seen: unknown[][] = []
    vc.sendTo({ log: (...args: unknown[]) => seen.push(args) } as unknown as Console)
    vc.emit('log', 'x', 1)
    expect(seen).toEqual([['x', 1]])
  })
})

describe('jsdom patterns: runScripts', () => {
  it('executes inline scripts and allows them to mutate the DOM', async () => {
    const dom = new JSDOM(
      `<!DOCTYPE html><html><body>
        <ul id=list></ul>
        <script>
          for (let i = 0; i < 3; i++) {
            const li = document.createElement('li')
            li.textContent = 'item-' + i
            document.getElementById('list').appendChild(li)
          }
        </script>
      </body></html>`,
      { runScripts: 'dangerously' },
    )
    const items = dom.window.document.querySelectorAll('li')
    expect(items).toHaveLength(3)
    expect((items[0] as any).textContent).toBe('item-0')
  })

  it('jsdomError reports script exceptions', () => {
    const vc = new VirtualConsole()
    const errors: unknown[] = []
    vc.on('jsdomError', (e: unknown) => errors.push(e))
    const dom = new JSDOM(
      '<!DOCTYPE html><html><body><script>throw new Error("script-boom")</script></body></html>',
      { virtualConsole: vc, runScripts: 'dangerously' },
    )
    expect(dom.window).toBeDefined()
    expect((errors[0] as Error).message).toBe('script-boom')
  })
})

// ---------------------------------------------------------------------------
// happy-dom migration patterns
// ---------------------------------------------------------------------------

describe('happy-dom patterns: Window construction and cleanup', () => {
  it('new Window({ url, width, height })', () => {
    const w = new Window({ url: 'http://localhost:3000/', width: 1280, height: 720 })
    expect(w.location.href).toBe('http://localhost:3000/')
    expect(w.innerWidth).toBe(1280)
    expect(w.innerHeight).toBe(720)
  })

  it('window.happyDOM API is present', () => {
    const w = new Window()
    expect(typeof w.happyDOM.close).toBe('function')
    expect(typeof w.happyDOM.waitUntilComplete).toBe('function')
    expect(typeof w.happyDOM.abort).toBe('function')
    expect(typeof w.happyDOM.setURL).toBe('function')
    expect(typeof w.happyDOM.setViewport).toBe('function')
  })

  it('happyDOM.setViewport resizes', () => {
    const w = new Window()
    w.happyDOM.setViewport({ width: 800, height: 600 })
    expect(w.innerWidth).toBe(800)
    expect(w.innerHeight).toBe(600)
  })

  it('happyDOM.setURL updates location without navigating', () => {
    const w = new Window({ url: 'http://a/' })
    w.happyDOM.setURL('http://b/page?x=1')
    expect(w.location.href).toBe('http://b/page?x=1')
    expect(w.location.search).toBe('?x=1')
  })

  it('happyDOM.close clears document + storage', async () => {
    const w = new Window()
    w.document.body!.innerHTML = '<div>X</div>'
    w.localStorage.setItem('k', 'v')
    await w.happyDOM.close()
    expect(w.document.documentElement?.innerHTML).toBe('')
    expect(w.localStorage.getItem('k')).toBeNull()
  })

  it('waitUntilComplete drains pending timers', async () => {
    const w = new Window()
    let fired = false
    w.setTimeout(() => { fired = true }, 10)
    await w.happyDOM.waitUntilComplete()
    expect(fired).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Testing Library-style flows
// ---------------------------------------------------------------------------

describe('Testing Library patterns: render + query + interact', () => {
  function mount(html: string): Window {
    const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`)
    return dom.window
  }

  it('query by text content via querySelector + textContent iteration', () => {
    const w = mount('<button id=go>Sign up</button><button>Cancel</button>')
    const buttons = Array.from(w.document.querySelectorAll('button')) as any[]
    const signup = buttons.find(b => b.textContent === 'Sign up')
    expect(signup?.id).toBe('go')
  })

  it('click fires a bubbling event and a handler responds', () => {
    const w = mount('<button id=b>click</button>')
    const btn = w.document.getElementById('b') as any
    let clicked = 0
    w.document.body!.addEventListener('click', () => clicked++) // bubbled
    btn.click()
    expect(clicked).toBe(1)
  })

  it('form change → setter fires input event', () => {
    const w = mount('<input id=i value="" />')
    const input = w.document.getElementById('i') as any
    const seen: string[] = []
    input.addEventListener('input', () => seen.push(input.value))
    input.value = 'hello'
    input.dispatchEvent(new w.Event('input', { bubbles: true }))
    expect(seen).toEqual(['hello'])
  })

  it('role attribute query works', () => {
    const w = mount('<div role=alert>msg</div><nav role=navigation></nav>')
    expect(w.document.querySelector('[role=alert]')?.textContent).toBe('msg')
    expect(w.document.querySelectorAll('[role]')).toHaveLength(2)
  })

  it('label-for association', () => {
    const w = mount('<label for=email>Email</label><input id=email type=email />')
    const label = w.document.querySelector('label[for=email]') as any
    expect(label.getAttribute('for')).toBe('email')
    const input = w.document.getElementById('email') as any
    expect(input?.type).toBe('email')
  })

  it('waitFor polls until a condition is met', async () => {
    const w = mount('<div id=target></div>')
    const target = w.document.getElementById('target') as any
    setTimeout(() => { target.textContent = 'ready' }, 20)

    const waitFor = async (fn: () => boolean, timeout = 500): Promise<void> => {
      const deadline = Date.now() + timeout
      while (Date.now() < deadline) {
        if (fn()) return
        await new Promise(r => setTimeout(r, 5))
      }
      throw new Error('waitFor timeout')
    }
    await waitFor(() => target.textContent === 'ready')
    expect(target.textContent).toBe('ready')
  })
})

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

describe('Form interaction: deep coverage', () => {
  function dom(html: string) {
    const d = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`)
    return d.window
  }

  it('input value setter updates the DOM', () => {
    const w = dom('<input id=i value="start" />')
    const input = w.document.getElementById('i') as any
    expect(input.value).toBe('start')
    input.value = 'changed'
    expect(input.value).toBe('changed')
  })

  it('checkbox checked state round-trips', () => {
    const w = dom('<input type=checkbox id=c /> <input type=checkbox id=c2 checked />')
    const c = w.document.getElementById('c') as any
    const c2 = w.document.getElementById('c2') as any
    expect(c.checked).toBe(false)
    expect(c2.checked).toBe(true)
    c.checked = true
    expect(c.checked).toBe(true)
  })

  it('submit button dispatches a cancelable submit event', () => {
    const w = dom('<form id=f><input name=x value=1 /><button type=submit>go</button></form>')
    const form = w.document.getElementById('f') as any
    let stopped = false
    form.addEventListener('submit', (event: Event) => {
      event.preventDefault()
      stopped = true
    })
    const button = form.querySelector('button')
    button.click()
    expect(stopped).toBe(true)
  })

  it('FormData populates from a real form', () => {
    const w = dom(`
      <form id=f>
        <input name=username value=alice />
        <input type=checkbox name=agree checked />
        <select name=role><option selected value=admin>A</option><option value=user>U</option></select>
      </form>
    `)
    const form = w.document.getElementById('f') as any
    const fd = new w.FormData(form)
    expect(fd.get('username')).toBe('alice')
    expect(fd.get('agree')).toBe('on')
    expect(fd.get('role')).toBe('admin')
  })

  it('constraint validation: required input', () => {
    const w = dom('<input id=x required />')
    const input = w.document.getElementById('x') as any
    expect(input.checkValidity()).toBe(false)
    expect(input.validity?.valueMissing).toBe(true)
    input.value = 'filled'
    expect(input.checkValidity()).toBe(true)
  })

  it('setCustomValidity reports a message and blocks submit', () => {
    const w = dom('<input id=x />')
    const input = w.document.getElementById('x') as any
    input.setCustomValidity('nope')
    expect(input.validationMessage).toBe('nope')
    expect(input.checkValidity()).toBe(false)
    input.setCustomValidity('')
    expect(input.checkValidity()).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

describe('Event system: realistic flows', () => {
  function tree() {
    const dom = new JSDOM('<!DOCTYPE html><html><body><section id=outer><article id=inner><button id=btn>click</button></article></section></body></html>')
    return dom.window
  }

  it('bubbles up from target to document', () => {
    const w = tree()
    const path: string[] = []
    for (const id of ['btn', 'inner', 'outer']) {
      const el = w.document.getElementById(id) as any
      el.addEventListener('custom', () => path.push(id))
    }
    const target = w.document.getElementById('btn') as any
    target.dispatchEvent(new w.CustomEvent('custom', { bubbles: true }))
    expect(path).toEqual(['btn', 'inner', 'outer'])
  })

  it('stopPropagation halts bubbling', () => {
    const w = tree()
    const path: string[] = []
    const inner = w.document.getElementById('inner') as any
    inner.addEventListener('x', (e: Event) => { path.push('inner'); e.stopPropagation() })
    w.document.getElementById('outer')!.addEventListener('x', () => path.push('outer'))
    const btn = w.document.getElementById('btn') as any
    btn.dispatchEvent(new w.CustomEvent('x', { bubbles: true }))
    expect(path).toEqual(['inner'])
  })

  it('once listener fires exactly once', () => {
    const w = tree()
    const btn = w.document.getElementById('btn') as any
    let count = 0
    btn.addEventListener('click', () => count++, { once: true })
    btn.click()
    btn.click()
    expect(count).toBe(1)
  })

  it('CustomEvent carries detail through dispatch', () => {
    const w = tree()
    const btn = w.document.getElementById('btn') as any
    let captured: any = null
    btn.addEventListener('notify', (e: any) => { captured = e.detail })
    btn.dispatchEvent(new w.CustomEvent('notify', { detail: { id: 42 } }))
    expect(captured).toEqual({ id: 42 })
  })

  it('KeyboardEvent with key/code/modifiers', () => {
    const w = tree()
    const btn = w.document.getElementById('btn') as any
    let key = ''
    btn.addEventListener('keydown', (e: any) => { key = `${e.key}:${e.code}:${e.ctrlKey ? 'C' : ''}` })
    const ev = new w.KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', ctrlKey: true })
    btn.dispatchEvent(ev)
    expect(key).toBe('Enter:Enter:C')
  })
})

// ---------------------------------------------------------------------------
// Observers + timing
// ---------------------------------------------------------------------------

describe('Observers + async timing', () => {
  it('MutationObserver records attribute changes', async () => {
    const { window } = new JSDOM('<!DOCTYPE html><html><body><div id=m></div></body></html>')
    const el = window.document.getElementById('m') as any
    const records: any[] = []
    const mo = new window.MutationObserver((list: any) => { records.push(...list) })
    mo.observe(el, { attributes: true, attributeOldValue: true })
    el.setAttribute('data-x', '1')
    el.setAttribute('data-x', '2')
    await new Promise(r => setTimeout(r, 10))
    expect(records.length).toBeGreaterThanOrEqual(2)
    mo.disconnect()
  })

  it('MutationObserver records childList additions', async () => {
    const { window } = new JSDOM('<!DOCTYPE html><html><body><ul id=l></ul></body></html>')
    const ul = window.document.getElementById('l') as any
    const records: any[] = []
    const mo = new window.MutationObserver((list: any) => { records.push(...list) })
    mo.observe(ul, { childList: true })
    const li = window.document.createElement('li')
    ul.appendChild(li)
    await new Promise(r => setTimeout(r, 10))
    expect(records.some((r: any) => r.type === 'childList' && r.addedNodes.length > 0)).toBe(true)
    mo.disconnect()
  })

  it('microtasks run before macrotasks', async () => {
    const order: string[] = []
    queueMicrotask(() => order.push('micro'))
    setTimeout(() => order.push('macro'), 0)
    await new Promise(r => setTimeout(r, 5))
    expect(order).toEqual(['micro', 'macro'])
  })

  it('requestAnimationFrame runs callbacks', async () => {
    const { window } = new JSDOM()
    const fired: number[] = []
    window.requestAnimationFrame(() => fired.push(1))
    window.requestAnimationFrame(() => fired.push(2))
    await new Promise(r => setTimeout(r, 30))
    expect(fired).toEqual([1, 2])
  })
})

// ---------------------------------------------------------------------------
// Network + storage
// ---------------------------------------------------------------------------

describe('Network + storage patterns', () => {
  it('fetch works with a local Bun.serve', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => new Response(JSON.stringify({ ok: true })),
    })
    try {
      const { window } = new JSDOM()
      const res = await window.fetch(`http://localhost:${server.port}/`)
      const body = await res.json()
      expect(body).toEqual({ ok: true })
    }
    finally {
      server.stop(true)
    }
  })

  it('XMLHttpRequest fires load event and returns responseText', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => new Response('hello-xhr'),
    })
    try {
      const { window } = new JSDOM()
      const xhr = new window.XMLHttpRequest()
      const done = new Promise<string>((resolve, reject) => {
        xhr.addEventListener('load', () => resolve(xhr.responseText))
        xhr.addEventListener('error', reject)
      })
      xhr.open('GET', `http://localhost:${server.port}/`)
      xhr.send()
      expect(await done).toBe('hello-xhr')
    }
    finally {
      server.stop(true)
    }
  })

  it('AbortController cancels a fetch', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => new Promise<Response>(() => {}),
    })
    try {
      const { window } = new JSDOM()
      const ac = new window.AbortController()
      const p = window.fetch(`http://localhost:${server.port}/`, { signal: ac.signal })
      ac.abort()
      await expect(p).rejects.toBeDefined()
    }
    finally {
      server.stop(true)
    }
  })

  it('localStorage / sessionStorage persist within an instance', () => {
    const { window } = new JSDOM()
    window.localStorage.setItem('a', '1')
    window.sessionStorage.setItem('b', '2')
    expect(window.localStorage.getItem('a')).toBe('1')
    expect(window.sessionStorage.getItem('b')).toBe('2')
    expect(window.localStorage.length).toBe(1)
  })

  it('document.cookie round-trips with multiple keys', () => {
    const { window } = new JSDOM('', { url: 'https://example.test/' })
    window.document.cookie = 'a=1'
    window.document.cookie = 'b=2; Path=/'
    const parts = window.document.cookie.split('; ').sort()
    expect(parts).toContain('a=1')
    expect(parts).toContain('b=2')
  })
})

// ---------------------------------------------------------------------------
// Web Components + Shadow DOM
// ---------------------------------------------------------------------------

describe('Web Components', () => {
  it('customElements.define creates an upgradable element', () => {
    const { window } = new JSDOM('<!DOCTYPE html><html><body><x-badge>label</x-badge></body></html>')

    const invocations: string[] = []
    class XBadge extends window.HTMLElement {
      static observedAttributes = ['count']
      connectedCallback() { invocations.push('connected') }
      disconnectedCallback() { invocations.push('disconnected') }
      attributeChangedCallback(name: string, _old: string | null, value: string | null) {
        invocations.push(`attr:${name}=${value}`)
      }
    }
    window.customElements.define('x-badge', XBadge)

    const el = window.document.createElement('x-badge') as any
    window.document.body!.appendChild(el)
    el.setAttribute('count', '3')
    el.remove()
    expect(invocations.some(i => i === 'connected')).toBe(true)
    expect(invocations).toContain('attr:count=3')
  })

  it('attachShadow with mode open exposes the root', () => {
    const { window } = new JSDOM('<!DOCTYPE html><html><body><div id=host></div></body></html>')
    const host = window.document.getElementById('host') as any
    const root = host.attachShadow({ mode: 'open' })
    root.innerHTML = '<span class=inner>shadow</span>'
    expect(host.shadowRoot).toBe(root)
    expect(root.querySelector('.inner')?.textContent).toBe('shadow')
  })

  it('closed shadow mode hides shadowRoot from the host', () => {
    const { window } = new JSDOM('<!DOCTYPE html><html><body><div id=host></div></body></html>')
    const host = window.document.getElementById('host') as any
    host.attachShadow({ mode: 'closed' })
    expect(host.shadowRoot).toBeNull()
  })

  it('<template> content is a DocumentFragment query target', () => {
    const { window } = new JSDOM('<!DOCTYPE html><html><body><template id=t><p class=row></p><p class=row></p></template></body></html>')
    const tpl = window.document.getElementById('t') as any
    expect(tpl.content).toBeDefined()
    expect(tpl.content.querySelectorAll('.row')).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// DOM traversal + selectors
// ---------------------------------------------------------------------------

describe('DOM traversal + selectors', () => {
  function dom() {
    return new JSDOM(`<!DOCTYPE html><html><body>
      <section id=s>
        <p class="one">a</p>
        <p class="two">b</p>
        <p class="three hidden">c</p>
        <article><h1>title</h1><p>body</p></article>
        <div data-type="promo" data-n=1>promo</div>
      </section>
    </body></html>`).window
  }

  it('complex selectors', () => {
    const w = dom()
    expect(w.document.querySelector('section > p.one')?.textContent).toBe('a')
    expect(w.document.querySelectorAll('section > p')).toHaveLength(3)
    expect(w.document.querySelectorAll('section p')).toHaveLength(4) // includes article>p
  })

  it('attribute selectors', () => {
    const w = dom()
    expect(w.document.querySelector('[data-type=promo]')?.textContent).toBe('promo')
    expect(w.document.querySelectorAll('[data-n]')).toHaveLength(1)
  })

  it(':not and multiple classes', () => {
    const w = dom()
    const notHidden = w.document.querySelectorAll('section > p:not(.hidden)')
    expect(notHidden).toHaveLength(2)
  })

  it('closest walks up the tree', () => {
    const w = dom()
    const h1 = w.document.querySelector('h1') as any
    expect(h1.closest('article')).toBeDefined()
    expect(h1.closest('section')?.id).toBe('s')
    expect(h1.closest('body')).toBe(w.document.body)
  })

  it('matches returns a boolean', () => {
    const w = dom()
    const p = w.document.querySelector('p.one') as any
    expect(p.matches('.one')).toBe(true)
    expect(p.matches('section > p')).toBe(true)
    expect(p.matches('.two')).toBe(false)
  })

  it('contains works across ancestors', () => {
    const w = dom()
    const section = w.document.getElementById('s') as any
    const h1 = w.document.querySelector('h1') as any
    expect(section.contains(h1)).toBe(true)
    expect(h1.contains(section)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Final smoke: end-to-end story that touches many systems
// ---------------------------------------------------------------------------

describe('End-to-end smoke', () => {
  it('mount → fetch → update DOM → assert', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => Response.json({ items: ['x', 'y', 'z'] }),
    })
    try {
      const { window } = new JSDOM('<!DOCTYPE html><html><body><ul id=out></ul></body></html>')
      const res = await window.fetch(`http://localhost:${server.port}/`)
      const data = await res.json() as { items: string[] }
      const ul = window.document.getElementById('out') as any
      for (const item of data.items) {
        const li = window.document.createElement('li')
        li.textContent = item
        ul.appendChild(li)
      }
      expect(ul.children).toHaveLength(3)
      expect(ul.children[1]?.textContent).toBe('y')
    }
    finally {
      server.stop(true)
    }
  })

  it('form submit → preventDefault → FormData round-trip', () => {
    const { window } = new JSDOM(`<!DOCTYPE html><html><body>
      <form id=f>
        <input name=name value=chris />
        <input name=email value=c@example />
        <button type=submit>go</button>
      </form>
    </body></html>`)

    const form = window.document.getElementById('f') as any
    let received: FormData | null = null
    form.addEventListener('submit', (event: Event) => {
      event.preventDefault()
      received = new window.FormData(form)
    })
    form.querySelector('button').click()
    expect(received).not.toBeNull()
    expect(received!.get('name')).toBe('chris')
    expect(received!.get('email')).toBe('c@example')
  })
})
