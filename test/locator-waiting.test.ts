import { beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'
import { TimeoutError } from '../src/browser/waiting'

// =============================================================================
// Locator actions auto-wait, and locators can be waited on (#1604).
//
// `_one()` used to resolve synchronously and give up, so a locator could only
// see what was in the document on the tick it was called. "No real browser, so
// nothing is async" was never true here: timers fire, fetch settles, microtasks
// drain, custom elements upgrade.
//
// The two halves are deliberately different. Actions wait; reads do not. A
// retrying `count()` would make the assertions built on it wait twice over, and
// `count()` is how you ask "how many are there right now".
// =============================================================================

let page: any
let document: any

beforeEach(() => {
  page = new Browser().newPage()
  document = page.mainFrame.window.document
  // Short, so a negative case does not spend the 30s default.
  page.setDefaultTimeout(300)
})

/** Put markup in the page after `delay` ms, the way a render would. */
function appendLater(html: string, delay = 20): void {
  setTimeout(() => { document.body.insertAdjacentHTML('beforeend', html) }, delay)
}

describe('actions wait for the element to arrive', () => {
  test('a click lands on a button rendered on a later tick', async () => {
    // The reproduction from the issue: this used to throw immediately.
    appendLater('<button>Save</button>')

    let clicked = false
    await page.getByRole('button', { name: 'Save' }).click()
    document.querySelector('button')!.addEventListener('click', () => { clicked = true })

    // The click already happened; prove it reached the element by doing it
    // again now that a listener exists, which also proves the locator resolved.
    await page.getByRole('button', { name: 'Save' }).click()
    expect(clicked).toBe(true)
  })

  test('fill waits for the input', async () => {
    appendLater('<input id="email">')

    await page.locator('#email').fill('rider@example.test')

    expect(document.querySelector('#email').value).toBe('rider@example.test')
  })

  test('check waits, and acts on the element it resolved', async () => {
    appendLater('<input type="checkbox" id="terms">')

    await page.locator('#terms').check()

    expect(document.querySelector('#terms').checked).toBe(true)
  })

  test('an action waits for a hidden element to be shown', async () => {
    // A CSS locator deliberately, because `getByRole` already skips hidden
    // elements (#1601) and would prove the filter rather than the wait.
    document.head.innerHTML = '<style>.closed { display: none }</style>'
    document.body.innerHTML = '<button id="go" class="closed">Confirm</button>'

    // The order is the assertion. A click that arrived while the button was
    // still hidden would land first, and clicks do fire on hidden elements, so
    // resolving without error proves nothing on its own.
    const order: string[] = []
    document.querySelector('#go').addEventListener('click', () => order.push('click'))
    setTimeout(() => {
      document.querySelector('#go').className = ''
      order.push('shown')
    }, 20)

    await page.locator('#go').click()

    expect(order).toEqual(['shown', 'click'])
  })

  test('an action waits for a disabled control to be enabled', async () => {
    document.body.innerHTML = '<button disabled>Submit</button>'

    // A disabled control swallows the event, as it does in a real browser, so
    // clicking too early would leave no 'click' here at all.
    const order: string[] = []
    document.querySelector('button').addEventListener('click', () => order.push('click'))
    setTimeout(() => {
      document.querySelector('button').disabled = false
      order.push('enabled')
    }, 20)

    await page.getByRole('button', { name: 'Submit' }).click()

    expect(order).toEqual(['enabled', 'click'])
  })

  test('a disabled control that stays disabled times out, and says so', async () => {
    document.body.innerHTML = '<button disabled>Submit</button>'

    await expect(page.getByRole('button', { name: 'Submit' }).click({ timeout: 50 }))
      .rejects
      .toThrow('it was disabled')
  })

  test('elementHandle waits for attachment, but not for visibility', async () => {
    // The escape hatch is how people inspect markup that is deliberately
    // hidden, so waiting for visible here would defeat the point.
    document.head.innerHTML = '<style>.closed { display: none }</style>'
    appendLater('<div class="closed" id="panel">shut</div>')

    const handle = await page.locator('#panel').elementHandle()
    expect(handle).toBe(document.querySelector('#panel'))
  })
})

describe('waitFor', () => {
  test('visible is the default state', async () => {
    appendLater('<p>Loaded</p>')

    await expect(page.getByText('Loaded').waitFor()).resolves.toBeUndefined()
  })

  test('attached resolves for an element that is present but hidden', async () => {
    document.head.innerHTML = '<style>.closed { display: none }</style>'
    appendLater('<div class="closed" id="p">x</div>')

    await expect(page.locator('#p').waitFor({ state: 'attached' })).resolves.toBeUndefined()
    // ... and the same locator is not visible, so the two states differ.
    await expect(page.locator('#p').waitFor({ state: 'visible', timeout: 50 })).rejects.toThrow('hidden')
  })

  test('detached resolves when the element is removed', async () => {
    document.body.innerHTML = '<div id="spinner"></div>'
    setTimeout(() => { document.querySelector('#spinner').remove() }, 20)

    await expect(page.locator('#spinner').waitFor({ state: 'detached' })).resolves.toBeUndefined()
  })

  test('hidden resolves when the element is hidden rather than removed', async () => {
    document.body.innerHTML = '<div id="modal">open</div>'
    setTimeout(() => { document.querySelector('#modal').style.display = 'none' }, 20)

    await expect(page.locator('#modal').waitFor({ state: 'hidden' })).resolves.toBeUndefined()
    // Still in the document — hidden and detached are not the same question.
    expect(document.querySelector('#modal')).not.toBeNull()
  })

  test('hidden is satisfied by an element that was never there', async () => {
    // Playwright's contract: hidden means "not visible", and absent qualifies.
    await expect(page.locator('#never').waitFor({ state: 'hidden' })).resolves.toBeUndefined()
  })

  test('the negative states are not strict', async () => {
    // Two hidden copies are as gone as one, so there is no single element to
    // be strict about and a strictness error here would be perverse.
    document.body.innerHTML = '<span class="gone" hidden>a</span><span class="gone" hidden>b</span>'

    await expect(page.locator('.gone').waitFor({ state: 'hidden' })).resolves.toBeUndefined()
  })

  test('a timeout names the locator, the state and what was seen', async () => {
    document.body.innerHTML = '<div id="here">still here</div>'

    const failure = await page.locator('#here').waitFor({ state: 'detached', timeout: 50 }).catch((error: Error) => error)

    expect(failure).toBeInstanceOf(TimeoutError)
    expect(failure.name).toBe('TimeoutError')
    expect(failure.message).toContain('#here')
    expect(failure.message).toContain('detached')
    expect(failure.message).toContain('1 element(s) were still attached')
  })
})

describe('what deliberately does not wait', () => {
  test('count answers about now, and does not block', async () => {
    // A retrying count() would make every assertion built on it wait twice.
    const started = Date.now()
    expect(await page.locator('.absent').count()).toBe(0)
    expect(Date.now() - started).toBeLessThan(200)
  })

  test('a one-shot read still fails immediately rather than timing out', async () => {
    const started = Date.now()
    await expect(page.locator('.absent').textContent()).rejects.toThrow('No element matches')
    expect(Date.now() - started).toBeLessThan(200)
  })

  test('isVisible reports false for something absent instead of waiting', async () => {
    const started = Date.now()
    expect(await page.locator('.absent').isVisible()).toBe(false)
    expect(Date.now() - started).toBeLessThan(200)
  })

  test('elementHandles is one-shot, like all() in Playwright', async () => {
    const started = Date.now()
    expect(await page.locator('.absent').elementHandles()).toEqual([])
    expect(Date.now() - started).toBeLessThan(200)
  })
})

describe('strictness survives the wait', () => {
  test('two matches throw at once rather than waiting out the timeout', async () => {
    // Ambiguity is a fact about the query, not a state the DOM grows out of.
    // Spending 30s to report something already certain would be the worst of
    // both behaviours.
    document.body.innerHTML = '<button>Go</button><button>Go</button>'

    const started = Date.now()
    await expect(page.getByRole('button', { name: 'Go' }).click({ timeout: 5000 }))
      .rejects
      .toThrow('2 elements match')
    expect(Date.now() - started).toBeLessThan(200)
  })

  test('one match that becomes two while waiting still throws', async () => {
    setTimeout(() => { document.body.innerHTML = '<button>Go</button><button>Go</button>' }, 20)

    await expect(page.getByRole('button', { name: 'Go' }).click()).rejects.toThrow('2 elements match')
  })

  test('first() disambiguates, as the error suggests', async () => {
    document.body.innerHTML = '<button>Go</button><button>Go</button>'

    await expect(page.getByRole('button', { name: 'Go' }).first().click()).resolves.toBeUndefined()
  })
})

describe('the timeout comes from the page when none is given', () => {
  test('setDefaultTimeout bounds a locator wait', async () => {
    page.setDefaultTimeout(60)

    const started = Date.now()
    await expect(page.locator('.never').waitFor()).rejects.toThrow(TimeoutError)
    const elapsed = Date.now() - started

    expect(elapsed).toBeGreaterThanOrEqual(50)
    expect(elapsed).toBeLessThan(1000)
  })

  test('a satisfied wait costs nothing', async () => {
    // The first check runs before any sleep, so the ordinary case — it is
    // already there — must not pay a poll interval.
    document.body.innerHTML = '<button>Ready</button>'

    const started = Date.now()
    await page.getByRole('button', { name: 'Ready' }).click()
    expect(Date.now() - started).toBeLessThan(15)
  })
})
