import { beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'

// =============================================================================
// Running code against what a locator resolved (#1607).
//
// `page.evaluate` existed and took an argument, but the element had nowhere to
// ride in, so the only way through was `elementHandles()` — which drops out of
// the locator API and, for the single-element case, skips the strictness check
// and silently measures the first match.
//
// The text helpers are the part with a trap in them. Playwright normalises
// whitespace in one and not the other, and a hand-mapped array quietly picks
// whichever the author happened to use.
// =============================================================================

let page: any
let document: any

beforeEach(() => {
  page = new Browser().newPage()
  document = page.mainFrame.window.document
  page.setDefaultTimeout(300)
})

describe('locator.evaluate', () => {
  test('the element arrives as the first argument', async () => {
    document.body.innerHTML = '<div id="d" data-id="42">text</div>'

    expect(await page.locator('#d').evaluate((el: any) => el.dataset.id)).toBe('42')
  })

  test('it is the real node, not a copy', async () => {
    // The whole point of an escape hatch: mutating through it changes the
    // document. A structured clone would silently discard the write.
    document.body.innerHTML = '<div id="d">before</div>'

    await page.locator('#d').evaluate((el: any) => { el.textContent = 'after' })

    expect(document.querySelector('#d').textContent).toBe('after')
    expect(await page.locator('#d').evaluate((el: any) => el))
      .toBe(await page.locator('#d').elementHandle())
  })

  test('an argument is passed after the element', async () => {
    document.body.innerHTML = '<div id="d">x</div>'

    const result = await page.locator('#d')
      .evaluate((el: any, suffix: string) => el.tagName + suffix, '!')

    expect(result).toBe('DIV!')
  })

  test('bare globals resolve against the frame', async () => {
    document.head.innerHTML = '<title>Trails</title>'
    document.body.innerHTML = '<div id="d">x</div>'

    expect(await page.locator('#d').evaluate(() => document.title)).toBe('Trails')
  })

  test('globals beyond window and document reach the frame too', async () => {
    // `document` above proves less than it looks: the compiled function already
    // names `window` and `document` as parameters, so those two would resolve
    // even without the `with (window)` wrapper. `localStorage` is the one that
    // pins the wrapper, and it is per-window state, so getting it from the
    // outer scope would be a real bug rather than a cosmetic one.
    page.mainFrame.window.localStorage.setItem('area', 'north')
    document.body.innerHTML = '<div id="d"></div>'

    expect(await page.locator('#d').evaluate(() => localStorage.getItem('area'))).toBe('north')
  })

  test('it is strict, and says which locator was ambiguous', async () => {
    document.body.innerHTML = '<span class="c">a</span><span class="c">b</span>'

    await expect(page.locator('.c').evaluate((el: any) => el.textContent))
      .rejects
      .toThrow('2 elements match')
  })

  test('it waits for the element, but not for it to be visible', async () => {
    document.head.innerHTML = '<style>.closed { display: none }</style>'
    setTimeout(() => { document.body.innerHTML = '<div class="closed" id="d" data-v="7"></div>' }, 20)

    // Reading an attribute off deliberately hidden markup is a fair thing to
    // want, so `attached` rather than `visible`.
    expect(await page.locator('#d').evaluate((el: any) => el.dataset.v)).toBe('7')
  })

  test('a string function expression works, as in Playwright', async () => {
    document.body.innerHTML = '<div id="d">hello</div>'

    expect(await page.locator('#d').evaluate('el => el.textContent')).toBe('hello')
  })
})

describe('locator.evaluateAll', () => {
  test('every match arrives as an array', async () => {
    document.body.innerHTML = '<ul><li data-id="1">a</li><li data-id="2">b</li></ul>'

    const ids = await page.locator('li').evaluateAll((els: any[]) => els.map(el => el.dataset.id))

    expect(ids).toEqual(['1', '2'])
  })

  test('it agrees with count()', async () => {
    document.body.innerHTML = '<p>1</p><p>2</p><p>3</p>'

    expect(await page.locator('p').evaluateAll((els: any[]) => els.length))
      .toBe(await page.locator('p').count())
  })

  test('no match is an empty array, not something to wait for', async () => {
    // The split from evaluate(): none is a legitimate answer here.
    const started = Date.now()
    expect(await page.locator('.absent').evaluateAll((els: any[]) => els.length)).toBe(0)
    expect(Date.now() - started).toBeLessThan(200)
  })

  test('many matches do not trigger strictness', async () => {
    document.body.innerHTML = '<p>1</p><p>2</p>'

    await expect(page.locator('p').evaluateAll((els: any[]) => els.length)).resolves.toBe(2)
  })
})

describe('allTextContents and allInnerTexts', () => {
  beforeEach(() => {
    document.body.innerHTML = '<ul>'
      + '<li>  one   spaced  </li>'
      + '<li>two<span style="display:none">HIDDEN</span></li>'
      + '</ul>'
  })

  test('allTextContents is raw, untrimmed and uncollapsed', async () => {
    expect(await page.locator('li').allTextContents())
      .toEqual(['  one   spaced  ', 'twoHIDDEN'])
  })

  test('allInnerTexts is rendered text: trimmed, hidden subtrees left out', async () => {
    // The meaningful difference. Interior runs are NOT collapsed here, which a
    // browser would do — asserted as it is rather than papered over, because
    // normalising in this one method would make it disagree with innerText().
    expect(await page.locator('li').allInnerTexts())
      .toEqual(['one   spaced', 'two'])
  })

  test('allInnerTexts agrees with innerText() on the same element', async () => {
    // Two APIs answering the same question must not drift apart.
    const first = page.locator('li').first()
    expect((await page.locator('li').allInnerTexts())[0]).toBe(await first.innerText())
  })

  test('neither waits, and both answer [] for nothing', async () => {
    expect(await page.locator('.absent').allTextContents()).toEqual([])
    expect(await page.locator('.absent').allInnerTexts()).toEqual([])
  })
})

describe('$eval and $$eval', () => {
  test('$eval takes the first match rather than refusing', async () => {
    // The discouraged form, and this is why: two matches is not an error here.
    document.body.innerHTML = '<p>first</p><p>second</p>'

    expect(await page.$eval('p', (el: any) => el.textContent)).toBe('first')
  })

  test('$$eval maps over every match', async () => {
    document.body.innerHTML = '<p>a</p><p>b</p>'

    expect(await page.$$eval('p', (els: any[]) => els.map(el => el.textContent))).toEqual(['a', 'b'])
  })

  test('both take an argument', async () => {
    document.body.innerHTML = '<p>a</p>'

    expect(await page.$eval('p', (el: any, n: number) => el.textContent.repeat(n), 3)).toBe('aaa')
    expect(await page.$$eval('p', (els: any[], n: number) => els.length * n, 5)).toBe(5)
  })
})
