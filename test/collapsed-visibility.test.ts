import { beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'
import '../src/matchers'

// =============================================================================
// An element collapsed to nothing is hidden (#1617).
//
// `height: 0; overflow: hidden` is how a closed accordion, disclosure, inactive
// tab panel or slide-out drawer is built when the author wants a transition,
// because `display: none` cannot be animated. All of that markup was reachable:
// a role query matched a button inside a shut drawer, and since #1604 the click
// auto-waited and then succeeded, so the test reported success.
//
// The rule is deliberately narrower than Playwright's, and the test that matters
// most here is the one guarding that narrowness. Playwright asks whether the
// bounding box is non-empty. There is no layout pass, so an element nobody sized
// also measures nothing — consulting the box would hide every unstyled element
// and empty out every getBy* query in the suite. Zero means *unknown* unless
// somebody declared it.
// =============================================================================

let page: any
let document: any

beforeEach(() => {
  page = new Browser().newPage()
  document = page.mainFrame.window.document
  page.setDefaultTimeout(200)
})

/**
 * Put a stylesheet and markup in the page.
 *
 * This was a hand-rolled `setContent` before there was one to call — written out
 * in two test files, which is what #1610 was filed about.
 */
async function render(css: string, markup: string): Promise<void> {
  await page.setContent(`<head>${css ? `<style>${css}</style>` : ''}</head><body>${markup}</body>`)
}

describe('a declared zero collapses the element', () => {
  test('a closed drawer hides the button inside it', async () => {
    // The reproduction from the issue.
    await render('.collapsed { height: 0; overflow: hidden }', '<div class="collapsed"><button>Hidden action</button></div>')

    expect(await page.getByRole('button').count()).toBe(0)
    expect(await page.getByRole('button').isVisible()).toBe(false)
  })

  test('the action no longer succeeds against it', async () => {
    // Since #1604 an action auto-waits and then clicks, so this used to resolve
    // and report success for a button nobody could reach.
    await render('.collapsed { height: 0 }', '<div class="collapsed"><button>Go</button></div>')

    await expect(page.getByRole('button').click({ timeout: 40 }))
      .rejects
      .toThrow(/Timed out/)
  })

  test('height and width both count, alone', async () => {
    await render(
      '.zh { height: 0 } .zw { width: 0 }',
      '<button class="zh">A</button><button class="zw">B</button><button>C</button>',
    )

    expect(await page.getByRole('button').count()).toBe(1)
    expect(await page.getByRole('button').textContent()).toBe('C')
  })

  test('max-height: 0 is the other common spelling', async () => {
    // The reason `overflow: hidden` is not required: this collapses too, and
    // demanding both properties would miss it.
    await render('.shut { max-height: 0; overflow: hidden }', '<div class="shut"><button>Inside</button></div>')

    expect(await page.getByRole('button').count()).toBe(0)
  })

  test('max-width: 0 as well', async () => {
    await render('.shut { max-width: 0 }', '<div class="shut"><button>Inside</button></div>')

    expect(await page.getByRole('button').count()).toBe(0)
  })

  test('an inline style counts, not only a stylesheet rule', async () => {
    await render('', '<div style="height: 0"><button>Inside</button></div>')

    expect(await page.getByRole('button').count()).toBe(0)
  })

  test('0% is zero of any container', async () => {
    await render('.pct { height: 0% }', '<div class="pct"><button>Inside</button></div>')

    expect(await page.getByRole('button').count()).toBe(0)
  })

  test('0px is the same as 0', async () => {
    await render('.px { height: 0px }', '<div class="px"><button>Inside</button></div>')

    expect(await page.getByRole('button').count()).toBe(0)
  })
})

describe('what must stay visible', () => {
  test('an element nobody sized is still visible', async () => {
    // The guard against the naive fix, and the most important test in this file.
    await render('', '<button>Save</button>')

    expect(await page.getByRole('button').count()).toBe(1)
    expect(await page.getByRole('button').isVisible()).toBe(true)

    // This button's box used to be empty, which was the original reason for
    // consulting the declaration rather than the box. It has a real one now.
    // The reason still stands, and the next case is what it rests on: an
    // element whose box is empty for want of a declared size must not be
    // treated as hidden, because the box is an estimate and the declaration is
    // not.
    const box = (await page.getByRole('button').elementHandle()).getBoundingClientRect()
    expect(box.width).toBeGreaterThan(0)
  })

  test('an empty box is not enough to call something hidden', async () => {
    // An empty <span> has nothing to give it a size, so its box is 0 x 0 — and
    // a browser agrees. Visibility still comes from the declaration, so this
    // counts as visible, where a box-based rule would hide it.
    await render('', '<span data-testid="empty"></span>')

    const box = (await page.getByTestId('empty').elementHandle()).getBoundingClientRect()
    expect({ width: box.width, height: box.height }).toEqual({ width: 0, height: 0 })
    expect(await page.getByTestId('empty').isVisible()).toBe(true)
  })

  test('height: auto is not zero', async () => {
    await render('.auto { height: auto; width: auto }', '<div class="auto"><button>Inside</button></div>')

    expect(await page.getByRole('button').count()).toBe(1)
  })

  test('a non-zero size is visible', async () => {
    await render('.sized { height: 20px; width: 100px }', '<div class="sized"><button>Inside</button></div>')

    expect(await page.getByRole('button').count()).toBe(1)
  })

  test('a value that does not parse is left alone rather than guessed at', async () => {
    // `calc(0px)` is zero, but parsing arithmetic to find out is a different
    // project. Assuming it is not zero keeps the element reachable, which is the
    // safe direction to be wrong in.
    await render('.calc { height: calc(0px) }', '<div class="calc"><button>Inside</button></div>')

    expect(await page.getByRole('button').count()).toBe(1)
  })

  test('an open drawer shows its contents again', async () => {
    await render('.drawer { height: 0; overflow: hidden } .drawer.open { height: 200px }',
      '<div class="drawer" id="d"><button>Inside</button></div>')
    expect(await page.getByRole('button').count()).toBe(0)

    document.querySelector('#d').className = 'drawer open'

    // The more specific rule wins, as the cascade decides — so opening it is
    // enough, without the visibility check needing to know anything about it.
    expect(await page.getByRole('button').count()).toBe(1)
  })
})

describe('the two predicates stay separate', () => {
  test('includeHidden still finds a collapsed element', async () => {
    await render('.collapsed { height: 0 }', '<div class="collapsed"><button>Shut</button></div>')

    expect(await page.getByRole('button', { includeHidden: true }).count()).toBe(1)
  })

  test('aria-hidden is still not the same question', async () => {
    // #1601's distinction, unaffected: an aria-hidden element is painted, so it
    // is visible even though a role query skips it.
    await render('', '<button id="d" aria-hidden="true">Decorative</button>')

    expect(await page.isVisible('#d')).toBe(true)
    expect(await page.getByRole('button').count()).toBe(0)
  })

  test('toBeHidden agrees about a collapsed element', async () => {
    await render('.collapsed { height: 0 }', '<div class="collapsed" id="c">shut</div>')

    await expect(page.locator('#c')).toBeHidden()
    await expect(page.locator('#c')).toBeAttached()
  })

  test('waitFor({ state: hidden }) resolves when a drawer closes', async () => {
    await render('.drawer { height: 200px }', '<div class="drawer" id="d">open</div>')
    setTimeout(() => { document.querySelector('#d').style.height = '0' }, 20)

    await expect(page.locator('#d').waitFor({ state: 'hidden' })).resolves.toBeUndefined()
  })
})
