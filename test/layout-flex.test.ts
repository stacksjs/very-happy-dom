/**
 * Flex layout.
 *
 * A flex container used to lay its children out as blocks, so they stacked
 * where a browser puts them in a row. That was the largest difference from a
 * browser there was, and most app markup is flex.
 *
 * The expectations here are what Chrome reports for the same markup. The
 * trickier cases — `wrap-reverse` with stretched lines, `align-content`
 * defaults, a header with a `flex: 1` spacer — were checked against a live
 * browser rather than reasoned about, because the spec's cross-axis reversing
 * is easy to get subtly wrong and a wrong number is worse than a missing one.
 *
 * Two differences remain and are asserted as such at the bottom: text is
 * measured by character count, so an item sized by its text is a few percent
 * out, and `baseline` falls back to `flex-start` because there are no font
 * baselines to align to.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { Window } from '../src/window/Window'

let window: Window
let document: any

beforeEach(() => {
  window = new Window()
  document = window.document
})

/** Lay out `markup` and return a reader for rounded box geometry. */
function render(markup: string, css = ''): (id: string) => { x: number, y: number, width: number, height: number } {
  document.head.innerHTML = css ? `<style>${css}</style>` : ''
  document.body.innerHTML = markup
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

/** Two boxes of a given width, in a row of a given width. */
function pair(containerStyle: string, itemStyle = 'width:50px;height:10px'): (id: string) => any {
  return render(`<div style="display:flex;${containerStyle}">`
    + `<div id="a" style="${itemStyle}"></div>`
    + `<div id="b" style="${itemStyle}"></div></div>`)
}

describe('a row', () => {
  test('items sit side by side', () => {
    const box = pair('width:300px')
    expect(box('a')).toEqual({ x: 0, y: 0, width: 50, height: 10 })
    expect(box('b')).toEqual({ x: 50, y: 0, width: 50, height: 10 })
  })

  test('the container takes the tallest item\'s height', () => {
    const box = render('<div id="box" style="display:flex">'
      + '<div style="width:10px;height:25px"></div>'
      + '<div style="width:10px;height:40px"></div></div>'
      + '<div id="after" style="height:5px"></div>')

    expect(box('box').height).toBe(40)
    expect(box('after').y).toBe(40)
  })

  test('the container\'s padding and border offset its items', () => {
    const box = render('<div style="display:flex;width:300px;padding:10px;border:5px solid red">'
      + '<div id="a" style="flex:1;height:10px"></div></div>')

    expect(box('a')).toEqual({ x: 15, y: 15, width: 300, height: 10 })
  })

  test('an item\'s margins count against the line', () => {
    const box = render('<div style="display:flex;width:300px">'
      + '<div id="a" style="flex:1;margin:0 20px;height:10px"></div>'
      + '<div id="b" style="flex:1;height:10px"></div></div>')

    expect(box('a')).toEqual({ x: 20, y: 0, width: 130, height: 10 })
    expect(box('b')).toEqual({ x: 170, y: 0, width: 130, height: 10 })
  })

  test('row-reverse lays the line out from the far end', () => {
    const box = pair('flex-direction:row-reverse;width:300px')
    expect(box('a').x).toBe(250)
    expect(box('b').x).toBe(200)
  })
})

describe('a column', () => {
  test('items stack and fill the cross axis', () => {
    const box = render('<div style="display:flex;flex-direction:column">'
      + '<div id="a" style="height:30px"></div>'
      + '<div id="b" style="height:20px"></div></div>')

    expect(box('a')).toEqual({ x: 0, y: 0, width: 1024, height: 30 })
    expect(box('b')).toEqual({ x: 0, y: 30, width: 1024, height: 20 })
  })

  test('grow shares a definite height', () => {
    const box = render('<div style="display:flex;flex-direction:column;height:300px">'
      + '<div id="a" style="flex:1"></div><div id="b" style="flex:2"></div></div>')

    expect(box('a').height).toBe(100)
    expect(box('b')).toEqual({ x: 0, y: 100, width: 1024, height: 200 })
  })

  test('column-reverse starts from the bottom', () => {
    const box = render('<div style="display:flex;flex-direction:column-reverse;height:100px">'
      + '<div id="a" style="height:20px"></div><div id="b" style="height:30px"></div></div>')

    expect(box('a').y).toBe(80)
    expect(box('b').y).toBe(50)
  })
})

describe('growing and shrinking', () => {
  test('flex: 1 shares the line in proportion', () => {
    const box = render('<div style="display:flex;width:300px">'
      + '<div id="a" style="flex:1;height:10px"></div>'
      + '<div id="b" style="flex:1;height:10px"></div>'
      + '<div id="c" style="flex:2;height:10px"></div></div>')

    expect(box('a').width).toBe(75)
    expect(box('b')).toEqual({ x: 75, y: 0, width: 75, height: 10 })
    expect(box('c')).toEqual({ x: 150, y: 0, width: 150, height: 10 })
  })

  test('flex: 1 ignores the declared width, because the basis becomes 0', () => {
    const box = render('<div style="display:flex;width:300px">'
      + '<div id="a" style="flex:1;width:280px;height:10px"></div>'
      + '<div id="b" style="flex:1;width:10px;height:10px"></div></div>')

    expect(box('a').width).toBe(150)
    expect(box('b').width).toBe(150)
  })

  test('flex: auto keeps the content as the basis and shares what is left', () => {
    const box = render('<div style="display:flex;width:300px">'
      + '<div id="a" style="flex:auto;width:100px;height:10px"></div>'
      + '<div id="b" style="flex:auto;width:50px;height:10px"></div></div>')

    // 150px of free space split equally on top of each basis.
    expect(box('a').width).toBe(175)
    expect(box('b').width).toBe(125)
  })

  test('items shrink to fit a line that is too narrow', () => {
    const box = render('<div style="display:flex;width:300px">'
      + '<div id="a" style="width:200px;height:10px"></div>'
      + '<div id="b" style="width:200px;height:10px"></div></div>')

    expect(box('a').width).toBe(150)
    expect(box('b').width).toBe(150)
  })

  test('shrinking stops at min-width', () => {
    const box = render('<div style="display:flex;width:200px">'
      + '<div id="a" style="width:200px;min-width:150px;height:10px"></div>'
      + '<div id="b" style="width:200px;height:10px"></div></div>')

    expect(box('a').width).toBe(150)
    expect(box('b')).toEqual({ x: 150, y: 0, width: 50, height: 10 })
  })

  test('flex-shrink: 0 overflows rather than shrinking', () => {
    const box = render('<div style="display:flex;width:100px">'
      + '<div id="a" style="width:200px;height:10px;flex-shrink:0"></div></div>')

    expect(box('a').width).toBe(200)
  })

  test('growing stops at max-width, and the rest goes elsewhere', () => {
    const box = render('<div style="display:flex;width:400px">'
      + '<div id="a" style="flex:1;max-width:100px;height:10px"></div>'
      + '<div id="b" style="flex:1;height:10px"></div></div>')

    expect(box('a').width).toBe(100)
    expect(box('b')).toEqual({ x: 100, y: 0, width: 300, height: 10 })
  })

  test('flex: none neither grows nor shrinks', () => {
    const box = render('<div style="display:flex;width:100px">'
      + '<div id="a" style="flex:none;width:150px;height:10px"></div></div>')

    expect(box('a').width).toBe(150)
  })

  test('a percentage flex-basis resolves against the container', () => {
    const box = render('<div style="display:flex;width:400px">'
      + '<div id="a" style="flex:0 0 25%;height:10px"></div>'
      + '<div id="b" style="flex:0 0 50%;height:10px"></div></div>')

    expect(box('a').width).toBe(100)
    expect(box('b')).toEqual({ x: 100, y: 0, width: 200, height: 10 })
  })
})

describe('justify-content', () => {
  const cases: Array<[string, number, number]> = [
    ['flex-start', 0, 50],
    ['flex-end', 200, 250],
    ['center', 100, 150],
    ['space-between', 0, 250],
    ['space-around', 50, 200],
  ]

  for (const [mode, firstX, secondX] of cases) {
    test(mode, () => {
      const box = pair(`width:300px;justify-content:${mode}`)
      expect(box('a').x).toBe(firstX)
      expect(box('b').x).toBe(secondX)
    })
  }

  test('space-evenly spreads the gaps equally', () => {
    const box = pair('width:300px;justify-content:space-evenly')
    // 200px of free space over three gaps.
    expect(box('a').x).toBe(67)
    expect(box('b').x).toBe(183)
  })

  test('with no free space the space-* values behave as flex-start', () => {
    const box = pair('width:100px;justify-content:space-between')
    expect(box('a').x).toBe(0)
    expect(box('b').x).toBe(50)
  })
})

describe('align-items and align-self', () => {
  const cases: Array<[string, number, number]> = [
    ['stretch', 0, 100],
    ['flex-start', 0, 0],
    ['flex-end', 100, 0],
    ['center', 50, 0],
  ]

  for (const [mode, y, height] of cases) {
    test(mode, () => {
      const box = render(`<div style="display:flex;height:100px;align-items:${mode}">`
        + '<div id="a" style="width:50px"></div></div>')

      expect(box('a').y).toBe(y)
      expect(box('a').height).toBe(height)
    })
  }

  test('stretch leaves an item that declared its cross size alone', () => {
    const box = render('<div style="display:flex;height:100px">'
      + '<div id="a" style="width:50px;height:20px"></div></div>')

    expect(box('a').height).toBe(20)
  })

  test('align-self overrides the container', () => {
    const box = render('<div style="display:flex;height:100px;align-items:flex-start">'
      + '<div id="a" style="width:10px;height:10px"></div>'
      + '<div id="b" style="width:10px;height:10px;align-self:flex-end"></div></div>')

    expect(box('a').y).toBe(0)
    expect(box('b').y).toBe(90)
  })
})

describe('wrapping', () => {
  test('a line breaks when the next item will not fit', () => {
    const box = render('<div style="display:flex;flex-wrap:wrap;width:120px">'
      + '<div id="a" style="width:50px;height:10px"></div>'
      + '<div id="b" style="width:50px;height:10px"></div>'
      + '<div id="c" style="width:50px;height:10px"></div></div>')

    expect(box('a')).toEqual({ x: 0, y: 0, width: 50, height: 10 })
    expect(box('b')).toEqual({ x: 50, y: 0, width: 50, height: 10 })
    expect(box('c')).toEqual({ x: 0, y: 10, width: 50, height: 10 })
  })

  test('nowrap keeps one line however much it overflows', () => {
    const box = render('<div style="display:flex;width:60px">'
      + '<div id="a" style="width:50px;flex-shrink:0;height:10px"></div>'
      + '<div id="b" style="width:50px;flex-shrink:0;height:10px"></div></div>')

    expect(box('b')).toEqual({ x: 50, y: 0, width: 50, height: 10 })
  })

  test('lines stretch to fill a definite cross size, which is the default', () => {
    // Verified against Chrome: align-content defaults to stretch, so two 10px
    // lines in a 100px container become 50px apart.
    const box = render('<div style="display:flex;flex-wrap:wrap;width:100px;height:100px">'
      + '<div id="a" style="width:100px;height:10px"></div>'
      + '<div id="b" style="width:100px;height:10px"></div></div>')

    expect(box('a').y).toBe(0)
    expect(box('b').y).toBe(50)
  })

  test('align-content: flex-end packs the lines at the far edge', () => {
    const box = render('<div style="display:flex;flex-wrap:wrap;width:100px;height:100px;align-content:flex-end">'
      + '<div id="a" style="width:100px;height:10px"></div>'
      + '<div id="b" style="width:100px;height:10px"></div></div>')

    expect(box('a').y).toBe(80)
    expect(box('b').y).toBe(90)
  })

  test('wrap-reverse mirrors the cross axis', () => {
    // Verified against Chrome. The lines still stretch, and then the whole
    // cross axis is flipped, which is why these are 90 and 40 rather than
    // 90 and 80.
    const box = render('<div style="display:flex;flex-wrap:wrap-reverse;width:100px;height:100px">'
      + '<div id="a" style="width:100px;height:10px"></div>'
      + '<div id="b" style="width:100px;height:10px"></div></div>')

    expect(box('a').y).toBe(90)
    expect(box('b').y).toBe(40)
  })
})

describe('gap', () => {
  test('column-gap separates items in a row', () => {
    const box = pair('gap:10px')
    expect(box('b').x).toBe(60)
  })

  test('row-gap separates lines', () => {
    const box = render('<div style="display:flex;flex-wrap:wrap;width:100px;row-gap:8px">'
      + '<div id="a" style="width:100px;height:10px"></div>'
      + '<div id="b" style="width:100px;height:10px"></div></div>')

    expect(box('b').y).toBe(18)
  })

  test('a gap counts against the space available to grow into', () => {
    const box = render('<div style="display:flex;width:300px;gap:20px">'
      + '<div id="a" style="flex:1;height:10px"></div>'
      + '<div id="b" style="flex:1;height:10px"></div></div>')

    expect(box('a').width).toBe(140)
    expect(box('b')).toEqual({ x: 160, y: 0, width: 140, height: 10 })
  })

  test('a gap in a column separates along the main axis', () => {
    const box = render('<div style="display:flex;flex-direction:column;gap:12px">'
      + '<div id="a" style="height:10px"></div><div id="b" style="height:10px"></div></div>')

    expect(box('b').y).toBe(22)
  })
})

describe('order', () => {
  test('a higher order moves an item later', () => {
    const box = render('<div style="display:flex">'
      + '<div id="a" style="order:2;width:50px;height:10px"></div>'
      + '<div id="b" style="order:1;width:50px;height:10px"></div></div>')

    expect(box('a').x).toBe(50)
    expect(box('b').x).toBe(0)
  })

  test('items sharing an order keep document order', () => {
    const box = render('<div style="display:flex">'
      + '<div id="a" style="width:10px;height:10px"></div>'
      + '<div id="b" style="width:10px;height:10px"></div>'
      + '<div id="c" style="order:-1;width:10px;height:10px"></div></div>')

    expect(box('c').x).toBe(0)
    expect(box('a').x).toBe(10)
    expect(box('b').x).toBe(20)
  })
})

describe('what is and is not a flex item', () => {
  test('display: none is not laid out and takes no room', () => {
    const box = render('<div style="display:flex">'
      + '<div style="display:none;width:100px;height:10px"></div>'
      + '<div id="b" style="width:50px;height:10px"></div></div>')

    expect(box('b').x).toBe(0)
  })

  test('an absolutely positioned child is not a flex item', () => {
    const box = render('<div id="box" style="display:flex;position:relative;width:300px">'
      + '<div id="abs" style="position:absolute;top:5px;left:7px;width:10px;height:10px"></div>'
      + '<div id="b" style="width:50px;height:10px"></div></div>')

    // It takes no room on the line, and is placed against the container.
    expect(box('b').x).toBe(0)
    expect(box('abs')).toEqual({ x: 7, y: 5, width: 10, height: 10 })
  })

  test('an inline child becomes a block-level flex item', () => {
    const box = render('<div style="display:flex;width:300px">'
      + '<span id="a" style="width:60px;height:10px"></span>'
      + '<span id="b" style="width:40px;height:10px"></span></div>')

    expect(box('a')).toEqual({ x: 0, y: 0, width: 60, height: 10 })
    expect(box('b').x).toBe(60)
  })
})

describe('nesting', () => {
  test('a flex item lays its own children out normally', () => {
    const box = render('<div style="display:flex;width:300px">'
      + '<div id="side" style="width:100px"></div>'
      + '<div id="main" style="flex:1">'
      + '<div id="p1" style="height:20px"></div>'
      + '<div id="p2" style="height:30px"></div></div></div>')

    expect(box('main')).toEqual({ x: 100, y: 0, width: 200, height: 50 })
    expect(box('p1')).toEqual({ x: 100, y: 0, width: 200, height: 20 })
    expect(box('p2')).toEqual({ x: 100, y: 20, width: 200, height: 30 })
    // The container's height comes from the tallest item, stretched.
    expect(box('side').height).toBe(50)
  })

  test('a flex container inside a flex item works', () => {
    const box = render('<div style="display:flex;width:400px">'
      + '<div id="outer" style="flex:1"><div style="display:flex">'
      + '<div id="x" style="width:30px;height:10px"></div>'
      + '<div id="y" style="width:30px;height:10px"></div></div></div>'
      + '<div id="far" style="width:100px;height:10px"></div></div>')

    expect(box('outer').width).toBe(300)
    expect(box('x').x).toBe(0)
    expect(box('y').x).toBe(30)
    expect(box('far').x).toBe(300)
  })

  test('inline-flex shrinks to fit its items', () => {
    const box = render('<div style="width:400px"><div id="box" style="display:inline-flex">'
      + '<div id="a" style="width:40px;height:10px"></div>'
      + '<div id="b" style="width:30px;height:10px"></div></div></div>')

    // Measured as the sum of the items, not the widest of them: an inline-flex
    // row that reported one item's width would squeeze all of them into it.
    expect(box('box').width).toBe(70)
    expect(box('a').x).toBe(0)
    expect(box('b').x).toBe(40)
  })

  test('a header with a flex: 1 spacer pushes the rest to the end', () => {
    const box = render(
      '<nav id="n"><span id="logo" style="width:32px;height:20px"></span>'
      + '<span id="spacer"></span>'
      + '<a id="one" style="width:24px;height:20px"></a>'
      + '<a id="two" style="width:24px;height:20px"></a></nav>',
      '#n { display: flex; align-items: center; gap: 16px; height: 64px; padding: 0 24px }'
      + '#spacer { flex: 1 }',
    )

    expect(box('logo').x).toBe(24)
    // 976 of content, 80 of fixed items, 48 of gaps: the spacer takes 848.
    expect(box('spacer').width).toBe(848)
    expect(box('one').x).toBe(936)
    expect(box('two').x).toBe(976)
    // Centred on the 64px cross axis: (64 - 20) / 2.
    expect(box('logo').y).toBe(22)
  })
})

describe('auto margins', () => {
  // These used to do nothing: an `auto` margin resolved to zero like anything
  // unresolved, so the common `margin-left: auto` push did not push.
  test('margin-left: auto pushes an item to the end', () => {
    const box = render('<div style="display:flex;width:400px">'
      + '<div id="a" style="width:50px;height:10px"></div>'
      + '<div id="b" style="margin-left:auto;width:50px;height:10px"></div></div>')

    expect(box('a').x).toBe(0)
    expect(box('b').x).toBe(350)
  })

  test('an auto margin on both sides centres the item', () => {
    const box = render('<div style="display:flex;width:400px">'
      + '<div id="a" style="margin:0 auto;width:50px;height:10px"></div></div>')

    expect(box('a').x).toBe(175)
  })

  test('it takes the free space before justify-content can', () => {
    const box = render('<div style="display:flex;width:400px;justify-content:center">'
      + '<div id="a" style="width:50px;height:10px"></div>'
      + '<div id="b" style="margin-left:auto;width:50px;height:10px"></div></div>')

    // Centring would put these at 150 and 200; the auto margin wins.
    expect(box('a').x).toBe(0)
    expect(box('b').x).toBe(350)
  })

  test('two auto margins share the space equally', () => {
    const box = render('<div style="display:flex;width:400px">'
      + '<div id="a" style="width:50px;height:10px"></div>'
      + '<div id="b" style="margin-left:auto;margin-right:auto;width:50px;height:10px"></div></div>')

    expect(box('b').x).toBe(200)
  })

  test('a cross-axis auto margin centres the item', () => {
    const box = render('<div style="display:flex;height:100px">'
      + '<div id="a" style="margin:auto 0;width:50px;height:20px"></div></div>')

    expect(box('a').y).toBe(40)
  })

  test('with no free space it does nothing', () => {
    const box = render('<div style="display:flex;width:100px">'
      + '<div id="a" style="width:50px;height:10px"></div>'
      + '<div id="b" style="margin-left:auto;width:50px;height:10px"></div></div>')

    expect(box('b').x).toBe(50)
  })

  test('it works down a column too', () => {
    const box = render('<div style="display:flex;flex-direction:column;height:100px">'
      + '<div id="a" style="height:20px;margin-top:auto"></div></div>')

    expect(box('a').y).toBe(80)
  })
})

describe('what flex does not model', () => {
  test('baseline falls back to flex-start', () => {
    // Chrome puts the shorter box at y = 20 so the two text baselines line up.
    // There are no font baselines here, so this is the top of the box. Asserted
    // so the difference is visible rather than discovered.
    const box = render('<div style="display:flex;align-items:baseline;width:300px">'
      + '<div id="a" style="width:10px;height:20px"></div>'
      + '<div id="b" style="width:10px;height:40px"></div></div>')

    expect(box('a').y).toBe(0)
    expect(box('b').y).toBe(0)
  })

  test('an item sized by its text is only as close as the text estimate', () => {
    // Chrome reports 34 for "Logo" at the default 16px serif; the estimate here
    // is character count x font-size x 0.5, so 32. Everything downstream of an
    // item like this inherits that error.
    const box = render('<div id="box" style="display:inline-flex"><span id="a">Logo</span></div>')

    expect(box('a').width).toBe(32)
  })
})
