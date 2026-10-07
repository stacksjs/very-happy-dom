/**
 * Adjoining margin collapsing.
 *
 * Vertical margins that meet with nothing between them collapse into one, so
 * two stacked siblings with a 30px bottom margin and a 20px top margin end up
 * 30 apart rather than 50. They used to add up, which put everything below such
 * a pair further down than a browser would.
 *
 * Every number here was read off Chrome for the same markup. The rules have a
 * lot of corners — margins escaping a parent, borders and `overflow` stopping
 * them, a box with nothing in it collapsing through entirely — and each corner
 * is a place to be confidently wrong, so none of them were reasoned about.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { Window } from '../src/window/Window'
import { joinMargins, marginOf, marginValue, NO_MARGIN } from '../src/layout/margins'

let window: Window
let document: any

beforeEach(() => {
  window = new Window()
  document = window.document
})

/** Lay out `markup` and return a reader for each element's y and height. */
function render(markup: string): (id: string) => { y: number, height: number } {
  document.body.innerHTML = markup
  return (id: string) => {
    const element = document.getElementById(id)
    if (!element)
      throw new Error(`no #${id}`)
    const rect = element.getBoundingClientRect()
    return { y: Math.round(rect.y), height: Math.round(rect.height) }
  }
}

describe('the collapsed value', () => {
  test('two positives collapse to the larger', () => {
    const box = render('<div style="margin-bottom:30px;height:10px"></div>'
      + '<div id="b" style="margin-top:20px;height:10px"></div>')

    expect(box('b').y).toBe(40)
  })

  test('two negatives collapse to the more negative', () => {
    const box = render('<div style="margin-bottom:-10px;height:10px"></div>'
      + '<div id="b" style="margin-top:-20px;height:10px"></div>')

    expect(box('b').y).toBe(-10)
  })

  test('mixed signs add the largest positive to the most negative', () => {
    const box = render('<div style="margin-bottom:10px;height:10px"></div>'
      + '<div id="b" style="margin-top:-5px;height:10px"></div>')

    expect(box('b').y).toBe(15)
  })

  test('a run of three is not a running maximum', () => {
    // {10, -5, 20} collapses to 15, not 20: the largest positive plus the most
    // negative. Folding a single number pairwise would answer 20.
    const box = render('<div style="margin-bottom:10px;height:10px"></div>'
      + '<div style="margin-top:-5px;margin-bottom:20px"></div>'
      + '<div id="c" style="height:10px"></div>')

    expect(box('c').y).toBe(25)
  })
})

describe('a margin escaping its parent', () => {
  test('a first child\'s top margin collapses through the parent\'s top edge', () => {
    const box = render('<div style="height:10px"></div>'
      + '<div id="p"><div id="c" style="margin-top:40px;height:10px"></div></div>')

    // The parent moves down with the child rather than the margin sitting
    // inside it, so both report the same y.
    expect(box('p').y).toBe(50)
    expect(box('c').y).toBe(50)
    expect(box('p').height).toBe(10)
  })

  test('it comes up through more than one level', () => {
    const box = render('<div style="height:10px"></div>'
      + '<div id="p"><div><div id="c" style="margin-top:50px;height:10px"></div></div></div>')

    expect(box('p').y).toBe(60)
    expect(box('c').y).toBe(60)
  })

  test('a last child\'s bottom margin escapes, and is not in the parent\'s height', () => {
    const box = render('<div id="p"><div style="margin-bottom:25px;height:10px"></div></div>'
      + '<div id="after" style="height:10px"></div>')

    expect(box('p').height).toBe(10)
    expect(box('after').y).toBe(35)
  })

  test('a border on the parent stops the escape', () => {
    const box = render('<div style="height:10px"></div>'
      + '<div id="p" style="border-top:1px solid red">'
      + '<div id="c" style="margin-top:40px;height:10px"></div></div>')

    // The border separates the two margins, so the child's sits inside the
    // parent and the parent grows by it.
    expect(box('p').y).toBe(10)
    expect(box('p').height).toBe(51)
    expect(box('c').y).toBe(51)
  })

  test('padding on the parent stops it too', () => {
    const box = render('<div style="height:10px"></div>'
      + '<div id="p" style="padding-top:5px">'
      + '<div id="c" style="margin-top:40px;height:10px"></div></div>')

    expect(box('p').y).toBe(10)
    expect(box('c').y).toBe(55)
  })

  test('overflow other than visible stops it, which is the usual fix', () => {
    const box = render('<div style="height:10px"></div>'
      + '<div id="p" style="overflow:hidden">'
      + '<div id="c" style="margin-top:40px;height:10px"></div></div>')

    expect(box('p').y).toBe(10)
    expect(box('p').height).toBe(50)
    expect(box('c').y).toBe(50)
  })

  test('a definite height keeps the last child\'s bottom margin inside', () => {
    const box = render('<div id="p" style="height:30px">'
      + '<div style="margin-bottom:25px;height:10px"></div></div>'
      + '<div id="after" style="height:10px"></div>')

    expect(box('p').height).toBe(30)
    expect(box('after').y).toBe(30)
  })

  test('the root element\'s margins do not escape the document', () => {
    document.body.innerHTML = '<div id="a" style="margin-top:20px;height:10px"></div>'
    // The body is not moved out of the document by its child's margin.
    expect(Math.round(document.getElementById('a').getBoundingClientRect().y)).toBe(20)
  })
})

describe('a box that collapses through', () => {
  test('an empty box between two siblings leaves no trace of itself', () => {
    const box = render('<div style="margin-bottom:10px;height:10px"></div>'
      + '<div id="empty" style="margin-top:20px;margin-bottom:30px"></div>'
      + '<div id="after" style="height:10px"></div>')

    // Its top edge sits after the margins before it — 10 and 20 collapse to 20
    // — and the whole run of {10, 20, 30} then decides where `after` goes.
    expect(box('empty')).toEqual({ y: 30, height: 0 })
    expect(box('after').y).toBe(40)
  })

  test('a border stops it collapsing through', () => {
    const box = render('<div style="margin-bottom:10px;height:10px"></div>'
      + '<div id="mid" style="margin-top:20px;margin-bottom:30px;border-top:1px solid red"></div>'
      + '<div id="after" style="height:10px"></div>')

    expect(box('mid').height).toBe(1)
    expect(box('after').y).toBe(61)
  })
})

describe('what does not collapse', () => {
  test('a flex item keeps its child\'s margin inside it', () => {
    // A flex item is its own block formatting context, so the margin does not
    // escape. Chrome: the item is 18 tall (4 + 10 + 4) with the child 4 down.
    const box = render('<div style="display:flex">'
      + '<div id="item" style="flex:1"><p id="p" style="margin:4px 0;height:10px"></p></div></div>')

    expect(box('item')).toEqual({ y: 0, height: 18 })
    expect(box('p').y).toBe(4)
  })

  test('a grid item does too', () => {
    const box = render('<div style="display:grid">'
      + '<div id="item"><p id="p" style="margin:4px 0;height:10px"></p></div></div>')

    expect(box('item')).toEqual({ y: 0, height: 18 })
    expect(box('p').y).toBe(4)
  })

  test('a plain block in normal flow still lets it escape', () => {
    // The contrast that makes the two above meaningful: with no formatting
    // context in the way the margin passes through and moves the parent.
    const box = render('<div id="plain"><p id="p" style="margin:4px 0;height:10px"></p></div>')

    expect(box('plain')).toEqual({ y: 4, height: 10 })
    expect(box('p').y).toBe(4)
  })

  test('a line box between two margins separates them', () => {
    const box = render('<div style="margin-bottom:30px;height:10px"></div>text'
      + '<div id="after" style="margin-top:20px;height:10px"></div>')

    // 10 + 30 of margin, an 18.4px line, then 20 more. Chrome lands on 78.5
    // exactly; this reader rounds, and 78.398 rounds down where 78.5 rounds up.
    expect(box('after').y).toBe(78)
  })

  test('flex items never collapse', () => {
    const box = render('<div style="display:flex;flex-direction:column">'
      + '<div style="margin-bottom:30px;height:10px"></div>'
      + '<div id="b" style="margin-top:20px;height:10px"></div></div>')

    expect(box('b').y).toBe(60)
  })

  test('horizontal margins never collapse', () => {
    document.body.innerHTML = '<div style="width:100px"><div id="a" style="margin-left:10px;height:5px"></div></div>'
    expect(Math.round(document.getElementById('a').getBoundingClientRect().x)).toBe(10)
  })

  test('an absolutely positioned box is out of the run', () => {
    const box = render('<div style="margin-bottom:30px;height:10px"></div>'
      + '<div style="position:absolute;margin-top:100px;height:10px"></div>'
      + '<div id="after" style="margin-top:20px;height:10px"></div>')

    expect(box('after').y).toBe(40)
  })

  test('an inline-block is its own formatting context', () => {
    const box = render('<div style="height:10px"></div>'
      + '<div id="p" style="display:inline-block;width:100px">'
      + '<div id="c" style="margin-top:40px;height:10px"></div></div>')

    expect(box('c').y).toBe(50)
    expect(box('p').height).toBe(50)
  })
})

describe('the margin algebra', () => {
  test('a positive and a negative are kept apart', () => {
    const joined = joinMargins(marginOf(10), marginOf(-5))
    expect(joined).toEqual({ positive: 10, negative: -5 })
    expect(marginValue(joined)).toBe(5)
  })

  test('joining is associative, which a single number is not', () => {
    const left = joinMargins(joinMargins(marginOf(10), marginOf(-5)), marginOf(20))
    const right = joinMargins(marginOf(10), joinMargins(marginOf(-5), marginOf(20)))

    expect(marginValue(left)).toBe(15)
    expect(marginValue(right)).toBe(15)
  })

  test('nothing collapses to nothing', () => {
    expect(marginValue(joinMargins(NO_MARGIN, NO_MARGIN))).toBe(0)
    expect(marginValue(joinMargins(NO_MARGIN, marginOf(7)))).toBe(7)
  })
})
