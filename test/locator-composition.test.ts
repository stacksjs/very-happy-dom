import { beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'

// =============================================================================
// filter({ has }), or() and and() (#1619).
//
// `filter()` read only its two text keys, so an unknown one was dropped without
// complaint: `filter({ has: ... })` returned a locator matching everything the
// original did, which is worse than an error. A following `.first()` then bound
// to row one and the test passed against the wrong record, with nothing anywhere
// reporting a problem.
//
// `has` is queried FROM each candidate, not from the page. That distinction is
// what makes it useful, and the test for it is the one that separates a real
// implementation from one that only asks whether the inner locator matches
// anything at all.
// =============================================================================

let page: any

beforeEach(() => {
  page = new Browser().newPage()
  page.setDefaultTimeout(200)
})

/** Three rows; only the middle one has a Delete button. */
const TABLE = `
  <table><tbody>
    <tr><td>Ridge Loop</td><td><button>Edit</button></td></tr>
    <tr><td>Gorge Trail</td><td><button>Delete</button></td></tr>
    <tr><td>Summit Path</td><td><button>Edit</button></td></tr>
  </tbody></table>
`

describe('filter({ has })', () => {
  test('it selects the rows containing a match', async () => {
    await page.setContent(TABLE)

    const withDelete = page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Delete' }) })

    expect(await withDelete.count()).toBe(1)
    expect(await withDelete.textContent()).toContain('Gorge Trail')
  })

  test('the inner locator is scoped to the candidate, not the page', async () => {
    // The test that matters. An implementation that merely asks "does the inner
    // locator match anything?" passes every row here, because a Delete button
    // does exist on the page — just not in the row being considered.
    await page.setContent(TABLE)

    const rows = page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Delete' }) })

    expect(await rows.count()).toBe(1)
  })

  test('the documented shape reaches the button in the row it names', async () => {
    await page.setContent(TABLE)
    let clicked = ''
    for (const button of page.mainFrame.window.document.querySelectorAll('button')) {
      (button as any).addEventListener('click', (event: any) => {
        clicked = event.target.closest('tr').textContent.trim()
      })
    }

    const row = page.getByRole('row').filter({ hasText: 'Summit Path' })
    await row.getByRole('button', { name: 'Edit' }).click()

    expect(clicked).toContain('Summit Path')
  })

  test('hasNot is the complement', async () => {
    await page.setContent(TABLE)

    const withoutDelete = page.getByRole('row').filter({ hasNot: page.getByRole('button', { name: 'Delete' }) })

    expect(await withoutDelete.count()).toBe(2)
    expect(await withoutDelete.allTextContents()).toEqual([
      expect.stringContaining('Ridge Loop'),
      expect.stringContaining('Summit Path'),
    ])
  })

  test('has composes with hasText', async () => {
    await page.setContent(TABLE)

    const both = page.getByRole('row')
      .filter({ hasText: 'Gorge' })
      .filter({ has: page.getByRole('button') })

    expect(await both.count()).toBe(1)
  })

  test('a candidate does not contain itself', async () => {
    // `has` asks about descendants. A row is not inside itself, so a locator
    // matching the row cannot qualify it.
    await page.setContent('<div id="a">x</div>')

    expect(await page.locator('#a').filter({ has: page.locator('#a') }).count()).toBe(0)
  })

  test('a CSS inner locator is re-rooted too, not only a getBy* one', async () => {
    await page.setContent('<ul>'
      + '<li class="row"><span class="flag">!</span>one</li>'
      + '<li class="row">two</li>'
      + '</ul>')

    expect(await page.locator('.row').filter({ has: page.locator('.flag') }).count()).toBe(1)
  })
})

describe('an unknown filter key is refused', () => {
  test('a typo throws, naming the key', async () => {
    // This is the half that made the missing feature invisible: the call looked
    // like it worked and quietly matched everything.
    await page.setContent(TABLE)

    expect(() => page.getByRole('row').filter({ hasTxt: 'Gorge' } as any))
      .toThrow(/does not understand "hasTxt"/)
  })

  test('the error lists what is supported', async () => {
    await page.setContent(TABLE)

    expect(() => page.getByRole('row').filter({ contains: 'x' } as any))
      .toThrow(/hasText, hasNotText, has, hasNot/)
  })

  test('the known keys still work, together', async () => {
    await page.setContent(TABLE)

    await expect(page.getByRole('row').filter({ hasText: 'Ridge', hasNotText: 'Gorge' }).count())
      .resolves
      .toBe(1)
  })
})

describe('or()', () => {
  test('it matches either side', async () => {
    await page.setContent('<div role="alert" id="a">Failed</div>')

    expect(await page.getByRole('alert').or(page.getByText('Saved')).count()).toBe(1)
  })

  test('two possible outcomes, without racing them', async () => {
    // The shape it exists for: the page ends up in one of two states and the
    // assertion should not have to know which.
    await page.setContent('<p id="ok">Saved</p>')

    const outcome = page.getByRole('alert').or(page.getByText('Saved'))

    expect(await outcome.textContent()).toBe('Saved')
  })

  test('results come back in document order, not side order', async () => {
    await page.setContent('<p class="second">B</p>')
    await page.setContent('<span id="first">A</span><p class="second">B</p>')

    const combined = page.locator('.second').or(page.locator('#first'))

    expect(await combined.allTextContents()).toEqual(['A', 'B'])
  })

  test('an element matched by both sides appears once', async () => {
    // Returning it twice would make count() wrong and make strict mode fire on
    // what is really a single element.
    await page.setContent('<button id="b">Go</button>')

    const both = page.locator('#b').or(page.getByRole('button'))

    expect(await both.count()).toBe(1)
    await expect(both.click()).resolves.toBeUndefined()
  })

  test('strictness still applies to an action on two matches', async () => {
    await page.setContent('<button id="a">A</button><button id="b">B</button>')

    await expect(page.locator('#a').or(page.locator('#b')).click({ timeout: 50 }))
      .rejects
      .toThrow('2 elements match')
  })
})

describe('and()', () => {
  test('it keeps only the overlap', async () => {
    await page.setContent('<button class="primary" id="a">A</button><button id="b">B</button>'
      + '<span class="primary" id="c">C</span>')

    const primaryButtons = page.getByRole('button').and(page.locator('.primary'))

    expect(await primaryButtons.count()).toBe(1)
    expect(await primaryButtons.getAttribute('id')).toBe('a')
  })

  test('no overlap is an empty locator', async () => {
    await page.setContent('<button id="a">A</button><span class="x">B</span>')

    expect(await page.getByRole('button').and(page.locator('.x')).count()).toBe(0)
  })
})

describe('locator.page', () => {
  test('it reports the page it queries', async () => {
    await page.setContent('<p>x</p>')

    expect(page.locator('p').page).toBe(page)
  })
})
