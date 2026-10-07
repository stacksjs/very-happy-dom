/**
 * Text measurement.
 *
 * Text was measured as `length x font-size x 0.5` — every character the same
 * width. Against Chrome at 16px that was out by up to 50% in both directions:
 * `illiterate` came back half again too wide and `WWWW` almost half too narrow,
 * and anything sized by its text carried the error into everything below it.
 *
 * Real per-glyph advances, with kerning, bring that to under a tenth of a
 * percent for the three generic families. The numbers in `font-metrics.ts` were
 * measured out of Chrome and match the published Times New Roman, Arial and
 * Courier tables, which is why they are worth embedding rather than being one
 * machine's quirk.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { classifyFamily, isBoldWeight, measureText } from '../src/layout/font-metrics'
import { Window } from '../src/window/Window'

/** Chrome's own width for a string at 16px, measured in the browser. */
const CHROME_AT_16: Array<[string, 'serif' | 'sans', number]> = [
  ['Logo', 'serif', 33.77],
  ['One', 'serif', 26.66],
  ['Two', 'serif', 28.21],
  ['AVATAR', 'serif', 59.49],
  ['Walter', 'serif', 42.25],
  ['Trail 12', 'serif', 50.54],
  ['illiterate', 'serif', 53.30],
  ['WWWW', 'serif', 60.41],
  ['some words here', 'serif', 108.41],
  ['Logo', 'sans', 35.59],
  ['One', 'sans', 30.24],
  ['Two', 'sans', 29.35],
  ['AVATAR', 'sans', 59.30],
  ['Walter', 'sans', 45.64],
  ['Trail 12', 'sans', 52.77],
  ['illiterate', 'sans', 55.13],
  ['WWWW', 'sans', 60.41],
  ['some words here', 'sans', 122.72],
]

/** How far off a measurement is, as a fraction. */
function errorAgainst(measured: number, expected: number): number {
  return Math.abs(measured - expected) / expected
}

describe('measured against Chrome', () => {
  for (const [text, family, expected] of CHROME_AT_16) {
    test(`${family}: ${JSON.stringify(text)}`, () => {
      expect(errorAgainst(measureText(text, 16, family, false), expected)).toBeLessThan(0.001)
    })
  }

  test('the flat ratio it replaced was out by up to 50%', () => {
    // Recorded so the size of the change is visible, and so nobody is tempted
    // back to a single number.
    let worstFlat = 0
    let worstNow = 0

    for (const [text, family, expected] of CHROME_AT_16) {
      worstFlat = Math.max(worstFlat, errorAgainst(text.length * 16 * 0.5, expected))
      worstNow = Math.max(worstNow, errorAgainst(measureText(text, 16, family, false), expected))
    }

    expect(worstFlat).toBeGreaterThan(0.45)
    expect(worstNow).toBeLessThan(0.001)
  })
})

describe('advances', () => {
  test('width scales with the font size', () => {
    const at16 = measureText('Hello', 16, 'serif', false)
    expect(measureText('Hello', 32, 'serif', false)).toBeCloseTo(at16 * 2, 6)
    expect(measureText('Hello', 8, 'serif', false)).toBeCloseTo(at16 / 2, 6)
  })

  test('narrow and wide characters differ', () => {
    // The whole point: `i` is not `W`.
    expect(measureText('i', 16, 'serif', false)).toBeCloseTo(278 / 1000 * 16, 5)
    expect(measureText('W', 16, 'serif', false)).toBeCloseTo(944 / 1000 * 16, 5)
  })

  test('monospace gives every character the same width', () => {
    const one = measureText('i', 16, 'mono', false)
    expect(measureText('W', 16, 'mono', false)).toBe(one)
    expect(measureText('iWiW', 16, 'mono', false)).toBeCloseTo(one * 4, 6)
  })

  test('bold is wider than regular', () => {
    expect(measureText('Hello', 16, 'serif', true))
      .toBeGreaterThan(measureText('Hello', 16, 'serif', false))
  })

  test('empty text and a zero size measure nothing', () => {
    expect(measureText('', 16, 'serif', false)).toBe(0)
    expect(measureText('x', 0, 'serif', false)).toBe(0)
  })

  test('a character outside the table takes the family average', () => {
    // ASCII 32..126 is what the tables cover. Anything else — an accent, a
    // CJK glyph, an emoji — gets one number, which is the honest answer for a
    // table that does not have it.
    const average = measureText('é', 16, 'serif', false)
    expect(average).toBeCloseTo(500 / 1000 * 16, 5)
    expect(measureText('你', 16, 'serif', false)).toBe(average)
  })
})

describe('kerning', () => {
  test('a kerned pair is narrower than its parts', () => {
    const a = measureText('A', 16, 'serif', false)
    const v = measureText('V', 16, 'serif', false)

    expect(measureText('AV', 16, 'serif', false)).toBeLessThan(a + v)
    // Chrome: -129 thousandths of the em.
    expect(measureText('AV', 16, 'serif', false)).toBeCloseTo(a + v - 129 / 1000 * 16, 5)
  })

  test('an unkerned pair is exactly its parts', () => {
    const n = measureText('n', 16, 'serif', false)
    expect(measureText('nn', 16, 'serif', false)).toBeCloseTo(n * 2, 6)
  })

  test('a pair with a space on the left kerns', () => {
    // These are the entries the table has to parse carefully, since the pair
    // itself contains the separator the entries are split on.
    const space = measureText(' ', 16, 'serif', false)
    const a = measureText('A', 16, 'serif', false)
    expect(measureText(' A', 16, 'serif', false)).toBeCloseTo(space + a - 55 / 1000 * 16, 5)
  })

  test('the f ligatures come out as kerning', () => {
    const f = measureText('f', 16, 'serif', false)
    const i = measureText('i', 16, 'serif', false)
    expect(measureText('fi', 16, 'serif', false)).toBeCloseTo(f + i - 55 / 1000 * 16, 5)
  })

  test('monospace never kerns', () => {
    const a = measureText('A', 16, 'mono', false)
    const v = measureText('V', 16, 'mono', false)
    expect(measureText('AV', 16, 'mono', false)).toBeCloseTo(a + v, 6)
  })
})

describe('picking a table', () => {
  test('the generic keywords', () => {
    expect(classifyFamily('serif')).toBe('serif')
    expect(classifyFamily('sans-serif')).toBe('sans')
    expect(classifyFamily('monospace')).toBe('mono')
  })

  test('named fonts map onto their family', () => {
    expect(classifyFamily('Times New Roman')).toBe('serif')
    expect(classifyFamily('Georgia')).toBe('serif')
    expect(classifyFamily('Arial')).toBe('sans')
    expect(classifyFamily('Helvetica Neue')).toBe('sans')
    expect(classifyFamily('Courier New')).toBe('mono')
    expect(classifyFamily('Menlo')).toBe('mono')
  })

  test('the first recognised name in the list wins', () => {
    expect(classifyFamily('"Comic Papyrus", Arial, sans-serif')).toBe('sans')
    expect(classifyFamily('Menlo, monospace')).toBe('mono')
    // Quotes and spacing are stripped.
    expect(classifyFamily('  \'Times New Roman\' , serif ')).toBe('serif')
  })

  test('an unrecognised list falls back to serif, the initial value', () => {
    expect(classifyFamily('Nonesuch, Alsonothing')).toBe('serif')
    expect(classifyFamily('')).toBe('serif')
  })

  test('weights above 600 use the bold table', () => {
    expect(isBoldWeight('bold')).toBe(true)
    expect(isBoldWeight('700')).toBe(true)
    expect(isBoldWeight('600')).toBe(true)
    expect(isBoldWeight('normal')).toBe(false)
    expect(isBoldWeight('400')).toBe(false)
    expect(isBoldWeight('500')).toBe(false)
  })
})

describe('what layout does with it', () => {
  let window: Window
  let document: any

  beforeEach(() => {
    window = new Window()
    document = window.document
  })

  test('an inline-block is as wide as its text', () => {
    document.body.innerHTML = '<div style="width:400px">'
      + '<span id="a" style="display:inline-block">Logo</span></div>'

    // Chrome: 33.77.
    const width = document.getElementById('a').getBoundingClientRect().width
    expect(Math.abs(width - 33.77)).toBeLessThan(0.1)
  })

  test('font-family changes the measurement', () => {
    document.body.innerHTML = '<div style="width:400px">'
      + '<span id="a" style="display:inline-block;font-family:serif">Logo</span>'
      + '<span id="b" style="display:inline-block;font-family:sans-serif">Logo</span>'
      + '<span id="c" style="display:inline-block;font-family:monospace">Logo</span></div>'

    const width = (id: string): number => document.getElementById(id).getBoundingClientRect().width
    expect(Math.abs(width('a') - 33.77)).toBeLessThan(0.1)
    expect(Math.abs(width('b') - 35.59)).toBeLessThan(0.1)
    // Monospace: four glyphs at 602 thousandths.
    expect(width('c')).toBeCloseTo(4 * 602 / 1000 * 16, 5)
  })

  test('font-family is inherited for measurement', () => {
    document.body.innerHTML = '<div style="width:400px;font-family:monospace">'
      + '<span id="a" style="display:inline-block">Logo</span></div>'

    expect(document.getElementById('a').getBoundingClientRect().width)
      .toBeCloseTo(4 * 602 / 1000 * 16, 5)
  })

  test('bold text is wider, and that reaches the box', () => {
    document.body.innerHTML = '<div style="width:400px">'
      + '<span id="a" style="display:inline-block">Logo</span>'
      + '<span id="b" style="display:inline-block;font-weight:bold">Logo</span></div>'

    const width = (id: string): number => document.getElementById(id).getBoundingClientRect().width
    expect(width('b')).toBeGreaterThan(width('a'))
  })

  test('wrapping follows the real width, not a character count', () => {
    // 20 narrow characters fit on a line that 20 wide ones do not.
    document.body.innerHTML = '<div style="width:400px">'
      + `<div id="narrow" style="width:150px">${'i'.repeat(20)}</div>`
      + `<div id="wide" style="width:150px">${'W'.repeat(20)}</div></div>`

    const height = (id: string): number => document.getElementById(id).getBoundingClientRect().height
    expect(height('narrow')).toBeLessThan(height('wide'))
  })
})
