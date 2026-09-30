/**
 * getComputedStyle and the style cascade.
 *
 * Regression guard for #1597: `getComputedStyle` read the inline `style`
 * attribute and nothing else, so anything styled through a class, id or type
 * selector was invisible to it and `document.styleSheets` returned `[]`. That
 * returned a wrong answer rather than failing — a class-based visibility
 * assertion passed whatever the stylesheet said.
 */

import { describe, expect, test } from 'bun:test'
import { CSSStyleSheet, Window } from '../src'

function styled(css: string, html: string) {
  const window = new Window()
  window.document.head!.innerHTML = `<style>${css}</style>`
  window.document.body!.innerHTML = html
  return window
}

/** Computed value of `property` for the first element matching `selector`. */
function computed(window: Window, selector: string, property: string): string {
  const element = window.document.querySelector(selector)!
  return (window.getComputedStyle(element) as any).getPropertyValue(property)
}

describe('document.styleSheets', () => {
  test('exposes one sheet per style element, in document order', () => {
    const window = new Window()
    window.document.head!.innerHTML = '<style>.a { color: red }</style><style>.b { color: blue }</style>'

    const sheets = window.document.styleSheets
    expect(sheets).toHaveLength(2)
    expect((sheets[0].cssRules[0] as any).selectorText).toBe('.a')
    expect((sheets[1].cssRules[0] as any).selectorText).toBe('.b')
  })

  test('is empty when the document has no style elements', () => {
    expect(new Window().document.styleSheets).toHaveLength(0)
  })

  test('reparses when a style element is edited', () => {
    const window = styled('.c { display: none }', '<div class="c">x</div>')
    expect(computed(window, '.c', 'display')).toBe('none')

    window.document.querySelector('style')!.textContent = '.c { display: flex }'

    expect(computed(window, '.c', 'display')).toBe('flex')
  })
})

describe('getComputedStyle resolves stylesheet rules', () => {
  test('a class rule applies', () => {
    const window = styled('.hidden { display: none }', '<div class="hidden">x</div>')
    expect(computed(window, '.hidden', 'display')).toBe('none')
  })

  test('a descendant selector applies', () => {
    const window = styled('.wrap .item { display: none }', '<div class="wrap"><span class="item">x</span></div>')
    expect(computed(window, '.item', 'display')).toBe('none')
  })

  test('a rule that does not match is ignored', () => {
    const window = styled('.other { display: none }', '<div class="item">x</div>')
    expect(computed(window, '.item', 'display')).toBe('block')
  })

  test('per-tag defaults still apply when nothing declares the property', () => {
    const window = styled('', '<span>x</span>')
    expect(computed(window, 'span', 'display')).toBe('inline')
    expect(computed(window, 'span', 'color')).toBe('rgb(0, 0, 0)')
  })

  test('adopted stylesheets participate', () => {
    const window = new Window()
    const sheet = new CSSStyleSheet()
    sheet.replaceSync('.adopted { display: none }')
    window.document.adoptedStyleSheets = [sheet]
    window.document.body!.innerHTML = '<div class="adopted">x</div>'

    expect(computed(window, '.adopted', 'display')).toBe('none')
  })

  test('camelCase access and getPropertyValue agree', () => {
    const window = styled('.c { background-color: rgb(1, 2, 3) }', '<div class="c">x</div>')
    const style = window.getComputedStyle(window.document.querySelector('.c')!) as any

    expect(style.backgroundColor).toBe('rgb(1, 2, 3)')
    expect(style.getPropertyValue('background-color')).toBe('rgb(1, 2, 3)')
  })

  test('a matching @media block applies', () => {
    // This used to assert the opposite, as a record of the limitation: the
    // parser flattened @media into a rule whose body was read as declarations,
    // so the cascade had to skip anything starting with '@'. It is a real
    // CSSMediaRule now and is descended into when its condition holds (#1611).
    const window = styled('@media screen { .c { display: none } }', '<div class="c">x</div>')
    expect(computed(window, '.c', 'display')).toBe('none')
  })

  test('a @media block that does not match is skipped', () => {
    const window = styled('@media print { .c { display: none } }', '<div class="c">x</div>')
    expect(computed(window, '.c', 'display')).toBe('block')
  })

  test('the other at-rules still never match an element', () => {
    // The boundary that remains. @font-face and friends are still flattened by
    // the parser into a rule whose body was never meant to be read as
    // declarations, so they must not reach an element.
    const window = styled(
      '@font-face { font-family: "X"; color: red } @keyframes spin { from { color: blue } }',
      '<div class="c">x</div>',
    )
    expect(computed(window, '.c', 'color')).not.toBe('red')
    expect(computed(window, '.c', 'color')).not.toBe('blue')
  })
})

describe('cascade order', () => {
  test('id beats class beats type, whatever the source order', () => {
    const window = styled(
      '#x { color: blue } .c { color: red } div { color: green }',
      '<div id="x" class="c">x</div>',
    )
    expect(computed(window, 'div', 'color')).toBe('blue')
  })

  test('class beats type', () => {
    const window = styled('.c { color: red } div { color: green }', '<div class="c">x</div>')
    expect(computed(window, 'div', 'color')).toBe('red')
  })

  test('at equal specificity the later rule wins', () => {
    const window = styled('.a { color: red } .b { color: green }', '<div class="a b">x</div>')
    expect(computed(window, 'div', 'color')).toBe('green')
  })

  test('inline style beats a stylesheet rule', () => {
    const window = styled('.c { color: red }', '<div class="c" style="color: green">x</div>')
    expect(computed(window, 'div', 'color')).toBe('green')
  })

  test('an important sheet declaration beats inline', () => {
    const window = styled('.c { color: red !important }', '<div class="c" style="color: green">x</div>')
    expect(computed(window, 'div', 'color')).toBe('red')
  })

  test('important inline beats important sheet', () => {
    const window = styled('.c { color: red !important }', '<div class="c" style="color: green !important">x</div>')
    expect(computed(window, 'div', 'color')).toBe('green')
  })

  test('important beats higher specificity', () => {
    const window = styled('#x { color: blue } .c { color: red !important }', '<div id="x" class="c">x</div>')
    expect(computed(window, 'div', 'color')).toBe('red')
  })

  test('getPropertyPriority reports important from a sheet', () => {
    const window = styled('.c { color: red !important }', '<div class="c">x</div>')
    const style = window.getComputedStyle(window.document.querySelector('.c')!) as any

    expect(style.getPropertyPriority('color')).toBe('important')
    expect(style.getPropertyValue('color')).toBe('red')
  })
})

describe('replaceSync records !important as a priority', () => {
  test('the value excludes the bang keyword', () => {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync('.c { color: red !important; display: none }')
    const rule = sheet.cssRules[0] as any

    expect(rule.style.getPropertyValue('color')).toBe('red')
    expect(rule.style.getPropertyPriority('color')).toBe('important')
    expect(rule.style.getPropertyValue('display')).toBe('none')
    expect(rule.style.getPropertyPriority('display')).toBe('')
  })
})
