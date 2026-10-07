/**
 * Grid layout.
 *
 * A grid container used to lay its children out as blocks, so they stacked
 * instead of being placed in cells.
 *
 * Every number here was read off Chrome for the same markup, across two passes
 * of cases — 51 measurements in all. The track sizing algorithm and the
 * auto-placement cursor both have behaviour that is easy to assume wrongly, and
 * two of these were wrong on the first attempt in ways no amount of re-reading
 * my own code would have surfaced.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { Window } from '../src/window/Window'
import { parseAreas, parseTrackList, sizeTracks } from '../src/layout/grid'

let window: Window
let document: any

beforeEach(() => {
  window = new Window()
  document = window.document
})

/**
 * Lay out a grid of `columns` holding `markup`, inside a 400px box.
 *
 * Fixed at 400 so the numbers do not depend on the default viewport.
 */
function grid(containerStyle: string, markup: string): (id: string) => { x: number, y: number, width: number, height: number } {
  document.body.innerHTML = `<div style="width:400px"><div style="display:grid;${containerStyle}">${markup}</div></div>`
  return (id: string) => {
    const element = document.getElementById(id)
    if (!element)
      throw new Error(`no #${id}`)
    const rect = element.getBoundingClientRect()
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    }
  }
}

/** Three 10px-tall cells, for sizing tests. */
const CELLS = '<div id="a" style="height:10px"></div><div id="b" style="height:10px"></div><div id="c" style="height:10px"></div>'

describe('track sizing', () => {
  test('fixed columns are used as given, and items wrap', () => {
    const box = grid('grid-template-columns:100px 150px', CELLS)

    expect(box('a')).toEqual({ x: 0, y: 0, width: 100, height: 10 })
    expect(box('b')).toEqual({ x: 100, y: 0, width: 150, height: 10 })
    expect(box('c')).toEqual({ x: 0, y: 10, width: 100, height: 10 })
  })

  test('fr tracks share the space in proportion', () => {
    const box = grid('grid-template-columns:1fr 2fr 1fr', CELLS)

    expect(box('a').width).toBe(100)
    expect(box('b')).toEqual({ x: 100, y: 0, width: 200, height: 10 })
    expect(box('c').x).toBe(300)
  })

  test('an fr track takes what a fixed one leaves', () => {
    const box = grid('grid-template-columns:100px 1fr', CELLS)

    expect(box('a').width).toBe(100)
    expect(box('b')).toEqual({ x: 100, y: 0, width: 300, height: 10 })
  })

  test('an fr track does not claim its content as a base size', () => {
    // `1fr` is `minmax(auto, 1fr)`. Treating that minimum as the item's
    // max-content let one auto-width child take the whole container before any
    // sharing out, and the fixed column then overflowed it.
    const box = grid('grid-template-columns:100px 1fr',
      '<div id="a" style="height:10px"></div><div id="b"><div style="height:10px"></div></div>')

    expect(box('b').width).toBe(300)
  })

  test('percentages resolve against the container', () => {
    const box = grid('grid-template-columns:25% 50%', CELLS)

    expect(box('a').width).toBe(100)
    expect(box('b')).toEqual({ x: 100, y: 0, width: 200, height: 10 })
  })

  test('minmax clamps to its maximum', () => {
    const box = grid('grid-template-columns:minmax(50px,80px) 1fr', CELLS)

    expect(box('a').width).toBe(80)
    expect(box('b').width).toBe(320)
  })

  test('an auto column takes its content\'s width', () => {
    const box = grid('grid-template-columns:auto 1fr',
      '<div id="a" style="width:70px;height:10px"></div><div id="b" style="height:10px"></div>')

    expect(box('a').width).toBe(70)
    expect(box('b')).toEqual({ x: 70, y: 0, width: 330, height: 10 })
  })

  test('auto columns share whatever is left when no fr track is there to', () => {
    // Only `auto` tracks stretch, and only when `justify-content` is `normal`.
    // Without this, two implicit columns reported no width at all.
    const box = grid('grid-auto-flow:column;grid-template-rows:20px 20px',
      '<div id="a"></div><div id="b"></div><div id="c"></div>')

    expect(box('a')).toEqual({ x: 0, y: 0, width: 200, height: 20 })
    expect(box('b')).toEqual({ x: 0, y: 20, width: 200, height: 20 })
    expect(box('c')).toEqual({ x: 200, y: 0, width: 200, height: 20 })
  })

  test('repeat() expands', () => {
    const box = grid('grid-template-columns:repeat(4, 1fr)', CELLS)
    expect(box('a').width).toBe(100)
    expect(box('c').x).toBe(200)
  })

  test('repeat(auto-fill, minmax(...)) fits as many as it can', () => {
    const box = grid('grid-template-columns:repeat(auto-fill, minmax(90px, 1fr))',
      `${CELLS}<div id="d" style="height:10px"></div><div id="e" style="height:10px"></div>`)

    // 400 / 90 is four columns, each stretched to 100 by its 1fr maximum.
    expect(box('a').width).toBe(100)
    expect(box('d')).toEqual({ x: 300, y: 0, width: 100, height: 10 })
    expect(box('e')).toEqual({ x: 0, y: 10, width: 100, height: 10 })
  })

  test('grid-auto-rows sizes the implicit rows', () => {
    const box = grid('grid-template-columns:1fr;grid-auto-rows:35px',
      '<div id="a"></div><div id="b"></div>')

    expect(box('a').height).toBe(35)
    expect(box('b')).toEqual({ x: 0, y: 35, width: 400, height: 35 })
  })

  test('an implicit row takes its tallest item\'s height', () => {
    const box = grid('grid-template-columns:1fr 1fr',
      '<div id="a" style="height:25px"></div><div id="b" style="height:40px"></div>'
      + '<div id="c" style="height:15px"></div>')

    expect(box('b').height).toBe(40)
    expect(box('c').y).toBe(40)
  })

  test('a row takes its height from a block child', () => {
    const box = grid('grid-template-columns:150px', '<div id="a"><div style="height:22px"></div></div>')
    expect(box('a')).toEqual({ x: 0, y: 0, width: 150, height: 22 })
  })
})

describe('placement', () => {
  test('grid-column spans from one line to another', () => {
    const box = grid('grid-template-columns:repeat(4, 1fr)',
      '<div id="a" style="grid-column:1 / 3;height:10px"></div>'
      + '<div id="b" style="height:10px"></div>'
      + '<div id="c" style="grid-column:span 2;height:10px"></div>')

    expect(box('a').width).toBe(200)
    expect(box('b')).toEqual({ x: 200, y: 0, width: 100, height: 10 })
    expect(box('c')).toEqual({ x: 0, y: 10, width: 200, height: 10 })
  })

  test('a negative line counts back from the end', () => {
    const box = grid('grid-template-columns:repeat(3, 1fr)',
      '<div id="a" style="grid-column:1 / -1;height:10px"></div><div id="b" style="height:10px"></div>')

    expect(box('a').width).toBe(400)
    expect(box('b')).toEqual({ x: 0, y: 10, width: 133, height: 10 })
  })

  test('an explicit row and column place an item exactly', () => {
    const box = grid('grid-template-columns:1fr 1fr;grid-template-rows:30px 50px',
      '<div id="a"></div><div id="b"></div><div id="c" style="grid-row:2;grid-column:1"></div>')

    expect(box('c')).toEqual({ x: 0, y: 30, width: 200, height: 50 })
  })

  test('a row span reaches across implicit rows', () => {
    const box = grid('grid-template-columns:1fr 1fr',
      '<div id="a" style="grid-row:span 2;height:10px"></div>'
      + '<div id="b" style="height:30px"></div><div id="c" style="height:40px"></div>')

    expect(box('a')).toEqual({ x: 0, y: 0, width: 200, height: 10 })
    expect(box('b')).toEqual({ x: 200, y: 0, width: 200, height: 30 })
    expect(box('c')).toEqual({ x: 200, y: 30, width: 200, height: 40 })
  })

  test('an item with only a column moves the auto-placement cursor', () => {
    // The third item lands on the next row, not in the hole the second one
    // skipped: placing an explicitly-columned item moves the shared cursor to
    // its column, so what follows starts looking from there. This was the
    // subtlest thing in the whole algorithm and it was wrong at first.
    const box = grid('grid-template-columns:repeat(3,1fr)',
      '<div id="a" style="height:10px"></div>'
      + '<div id="b" style="grid-column:3;height:10px"></div>'
      + '<div id="c" style="height:10px"></div>')

    expect(box('a')).toEqual({ x: 0, y: 0, width: 133, height: 10 })
    expect(box('b').x).toBe(267)
    expect(box('c')).toEqual({ x: 0, y: 10, width: 133, height: 10 })
  })

  test('grid-auto-flow: column fills down each column', () => {
    const box = grid('grid-auto-flow:column;grid-template-rows:20px 20px',
      '<div id="a"></div><div id="b"></div><div id="c"></div>')

    expect(box('b').y).toBe(20)
    expect(box('c')).toEqual({ x: 200, y: 0, width: 200, height: 20 })
  })

  test('an absolutely positioned child is not a grid item', () => {
    const box = grid('position:relative;grid-template-columns:1fr 1fr',
      '<div id="abs" style="position:absolute;top:3px;left:4px;width:10px;height:10px"></div>'
      + '<div id="a" style="height:10px"></div>')

    expect(box('a').x).toBe(0)
    expect(box('abs')).toEqual({ x: 4, y: 3, width: 10, height: 10 })
  })

  test('display: none takes no cell', () => {
    const box = grid('grid-template-columns:1fr 1fr',
      '<div style="display:none"></div><div id="a" style="height:10px"></div>')

    expect(box('a').x).toBe(0)
  })
})

describe('named areas', () => {
  test('a name spanning cells gives the item all of them', () => {
    const box = grid(
      'grid-template-areas:\'h h\' \'side main\';grid-template-columns:100px 1fr;grid-template-rows:40px 60px',
      '<div id="h" style="grid-area:h"></div>'
      + '<div id="side" style="grid-area:side"></div>'
      + '<div id="main" style="grid-area:main"></div>',
    )

    expect(box('h')).toEqual({ x: 0, y: 0, width: 400, height: 40 })
    expect(box('side')).toEqual({ x: 0, y: 40, width: 100, height: 60 })
    expect(box('main')).toEqual({ x: 100, y: 40, width: 300, height: 60 })
  })

  test('parseAreas reports the shape and the spans', () => {
    const parsed = parseAreas('"h h" "side main"')

    expect({ rows: parsed.rows, columns: parsed.columns }).toEqual({ rows: 2, columns: 2 })
    expect(parsed.areas.get('h')).toEqual({ columnStart: 0, columnEnd: 2, rowStart: 0, rowEnd: 1 })
    expect(parsed.areas.get('main')).toEqual({ columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 })
  })

  test('a dot leaves a cell empty', () => {
    const parsed = parseAreas('"a ." ". b"')

    expect(parsed.areas.has('.')).toBe(false)
    expect(parsed.areas.get('b')).toEqual({ columnStart: 1, columnEnd: 2, rowStart: 1, rowEnd: 2 })
  })
})

describe('alignment', () => {
  test('an item stretches to its area by default', () => {
    const box = grid('grid-template-columns:200px;grid-template-rows:100px', '<div id="a"></div>')
    expect(box('a')).toEqual({ x: 0, y: 0, width: 200, height: 100 })
  })

  test('justify-items and align-items move it within its area', () => {
    const box = grid('grid-template-columns:200px;grid-template-rows:100px;justify-items:center;align-items:end',
      '<div id="a" style="width:50px;height:20px"></div>')

    expect(box('a')).toEqual({ x: 75, y: 80, width: 50, height: 20 })
  })

  test('justify-content distributes the tracks themselves', () => {
    const box = grid('grid-template-columns:50px 50px;justify-content:space-between',
      '<div id="a" style="height:10px"></div><div id="b" style="height:10px"></div>')

    expect(box('a').x).toBe(0)
    expect(box('b').x).toBe(350)
  })

  test('align-content centres the rows in a definite height', () => {
    document.body.innerHTML = '<div style="width:400px">'
      + '<div style="display:grid;grid-template-rows:20px 20px;height:200px;align-content:center">'
      + '<div id="a"></div><div id="b"></div></div></div>'

    expect(Math.round(document.getElementById('a').getBoundingClientRect().y)).toBe(80)
    expect(Math.round(document.getElementById('b').getBoundingClientRect().y)).toBe(100)
  })

  test('margins sit inside the area', () => {
    const box = grid('grid-template-columns:200px;grid-template-rows:100px',
      '<div id="a" style="margin:10px 20px"></div>')

    expect(box('a')).toEqual({ x: 20, y: 10, width: 160, height: 80 })
  })
})

describe('nesting', () => {
  test('a grid inside a grid gets its own area to work in', () => {
    const box = grid('grid-template-columns:100px 1fr',
      '<div id="a" style="height:10px"></div>'
      + '<div id="outer" style="display:grid;grid-template-columns:1fr 1fr">'
      + '<div id="x" style="height:10px"></div><div id="y" style="height:10px"></div></div>')

    expect(box('outer').width).toBe(300)
    expect(box('x')).toEqual({ x: 100, y: 0, width: 150, height: 10 })
    expect(box('y').x).toBe(250)
  })

  test('inline-grid is as wide as its columns', () => {
    // Measured as a block it would be the widest child, which would squeeze
    // both columns into one column's width.
    const box = grid('grid-template-columns:1fr',
      '<div id="wrap"><div id="ig" style="display:inline-grid;grid-template-columns:60px 40px">'
      + '<div id="p" style="height:10px"></div><div id="q" style="height:10px"></div></div></div>')

    expect(box('ig').width).toBe(100)
    expect(box('p').width).toBe(60)
    expect(box('q').x).toBe(60)
  })
})

describe('the pieces on their own', () => {
  const resolve = (text: string): number | null => {
    const match = /^(-?[\d.]+)px$/.exec(text.trim())
    return match ? Number.parseFloat(match[1]) : null
  }

  test('parseTrackList reads the forms it supports', () => {
    const tracks = parseTrackList('100px 1fr auto minmax(10px, 2fr)', { resolve, available: 400, gap: 0 })

    expect(tracks).toHaveLength(4)
    expect(tracks[0].max).toEqual({ kind: 'length', px: 100 })
    expect(tracks[1].max).toEqual({ kind: 'fr', factor: 1 })
    expect(tracks[2].max).toEqual({ kind: 'auto' })
    expect(tracks[3]).toEqual({ min: { kind: 'length', px: 10 }, max: { kind: 'fr', factor: 2 } })
  })

  test('repeat(auto-fill) counts what fits, allowing for the gaps', () => {
    const tracks = parseTrackList('repeat(auto-fill, 90px)', { resolve, available: 400, gap: 10 })
    // 4 x 90 plus 3 x 10 is 390; a fifth would not fit.
    expect(tracks).toHaveLength(4)
  })

  test('named lines are parsed away rather than half-supported', () => {
    const tracks = parseTrackList('[start] 100px [mid] 1fr [end]', { resolve, available: 400, gap: 0 })
    expect(tracks).toHaveLength(2)
  })

  test('sizeTracks gives free space to fr, then to auto', () => {
    const fixed = { kind: 'length' as const, px: 100 }
    const fr = { kind: 'fr' as const, factor: 1 }
    const auto = { kind: 'auto' as const }

    expect(sizeTracks(
      [{ min: fixed, max: fixed }, { min: auto, max: fr }],
      { available: 400, gap: 0, contributions: [0, 0], stretchAuto: true },
    )).toEqual([100, 300])

    // No fr track, so the auto ones share it.
    expect(sizeTracks(
      [{ min: auto, max: auto }, { min: auto, max: auto }],
      { available: 400, gap: 0, contributions: [0, 0], stretchAuto: true },
    )).toEqual([200, 200])

    // Unless the distribution says otherwise, in which case they keep their
    // content size and `justify-content` moves them instead.
    expect(sizeTracks(
      [{ min: auto, max: auto }, { min: auto, max: auto }],
      { available: 400, gap: 0, contributions: [50, 50], stretchAuto: false },
    )).toEqual([50, 50])
  })
})

describe('dense packing', () => {
  // Sparse placement, the default, carries one cursor forward and never looks
  // behind it, so a hole a wide item left stays empty. `dense` starts each
  // item's search at the beginning instead. Both were sparse before.
  test('a later item goes back into an earlier hole', () => {
    const box = grid('grid-template-columns:repeat(3,1fr);grid-auto-flow:row dense',
      '<div id="a" style="grid-column:span 2;height:10px"></div>'
      + '<div id="b" style="grid-column:span 2;height:10px"></div>'
      + '<div id="c" style="height:10px"></div>')

    expect(box('b').y).toBe(10)
    expect(box('c')).toEqual({ x: 267, y: 0, width: 133, height: 10 })
  })

  test('it finds a hole several rows back', () => {
    const box = grid('grid-template-columns:repeat(4,1fr);grid-auto-flow:row dense',
      '<div id="a" style="grid-column:span 3;height:10px"></div>'
      + '<div id="b" style="grid-column:span 4;height:10px"></div>'
      + '<div id="c" style="height:10px"></div>')

    expect(box('b').y).toBe(10)
    expect(box('c')).toEqual({ x: 300, y: 0, width: 100, height: 10 })
  })

  test('sparse placement, the default, leaves the hole alone', () => {
    const box = grid('grid-template-columns:repeat(3,1fr)',
      '<div id="a" style="grid-column:span 2;height:10px"></div>'
      + '<div id="b" style="grid-column:span 2;height:10px"></div>'
      + '<div id="c" style="height:10px"></div>')

    expect(box('c')).toEqual({ x: 267, y: 10, width: 133, height: 10 })
  })

  test('dense works down a column too', () => {
    const box = grid('grid-template-rows:repeat(3,20px);grid-auto-flow:column dense',
      '<div id="a" style="grid-row:span 2"></div>'
      + '<div id="b" style="grid-row:span 2"></div>'
      + '<div id="c"></div>')

    expect(box('b').x).toBe(200)
    expect(box('c')).toEqual({ x: 0, y: 40, width: 200, height: 20 })
  })
})

describe('what grid does not model', () => {

  test('an inline-level box sits on the text baseline of its line', () => {
    // It used to sit at the top, 5px above where Chrome puts it. Chrome says
    // 4.5 for this one; the font's ascent is estimated, so this is within a
    // third of a pixel rather than exact.
    document.body.innerHTML = '<div style="width:400px">'
      + '<div id="a" style="display:inline-block;width:50px;height:10px"></div></div>'

    const y = document.getElementById('a').getBoundingClientRect().y
    expect(Math.abs(y - 4.5)).toBeLessThan(0.3)
  })
})
