/**
 * Font-relative units, inheritance, and `calc()`.
 *
 * `em` used to fall back to automatic sizing, because resolving it needs the
 * inherited `font-size` chain and there was none: every element read its own
 * declared size and fell back to 16px. `calc()` did not parse at all.
 *
 * Every number here was read off Chrome for the same markup — 22 measurements,
 * all matching.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { Window } from '../src/window/Window'
import { resolveLength } from '../src/layout/length'

let window: Window
let document: any

beforeEach(() => {
  window = new Window()
  document = window.document
})

/** Lay out `markup` in a 400px box and return a size reader. */
function sized(markup: string): (id: string) => { width: number, height: number } {
  document.body.innerHTML = `<div style="width:400px">${markup}</div>`
  return (id: string) => {
    const element = document.getElementById(id)
    if (!element)
      throw new Error(`no #${id}`)
    const rect = element.getBoundingClientRect()
    return {
      width: Math.round(rect.width * 100) / 100,
      height: Math.round(rect.height * 100) / 100,
    }
  }
}

describe('em', () => {
  test('resolves against the default font size', () => {
    const box = sized('<div id="a" style="width:10em;height:1em"></div>')
    expect(box('a')).toEqual({ width: 160, height: 16 })
  })

  test('resolves against a size the element declares', () => {
    const box = sized('<div id="a" style="font-size:20px;width:10em;height:2em"></div>')
    expect(box('a')).toEqual({ width: 200, height: 40 })
  })

  test('resolves against a size the element inherits', () => {
    const box = sized('<div style="font-size:24px"><div id="a" style="width:5em;height:1em"></div></div>')
    expect(box('a')).toEqual({ width: 120, height: 24 })
  })

  test('inherits through more than one level', () => {
    const box = sized('<div style="font-size:30px"><div>'
      + '<div id="a" style="width:2em;height:1em"></div></div></div>')

    expect(box('a')).toEqual({ width: 60, height: 30 })
  })

  test('a nearer declaration wins over a further one', () => {
    const box = sized('<div style="font-size:30px"><div style="font-size:10px">'
      + '<div id="a" style="width:2em;height:1em"></div></div></div>')

    expect(box('a')).toEqual({ width: 20, height: 10 })
  })
})

describe('font-size itself', () => {
  test('an em in font-size is relative to the parent, not to itself', () => {
    // Which is what stops it being circular.
    const box = sized('<div style="font-size:10px">'
      + '<div id="a" style="font-size:2em;width:3em;height:1em"></div></div>')

    expect(box('a')).toEqual({ width: 60, height: 20 })
  })

  test('a percentage in font-size is relative to the parent too', () => {
    const box = sized('<div style="font-size:20px">'
      + '<div id="a" style="font-size:150%;width:2em;height:1em"></div></div>')

    expect(box('a')).toEqual({ width: 60, height: 30 })
  })

  test('the absolute-size keywords resolve', () => {
    const box = sized('<div id="a" style="font-size:large;width:2em;height:1em"></div>')
    expect(box('a')).toEqual({ width: 36, height: 18 })
  })

  test('rem ignores the parent and uses the root', () => {
    const box = sized('<div style="font-size:40px">'
      + '<div id="a" style="width:2rem;height:1rem"></div></div>')

    expect(box('a')).toEqual({ width: 32, height: 16 })
  })

  test('line-height inherits, and a bare number multiplies the font size', () => {
    const box = sized('<div style="font-size:20px;line-height:2">'
      + '<div id="a" style="width:200px">one line</div></div>')

    expect(box('a')).toEqual({ width: 200, height: 40 })
  })
})

describe('getComputedStyle agrees about what was inherited', () => {
  test('a child reports the font size it inherited', () => {
    // It reported 16px here while the layout pass sized the child's `em`
    // against 24 — the two resolutions drifting apart.
    document.body.innerHTML = '<div style="font-size:24px"><div id="a" style="width:5em">x</div></div>'
    const element = document.getElementById('a')

    expect(window.getComputedStyle(element).fontSize).toBe('24px')
    expect(Math.round(element.getBoundingClientRect().width)).toBe(120)
  })

  test('a property that does not inherit still falls back to its initial value', () => {
    document.body.innerHTML = '<div style="width:300px"><div id="a"></div></div>'
    // `width` is not inherited, so the child does not take 300px.
    expect(window.getComputedStyle(document.getElementById('a')).width).toBe('auto')
  })

  test('an explicit inherit takes the parent\'s value for any property', () => {
    document.body.innerHTML = '<div style="text-align:right"><div id="a" style="text-align:inherit"></div></div>'
    expect(window.getComputedStyle(document.getElementById('a')).textAlign).toBe('right')
  })
})

describe('calc', () => {
  const cases: Array<[string, number]> = [
    ['calc(100% - 50px)', 350],
    ['calc(50px + 25px)', 75],
    ['calc(100px * 2)', 200],
    ['calc(2 * 100px)', 200],
    ['calc(300px / 4)', 75],
    ['calc((50px + 50px) * 2)', 200],
    ['calc(100% / 3)', 133.33],
    ['calc(100% - calc(50px * 2))', 300],
    ['min(300px, 50%)', 200],
    ['max(100px, 40%)', 160],
    ['clamp(100px, 10%, 250px)', 100],
  ]

  for (const [expression, width] of cases) {
    test(expression, () => {
      const box = sized(`<div id="a" style="width:${expression};height:10px"></div>`)
      expect(box('a').width).toBeCloseTo(width, 1)
    })
  }

  test('subtraction associates left', () => {
    // 75, not 85: `(100 - 20) - 5` rather than `100 - (20 - 5)`.
    const box = sized('<div id="a" style="width:calc(100px - 20px - 5px);height:10px"></div>')
    expect(box('a').width).toBe(75)
  })

  test('a calc can mix a percentage with a font-relative length', () => {
    const box = sized('<div id="a" style="font-size:20px;width:calc(100% - 2em);height:10px"></div>')
    expect(box('a').width).toBe(360)
  })

  test('an expression without spaces around the minus is invalid, as in CSS', () => {
    // `calc(100%-20px)` is not a subtraction: `-20px` there is one signed
    // value, and the grammar requires whitespace around `+` and `-`. Chrome
    // throws the declaration away, so the width stays automatic.
    const box = sized('<div id="a" style="width:calc(100%-20px);height:10px"></div>')
    expect(box('a').width).toBe(400)
  })

  test('a division by zero is invalid', () => {
    const box = sized('<div id="a" style="width:calc(100px / 0);height:10px"></div>')
    expect(box('a').width).toBe(400)
  })

  test('multiplying two lengths is invalid', () => {
    const box = sized('<div id="a" style="width:calc(10px * 10px);height:10px"></div>')
    expect(box('a').width).toBe(400)
  })
})

describe('resolveLength on its own', () => {
  const basis = { basis: 200, viewportWidth: 1000, viewportHeight: 800, rootFontSize: 16, fontSize: 20 }

  test('the units it understands', () => {
    expect(resolveLength('10px', basis)).toBe(10)
    expect(resolveLength('50%', basis)).toBe(100)
    expect(resolveLength('2em', basis)).toBe(40)
    expect(resolveLength('2rem', basis)).toBe(32)
    expect(resolveLength('10vw', basis)).toBe(100)
    expect(resolveLength('10vh', basis)).toBe(80)
    expect(resolveLength('10vmin', basis)).toBe(80)
    expect(resolveLength('10vmax', basis)).toBe(100)
    expect(resolveLength('1in', basis)).toBe(96)
    expect(resolveLength('12pt', basis)).toBe(16)
  })

  test('auto, none and empty are unresolved rather than zero', () => {
    expect(resolveLength('auto', basis)).toBeNull()
    expect(resolveLength('none', basis)).toBeNull()
    expect(resolveLength('', basis)).toBeNull()
  })

  test('an unmodelled unit is unresolved, not guessed at', () => {
    // `lh` and `cqw` are real units this does not resolve. Falling back to
    // automatic sizing is visible; inventing a number would not be.
    expect(resolveLength('2lh', basis)).toBeNull()
    expect(resolveLength('50cqw', basis)).toBeNull()
  })

  test('ex and ch are approximated, and that is a guess', () => {
    // Both need the font: `ex` is the x-height and `ch` the width of a zero.
    // Half the font size is the conventional fallback, and it is a fallback —
    // Chrome reports these against the real metrics of the real font.
    expect(resolveLength('2ex', basis)).toBe(20)
    expect(resolveLength('2ch', basis)).toBe(20)
  })
})
