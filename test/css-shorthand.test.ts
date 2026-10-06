/**
 * CSS shorthand expansion.
 *
 * `resolveProperty()` looks a property up by exact name, so a declared
 * `margin: 10px` was invisible to every `margin-top` query and
 * `getComputedStyle` answered with the initial value instead. Longhands are
 * what everything downstream reads, so a shorthand is expanded where it is set.
 *
 * The declaration keeps reporting what the author wrote: the longhands answer
 * reads but stay out of `cssText`, `item()`, `length` and the serialized
 * `style` attribute.
 */
import { describe, expect, test } from 'bun:test'
import { CSSStyleDeclaration, CSSStyleSheet } from '../src/css/CSSOM'
import { expandShorthand, isShorthand, splitValues } from '../src/css/shorthand'
import { Window } from '../src'

/** An element carrying `css`, plus the window that can compute its style. */
function styled(css: string, markup: string): { w: Window, at: (id: string) => (property: string) => string } {
  const w = new Window()
  w.document.head!.innerHTML = `<style>${css}</style>`
  w.document.body!.innerHTML = markup
  return {
    w,
    at: (id: string) => {
      const element = w.document.getElementById(id)
      if (!element)
        throw new Error(`no #${id}`)
      const computed = w.getComputedStyle(element)
      return (property: string) => computed.getPropertyValue(property)
    },
  }
}

describe('splitValues', () => {
  test('splits on top-level whitespace', () => {
    expect(splitValues('1px 2px 3px 4px')).toEqual(['1px', '2px', '3px', '4px'])
    expect(splitValues('  10px   20px  ')).toEqual(['10px', '20px'])
  })

  test('keeps a function call whole', () => {
    expect(splitValues('calc(1px + 2px) 3px')).toEqual(['calc(1px + 2px)', '3px'])
    expect(splitValues('var(--a, 2px) var(--b)')).toEqual(['var(--a, 2px)', 'var(--b)'])
    expect(splitValues('rgb(1 2 3) solid')).toEqual(['rgb(1 2 3)', 'solid'])
  })

  test('keeps a quoted string whole', () => {
    expect(splitValues('"a b" c')).toEqual(['"a b"', 'c'])
  })
})

describe('expandShorthand: box values', () => {
  test('one value covers all four sides', () => {
    expect(expandShorthand('margin', '10px')).toEqual([
      ['margin-top', '10px'],
      ['margin-right', '10px'],
      ['margin-bottom', '10px'],
      ['margin-left', '10px'],
    ])
  })

  test('two values are vertical then horizontal', () => {
    expect(expandShorthand('padding', '1px 2px')).toEqual([
      ['padding-top', '1px'],
      ['padding-right', '2px'],
      ['padding-bottom', '1px'],
      ['padding-left', '2px'],
    ])
  })

  test('three values leave the sides sharing the middle one', () => {
    expect(expandShorthand('margin', '1px 2px 3px')).toEqual([
      ['margin-top', '1px'],
      ['margin-right', '2px'],
      ['margin-bottom', '3px'],
      ['margin-left', '2px'],
    ])
  })

  test('four values go clockwise from the top', () => {
    expect(expandShorthand('inset', '1px 2px 3px 4px')).toEqual([
      ['top', '1px'],
      ['right', '2px'],
      ['bottom', '3px'],
      ['left', '4px'],
    ])
  })

  test('five values are not a box shorthand', () => {
    expect(expandShorthand('margin', '1px 2px 3px 4px 5px')).toBeNull()
  })

  test('covers the border box shorthands', () => {
    expect(expandShorthand('border-width', '2px')?.[0]).toEqual(['border-top-width', '2px'])
    expect(expandShorthand('border-style', 'solid')?.[1]).toEqual(['border-right-style', 'solid'])
    expect(expandShorthand('border-color', 'red')?.[3]).toEqual(['border-left-color', 'red'])
  })
})

describe('expandShorthand: border', () => {
  test('reads the components in any order', () => {
    const expected: Array<[string, string]> = [
      ['border-top-width', '2px'],
      ['border-top-style', 'solid'],
      ['border-top-color', 'red'],
    ]
    expect(expandShorthand('border-top', '2px solid red')?.slice(0, 3)).toEqual(expected)
    expect(expandShorthand('border-top', 'red 2px solid')?.slice(0, 3)).toEqual(expected)
    expect(expandShorthand('border-top', 'solid red 2px')?.slice(0, 3)).toEqual(expected)
  })

  test('an omitted component falls back to its initial value', () => {
    // A shorthand resets every longhand it owns, so the colour is reported as
    // `currentcolor` rather than left alone — which is what a browser says.
    expect(expandShorthand('border-left', '2px solid')).toEqual([
      ['border-left-width', '2px'],
      ['border-left-style', 'solid'],
      ['border-left-color', 'currentcolor'],
    ])
    expect(expandShorthand('border-left', 'red')).toEqual([
      ['border-left-width', 'medium'],
      ['border-left-style', 'none'],
      ['border-left-color', 'red'],
    ])
  })

  test('the all-sides shorthand writes twelve longhands', () => {
    const expanded = expandShorthand('border', '1px dashed blue')
    expect(expanded).toHaveLength(12)
    expect(expanded).toContainEqual(['border-bottom-style', 'dashed'])
    expect(expanded).toContainEqual(['border-right-color', 'blue'])
    expect(expanded).toContainEqual(['border-left-width', '1px'])
  })

  test('a width keyword is a width, not a colour', () => {
    expect(expandShorthand('border-top', 'thick solid')).toEqual([
      ['border-top-width', 'thick'],
      ['border-top-style', 'solid'],
      ['border-top-color', 'currentcolor'],
    ])
  })

  test('two colours do not parse', () => {
    expect(expandShorthand('border-top', 'red blue')).toBeNull()
  })
})

describe('expandShorthand: pairs and keywords', () => {
  test('a single value covers both axes', () => {
    expect(expandShorthand('gap', '8px')).toEqual([['row-gap', '8px'], ['column-gap', '8px']])
    expect(expandShorthand('overflow', 'hidden')).toEqual([['overflow-x', 'hidden'], ['overflow-y', 'hidden']])
  })

  test('two values are taken in order', () => {
    expect(expandShorthand('gap', '8px 16px')).toEqual([['row-gap', '8px'], ['column-gap', '16px']])
    expect(expandShorthand('place-items', 'center start')).toEqual([
      ['align-items', 'center'],
      ['justify-items', 'start'],
    ])
  })

  test('a css-wide keyword reaches every longhand as written', () => {
    expect(expandShorthand('margin', 'inherit')).toEqual([
      ['margin-top', 'inherit'],
      ['margin-right', 'inherit'],
      ['margin-bottom', 'inherit'],
      ['margin-left', 'inherit'],
    ])
    expect(expandShorthand('border', 'unset')).toHaveLength(12)
  })

  test('a property that is not a shorthand expands to nothing', () => {
    expect(expandShorthand('color', 'red')).toBeNull()
    expect(expandShorthand('margin-top', '10px')).toBeNull()
    expect(isShorthand('margin')).toBe(true)
    expect(isShorthand('margin-top')).toBe(false)
  })
})

describe('CSSStyleDeclaration', () => {
  test('a shorthand answers its longhands', () => {
    const style = new CSSStyleDeclaration()
    style.setProperty('margin', '10px 20px')
    expect(style.getPropertyValue('margin-top')).toBe('10px')
    expect(style.getPropertyValue('margin-left')).toBe('20px')
    expect(style.getPropertyValue('margin')).toBe('10px 20px')
  })

  test('serialization reports what the author wrote', () => {
    const style = new CSSStyleDeclaration()
    style.setProperty('margin', '10px')
    style.setProperty('color', 'red')
    expect(style.cssText).toBe('margin: 10px; color: red')
    expect(style.length).toBe(2)
    expect(style.item(0)).toBe('margin')
    expect(style.item(1)).toBe('color')
    expect([...style]).toEqual(['margin', 'color'])
  })

  test('the cascade still sees the longhands', () => {
    const style = new CSSStyleDeclaration()
    style.setProperty('margin', '10px')
    expect(style._allProperties()).toContain('margin-top')
    expect(style._allProperties()).toContain('margin')
  })

  test('a longhand set afterwards wins and becomes the author\'s own', () => {
    const style = new CSSStyleDeclaration()
    style.setProperty('margin', '10px')
    style.setProperty('margin-top', '5px')
    expect(style.getPropertyValue('margin-top')).toBe('5px')
    expect(style.getPropertyValue('margin-left')).toBe('10px')
    expect(style.cssText).toBe('margin: 10px; margin-top: 5px')
  })

  test('a shorthand set afterwards resets every side', () => {
    const style = new CSSStyleDeclaration()
    style.setProperty('margin-top', '5px')
    style.setProperty('margin', '10px')
    expect(style.getPropertyValue('margin-top')).toBe('10px')
    // The top margin is no longer the author's own declaration, so it drops out
    // of the serialized text in favour of the shorthand that replaced it.
    expect(style.cssText).toBe('margin: 10px')
  })

  test('removing a shorthand removes the longhands it alone set', () => {
    const style = new CSSStyleDeclaration()
    style.setProperty('margin', '10px')
    style.setProperty('margin-top', '5px')
    style.removeProperty('margin')
    expect(style.getPropertyValue('margin-left')).toBe('')
    // Declared in its own right, so it outlives the shorthand.
    expect(style.getPropertyValue('margin-top')).toBe('5px')
  })

  test('priority reaches the longhands', () => {
    const style = new CSSStyleDeclaration()
    style.setProperty('padding', '4px', 'important')
    expect(style.getPropertyPriority('padding-top')).toBe('important')
  })

  test('cssText assignment expands too', () => {
    const style = new CSSStyleDeclaration()
    style.cssText = 'padding: 1px 2px; color: red'
    expect(style.getPropertyValue('padding-right')).toBe('2px')
    expect(style.length).toBe(2)
  })
})

describe('getComputedStyle reads a shorthand from a sheet', () => {
  test('margin and padding longhands resolve', () => {
    const { at } = styled('.a { margin: 10px; padding: 5px 7px }', '<div class="a" id="a"></div>')
    const a = at('a')
    expect(a('margin-top')).toBe('10px')
    expect(a('margin-left')).toBe('10px')
    expect(a('padding-top')).toBe('5px')
    expect(a('padding-left')).toBe('7px')
  })

  test('border longhands resolve', () => {
    const { at } = styled('.a { border: 2px solid red }', '<div class="a" id="a"></div>')
    const a = at('a')
    expect(a('border-top-width')).toBe('2px')
    expect(a('border-bottom-style')).toBe('solid')
    expect(a('border-left-color')).toBe('red')
  })

  test('a longhand in a later rule still beats the shorthand', () => {
    const { at } = styled(
      '.a { margin: 10px } .a { margin-top: 1px }',
      '<div class="a" id="a"></div>',
    )
    expect(at('a')('margin-top')).toBe('1px')
    expect(at('a')('margin-bottom')).toBe('10px')
  })

  test('specificity decides between a shorthand and a longhand', () => {
    const { at } = styled(
      '#a { margin: 10px } .a { margin-top: 1px }',
      '<div class="a" id="a"></div>',
    )
    // The id rule wins, even though the class rule declares the longhand
    // directly and comes later.
    expect(at('a')('margin-top')).toBe('10px')
  })

  test('an inline shorthand outranks a sheet longhand', () => {
    const { at } = styled(
      '.a { margin-top: 1px }',
      '<div class="a" id="a" style="margin: 9px"></div>',
    )
    expect(at('a')('margin-top')).toBe('9px')
  })

  test('a media block contributes longhands when it matches', () => {
    const { w, at } = styled(
      '@media (min-width: 500px) { .a { padding: 3px } }',
      '<div class="a" id="a"></div>',
    )
    expect(w.innerWidth).toBeGreaterThanOrEqual(500)
    expect(at('a')('padding-left')).toBe('3px')
  })
})

describe('importance beats declaration order inside a block', () => {
  test('an important shorthand holds off a later normal longhand', () => {
    const { at } = styled('#a { margin: 10px !important; margin-top: 5px }', '<div id="a"></div>')
    expect(at('a')('margin-top')).toBe('10px')
  })

  test('an important longhand survives a later normal shorthand', () => {
    const { at } = styled('#a { margin-top: 5px !important; margin: 10px }', '<div id="a"></div>')
    expect(at('a')('margin-top')).toBe('5px')
    // The shorthand still moves every side that was not important.
    expect(at('a')('margin-bottom')).toBe('10px')
  })

  test('the same rule applies between two longhands', () => {
    const { at } = styled('#a { margin-top: 10px !important; margin-top: 5px }', '<div id="a"></div>')
    expect(at('a')('margin-top')).toBe('10px')
  })

  test('the style attribute follows the same rule', () => {
    const { at } = styled('', '<div id="a" style="margin: 10px !important; margin-top: 5px"></div>')
    expect(at('a')('margin-top')).toBe('10px')
  })

  test('setProperty overwrites regardless, as a browser does', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    d.style.setProperty('margin-top', '10px', 'important')
    d.style.setProperty('margin-top', '5px')
    expect(d.style.getPropertyValue('margin-top')).toBe('5px')
  })
})

describe('an element\'s inline style', () => {
  test('a shorthand answers its longhands', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    d.style.margin = '10px 20px'
    expect(d.style.marginTop).toBe('10px')
    expect(d.style.marginRight).toBe('20px')
    expect(d.style.getPropertyValue('margin-bottom')).toBe('10px')
  })

  test('the style attribute keeps the shorthand it was given', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    d.style.margin = '10px 20px'
    expect(d.getAttribute('style')).toBe('margin: 10px 20px')
    expect(d.style.cssText).toBe('margin: 10px 20px')
    expect(d.style.length).toBe(1)
    expect(d.style.item(0)).toBe('margin')
  })

  test('setAttribute expands too', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    d.setAttribute('style', 'padding: 1px 2px 3px 4px; border: 2px solid red')
    expect(d.style.paddingBottom).toBe('3px')
    expect(d.style.paddingLeft).toBe('4px')
    expect(d.style.borderTopWidth).toBe('2px')
    expect(d.style.borderRightColor).toBe('red')
    expect(d.getAttribute('style')).toBe('padding: 1px 2px 3px 4px; border: 2px solid red')
  })

  test('removeProperty drops the derived longhands', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    d.style.padding = '4px'
    d.style.removeProperty('padding')
    expect(d.style.getPropertyValue('padding-top')).toBe('')
    expect(d.hasAttribute('style')).toBe(false)
  })

  test('removing the style attribute clears the longhands', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    d.setAttribute('style', 'margin: 6px')
    d.removeAttribute('style')
    expect(d.style.getPropertyValue('margin-top')).toBe('')
  })

  test('reassigning cssText replaces the previous expansion', () => {
    const w = new Window()
    const d = w.document.createElement('div')
    d.style.cssText = 'margin: 6px'
    d.style.cssText = 'padding: 2px'
    expect(d.style.getPropertyValue('margin-top')).toBe('')
    expect(d.style.getPropertyValue('padding-top')).toBe('2px')
    expect(d.style.cssText).toBe('padding: 2px')
  })

  test('a sheet rule parsed through insertRule expands', () => {
    const sheet = new CSSStyleSheet()
    sheet.insertRule('.a { margin: 3px }', 0)
    const rule = sheet.cssRules[0] as any
    expect(rule.style.getPropertyValue('margin-top')).toBe('3px')
  })
})
