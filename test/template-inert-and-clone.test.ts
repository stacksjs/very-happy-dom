/**
 * cloneNode constructs custom elements, and template content is inert - as in
 * a browser.
 *
 * cloneNode always made a plain VirtualElement, so a cloned custom element
 * never ran its constructor or callbacks, and a cloned <canvas> or other typed
 * element lost its class. And template content was not inert: parsing a
 * <template> constructed the custom elements inside it, and define() upgraded
 * them. Code written for a browser leans on both - a framework clones a row
 * template per item, and keeps conditional branches in <template> precisely
 * so they cost nothing until shown - so tests here passed or failed for the
 * wrong reasons.
 */
import { describe, expect, test } from 'bun:test'
import { Window } from '../src/index'

function probe(window: any) {
  const made: string[] = []
  class Probe extends window.HTMLElement {
    constructor() {
      super()
      made.push('constructed')
    }

    connectedCallback() {
      made.push('connected')
    }
  }
  window.customElements.define('x-probe', Probe)
  return { made, Probe }
}

describe('cloneNode', () => {
  test('constructs a cloned custom element', () => {
    const window = new Window()
    const { made, Probe } = probe(window)
    const host = window.document.createElement('div')
    host.innerHTML = '<x-probe></x-probe>'
    made.length = 0

    const copy = host.cloneNode(true) as any
    expect(made).toEqual(['constructed'])
    expect(copy.firstChild).toBeInstanceOf(Probe)
  })

  test('keeps the element class of a typed element', () => {
    const window = new Window()
    const host = window.document.createElement('div')
    host.innerHTML = '<canvas></canvas><template><b>x</b></template>'
    const copy = host.cloneNode(true) as any
    expect(typeof copy.firstChild.getContext).toBe('function')
    expect(copy.lastChild.content.firstChild.tagName).toBe('B')
  })
})

describe('template content is inert', () => {
  test('parsing a template does not construct the custom elements in it', () => {
    const window = new Window()
    const { made } = probe(window)
    const template = window.document.createElement('template')
    template.innerHTML = '<x-probe></x-probe>'
    const host = window.document.createElement('div')
    host.innerHTML = '<template><x-probe></x-probe></template>'
    expect(made).toEqual([])
  })

  test('define() does not upgrade what is inside a template', () => {
    const window = new Window()
    window.document.body!.innerHTML = '<template><x-probe></x-probe></template><x-probe></x-probe>'
    const { made } = probe(window)
    expect(made).toEqual(['constructed', 'connected'])
  })

  test('cloning template content copies it inert, and inserting the copy upgrades it', () => {
    const window = new Window()
    const { made, Probe } = probe(window)
    const template = window.document.createElement('template')
    template.innerHTML = '<x-probe></x-probe>'

    const copy = template.content.firstChild!.cloneNode(true) as any
    expect(made).toEqual([])
    expect(copy).not.toBeInstanceOf(Probe)

    window.document.body!.appendChild(copy)
    expect(made).toEqual(['constructed', 'connected'])
    expect(copy).toBeInstanceOf(Probe)
  })

  test('cloning a template copies its content inert', () => {
    const window = new Window()
    const { made } = probe(window)
    const template = window.document.createElement('template')
    template.innerHTML = '<x-probe></x-probe>'
    template.cloneNode(true)
    expect(made).toEqual([])
  })

  test('importNode of template content constructs, ready to insert', () => {
    const window = new Window()
    const { made } = probe(window)
    const template = window.document.createElement('template')
    template.innerHTML = '<x-probe></x-probe>'
    const imported = window.document.importNode(template.content, true)
    expect(made).toEqual(['constructed'])
    window.document.body!.appendChild(imported)
    expect(made).toEqual(['constructed', 'connected'])
  })
})
