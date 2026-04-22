import { describe, expect, test } from 'bun:test'
import { Window } from '../src'

// =============================================================================
// Inline layout: clientWidth / clientHeight / offsetWidth / offsetHeight /
// getBoundingClientRect should honor inline `style` width/height (and the
// width/height attribute for SVG/canvas/img). very-happy-dom has no real
// layout engine, but honoring inline sizes is the useful behavior for tests.
// =============================================================================

describe('Inline layout: clientWidth / offsetWidth / getBoundingClientRect honor inline style', () => {
  test('div with style.width=800px / style.height=600px reports 800x600', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    w.document.body.appendChild(d)
    d.style.width = '800px'
    d.style.height = '600px'

    expect(d.clientWidth).toBe(800)
    expect(d.offsetWidth).toBe(800)
    expect(d.clientHeight).toBe(600)
    expect(d.offsetHeight).toBe(600)

    const rect = d.getBoundingClientRect()
    expect(rect.width).toBe(800)
    expect(rect.height).toBe(600)
  })

  test('inline style set via setAttribute reports size', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    w.document.body.appendChild(d)
    d.setAttribute('style', 'width: 1024px; height: 768px;')

    expect(d.clientWidth).toBe(1024)
    expect(d.clientHeight).toBe(768)
    expect(d.getBoundingClientRect().width).toBe(1024)
    expect(d.getBoundingClientRect().height).toBe(768)
  })

  test('element without inline size still returns 0', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    w.document.body.appendChild(d)

    expect(d.clientWidth).toBe(0)
    expect(d.clientHeight).toBe(0)
    expect(d.offsetWidth).toBe(0)
    expect(d.offsetHeight).toBe(0)
    expect(d.getBoundingClientRect().width).toBe(0)
    expect(d.getBoundingClientRect().height).toBe(0)
  })

  test('SVG element reads width/height attributes', () => {
    const w = new Window()
    const svg = w.document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '640')
    svg.setAttribute('height', '480')

    expect(svg.clientWidth).toBe(640)
    expect(svg.clientHeight).toBe(480)
    expect(svg.offsetWidth).toBe(640)
    expect(svg.offsetHeight).toBe(480)
    expect(svg.getBoundingClientRect().width).toBe(640)
    expect(svg.getBoundingClientRect().height).toBe(480)
  })

  test('inline style wins over width attribute', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    d.setAttribute('width', '100')
    d.style.width = '500px'

    expect(d.clientWidth).toBe(500)
  })

  test('percentage width resolves against parent inline size', () => {
    const w = new Window()
    const parent = w.document.createElement('div')
    parent.style.width = '1000px'
    parent.style.height = '500px'
    w.document.body.appendChild(parent)

    const child = w.document.createElement('div')
    child.style.width = '50%'
    child.style.height = '20%'
    parent.appendChild(child)

    expect(child.clientWidth).toBe(500)
    expect(child.clientHeight).toBe(100)
  })

  test('percentage width on orphaned element returns 0', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    d.style.width = '50%'
    // Not appended to a parent -> no resolvable context
    expect(d.clientWidth).toBe(0)
  })

  test('fractional px values are preserved', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    w.document.body.appendChild(d)
    d.style.width = '123.5px'
    expect(d.clientWidth).toBeCloseTo(123.5)
  })

  test('bare numeric style values (no unit) are treated as px', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    w.document.body.appendChild(d)
    d.style.width = '300'
    expect(d.clientWidth).toBe(300)
  })

  test('auto / invalid style values return 0', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    w.document.body.appendChild(d)
    d.style.width = 'auto'
    expect(d.clientWidth).toBe(0)

    d.style.width = 'bogus'
    expect(d.clientWidth).toBe(0)
  })
})

// =============================================================================
// Pointer capture: no-op stubs so drag/zoom code that calls these doesn't
// throw under tests.
// =============================================================================

describe('Pointer capture: setPointerCapture / releasePointerCapture / hasPointerCapture', () => {
  test('set/hasPointerCapture tracks ids', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    expect(d.hasPointerCapture(1)).toBe(false)
    d.setPointerCapture(1)
    expect(d.hasPointerCapture(1)).toBe(true)
    d.releasePointerCapture(1)
    expect(d.hasPointerCapture(1)).toBe(false)
  })

  test('releasePointerCapture is safe to call without a prior set', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    expect(() => d.releasePointerCapture(42)).not.toThrow()
  })
})
