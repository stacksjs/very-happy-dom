import { beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'

// =============================================================================
// locator.boundingBox() (#1609).
//
// Not worth having before #1600: getBoundingClientRect() read only the inline
// style then, so anything sized by a stylesheet reported 0 x 0 and the method
// would have been a way to get wrong numbers. The rect resolves through the
// cascade now, and nothing exposed it at the locator level.
//
// What it still cannot answer is position. There is no layout pass, so x and y
// are always the origin — which is the half people reach for boundingBox() to
// get. Asserted as zero, so a future change cannot quietly start reporting
// made-up coordinates.
// =============================================================================

let page: any
let document: any

beforeEach(() => {
  page = new Browser().newPage()
  document = page.mainFrame.window.document
  page.setDefaultTimeout(200)
})

describe('the size is real', () => {
  test('a size from a stylesheet is reported', async () => {
    await page.setContent('<head><style>.box { width: 120px; height: 40px }</style></head>'
      + '<body><div class="box" id="b"></div></body>')

    const box = await page.locator('#b').boundingBox()

    expect({ width: box!.width, height: box!.height }).toEqual({ width: 120, height: 40 })
  })

  test('it agrees with getComputedStyle about the same element', async () => {
    // One resolution, so the two cannot drift apart — the point of #1600.
    await page.setContent('<head><style>.box { width: 250px }</style></head>'
      + '<body><div class="box" id="b"></div></body>')

    const computed = page.mainFrame.window.getComputedStyle(document.querySelector('#b')).getPropertyValue('width')
    const box = await page.locator('#b').boundingBox()

    expect(box!.width).toBe(Number.parseFloat(computed))
  })

  test('an inline style still beats the stylesheet', async () => {
    await page.setContent('<head><style>.box { width: 120px }</style></head>'
      + '<body><div class="box" id="b" style="width: 300px"></div></body>')

    expect((await page.locator('#b').boundingBox())!.width).toBe(300)
  })

  test('a width attribute works for the elements that carry one', async () => {
    await page.setContent('<canvas id="c" width="300" height="150"></canvas>')

    const box = await page.locator('#c').boundingBox()

    expect({ width: box!.width, height: box!.height }).toEqual({ width: 300, height: 150 })
  })
})

describe('position is computed', () => {
  test('a margin moves the box', async () => {
    await page.setContent('<head><style>.box { width: 120px; margin-left: 50px }</style></head>'
      + '<body><div class="box" id="b"></div></body>')

    const box = await page.locator('#b').boundingBox()

    expect({ x: box!.x, y: box!.y }).toEqual({ x: 50, y: 0 })
  })

  test('two stacked elements report different positions, so ordering can be asked', async () => {
    // This used to assert the opposite: both boxes at the origin, which is what
    // made overlap and ordering unanswerable and `toBeInViewport` pointless.
    await page.setContent('<head><style>div { width: 10px; height: 10px }</style></head>'
      + '<body><div id="a"></div><div id="b"></div></body>')

    const first = await page.locator('#a').boundingBox()
    const second = await page.locator('#b').boundingBox()

    expect(first!.y).toBe(0)
    expect(second!.y).toBe(10)
    expect(second!.y).toBeGreaterThan(first!.y)
  })

  test('a block with no declared width fills its containing block', async () => {
    await page.setContent('<body><div id="b"></div></body>')

    const box = await page.locator('#b').boundingBox()

    // The viewport is 1024 wide by default, and a block-level box fills it.
    // This reported 0 before there was a containing block to fill.
    expect(box!.width).toBe(1024)
  })
})

describe('null for an element that is not rendered', () => {
  test('display: none reports null, as in Playwright', async () => {
    await page.setContent('<head><style>.closed { display: none }</style></head>'
      + '<body><div class="closed" id="b"></div></body>')

    expect(await page.locator('#b').boundingBox()).toBeNull()
  })

  test('a collapsed element reports null too', async () => {
    // Consistent with #1617: a declared zero size means not rendered, so there
    // is no box to report rather than a box of nothing.
    await page.setContent('<head><style>.shut { height: 0 }</style></head>'
      + '<body><div class="shut" id="b"></div></body>')

    expect(await page.locator('#b').boundingBox()).toBeNull()
  })

  test('an element nobody sized still has a box', async () => {
    // Unknown size, not collapsed — the distinction #1617 rests on. The button
    // is rendered, so a box is reported rather than null. It used to be 0 x 0
    // for want of layout; now its text gives it one.
    await page.setContent('<button id="b">Save</button>')

    const box = await page.locator('#b').boundingBox()

    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThan(0)
  })
})

describe('strictness and waiting', () => {
  test('two matches throw rather than measuring the first', async () => {
    await page.setContent('<head><style>div { width: 10px }</style></head>'
      + '<body><div class="m"></div><div class="m"></div></body>')

    await expect(page.locator('.m').boundingBox()).rejects.toThrow('2 elements match')
  })

  test('it waits for the element to arrive', async () => {
    setTimeout(() => {
      document.body.insertAdjacentHTML('beforeend', '<div id="late" style="width: 77px"></div>')
    }, 20)

    expect((await page.locator('#late').boundingBox())!.width).toBe(77)
  })
})

describe('scrollIntoViewIfNeeded', () => {
  test('it resolves and fires a scroll event', async () => {
    // A resolving no-op rather than a missing method: in Playwright this is a
    // step before an action, so throwing would block a spec that is otherwise
    // fine here.
    await page.setContent('<div id="b">x</div>')
    const events: string[] = []
    document.querySelector('#b').addEventListener('scroll', () => events.push('scroll'))

    await expect(page.locator('#b').scrollIntoViewIfNeeded()).resolves.toBeUndefined()
    expect(events).toEqual(['scroll'])
  })

  test('it does not require the element to be visible', async () => {
    await page.setContent('<head><style>.closed { display: none }</style></head>'
      + '<body><div class="closed" id="b"></div></body>')

    await expect(page.locator('#b').scrollIntoViewIfNeeded()).resolves.toBeUndefined()
  })
})
