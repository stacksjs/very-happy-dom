/**
 * The screenshot pipeline reads the same layout the DOM does.
 *
 * `src/screenshot/layout.ts` used to be a second engine: its own HTML parser,
 * its own cascade, and a box algorithm that read `width` off the `style`
 * attribute with a regex and estimated text as `length * fontSize * 0.6`. It
 * knew nothing of flexbox, grid, `calc()` or stylesheets, so a screenshot and a
 * `getBoundingClientRect()` of the same markup disagreed.
 *
 * The point of these tests is the agreement itself, so most of them lay the same
 * markup out twice — once through a document, once through `computeLayout` —
 * and insist the boxes match exactly rather than asserting hand-written numbers.
 */
import { describe, expect, test } from 'bun:test'
import { computeLayout, parseCSS, parseHTML } from '../src/screenshot/layout'
import { renderHtmlToPixels } from '../src/screenshot/pixel-renderer'
import { Window } from '../src/window/Window'

/** Walk a laid-out screenshot tree, or a DOM subtree, in document order. */
function flatten<T>(root: T, childrenOf: (node: T) => Iterable<T>): T[] {
  const out: T[] = [root]
  for (const child of childrenOf(root))
    out.push(...flatten(child, childrenOf))
  return out
}

/**
 * Lay `markup` out both ways and pair the nodes up.
 *
 * Both walks start at the document element and visit elements in document
 * order, so the trees line up position for position — which is itself part of
 * what is being asserted.
 */
function paired(markup: string, css = ''): Array<{ tag: string, rect: DOMRect, box: any, node: any }> {
  const window = new Window({ width: 800, height: 600 })
  const document = window.document as any
  if (css)
    document.head.innerHTML = `<style>${css}</style>`
  document.body.innerHTML = markup

  const shot = flatten(computeLayout(markup, css, 800, 600), node => node.children)
  const dom = flatten<any>(document.documentElement, element => element.children)

  expect(shot.length).toBe(dom.length)

  return dom.map((element, index) => ({
    tag: element.tagName,
    rect: element.getBoundingClientRect(),
    box: shot[index].box,
    node: shot[index],
  }))
}

/** Assert every paired box is the same box. */
function expectAgreement(markup: string, css = ''): void {
  for (const { tag, rect, box } of paired(markup, css)) {
    expect({ tag, x: box.x, y: box.y, width: box.width, height: box.height })
      .toEqual({ tag, x: rect.x, y: rect.y, width: rect.width, height: rect.height })
  }
}

describe('the screenshot tree reports the layout pass\'s boxes', () => {
  test('flex items take their share of the main axis', () => {
    expectAgreement(
      '<div style="display:flex;width:300px">'
      + '<div style="flex:1;height:10px"></div><div style="flex:2;height:10px"></div></div>',
    )
  })

  test('grid items land in their tracks', () => {
    expectAgreement(
      '<div style="display:grid;grid-template-columns:100px 1fr;width:300px">'
      + '<div style="height:10px"></div><div style="height:10px"></div></div>',
    )
  })

  test('adjoining margins collapse', () => {
    expectAgreement(
      '<div style="width:100px"><div style="margin:20px 0;height:10px"></div>'
      + '<div style="margin:30px 0;height:10px"></div></div>',
    )
  })

  test('em resolves against the inherited size, and calc() evaluates', () => {
    // The old engine assumed 16px for every `em` and produced NaN for `calc()`.
    expectAgreement(
      '<div style="font-size:20px"><div style="width:calc(2em + 10px);height:1.5em"></div></div>',
    )
  })

  test('a stylesheet sizes a box', () => {
    // Width used to be read off the `style` attribute with a regex, so a class
    // that set it was ignored and the box filled its container instead.
    expectAgreement('<div class="box">hi</div>', '.box { width: 123px; padding: 7px; border: 2px solid red }')
  })

  test('a descendant combinator matches', () => {
    expectAgreement('<section><p>x</p></section>', 'section p { width: 55px; height: 11px }')
  })

  test('specificity decides, not declaration order', () => {
    expectAgreement('<div id="a" class="c">x</div>', 'div { width: 10px } .c { width: 20px } #a { width: 30px }')
  })

  test('a media query that matches applies', () => {
    expectAgreement('<div class="m">x</div>', '@media (min-width: 100px) { .m { width: 77px; height: 8px } }')
  })

  test('an absolutely positioned box sits against its containing block', () => {
    expectAgreement(
      '<div style="position:relative;width:200px;height:100px">'
      + '<div style="position:absolute;top:10px;left:20px;width:30px;height:40px"></div></div>',
    )
  })

  test('a line box is as tall as its line-height', () => {
    expectAgreement('<div style="width:400px;font-size:16px">Logo</div>')
  })

  test('inherited font sizes carry down', () => {
    expectAgreement(
      '<div style="font-size:2em"><span style="font-size:0.5em">x</span>'
      + '<div style="height:1em"></div></div>',
    )
  })

  test('a deep nested flow agrees the whole way down', () => {
    expectAgreement(
      '<main style="padding:10px;width:400px">'
      + '<header style="height:30px;margin-bottom:12px"></header>'
      + '<section style="display:flex;gap:8px">'
      + '<aside style="width:100px;height:50px"></aside>'
      + '<article style="flex:1"><p style="margin:4px 0">text</p></article>'
      + '</section></main>',
    )
  })
})

describe('the tree is a document, not a fragment', () => {
  test('the root is the document element', () => {
    const tree = computeLayout('<div>x</div>', '', 800, 600)
    expect(tree.tagName).toBe('html')
    expect(tree.visible).toBe(true)
    expect(tree.children.map(child => child.tagName)).toEqual(['head', 'body'])
  })

  test('the head generates no box', () => {
    const tree = computeLayout('<div>x</div>', '', 800, 600)
    const head = tree.children[0]
    expect(head.visible).toBe(false)
    expect(head.box).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })

  test('a body with attributes keeps them', () => {
    const tree = computeLayout('<body style="padding:5px"><div style="height:9px"></div></body>', '', 800, 600)
    const body = tree.children.find(child => child.tagName === 'body')!
    expect(body.styles.paddingTop).toBe(5)
    expect(body.children[0].box.y).toBe(5)
  })

  test('a full document with a doctype and a head parses', () => {
    const tree = computeLayout(
      '<!DOCTYPE html><html><head><style>.a{width:40px;height:12px}</style></head>'
      + '<body><div class="a"></div></body></html>',
      '',
      800,
      600,
    )
    const body = tree.children.find(child => child.tagName === 'body')!
    expect(body.children[0].box.width).toBe(40)
    expect(body.children[0].box.height).toBe(12)
  })

  test('the css argument loses to a sheet in the markup', () => {
    const tree = computeLayout(
      '<style>.a{width:20px}</style><div class="a" style="height:5px"></div>',
      '.a { width: 90px }',
      800,
      600,
    )
    const body = tree.children.find(child => child.tagName === 'body')!
    const div = body.children.find(child => child.tagName === 'div')!
    expect(div.box.width).toBe(20)
  })

  test('display: none is not visible', () => {
    const tree = computeLayout('<div style="display:none">x</div>', '', 800, 600)
    const body = tree.children[1]
    expect(body.children[0].visible).toBe(false)
  })

  test('visibility: hidden is not painted', () => {
    const tree = computeLayout('<div style="visibility:hidden;height:10px">x</div>', '', 800, 600)
    const body = tree.children[1]
    expect(body.children[0].visible).toBe(false)
  })
})

describe('paint values come off the same cascade', () => {
  /** The first element in the body of a laid-out tree. */
  function firstChild(markup: string, css = ''): any {
    const tree = computeLayout(markup, css, 800, 600)
    const body = tree.children.find(child => child.tagName === 'body')!
    return body.children[0]
  }

  test('the background shorthand sets the background colour', () => {
    // `background: red` left `background-color` at its initial `transparent`
    // until the shorthand expanded, so nothing painted.
    expect(firstChild('<div style="background:red;height:5px"></div>').styles.backgroundColor)
      .toEqual({ r: 255, g: 0, b: 0, a: 255 })
  })

  test('a background from a stylesheet paints too', () => {
    expect(firstChild('<div class="a"></div>', '.a { background: #0000ff; height: 5px }').styles.backgroundColor)
      .toEqual({ r: 0, g: 0, b: 255, a: 255 })
  })

  test('an undeclared background is transparent', () => {
    expect(firstChild('<div style="height:5px"></div>').styles.backgroundColor.a).toBe(0)
  })

  test('colour inherits', () => {
    const tree = computeLayout('<div style="color:#ff0000"><span>x</span></div>', '', 800, 600)
    const body = tree.children.find(child => child.tagName === 'body')!
    expect(body.children[0].children[0].styles.color).toEqual({ r: 255, g: 0, b: 0, a: 255 })
  })

  test('an unnamed border colour is the current colour', () => {
    // A browser paints `border-width` with no colour in `color`; the old engine
    // defaulted it to black whatever `color` said.
    const styles = firstChild('<div style="color:#00ff00;border:2px solid;height:5px"></div>').styles
    expect(styles.borderTopColor).toEqual({ r: 0, g: 255, b: 0, a: 255 })
  })

  test('insets come from the box, not a second reading of the style', () => {
    const styles = firstChild('<div style="font-size:10px;padding:2em;margin:1em;border:3px solid red"></div>').styles
    expect(styles.paddingTop).toBe(20)
    expect(styles.marginTop).toBe(10)
    expect(styles.borderTopWidth).toBe(3)
  })

  test('a border with no style has no used width', () => {
    // `border-width` alone paints nothing, because the style defaults to `none`.
    expect(firstChild('<div style="border-width:4px;height:5px"></div>').styles.borderTopWidth).toBe(0)
  })

  test('the used line-height is reported', () => {
    expect(firstChild('<div style="font-size:20px;line-height:1.5">x</div>').styles.lineHeight).toBe(30)
    expect(firstChild('<div style="font-size:20px">x</div>').styles.lineHeight).toBe(24)
  })

  test('font-size resolves, and the family is the first one named', () => {
    const styles = firstChild('<div style="font-size:150%;font-family:\'Times New Roman\', serif">x</div>').styles
    expect(styles.fontSize).toBe(24)
    expect(styles.fontFamily).toBe('Times New Roman')
  })

  test('text-align inherits', () => {
    const tree = computeLayout('<div style="text-align:center"><span>x</span></div>', '', 800, 600)
    const body = tree.children.find(child => child.tagName === 'body')!
    expect(body.children[0].children[0].styles.textAlign).toBe('center')
  })

  test('opacity is clamped to a fraction', () => {
    expect(firstChild('<div style="opacity:0.25"></div>').styles.opacity).toBe(0.25)
    expect(firstChild('<div style="opacity:7"></div>').styles.opacity).toBe(1)
    expect(firstChild('<div></div>').styles.opacity).toBe(1)
  })

  test('border-radius resolves its first length', () => {
    expect(firstChild('<div style="font-size:10px;border-radius:0.5em"></div>').styles.borderRadius).toBe(5)
  })
})

describe('text belongs to the node that holds it', () => {
  test('only direct text children, with whitespace collapsed', () => {
    const tree = computeLayout('<div>  hello\n  world <span>inner</span></div>', '', 800, 600)
    const body = tree.children.find(child => child.tagName === 'body')!
    expect(body.children[0].text).toBe('hello world')
    expect(body.children[0].children[0].text).toBe('inner')
  })

  test('an element with no text of its own reports none', () => {
    const tree = computeLayout('<div><span>x</span></div>', '', 800, 600)
    const body = tree.children.find(child => child.tagName === 'body')!
    expect(body.children[0].text).toBeNull()
  })
})

describe('parseHTML is the real parser', () => {
  test('parses a simple element', () => {
    const result = parseHTML('<div>Hello</div>')
    expect(result.tagName).toBe('div')
    expect(result.children.length).toBe(1)
    expect(result.children[0]).toHaveProperty('tagName', 'div')
  })

  test('decodes entities', () => {
    const div = parseHTML('<div>&lt;test&gt; &amp; &#65;</div>').children[0] as any
    expect(div.children[0]).toBe('<test> & A')
  })

  test('closes a p at the next p, as the spec requires', () => {
    // The old parser nested them, because it only closed on an explicit tag.
    const result = parseHTML('<p>a<p>b')
    expect(result.children.length).toBe(2)
    expect((result.children[0] as any).children[0]).toBe('a')
  })

  test('keeps void elements as siblings', () => {
    expect(parseHTML('<br><hr><img src="x">').children.length).toBe(3)
  })

  test('lower-cases tag names and attribute names', () => {
    const div = parseHTML('<DIV ID="t" CLASS="a">x</DIV>').children[0] as any
    expect(div.tagName).toBe('div')
    expect(div.attributes.id).toBe('t')
    expect(div.attributes.class).toBe('a')
  })

  test('drops comments and whitespace-only text', () => {
    const result = parseHTML('<div>\n  <!-- note -->\n  <span>x</span>\n</div>')
    const div = result.children[0] as any
    expect(div.children.length).toBe(1)
    expect(div.children[0].tagName).toBe('span')
  })
})

describe('parseCSS is the real CSSOM', () => {
  test('parses a rule', () => {
    const rules = parseCSS('.test { color: red; }')
    expect(rules.length).toBe(1)
    expect(rules[0].selector).toBe('.test')
    expect(rules[0].properties.color).toBe('red')
  })

  test('strips comments', () => {
    expect(parseCSS('/* comment */ .test { color: red; }').length).toBe(1)
  })

  test('descends into a media block', () => {
    // The old regex parser read `@media (min-width: 100px) {` as a selector and
    // produced a rule that could never match anything.
    const rules = parseCSS('@media (min-width: 100px) { .a { color: red } }')
    expect(rules.length).toBe(1)
    expect(rules[0].selector).toBe('.a')
    expect(rules[0].properties.color).toBe('red')
  })

  test('lists a shorthand as the author wrote it', () => {
    const rules = parseCSS('.a { margin: 10px }')
    expect(Object.keys(rules[0].properties)).toEqual(['margin'])
    expect(rules[0].properties.margin).toBe('10px')
  })

  test('keeps a declaration that is !important', () => {
    expect(parseCSS('.a { color: red !important }')[0].properties.color).toBe('red')
  })
})

describe('the renderer paints what the layout pass measured', () => {
  /** The pixel at (x, y) of a rendered buffer. */
  function pixelAt(html: string, css: string, x: number, y: number): any {
    return renderHtmlToPixels(html, 200, 120, { r: 255, g: 255, b: 255, a: 255 }, css).getPixel(x, y)
  }

  test('a class-sized box paints at the size the class gave it', () => {
    // The box used to fill its container, so this pixel was inside it.
    const inside = pixelAt('<div class="a"></div>', '.a { width: 40px; height: 20px; background: #ff0000 }', 20, 10)
    const outside = pixelAt('<div class="a"></div>', '.a { width: 40px; height: 20px; background: #ff0000 }', 60, 10)
    expect(inside).toEqual({ r: 255, g: 0, b: 0, a: 255 })
    expect(outside).toEqual({ r: 255, g: 255, b: 255, a: 255 })
  })

  test('the background shorthand reaches the buffer', () => {
    expect(pixelAt('<div style="width:30px;height:30px;background:blue"></div>', '', 10, 10))
      .toEqual({ r: 0, g: 0, b: 255, a: 255 })
  })

  test('a flex row paints its second item where layout put it', () => {
    const markup = '<div style="display:flex;width:100px">'
      + '<div style="flex:1;height:20px;background:#ff0000"></div>'
      + '<div style="flex:1;height:20px;background:#00ff00"></div></div>'
    expect(pixelAt(markup, '', 20, 10)).toEqual({ r: 255, g: 0, b: 0, a: 255 })
    expect(pixelAt(markup, '', 70, 10)).toEqual({ r: 0, g: 255, b: 0, a: 255 })
  })

  test('a body background paints the body\'s box', () => {
    // Only its box: a browser propagates the body\'s background to the whole
    // canvas when the root declares none, and neither engine models that, so
    // the page below the content keeps the buffer\'s own fill.
    const markup = '<body style="background:#eeeeee"><div style="height:20px"></div></body>'
    expect(pixelAt(markup, '', 100, 10)).toEqual({ r: 238, g: 238, b: 238, a: 255 })
    expect(pixelAt(markup, '', 100, 60)).toEqual({ r: 255, g: 255, b: 255, a: 255 })
  })
})

describe('wrapped text fits the box it was measured into', () => {
  test('the box is as tall as the lines it holds', () => {
    // The old engine estimated this at `length * fontSize * 0.6` and made the
    // box 96px — five lines where three fit.
    const tree = computeLayout(
      '<div style="width:140px;font-size:16px">The quick brown fox jumps over the lazy dog again and again</div>',
      '',
      200,
      200,
    )
    const div = tree.children.find(child => child.tagName === 'body')!.children[0]
    expect(div.styles.lineHeight).toBe(19.2)
    expect(div.box.height).toBeCloseTo(3 * 19.2, 5)
  })

  test('the ink stays inside it', () => {
    // It used to run to y=103 inside a box the engine itself called 96 tall,
    // because the renderer wrapped on its bitmap font's 6px grid while the box
    // was measured with real advances.
    const markup = '<div style="width:140px;font-size:16px">The quick brown fox jumps over the lazy dog again and again</div>'
    const buffer = renderHtmlToPixels(markup, 200, 200, { r: 255, g: 255, b: 255, a: 255 })

    let right = -1
    let bottom = -1
    for (let y = 0; y < 200; y++) {
      for (let x = 0; x < 200; x++) {
        const pixel = buffer.getPixel(x, y)
        if (pixel.r !== 255 || pixel.g !== 255 || pixel.b !== 255) {
          right = Math.max(right, x)
          bottom = Math.max(bottom, y)
        }
      }
    }

    expect(right).toBeGreaterThan(0)
    expect(right).toBeLessThan(140)
    expect(bottom).toBeLessThan(3 * 19.2)
  })
})

describe('lengths resolve against the right box', () => {
  test('a percentage border-radius is a share of the element, not its parent', () => {
    const tree = computeLayout(
      '<div style="width:400px"><div style="width:40px;height:40px;border-radius:50%"></div></div>',
      '',
      800,
      600,
    )
    const inner = tree.children.find(child => child.tagName === 'body')!.children[0].children[0]
    expect(inner.styles.borderRadius).toBe(20)
  })

  test('a percentage width is a share of the containing block', () => {
    expectAgreement('<div style="width:400px"><div style="width:25%;height:10px"></div></div>')
  })
})
