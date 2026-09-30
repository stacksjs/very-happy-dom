/**
 * Locators.
 *
 * Added for #1591: the page could act on a selector string but had no locator
 * layer, so nothing could be stored, chained, filtered or re-queried. A locator
 * holds the query rather than the element, which is what makes
 * `const save = page.getByRole('button', { name: 'Save' })` survive the DOM
 * changing underneath it.
 *
 * `getByRole` needs role resolution and accessible-name computation; both are
 * new in src/aria/roles.ts and covered by test/aria-roles.test.ts.
 */

import { describe, expect, test } from 'bun:test'
import { Browser } from '../src'

const MARKUP = `<body>
  <button id="save">Save</button>
  <button id="cancel">Cancel</button>
  <button id="dis" disabled>Disabled</button>
  <a href="/home">Home</a>
  <h2>Section title</h2><h3>Deeper</h3>
  <label for="n">Your name</label><input id="n">
  <input id="ph" placeholder="Search trails">
  <img src="cat.png" alt="a cat">
  <span title="Tip text">?</span>
  <div data-testid="panel">Panel body</div>
  <input id="cb" type="checkbox">
  <input id="cb2" type="checkbox" checked>
  <ul id="list"><li>One</li><li>Two</li><li>Three</li></ul>
  <div id="card"><button>Nested</button><span>Card text</span></div>
</body>`

function page() {
  const created = new Browser().newPage() as any
  created.content = MARKUP
  return created
}

describe('getByRole', () => {
  test('finds a button by its accessible name', async () => {
    const save = page().getByRole('button', { name: 'Save' })

    expect(await save.count()).toBe(1)
    expect(await save.accessibleName()).toBe('Save')
  })

  test('name matching is a substring unless exact', async () => {
    const subject = page()

    expect(await subject.getByRole('button', { name: 'Sav' }).count()).toBe(1)
    expect(await subject.getByRole('button', { name: 'Sav', exact: true }).count()).toBe(0)
  })

  test('name accepts a RegExp', async () => {
    expect(await page().getByRole('button', { name: /^Cancel$/ }).count()).toBe(1)
  })

  test('finds a link only when it has an href', async () => {
    expect(await page().getByRole('link', { name: 'Home' }).count()).toBe(1)
  })

  test('narrows headings by level', async () => {
    const subject = page()

    expect(await subject.getByRole('heading').count()).toBe(2)
    expect(await subject.getByRole('heading', { level: 3 }).textContent()).toBe('Deeper')
  })

  test('narrows by disabled and checked state', async () => {
    const subject = page()

    expect(await subject.getByRole('button', { disabled: true }).textContent()).toBe('Disabled')
    expect(await subject.getByRole('checkbox', { checked: true }).count()).toBe(1)
  })
})

describe('the other getBy helpers', () => {
  test('getByLabel resolves through the label element', async () => {
    expect(await page().getByLabel('Your name').getAttribute('id')).toBe('n')
  })

  test('getByPlaceholder', async () => {
    expect(await page().getByPlaceholder('Search').getAttribute('id')).toBe('ph')
  })

  test('getByAltText', async () => {
    expect(await page().getByAltText('a cat').getAttribute('src')).toBe('cat.png')
  })

  test('getByTitle', async () => {
    expect(await page().getByTitle('Tip text').textContent()).toBe('?')
  })

  test('getByTestId matches exactly, and the attribute is configurable', async () => {
    const subject = page()
    expect(await subject.getByTestId('panel').textContent()).toBe('Panel body')

    subject.setTestIdAttribute('data-other')
    expect(await subject.getByTestId('panel').count()).toBe(0)
  })

  test('getByText matches substrings, exact text and RegExps', async () => {
    const subject = page()

    expect(await subject.getByText('Panel').count()).toBe(1)
    expect(await subject.getByText('Panel', { exact: true }).count()).toBe(0)
    expect(await subject.getByText('Panel body', { exact: true }).count()).toBe(1)
    expect(await subject.getByText(/^Two$/).count()).toBe(1)
  })

  test('getByText returns the innermost match, not every ancestor', async () => {
    // Every ancestor also contains the text; returning all of them would make
    // this ambiguous for almost any markup.
    const found = page().getByText('Card text')

    expect(await found.count()).toBe(1)
    expect(await found.getAttribute('id')).toBeNull()
  })
})

describe('counting and indexing', () => {
  test('count, first, last and nth', async () => {
    const items = page().locator('#list li')

    expect(await items.count()).toBe(3)
    expect(await items.first().textContent()).toBe('One')
    expect(await items.last().textContent()).toBe('Three')
    expect(await items.nth(1).textContent()).toBe('Two')
  })

  test('a negative index counts from the end', async () => {
    expect(await page().locator('#list li').nth(-1).textContent()).toBe('Three')
  })

  test('all() yields one locator per match', async () => {
    const all = await page().locator('#list li').all()

    expect(all).toHaveLength(3)
    expect(await all[2].textContent()).toBe('Three')
  })

  test('count is zero rather than an error when nothing matches', async () => {
    expect(await page().locator('.missing').count()).toBe(0)
  })
})

describe('chaining and filtering', () => {
  test('a locator scopes its descendants', async () => {
    expect(await page().locator('#card').getByRole('button').textContent()).toBe('Nested')
  })

  test('filter keeps matches by text', async () => {
    const items = page().locator('#list li')

    expect(await items.filter({ hasText: 'Two' }).count()).toBe(1)
    expect(await items.filter({ hasNotText: 'Two' }).count()).toBe(2)
  })
})

describe('strictness', () => {
  test('a single-valued read refuses an ambiguous locator', async () => {
    // Silently taking the first match is how a test ends up asserting against
    // the wrong element.
    await expect(page().locator('#list li').textContent())
      .rejects
      .toThrow('3 elements match')
  })

  test('an action names what it could not find', async () => {
    // An action auto-waits now (#1604), so this reports a timeout rather than
    // an immediate miss. The timeout is passed explicitly because the default
    // is 30s: asserting an absence through an action costs the full wait, which
    // is why `toHaveCount(0)` is the better way to ask.
    await expect(page().getByRole('button', { name: 'Nope' }).click({ timeout: 50 }))
      .rejects
      .toThrow(/Timed out waiting for getByRole\("button"\).*no element matched/)
  })
})

describe('resolution is lazy', () => {
  test('a locator picks up an element added after it was created', async () => {
    const subject = page()
    const later = subject.locator('.later')
    expect(await later.count()).toBe(0)

    const added = subject.mainFrame.document.createElement('div')
    added.className = 'later'
    added.textContent = 'appeared'
    subject.mainFrame.document.body.appendChild(added)

    expect(await later.textContent()).toBe('appeared')
  })

  test('a locator stops matching an element that was removed', async () => {
    const subject = page()
    const save = subject.locator('#save')
    expect(await save.count()).toBe(1)

    const element = await save.elementHandle()
    element.parentNode.removeChild(element)

    expect(await save.count()).toBe(0)
  })
})

describe('locator actions and state', () => {
  test('click focuses and fires', async () => {
    const subject = page()
    const save = subject.getByRole('button', { name: 'Save' })
    let clicks = 0
    ;(await save.elementHandle()).addEventListener('click', () => clicks++)

    await save.click()

    expect(clicks).toBe(1)
    expect(subject.mainFrame.document.activeElement).toBe(await save.elementHandle())
  })

  test('fill and type share the page implementation', async () => {
    const subject = page()

    await subject.getByLabel('Your name').fill('Ada')
    expect(await subject.getByLabel('Your name').inputValue()).toBe('Ada')

    await subject.getByLabel('Your name').type(' L')
    expect(await subject.getByLabel('Your name').inputValue()).toBe('Ada L')
  })

  test('check and uncheck are idempotent', async () => {
    const subject = page()
    const box = subject.locator('#cb')

    await box.check()
    expect(await box.isChecked()).toBe(true)
    await box.check()
    expect(await box.isChecked()).toBe(true)

    await box.uncheck()
    expect(await box.isChecked()).toBe(false)
    await box.uncheck()
    expect(await box.isChecked()).toBe(false)
  })

  test('state reads', async () => {
    const subject = page()

    expect(await subject.locator('#save').isVisible()).toBe(true)
    expect(await subject.locator('#ghost').isVisible()).toBe(false)
    expect(await subject.locator('#dis').isDisabled()).toBe(true)
    expect(await subject.locator('#n').isEditable()).toBe(true)
    expect(await subject.locator('#save').ariaRole()).toBe('button')
  })
})
