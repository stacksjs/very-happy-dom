/**
 * Normal flow: the positions the layout pass computes.
 *
 * Every expectation here is what a real browser reports for the same markup,
 * except where a comment says otherwise — and those exceptions are the
 * documented gaps, asserted so they are visible rather than discovered.
 *
 * `test/box-metrics-parts.test.ts` covers the box model (which measurement
 * reports which part); this is about where boxes end up.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { Window } from '../src/window/Window'

let window: Window
let document: any

beforeEach(() => {
  window = new Window()
  document = window.document
})

/** Lay out `markup`, with `css` in a stylesheet, and return a box reader. */
function render(markup: string, css = ''): (id: string) => DOMRect {
  document.head.innerHTML = css ? `<style>${css}</style>` : ''
  document.body.innerHTML = markup
  return (id: string) => {
    const element = document.getElementById(id)
    if (!element)
      throw new Error(`no #${id}`)
    return element.getBoundingClientRect()
  }
}

/** The position and size that matter, as a comparable object. */
function at(rect: DOMRect): { x: number, y: number, width: number, height: number } {
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
}

describe('block flow', () => {
  test('a block with no width fills its containing block', () => {
    const box = render('<div id="a"></div>')
    // The viewport is 1024 wide, and that is the initial containing block.
    expect(at(box('a'))).toEqual({ x: 0, y: 0, width: 1024, height: 0 })
  })

  test('blocks stack in document order', () => {
    const box = render('<div id="a" style="height: 30px"></div>'
      + '<div id="b" style="height: 20px"></div>'
      + '<div id="c" style="height: 10px"></div>')

    expect(box('a').y).toBe(0)
    expect(box('b').y).toBe(30)
    expect(box('c').y).toBe(50)
  })

  test('a parent with no height takes its children\'s', () => {
    const box = render('<div id="p"><div style="height: 40px"></div><div style="height: 25px"></div></div>')
    expect(box('p').height).toBe(65)
  })

  test('padding and border on a parent offset its children', () => {
    const box = render('<div id="p" style="padding: 20px; border: 5px solid red">'
      + '<div id="c" style="height: 10px"></div></div>')

    expect(at(box('c'))).toEqual({ x: 25, y: 25, width: 974, height: 10 })
    expect(box('p').height).toBe(60)
  })

  test('margins move a box and push the next one down', () => {
    const box = render('<div id="a" style="height: 10px; margin: 15px"></div>'
      + '<div id="b" style="height: 10px"></div>')

    expect(box('a').x).toBe(15)
    expect(box('a').y).toBe(15)
    expect(box('a').width).toBe(1024 - 30)
    // 15 above + 10 tall + 15 below. A browser says 40 here too: these margins
    // are separated by a sibling's border box, so there is nothing to collapse.
    expect(box('b').y).toBe(40)
  })

  test('vertical margins do not collapse, which a browser does', () => {
    const box = render('<div style="margin-bottom: 30px; height: 10px"></div>'
      + '<div id="b" style="margin-top: 20px; height: 10px"></div>')

    // A browser collapses these to the larger of the two and reports y = 40.
    // Not implemented, so they add up. Asserted so the gap is visible rather
    // than surprising.
    expect(box('b').y).toBe(60)
  })

  test('a declared height wins over the content\'s', () => {
    const box = render('<div id="p" style="height: 5px"><div style="height: 100px"></div></div>'
      + '<div id="next"></div>')

    expect(box('p').height).toBe(5)
    // The overflowing child does not push the next sibling, as in a browser.
    expect(box('next').y).toBe(5)
  })

  test('min-height and max-height clamp the box', () => {
    const box = render('<div id="a" style="height: 5px; min-height: 40px"></div>'
      + '<div id="b" style="height: 500px; max-height: 50px"></div>')

    expect(box('a').height).toBe(40)
    expect(box('b').height).toBe(50)
    expect(box('b').y).toBe(40)
  })

  test('nesting accumulates offsets', () => {
    const box = render('<div style="padding: 10px"><div style="padding: 10px">'
      + '<div id="deep" style="height: 1px"></div></div></div>')

    expect(box('deep').x).toBe(20)
    expect(box('deep').y).toBe(20)
    expect(box('deep').width).toBe(1024 - 40)
  })
})

describe('inline flow', () => {
  test('inline-blocks sit side by side', () => {
    const box = render('<span id="a" style="display:inline-block;width:100px;height:20px"></span>'
      + '<span id="b" style="display:inline-block;width:80px;height:30px"></span>')

    expect(at(box('a'))).toEqual({ x: 0, y: 0, width: 100, height: 20 })
    expect(at(box('b'))).toEqual({ x: 100, y: 0, width: 80, height: 30 })
  })

  test('a block after a line starts below the tallest thing on it', () => {
    const box = render('<span style="display:inline-block;width:10px;height:20px"></span>'
      + '<span style="display:inline-block;width:10px;height:35px"></span>'
      + '<div id="after" style="height:5px"></div>')

    expect(box('after').y).toBe(35)
  })

  test('a line wraps when it runs out of room', () => {
    const box = render('<div style="width: 250px">'
      + '<span id="a" style="display:inline-block;width:100px;height:10px"></span>'
      + '<span id="b" style="display:inline-block;width:100px;height:10px"></span>'
      + '<span id="c" style="display:inline-block;width:100px;height:10px"></span>'
      + '</div>')

    expect(at(box('a'))).toEqual({ x: 0, y: 0, width: 100, height: 10 })
    expect(at(box('b'))).toEqual({ x: 100, y: 0, width: 100, height: 10 })
    expect(at(box('c'))).toEqual({ x: 0, y: 10, width: 100, height: 10 })
  })

  test('an inline box shrinks to fit rather than filling the line', () => {
    // `width` does not apply to a non-replaced inline box, and an inline-block
    // shrinks to fit. Filling the container the way a block does would report
    // an empty <span> as 1024 wide.
    const box = render('<span id="empty"></span><span id="ib" style="display:inline-block"></span>')

    expect(box('empty').width).toBe(0)
    expect(box('ib').width).toBe(0)
  })

  test('an inline box is as wide as its content', () => {
    const box = render('<div style="width: 400px">'
      + '<span id="s" style="display:inline-block">'
      + '<span style="display:inline-block;width:70px;height:5px"></span>'
      + '</span></div>')

    expect(box('s').width).toBe(70)
  })
})

describe('text', () => {
  test('text gives its container a height', () => {
    const box = render('<div id="a" style="width: 500px">a short line</div>')

    // No font engine, so the height is an estimate: one line at the default
    // 16px font and a 1.2 normal line-height.
    expect(box('a').height).toBeCloseTo(19.2, 5)
  })

  test('text wraps onto more lines as the box narrows', () => {
    const words = 'word '.repeat(40)
    const wide = render(`<div id="a" style="width: 1000px">${words}</div>`)('a').height
    const narrow = render(`<div id="a" style="width: 100px">${words}</div>`)('a').height

    expect(narrow).toBeGreaterThan(wide)
  })

  test('a larger font makes a taller line', () => {
    const small = render('<div id="a" style="width: 500px; font-size: 10px">hi</div>')('a').height
    const large = render('<div id="a" style="width: 500px; font-size: 40px">hi</div>')('a').height

    expect(large).toBeGreaterThan(small)
    expect(large).toBeCloseTo(48, 5)
  })

  test('line-height is honoured', () => {
    const box = render('<div id="a" style="width: 500px; font-size: 20px; line-height: 2">x</div>')
    expect(box('a').height).toBe(40)
  })

  test('whitespace-only text adds nothing', () => {
    const box = render('<div id="a" style="width: 100px">\n   \n</div>')
    expect(box('a').height).toBe(0)
  })
})

describe('positioning', () => {
  test('relative offsets move the box but not the flow', () => {
    const box = render('<div id="a" style="position:relative;top:15px;left:25px;height:20px"></div>'
      + '<div id="b" style="height:10px"></div>')

    expect(box('a').x).toBe(25)
    expect(box('a').y).toBe(15)
    // The next sibling sits where it would have without the offset.
    expect(box('b').y).toBe(20)
  })

  test('a relative offset carries the subtree with it', () => {
    const box = render('<div style="position:relative;top:10px;left:10px">'
      + '<div id="c" style="height:5px"></div></div>')

    expect(box('c').x).toBe(10)
    expect(box('c').y).toBe(10)
  })

  test('right and bottom offset the other way', () => {
    const box = render('<div id="a" style="position:relative;right:30px;bottom:5px;height:10px"></div>')
    expect(box('a').x).toBe(-30)
    expect(box('a').y).toBe(-5)
  })

  test('absolute is taken out of flow and placed against a positioned ancestor', () => {
    const box = render('<div style="height: 40px"></div>'
      + '<div id="anchor" style="position:relative;height:100px">'
      + '<div id="abs" style="position:absolute;top:10px;left:30px;width:40px;height:40px"></div>'
      + '</div><div id="next" style="height:10px"></div>')

    expect(at(box('abs'))).toEqual({ x: 30, y: 50, width: 40, height: 40 })
    // It reserved no space, so `next` sits right after the anchor.
    expect(box('next').y).toBe(140)
  })

  test('an unpositioned parent is skipped for the nearest positioned ancestor', () => {
    const box = render('<div id="anchor" style="position:relative;top:0;height:50px;padding:5px">'
      + '<div style="height:10px"><div id="abs" style="position:absolute;top:0;left:0;width:5px;height:5px"></div></div>'
      + '</div>')

    // Measured from the anchor's padding box, not the plain <div> in between.
    expect(box('abs').x).toBe(0)
    expect(box('abs').y).toBe(0)
  })

  test('right and bottom place an absolute box from the far edges', () => {
    const box = render('<div id="anchor" style="position:relative;width:200px;height:100px">'
      + '<div id="abs" style="position:absolute;right:0;bottom:0;width:20px;height:10px"></div>'
      + '</div>')

    expect(box('abs').x).toBe(180)
    expect(box('abs').y).toBe(90)
  })

  test('fixed is placed against the viewport', () => {
    const box = render('<div style="height: 300px"></div>'
      + '<div id="f" style="position:fixed;top:5px;left:7px;width:10px;height:10px"></div>')

    expect(box('f').x).toBe(7)
    expect(box('f').y).toBe(5)
  })
})

describe('percentages and units', () => {
  test('a percentage width resolves against the containing block', () => {
    const box = render('<div style="width: 400px"><div id="c" style="width: 25%"></div></div>')
    expect(box('c').width).toBe(100)
  })

  test('a percentage height resolves against a definite containing height', () => {
    const box = render('<div style="height: 200px"><div id="c" style="height: 30%"></div></div>')
    expect(box('c').height).toBe(60)
  })

  test('a percentage height against an auto parent is auto', () => {
    // A fraction of something indefinite is not a number, so the box takes its
    // content's height — which a browser does too.
    const box = render('<div><div id="c" style="height: 50%"></div></div>')
    expect(box('c').height).toBe(0)
  })

  test('viewport units resolve against the viewport', () => {
    const box = render('<div id="a" style="width: 50vw; height: 25vh"></div>')
    expect(box('a').width).toBe(512)
    expect(box('a').height).toBe(192)
  })

  test('rem resolves against the root font size', () => {
    const box = render('<div id="a" style="width: 3rem; height: 1rem"></div>')
    expect(box('a').width).toBe(48)
    expect(box('a').height).toBe(16)
  })

  test('absolute units convert to pixels', () => {
    const box = render('<div id="a" style="width: 1in; height: 12pt"></div>')
    expect(box('a').width).toBe(96)
    expect(box('a').height).toBe(16)
  })

  test('an unsupported unit falls back to automatic sizing', () => {
    // `em` needs the inherited font-size chain, which is not modelled.
    // Degrading to `auto` is better than reporting a wrong number.
    const box = render('<div id="a" style="width: 10em"></div>')
    expect(box('a').width).toBe(1024)
  })
})

describe('display', () => {
  test('display: none removes the box and takes no space', () => {
    const box = render('<div style="display:none;height:50px"></div><div id="b" style="height:10px"></div>')
    expect(box('b').y).toBe(0)
  })

  test('a hidden subtree has no boxes', () => {
    const box = render('<div style="display:none"><div id="c" style="height:10px"></div></div>')
    expect(at(box('c'))).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })

  test('visibility: hidden keeps its space', () => {
    const box = render('<div style="visibility:hidden;height:40px"></div><div id="b"></div>')
    expect(box('b').y).toBe(40)
  })

  test('a <style> or <script> in the body occupies nothing', () => {
    const box = render('<style>.x{color:red}</style><script>var a = 1</script>'
      + '<div id="b" style="height:10px"></div>')
    expect(box('b').y).toBe(0)
  })

  test('flex children stack, which a browser puts in a row', () => {
    // Not implemented. A flex container lays its children out as blocks, so
    // they stack vertically. Asserted so the gap is visible: this is the
    // biggest difference from a browser, and most app markup is flex.
    const box = render('<div style="display:flex">'
      + '<div id="a" style="width:50px;height:10px"></div>'
      + '<div id="b" style="width:50px;height:10px"></div>'
      + '</div>')

    expect(box('a').y).toBe(0)
    expect(box('b').y).toBe(10)
  })
})

describe('offsetTop, offsetLeft and offsetParent', () => {
  test('offsets are measured from the nearest positioned ancestor', () => {
    document.body.innerHTML = '<div id="anchor" style="position:relative;top:100px;left:50px;padding:10px">'
      + '<div id="child" style="height:5px;margin-top:7px"></div></div>'

    const child = document.getElementById('child')
    expect(child.offsetParent).toBe(document.getElementById('anchor'))
    // From the anchor's padding edge: its 10px padding plus the child's margin.
    expect(child.offsetTop).toBe(17)
    expect(child.offsetLeft).toBe(10)
  })

  test('with nothing positioned, offsets are measured from the body', () => {
    document.body.innerHTML = '<div style="height:30px"></div><div id="b" style="height:5px"></div>'

    const b = document.getElementById('b')
    expect(b.offsetParent).toBe(document.body)
    expect(b.offsetTop).toBe(30)
  })

  test('the body and a hidden element have no offsetParent', () => {
    document.body.innerHTML = '<div id="h" style="display:none"></div>'

    expect(document.body.offsetParent).toBeNull()
    expect(document.getElementById('h').offsetParent).toBeNull()
  })
})

describe('scrollWidth and scrollHeight', () => {
  test('they are at least the padding box', () => {
    document.body.innerHTML = '<div id="a" style="width:100px;height:40px;padding:5px"></div>'
    const a = document.getElementById('a')

    expect(a.scrollWidth).toBe(110)
    expect(a.scrollHeight).toBe(50)
  })

  test('content taller than the box extends the scroll height', () => {
    document.body.innerHTML = '<div id="a" style="width:100px;height:20px">'
      + '<div style="height:200px"></div></div>'

    expect(document.getElementById('a').scrollHeight).toBe(200)
  })
})

describe('hit testing', () => {
  test('a point finds the element drawn there', () => {
    document.body.innerHTML = '<div id="top" style="height:50px"></div><div id="bottom" style="height:50px"></div>'

    expect(document.elementFromPoint(5, 5).id).toBe('top')
    expect(document.elementFromPoint(5, 60).id).toBe('bottom')
  })

  test('the innermost box wins, and the list runs outward', () => {
    document.body.innerHTML = '<div id="outer" style="padding:20px">'
      + '<div id="inner" style="height:20px"></div></div>'

    expect(document.elementFromPoint(50, 30).id).toBe('inner')
    expect(document.elementsFromPoint(50, 30).map((e: any) => e.id || e.tagName))
      .toEqual(['inner', 'outer', 'BODY', 'HTML'])
  })

  test('a later sibling paints over an earlier one', () => {
    document.body.innerHTML = '<div id="under" style="position:relative;height:50px"></div>'
      + '<div id="over" style="position:relative;top:-50px;height:50px"></div>'

    expect(document.elementFromPoint(5, 5).id).toBe('over')
  })

  test('display: none is not hit', () => {
    document.body.innerHTML = '<div id="gone" style="display:none;height:50px"></div>'
      + '<div id="real" style="height:50px"></div>'

    expect(document.elementFromPoint(5, 5).id).toBe('real')
  })

  test('visibility: hidden is not hit, but what is behind it is', () => {
    document.body.innerHTML = '<div id="ghost" style="position:relative;visibility:hidden;height:50px"></div>'

    // The hidden box still occupies its space, so <body> covers the point and
    // answers for it — which is what a browser says too.
    expect(document.elementFromPoint(5, 5).tagName).toBe('BODY')
    expect(document.elementsFromPoint(5, 5).map((e: any) => e.id).filter(Boolean)).not.toContain('ghost')
  })

  test('pointer-events: none is not hit', () => {
    document.body.innerHTML = '<div id="through" style="position:relative;pointer-events:none;height:50px"></div>'
      + '<div id="under" style="position:relative;top:-50px;height:50px"></div>'

    expect(document.elementFromPoint(5, 5).id).toBe('under')
  })

  test('a point past the content still finds the root', () => {
    document.body.innerHTML = '<div style="height:10px"></div>'
    // The root's background paints the whole canvas, so a browser answers
    // <html> for empty space inside the viewport.
    expect(document.elementFromPoint(5, 700).tagName).toBe('HTML')
  })

  test('a point outside the viewport finds nothing', () => {
    document.body.innerHTML = '<div style="height:10px"></div>'
    expect(document.elementFromPoint(5, 5000)).toBeNull()
    expect(document.elementFromPoint(-1, 5)).toBeNull()
  })
})

describe('scrolling is taken off the rect', () => {
  test('an ancestor\'s scroll offset moves the box', () => {
    document.body.innerHTML = '<div id="scroller" style="height:100px">'
      + '<div id="c" style="height:20px;margin-top:50px"></div></div>'

    const before = document.getElementById('c').getBoundingClientRect().y
    expect(before).toBe(50)

    document.getElementById('scroller').scrollTop = 30
    // getBoundingClientRect is measured from the viewport, so scrolling the
    // ancestor brings the child up.
    expect(document.getElementById('c').getBoundingClientRect().y).toBe(20)
  })
})
