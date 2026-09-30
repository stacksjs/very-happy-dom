import { beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'

// =============================================================================
// Locator queries skip what a user cannot see (#1601).
//
// A closed modal, a collapsed menu, an inactive tab panel: all of them leave
// their markup in the DOM. Playwright's queries exclude anything hidden by
// display, visibility or aria-hidden; these did not, so hidden markup competed
// with the real element.
//
// It failed in two directions, and the quiet one was worse. Loudly, two
// matches made strict mode throw — and the fix that suggests itself, .first(),
// binds to the hidden element, since it comes first in document order. Quietly,
// when only the hidden copy existed, the query resolved and the assertion
// passed against markup nobody could reach.
// =============================================================================

let page: any
let document: any

beforeEach(() => {
  page = new Browser().newPage()
  document = page.mainFrame.window.document
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

describe('role queries skip hidden elements', async () => {
  test('a display:none copy does not compete with the visible one', async () => {
    await render('.closed { display: none }', '<div class="closed"><button>Save</button></div><button>Save</button>')

    const save = page.getByRole('button', { name: 'Save' })
    expect(await save.count()).toBe(1)
    // The one that resolves is the visible one, not the first in the document.
    expect(await save.elementHandle()).toBe(document.querySelectorAll('button')[1])
  })

  test('clicking resolves instead of throwing on a hidden duplicate', async () => {
    await render('.closed { display: none }', '<div class="closed"><button>Save</button></div><button>Save</button>')

    // Used to throw: '2 elements match getByRole("button")'.
    await expect(page.getByRole('button', { name: 'Save' }).click()).resolves.toBeUndefined()
  })

  test('an element hidden by an ancestor is skipped', async () => {
    await render('.panel { display: none }', '<div class="panel"><section><button>Only</button></section></div>')

    expect(await page.getByRole('button', { name: 'Only' }).count()).toBe(0)
  })

  test('visibility: hidden and collapse are skipped', async () => {
    await render(
      '.invisible { visibility: hidden } .collapsed { visibility: collapse }',
      '<button class="invisible">A</button><button class="collapsed">B</button><button>C</button>',
    )

    expect(await page.getByRole('button').count()).toBe(1)
    expect(await page.getByRole('button').textContent()).toBe('C')
  })

  test('the hidden attribute is skipped', async () => {
    await render('', '<button hidden>A</button><button>B</button>')

    expect(await page.getByRole('button').count()).toBe(1)
  })

  test('aria-hidden is skipped even though the element is painted', async () => {
    // Visually present but removed from the accessibility tree, which is what
    // a role query reads. This is the case `isVisible()` must NOT copy.
    await render('', '<button aria-hidden="true">Decorative</button><button>Real</button>')

    expect(await page.getByRole('button').count()).toBe(1)
    expect(await page.getByRole('button').textContent()).toBe('Real')
  })

  test('aria-hidden on an ancestor hides the subtree', async () => {
    await render('', '<div aria-hidden="true"><button>Inside</button></div><button>Outside</button>')

    expect(await page.getByRole('button').count()).toBe(1)
    expect(await page.getByRole('button').textContent()).toBe('Outside')
  })

  test('nothing matches when the only candidate is hidden', async () => {
    // The quiet failure: this used to resolve and let an assertion pass
    // against markup no user could reach.
    await render('.closed { display: none }', '<div class="closed"><button>Ghost</button></div>')

    expect(await page.getByRole('button', { name: 'Ghost' }).count()).toBe(0)
  })

  test('includeHidden brings them back deliberately', async () => {
    await render('.closed { display: none }', '<div class="closed"><button>Save</button></div><button>Save</button>')

    expect(await page.getByRole('button', { name: 'Save', includeHidden: true }).count()).toBe(2)
  })
})

describe('the other getBy helpers agree with getByRole', async () => {
  test('getByText skips a hidden copy', async () => {
    await render('.closed { display: none }', '<div class="closed"><span>Total</span></div><span>Total</span>')

    expect(await page.getByText('Total').count()).toBe(1)
  })

  test('getByLabel skips a control in a hidden panel', async () => {
    await render('.closed { display: none }', '<div class="closed"><label for="a">Email</label><input id="a"></div>')

    expect(await page.getByLabel('Email').count()).toBe(0)
  })

  test('getByPlaceholder, getByAltText, getByTitle and getByTestId skip hidden', async () => {
    await render('.closed { display: none }', `
      <div class="closed">
        <input placeholder="Search">
        <img alt="Logo">
        <span title="Tip">t</span>
        <div data-testid="panel">p</div>
      </div>
    `)

    expect(await page.getByPlaceholder('Search').count()).toBe(0)
    expect(await page.getByAltText('Logo').count()).toBe(0)
    expect(await page.getByTitle('Tip').count()).toBe(0)
    expect(await page.getByTestId('panel').count()).toBe(0)
  })
})

describe('isVisible keeps its own meaning', async () => {
  test('an aria-hidden element is still visible to a user', async () => {
    // Role queries skip it; isVisible must not, because it is painted. Two
    // related questions with different answers, kept deliberately apart.
    await render('', '<button id="d" aria-hidden="true">Decorative</button>')

    expect(await page.isVisible('#d')).toBe(true)
  })

  test('a display:none element is not visible', async () => {
    await render('.closed { display: none }', '<button id="h" class="closed">Hidden</button>')

    expect(await page.isVisible('#h')).toBe(false)
  })
})
