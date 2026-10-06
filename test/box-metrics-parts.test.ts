/**
 * The box metrics report the part of the box each one names.
 *
 * They all used to return the content width: an element's own padding and
 * border went unreported, so `width: 100px; padding: 10px` answered 100 where
 * every browser answers 120. `offsetWidth` is a border-box measurement,
 * `clientWidth` a padding-box one, and `clientTop` is the top border — three
 * different numbers that were one.
 *
 * `display: none` is handled here too. A declared size used to be reported for
 * an element that generates no box at all.
 *
 * Position is computed too, as of the layout pass. The cases at the bottom
 * check the two stay separate: a margin moves a box without being counted in
 * any of its measurements.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { Window } from '../src/window/Window'

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

describe('padding and border reach the measurements', () => {
  test('offsetWidth and clientWidth include the padding', () => {
    const el = styled('.b { width: 100px; height: 40px; padding: 10px }', '<div class="b"></div>')

    // content-box is the initial value, so the declared size is the content.
    expect(el.offsetWidth).toBe(120)
    expect(el.offsetHeight).toBe(60)
    expect(el.clientWidth).toBe(120)
    expect(el.clientHeight).toBe(60)
  })

  test('only offsetWidth includes the border', () => {
    const el = styled(
      '.b { width: 100px; height: 40px; padding: 10px; border: 2px solid red }',
      '<div class="b"></div>',
    )

    expect(el.offsetWidth).toBe(124)
    expect(el.offsetHeight).toBe(64)
    // The padding box stops at the border.
    expect(el.clientWidth).toBe(120)
    expect(el.clientHeight).toBe(60)
  })

  test('clientTop and clientLeft are the border widths', () => {
    const el = styled(
      '.b { width: 100px; border-top: 4px solid red; border-left: 7px solid red }',
      '<div class="b"></div>',
    )

    expect(el.clientTop).toBe(4)
    expect(el.clientLeft).toBe(7)
  })

  test('the rect is the border box, like offsetWidth', () => {
    const el = styled(
      '.b { width: 100px; height: 40px; padding: 5px; border: 1px solid red }',
      '<div class="b"></div>',
    )

    const rect = el.getBoundingClientRect()
    expect(rect.width).toBe(112)
    expect(rect.height).toBe(52)
    expect(rect.width).toBe(el.offsetWidth)
    expect(rect.height).toBe(el.offsetHeight)
  })

  test('asymmetric padding is summed per axis', () => {
    const el = styled('.b { width: 100px; height: 10px; padding: 1px 2px 3px 4px }', '<div class="b"></div>')

    expect(el.offsetWidth).toBe(106)
    expect(el.offsetHeight).toBe(14)
  })

  test('a border alone gives a sizeless element a box', () => {
    const el = styled('.b { width: 100px; border: 5px solid red }', '<div class="b"></div>')

    expect(el.offsetWidth).toBe(110)
    // No declared height, so the border is all there is.
    expect(el.offsetHeight).toBe(10)
  })

  test('an inline padding declaration counts too', () => {
    document.body.innerHTML = '<div style="width: 50px; padding: 3px"></div>'
    const el = document.body.firstElementChild

    expect(el.offsetWidth).toBe(56)
  })
})

describe('box-sizing decides how the declared size is read', () => {
  test('border-box takes the padding and border out of the content', () => {
    const el = styled(
      '.b { box-sizing: border-box; width: 100px; height: 40px; padding: 10px; border: 2px solid red }',
      '<div class="b"></div>',
    )

    // The declared size IS the border box.
    expect(el.offsetWidth).toBe(100)
    expect(el.offsetHeight).toBe(40)
    expect(el.clientWidth).toBe(96)
    expect(el.clientHeight).toBe(36)
  })

  test('border-box never drives the content below zero', () => {
    const el = styled('.b { box-sizing: border-box; width: 10px; padding: 40px }', '<div class="b"></div>')

    // The padding alone exceeds the declared width, so the content collapses
    // and the box is the padding.
    expect(el.clientWidth).toBe(80)
    expect(el.offsetWidth).toBe(80)
  })

  test('content-box is the default', () => {
    const el = styled('.b { width: 100px; padding: 10px }', '<div class="b"></div>')
    expect(el.offsetWidth).toBe(120)
  })
})

describe('a border only counts when it has a style', () => {
  test('border-style none means no border, whatever the width', () => {
    const el = styled('.b { width: 100px; border: 5px none red }', '<div class="b"></div>')

    expect(el.offsetWidth).toBe(100)
    expect(el.clientTop).toBe(0)
  })

  test('border-style hidden means no border either', () => {
    const el = styled('.b { width: 100px; border: 5px hidden red }', '<div class="b"></div>')
    expect(el.offsetWidth).toBe(100)
  })

  test('a declared width with no style at all is not a border', () => {
    // `border-width` on its own leaves `border-style` at `none`.
    const el = styled('.b { width: 100px; border-width: 5px }', '<div class="b"></div>')
    expect(el.offsetWidth).toBe(100)
  })

  test('the width keywords resolve to pixels', () => {
    const thin = styled('.b { width: 100px; border: thin solid red }', '<div class="b"></div>')
    expect(thin.offsetWidth).toBe(102)

    const medium = styled('.b { width: 100px; border: medium solid red }', '<div class="b"></div>')
    expect(medium.offsetWidth).toBe(106)

    const thick = styled('.b { width: 100px; border: thick solid red }', '<div class="b"></div>')
    expect(thick.offsetWidth).toBe(110)
  })

  test('a styled border with no width is medium', () => {
    const el = styled('.b { width: 100px; border-style: solid }', '<div class="b"></div>')
    expect(el.offsetWidth).toBe(106)
  })
})

describe('display: none generates no box', () => {
  test('a declared size is not reported', () => {
    const el = styled('.b { width: 100px; height: 40px; display: none }', '<div class="b"></div>')

    expect(el.offsetWidth).toBe(0)
    expect(el.offsetHeight).toBe(0)
    expect(el.clientWidth).toBe(0)
    expect(el.clientHeight).toBe(0)
    expect(el.getBoundingClientRect().width).toBe(0)
    expect(el.getClientRects()).toEqual([])
  })

  test('a hidden ancestor hides the whole subtree', () => {
    document.body.innerHTML = '<div style="display: none"><div id="k" style="width: 50px; height: 50px"></div></div>'
    const kid = document.getElementById('k')

    expect(kid.offsetWidth).toBe(0)
    expect(kid.offsetHeight).toBe(0)
    expect(kid.getClientRects()).toEqual([])
  })

  test('an inline display: none counts', () => {
    document.body.innerHTML = '<div style="width: 100px; display: none"></div>'
    expect(document.body.firstElementChild.offsetWidth).toBe(0)
  })

  test('visibility: hidden keeps its space, as it does in a browser', () => {
    const el = styled('.b { width: 100px; height: 40px; visibility: hidden }', '<div class="b"></div>')

    expect(el.offsetWidth).toBe(100)
    expect(el.offsetHeight).toBe(40)
    expect(el.getClientRects()).toHaveLength(1)
  })

  test('opacity: 0 keeps its space too', () => {
    const el = styled('.b { width: 100px; height: 40px; opacity: 0 }', '<div class="b"></div>')
    expect(el.offsetWidth).toBe(100)
  })

  test('display is read through the cascade, not only the inline style', () => {
    const el = styled('.b { display: none } .b { width: 100px }', '<div class="b"></div>')
    expect(el.offsetWidth).toBe(0)
  })

  // Resolving `display` for every ancestor means matching every rule against
  // each one, which dominated the cost of a box read. The sheets are asked
  // first whether any rule declares `display` at all, and only then is the
  // cascade consulted per ancestor. These two cover that branch: without it an
  // ancestor hidden by a rule rather than inline would be missed.
  test('an ancestor hidden by a stylesheet rule hides the subtree', () => {
    document.head.innerHTML = '<style>.filler { color: red } .h { display: none }</style>'
    document.body.innerHTML = '<div class="h"><div id="k" style="width: 50px; height: 50px"></div></div>'

    expect(document.getElementById('k').offsetWidth).toBe(0)
  })

  test('an ancestor hidden inside a matching media block counts', () => {
    document.head.innerHTML = '<style>@media (min-width: 100px) { .h { display: none } }</style>'
    document.body.innerHTML = '<div class="h"><div id="k" style="width: 50px; height: 50px"></div></div>'

    expect(window.innerWidth).toBeGreaterThanOrEqual(100)
    expect(document.getElementById('k').offsetWidth).toBe(0)
  })

  test('a visible ancestor leaves the subtree alone', () => {
    document.head.innerHTML = '<style>.filler { color: red }</style>'
    document.body.innerHTML = '<div class="filler"><div id="k" style="width: 50px; height: 50px"></div></div>'

    expect(document.getElementById('k').offsetWidth).toBe(50)
  })
})

describe('getClientRects', () => {
  test('a rendered element has one box', () => {
    const el = styled('.b { width: 30px; height: 10px }', '<div class="b"></div>')
    const rects = el.getClientRects()

    expect(rects).toHaveLength(1)
    expect(rects[0].width).toBe(30)
    expect(rects[0].height).toBe(10)
  })

  test('an element outside a document has none', () => {
    const el = document.createElement('div')
    el.style.width = '30px'

    expect(el.getClientRects()).toEqual([])
    // The size itself is still reported, which is the older contract here: a
    // test measures elements it never appends.
    expect(el.offsetWidth).toBe(30)
  })
})

describe('position', () => {
  test('a margin moves the box without being part of it', () => {
    const el = styled('.b { width: 100px; margin-left: 50px; padding: 10px }', '<div class="b"></div>')

    const rect = el.getBoundingClientRect()
    expect({ x: rect.x, y: rect.y }).toEqual({ x: 50, y: 0 })
    expect(el.offsetLeft).toBe(50)
    expect(el.offsetTop).toBe(0)
  })

  test('margin is not part of any of these measurements', () => {
    const el = styled('.b { width: 100px; margin: 25px }', '<div class="b"></div>')

    // Correct: the margin sits outside the border box.
    expect(el.offsetWidth).toBe(100)
    expect(el.clientWidth).toBe(100)
  })
})
