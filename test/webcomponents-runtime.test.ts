import { describe, expect, test } from 'bun:test'
import { Window } from '../src/index'

describe('custom element runtime semantics', () => {
  test('runs constructors when upgrading existing elements without replacing their identity', () => {
    const window = new Window()
    const element = window.document.createElement('upgrade-state')
    const child = window.document.createElement('span')
    element.setAttribute('label', 'ready')
    element.appendChild(child)
    window.document.body!.appendChild(element)
    const callbacks: string[] = []

    class UpgradeState extends window.HTMLElement {
      initialized = true

      constructor() {
        super()
        this.attachShadow({ mode: 'open' })
      }

      static get observedAttributes() {
        return ['label']
      }

      attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        callbacks.push(`${name}:${oldValue}:${newValue}:${this.initialized}`)
      }

      connectedCallback() {
        callbacks.push(`connected:${this.initialized}`)
      }
    }

    window.customElements.define('upgrade-state', UpgradeState)

    expect(window.document.querySelector('upgrade-state')).toBe(element)
    expect(element).toBeInstanceOf(UpgradeState)
    expect((element as UpgradeState).initialized).toBe(true)
    expect(element.firstChild).toBe(child)
    expect(element.getAttribute('label')).toBe('ready')
    expect(element.shadowRoot?.host).toBe(element)
    expect(callbacks).toEqual([
      'label:null:ready:true',
      'connected:true',
    ])
  })

  test('preserves pre-rendered shadow roots while initializing upgrade state', () => {
    const window = new Window()
    const element = window.document.createElement('shadow-hydration')
    const shadowRoot = element.attachShadow({ mode: 'open' })
    shadowRoot.innerHTML = '<p>Server rendered</p>'
    window.document.body!.appendChild(element)

    class ShadowHydration extends window.HTMLElement {
      initialized = true

      constructor() {
        super()
        if (!this.shadowRoot) {
          this.attachShadow({ mode: 'open' })
        }
      }
    }

    window.customElements.define('shadow-hydration', ShadowHydration)

    expect(element).toBeInstanceOf(ShadowHydration)
    expect(element.shadowRoot).toBe(shadowRoot)
    expect(element.shadowRoot?.textContent).toBe('Server rendered')
    expect((element as ShadowHydration).initialized).toBe(true)
  })

  test('rejects invalid names and prevents constructors from being registered twice', async () => {
    const window = new Window()
    class SharedConstructor extends window.HTMLElement {}

    window.customElements.define('first-name', SharedConstructor)

    expect(() => window.customElements.define('second-name', SharedConstructor)).toThrow('constructor has already been used')
    await expect(window.customElements.whenDefined('invalid')).rejects.toThrow('not a valid custom element name')
  })

  test('resolves whenDefined with the registered constructor', async () => {
    const window = new Window()
    class AsyncDefinition extends window.HTMLElement {}
    const definition = window.customElements.whenDefined('async-definition')

    window.customElements.define('async-definition', AsyncDefinition)

    expect(await definition).toBe(AsyncDefinition)
  })
})

describe('shadow DOM slot assignment', () => {
  test('assigns default and named light DOM children', () => {
    const window = new Window()
    const host = window.document.createElement('slot-host')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    shadowRoot.innerHTML = '<slot name="heading">Fallback heading</slot><slot>Fallback body</slot>'
    const heading = window.document.createElement('h2')
    const body = window.document.createTextNode('Body')
    heading.slot = 'heading'
    host.append(heading, body)

    const namedSlot = shadowRoot.querySelector('slot[name="heading"]') as InstanceType<typeof window.HTMLSlotElement>
    const defaultSlot = shadowRoot.querySelector('slot:not([name])') as InstanceType<typeof window.HTMLSlotElement>

    expect(namedSlot).toBeInstanceOf(window.HTMLSlotElement)
    expect(namedSlot.assignedNodes()).toEqual([heading])
    expect(namedSlot.assignedElements()).toEqual([heading])
    expect(defaultSlot.assignedNodes()).toEqual([body])
    expect(defaultSlot.assignedElements()).toEqual([])
  })

  test('uses only the first matching slot and flattens fallback content', () => {
    const window = new Window()
    const host = window.document.createElement('slot-fallback')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    shadowRoot.innerHTML = '<slot name="duplicate"><strong>Fallback</strong></slot><slot name="duplicate"></slot>'
    const slots = shadowRoot.querySelectorAll('slot') as Array<InstanceType<typeof window.HTMLSlotElement>>

    expect(slots[0].assignedNodes()).toEqual([])
    expect(slots[0].assignedElements({ flatten: true })).toHaveLength(1)
    expect(slots[0].assignedElements({ flatten: true })[0]).toBe(slots[0].firstElementChild as any)
    expect(slots[1].assignedNodes()).toEqual([])

    const assigned = window.document.createElement('span')
    assigned.slot = 'duplicate'
    host.appendChild(assigned)

    expect(slots[0].assignedElements({ flatten: true })).toEqual([assigned])
    expect(slots[1].assignedElements({ flatten: true })).toEqual([])
  })

  test('coalesces slotchange and reports redistributed nodes', async () => {
    const window = new Window()
    const host = window.document.createElement('slot-events')
    const shadowRoot = host.attachShadow({ mode: 'open' })
    shadowRoot.innerHTML = '<slot name="leading"></slot><slot></slot>'
    const leadingSlot = shadowRoot.querySelector('slot[name="leading"]') as InstanceType<typeof window.HTMLSlotElement>
    const defaultSlot = shadowRoot.querySelector('slot:not([name])') as InstanceType<typeof window.HTMLSlotElement>
    const changes: string[] = []
    leadingSlot.addEventListener('slotchange', () => changes.push(`leading:${leadingSlot.assignedNodes().length}`))
    defaultSlot.addEventListener('slotchange', () => changes.push(`default:${defaultSlot.assignedNodes().length}`))

    const first = window.document.createElement('span')
    const second = window.document.createElement('span')
    host.append(first, second)
    await Promise.resolve()

    expect(changes).toEqual(['default:2'])

    changes.length = 0
    first.slot = 'leading'
    await Promise.resolve()

    expect(leadingSlot.assignedElements()).toEqual([first])
    expect(defaultSlot.assignedElements()).toEqual([second])
    expect(changes).toEqual(['leading:1', 'default:1'])

    changes.length = 0
    first.remove()
    await Promise.resolve()

    expect(leadingSlot.assignedNodes()).toEqual([])
    expect(changes).toEqual(['leading:0'])
  })
})
