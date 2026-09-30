import { beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'
import { matchers } from '../src/matchers'
import '../src/matchers'

// =============================================================================
// Web-first assertions: matchers that retry (#1603).
//
// The point is not the shorter line. `expect(await loc.textContent()).toBe(x)`
// samples once, so anything that appears after a fetch settles or a microtask
// drains is a coin flip — and it flakes in CI rather than locally, which is the
// expensive direction.
//
// Two things here are easy to get wrong and are asserted directly. Negation has
// to invert the *goal*: `.not.toBeVisible()` must wait for the element to go
// away, not wait for it to appear and report the opposite. And a matcher must
// not retry an ambiguous locator, because two matches is a fact about the query
// rather than a state the DOM grows out of.
// =============================================================================

let page: any
let document: any

beforeEach(() => {
  page = new Browser().newPage()
  document = page.mainFrame.window.document
  page.setDefaultTimeout(300)
})

/** Change the DOM on a later tick, the way a render would. */
function later(change: () => void, delay = 20): void {
  setTimeout(change, delay)
}

/**
 * Run a matcher as the plain function it is, and get its verdict.
 *
 * A failing matcher fails the surrounding test the moment it is called, whether
 * or not its promise is handled — so going through `expect()` is no way to
 * assert on a failure message. Calling it directly is, and it also checks the
 * `isNot` contract without relying on how bun threads `.not` through.
 */
function verdict(
  name: keyof typeof matchers,
  subject: any,
  ...args: any[]
): Promise<{ pass: boolean, message: () => string }> {
  return (matchers[name] as any).call({ isNot: false }, subject, ...args)
}

/** The same, as `.not` would call it. */
function negated(
  name: keyof typeof matchers,
  subject: any,
  ...args: any[]
): Promise<{ pass: boolean, message: () => string }> {
  return (matchers[name] as any).call({ isNot: true }, subject, ...args)
}

describe('the matchers retry', () => {
  test('toBeVisible waits for an element that renders later', async () => {
    later(() => { document.body.innerHTML = '<p>Loaded</p>' })

    await expect(page.getByText('Loaded')).toBeVisible()
  })

  test('toContainText waits for text that arrives after a fetch settles', async () => {
    // The case the one-shot rewrite gets wrong: the assertion is written before
    // the value exists.
    document.body.innerHTML = '<div role="alert"></div>'
    const arriving = Promise.resolve('Saved').then((text) => {
      document.querySelector('[role=alert]').textContent = text
    })

    await expect(page.getByRole('alert')).toContainText('Saved')
    await arriving
  })

  test('toHaveCount waits for a list to fill', async () => {
    document.body.innerHTML = '<ul></ul>'
    later(() => { document.querySelector('ul').innerHTML = '<li>a</li><li>b</li><li>c</li>' })

    await expect(page.locator('li')).toHaveCount(3)
  })

  test('toHaveValue waits for a field to be populated', async () => {
    document.body.innerHTML = '<input id="name">'
    later(() => { document.querySelector('#name').value = 'Ridge Loop' })

    await expect(page.locator('#name')).toHaveValue('Ridge Loop')
  })

  test('toBeEnabled waits for a button to be released', async () => {
    document.body.innerHTML = '<button disabled>Submit</button>'
    later(() => { document.querySelector('button').disabled = false })

    await expect(page.getByRole('button')).toBeEnabled()
  })
})

describe('negation inverts the goal, not the answer', () => {
  test('not.toBeVisible waits for the element to go away', async () => {
    document.body.innerHTML = '<div id="spinner">loading</div>'
    later(() => { document.querySelector('#spinner').style.display = 'none' })

    // Sampling once here would report "visible" and fail. Inverting the result
    // instead of the goal would pass the moment it was still visible.
    await expect(page.locator('#spinner')).not.toBeVisible()
  })

  test('not.toHaveText waits for the text to change', async () => {
    document.body.innerHTML = '<p id="status">Pending</p>'
    later(() => { document.querySelector('#status').textContent = 'Done' })

    await expect(page.locator('#status')).not.toHaveText('Pending')
  })

  test('not.toBeVisible passes for an element that was never there', async () => {
    await expect(page.locator('#never')).not.toBeVisible()
  })

  test('not.toHaveCount waits for the count to move off the wrong number', async () => {
    document.body.innerHTML = '<ul><li>a</li></ul>'
    later(() => { document.querySelector('ul').innerHTML = '<li>a</li><li>b</li>' })

    await expect(page.locator('li')).not.toHaveCount(1)
  })
})

describe('failure messages say what was looked at and what was there', () => {
  test('a timeout names the locator, the expectation and the last value', async () => {
    document.body.innerHTML = '<p id="status">Pending</p>'

    const result = await verdict('toHaveText', page.locator('#status'), 'Done', { timeout: 50 })

    expect(result.pass).toBe(false)
    expect(result.message()).toContain('Timed out 50ms')
    expect(result.message()).toContain('Locator:  locator("#status")')
    expect(result.message()).toContain('Expected: the text "Done"')
    expect(result.message()).toContain('Received: "Pending"')
  })

  test('a missing element is reported as missing, not as a wrong value', async () => {
    // "it was never there" and "it was there and wrong" are different bugs.
    const result = await verdict('toBeVisible', page.locator('#absent'), { timeout: 50 })

    expect(result.pass).toBe(false)
    expect(result.message()).toContain('Received: no element matched')
  })

  test('a negated failure says so', async () => {
    document.body.innerHTML = '<p id="status">Pending</p>'

    const result = await negated('toHaveText', page.locator('#status'), 'Pending', { timeout: 50 })

    expect(result.pass).toBe(true)
    expect(result.message()).toContain('Expected: not the text "Pending"')
  })

  test('a one-shot failure is not reported as a timeout', async () => {
    // Nothing was waited for here, so claiming a timeout would misdescribe it.
    document.body.innerHTML = '<p id="status">Pending</p>'

    const result = await verdict('toHaveText', page.locator('#status'), 'Done', { timeout: 0 })

    expect(result.message()).toContain('The expectation did not hold')
    expect(result.message()).not.toContain('Timed out')
  })
})

describe('ambiguity is not waited out', () => {
  test('two matches fail at once rather than after the timeout', async () => {
    document.body.innerHTML = '<button>Go</button><button>Go</button>'

    const started = Date.now()
    await expect(verdict('toBeVisible', page.getByRole('button'), { timeout: 5000 }))
      .rejects
      .toThrow('2 elements match')
    expect(Date.now() - started).toBeLessThan(200)
  })

  test('toHaveCount is deliberately not strict', async () => {
    // The count is the question, so many matches is the expected case.
    document.body.innerHTML = '<button>Go</button><button>Go</button>'

    await expect(page.getByRole('button')).toHaveCount(2)
  })

  test('the array form of toHaveText is not strict either', async () => {
    document.body.innerHTML = '<ul><li>one</li><li>two</li></ul>'

    await expect(page.locator('li')).toHaveText(['one', 'two'])
  })
})

describe('text matching follows Playwright', () => {
  beforeEach(() => {
    document.body.innerHTML = '<p id="t">  Save   changes  </p>'
  })

  test('toHaveText is whole-string after whitespace normalisation', async () => {
    await expect(page.locator('#t')).toHaveText('Save changes')
    await expect(page.locator('#t')).not.toHaveText('Save', { timeout: 50 })
  })

  test('toContainText is a substring', async () => {
    await expect(page.locator('#t')).toContainText('Save')
  })

  test('a RegExp is used as written', async () => {
    await expect(page.locator('#t')).toHaveText(/^Save\s+changes$/)
  })

  test('toContainText and getByText agree about "contains"', async () => {
    // One definition, shared: a query that finds it and an assertion that
    // rejects it would be the worst possible pair.
    expect(await page.getByText('Save').count()).toBe(1)
    await expect(page.getByText('Save')).toContainText('Save')
  })
})

describe('the element-state matchers', () => {
  test('toBeHidden counts absent as hidden, like Playwright', async () => {
    await expect(page.locator('#never')).toBeHidden()
  })

  test('toBeHidden is not simply the negation of toBeVisible', async () => {
    document.head.innerHTML = '<style>.closed { display: none }</style>'
    document.body.innerHTML = '<div class="closed" id="p">shut</div>'

    await expect(page.locator('#p')).toBeHidden()
    await expect(page.locator('#p')).toBeAttached()
  })

  test('toBeChecked, and the unchecked form', async () => {
    document.body.innerHTML = '<input type="checkbox" id="c" checked><input type="checkbox" id="d">'

    await expect(page.locator('#c')).toBeChecked()
    await expect(page.locator('#d')).toBeChecked({ checked: false })
    await expect(page.locator('#d')).not.toBeChecked()
  })

  test('toBeDisabled and toBeEditable', async () => {
    document.body.innerHTML = '<input id="a"><input id="b" disabled><input id="c" readonly>'

    await expect(page.locator('#a')).toBeEditable()
    await expect(page.locator('#b')).toBeDisabled()
    await expect(page.locator('#c')).not.toBeEditable()
  })

  test('toBeFocused follows the active element', async () => {
    document.body.innerHTML = '<input id="a"><input id="b">'
    await page.locator('#a').focus()

    await expect(page.locator('#a')).toBeFocused()
    await expect(page.locator('#b')).not.toBeFocused()
  })

  test('toBeEmpty needs neither text nor children', async () => {
    document.body.innerHTML = '<div id="a"></div><div id="b">x</div><div id="c"><span></span></div>'

    await expect(page.locator('#a')).toBeEmpty()
    await expect(page.locator('#b')).not.toBeEmpty()
    await expect(page.locator('#c')).not.toBeEmpty()
  })

  test('toHaveAttribute asks about a value, or only about presence', async () => {
    document.body.innerHTML = '<a id="l" href="/trails" data-loading>link</a>'

    await expect(page.locator('#l')).toHaveAttribute('href', '/trails')
    await expect(page.locator('#l')).toHaveAttribute('data-loading')
    await expect(page.locator('#l')).not.toHaveAttribute('target')
    // A trailing options object must not be read as an expected value.
    await expect(page.locator('#l')).toHaveAttribute('href', { timeout: 50 })
  })

  test('toHaveClass compares the whole attribute, as Playwright does', async () => {
    document.body.innerHTML = '<div id="d" class="card active"></div>'

    await expect(page.locator('#d')).toHaveClass('card active')
    // The surprising half, asserted so nobody "fixes" it into a contains check.
    await expect(page.locator('#d')).not.toHaveClass('card', { timeout: 50 })
    await expect(page.locator('#d')).toHaveClass(/\bactive\b/)
  })
})

describe('the page matchers', () => {
  test('toHaveTitle waits for the title', async () => {
    document.head.innerHTML = '<title>Trails</title>'

    await expect(page).toHaveTitle('Trails')
    await expect(page).not.toHaveTitle('Settings', { timeout: 50 })
  })

  test('toHaveURL reads the page URL', async () => {
    page.route('https://example.com/**', (route: any) =>
      route.fulfill({ status: 200, body: '<html><body>ok</body></html>', contentType: 'text/html' }))
    await page.goto('https://example.com/trails')

    await expect(page).toHaveURL('https://example.com/trails')
    await expect(page).toHaveURL(/\/trails$/)
    await page.unroute()
  })
})

describe('the wrong subject is named, not silently accepted', () => {
  test('a matcher given an awaited read explains the mistake', async () => {
    document.body.innerHTML = '<p id="t">hi</p>'
    const text = await page.locator('#t').textContent()

    // The natural mistake. Without the guard this would ask a string about
    // element state and answer something meaningless.
    await expect(verdict('toBeVisible', text)).rejects.toThrow(/expects a Locator/)
    await expect(verdict('toBeVisible', text)).rejects.toThrow(/the string "hi"/)
  })

  test('a page matcher given a locator says so', async () => {
    await expect(verdict('toHaveTitle', page.locator('body'), 'x')).rejects.toThrow(/expects a BrowserPage/)
  })
})

describe('bun keeps its own matchers', () => {
  test('the built-ins still work alongside these', () => {
    expect([1, 2, 3]).toHaveLength(3)
    expect({ a: 1 }).toEqual({ a: 1 })
    expect('abc').toContain('b')
  })
})
