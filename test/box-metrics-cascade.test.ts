import { beforeEach, describe, expect, test } from 'bun:test'
import { Window } from '../src/window/Window'

// =============================================================================
// Box metrics read the cascade, not only the inline style (#1600).
//
// getComputedStyle() started resolving stylesheet rules in 0.1.11.
// getBoundingClientRect() and the offset*/client* pair were left reading the
// inline style, so the two APIs disagreed about the same element: the cascade
// reported `width: 120px` while the rect reported 0.
//
// That is the shape of a test that passes while checking nothing. Someone
// confirms getComputedStyle sees the class, reasonably concludes styles are
// wired up, and writes a geometry assertion that compares 0 to 0.
//
// Flow and positioning are computed now, so the cases below assert that the
// cascade reaches them: a margin from a stylesheet moves a box, and a width of
// `auto` resolves against the containing block rather than to zero.
// =============================================================================

let window: Window
let document: any

beforeEach(() => {
  window = new Window()
  document = window.document
})

/** Put a stylesheet in the document and return the element it targets. */
function styled(css: string, markup: string): any {
  document.head.innerHTML = `<style>${css}</style>`
  document.body.innerHTML = markup
  return document.body.firstElementChild
}

describe('box metrics resolve through the cascade', () => {
  test('a size from a stylesheet reaches getBoundingClientRect', () => {
    const el = styled('.box { width: 120px; height: 40px }', '<div class="box"></div>')

    const rect = el.getBoundingClientRect()
    expect(rect.width).toBe(120)
    expect(rect.height).toBe(40)
  })

  test('a size from a stylesheet reaches offsetWidth and clientWidth', () => {
    const el = styled('.box { width: 120px; height: 40px }', '<div class="box"></div>')

    expect(el.offsetWidth).toBe(120)
    expect(el.offsetHeight).toBe(40)
    expect(el.clientWidth).toBe(120)
    expect(el.clientHeight).toBe(40)
  })

  test('the rect agrees with getComputedStyle about the same element', () => {
    // The point of the fix: one resolution, so the two cannot drift apart.
    const el = styled('.box { width: 250px }', '<div class="box"></div>')

    const computed = window.getComputedStyle(el).getPropertyValue('width')
    expect(computed).toBe('250px')
    expect(el.getBoundingClientRect().width).toBe(Number.parseFloat(computed))
  })

  test('an inline style still beats the stylesheet', () => {
    const el = styled('.box { width: 120px }', '<div class="box" style="width: 300px"></div>')

    expect(el.getBoundingClientRect().width).toBe(300)
  })

  test('!important in the stylesheet beats the inline style', () => {
    const el = styled('.box { width: 120px !important }', '<div class="box" style="width: 300px"></div>')

    // Same precedence getComputedStyle applies, rather than a second opinion.
    expect(window.getComputedStyle(el).getPropertyValue('width')).toBe('120px')
    expect(el.getBoundingClientRect().width).toBe(120)
  })

  test('the more specific selector wins', () => {
    const el = styled(
      '.box { width: 120px } #target { width: 400px }',
      '<div class="box" id="target"></div>',
    )

    expect(el.getBoundingClientRect().width).toBe(400)
  })

  test('an element nobody sized fills its containing block', () => {
    // Zero before there was a layout pass. No rule matches, so the width is
    // `auto`, and a block-level box resolves that against its container.
    const el = styled('.other { width: 120px }', '<div class="box"></div>')

    expect(el.getBoundingClientRect().width).toBe(1024)
    expect(el.offsetWidth).toBe(1024)
    // Nothing inside it, so no height.
    expect(el.offsetHeight).toBe(0)
  })

  test('a width/height attribute still works when no rule matches', () => {
    // <canvas>, <img> and <svg> carry their size as an attribute.
    document.head.innerHTML = ''
    document.body.innerHTML = '<canvas width="300" height="150"></canvas>'
    const canvas = document.body.firstElementChild

    expect(canvas.getBoundingClientRect().width).toBe(300)
    expect(canvas.getBoundingClientRect().height).toBe(150)
  })

  test('a percentage resolves against a parent sized by a stylesheet', () => {
    document.head.innerHTML = '<style>.outer { width: 400px } .inner { width: 50% }</style>'
    document.body.innerHTML = '<div class="outer"><div class="inner"></div></div>'
    const inner = document.body.firstElementChild.firstElementChild

    expect(inner.getBoundingClientRect().width).toBe(200)
  })

  test('position is computed, from the same resolution', () => {
    // This asserted the origin for everything while there was no layout pass.
    // A margin from the cascade now moves the box, which is the point of
    // routing both through one resolution.
    const el = styled('.box { width: 120px; margin-left: 50px }', '<div class="box"></div>')

    const rect = el.getBoundingClientRect()
    expect({ x: rect.x, y: rect.y, top: rect.top, left: rect.left }).toEqual({ x: 50, y: 0, top: 0, left: 50 })
  })

  test('a document with no stylesheets behaves exactly as before', () => {
    document.body.innerHTML = '<div style="width: 80px; height: 20px"></div>'
    const el = document.body.firstElementChild

    expect(el.getBoundingClientRect().width).toBe(80)
    expect(el.clientHeight).toBe(20)
  })
})
