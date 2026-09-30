import { beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'
import { TimeoutError } from '../src/browser/waiting'

// =============================================================================
// waitForSelector throws on timeout (#1605).
//
// It used to answer a timeout with `null`, while `waitForFunction` twenty lines
// below it threw — two functions side by side disagreeing about what a timeout
// is, so whichever one a reader learned first was wrong about the other.
//
// The `null` was the worse half. The idiomatic line is
//
//   const row = await page.waitForSelector('.row')
//   await row.click()
//
// and when the row never arrived that reported `null is not an object`, pointing
// at the click, with the selector, the timeout and the wait nowhere in the
// message. The actual fact was not in there anywhere.
// =============================================================================

let page: any
let document: any

beforeEach(() => {
  page = new Browser().newPage()
  document = page.mainFrame.window.document
  page.setDefaultTimeout(200)
})

describe('a timeout is an error, not a null', () => {
  test('it throws, naming the selector and the timeout', async () => {
    const failure = await page.waitForSelector('.never', { timeout: 50 }).catch((error: Error) => error)

    expect(failure).toBeInstanceOf(TimeoutError)
    expect(failure.name).toBe('TimeoutError')
    expect(failure.message).toContain('".never"')
    expect(failure.message).toContain('50ms')
    expect(failure.message).toContain('no element matched')
  })

  test('the error is the same type waitForFunction raises', async () => {
    // The two sat twenty lines apart and disagreed. Asserted together so they
    // cannot drift again.
    const fromSelector = await page.waitForSelector('.never', { timeout: 40 }).catch((e: Error) => e)
    const fromFunction = await page.waitForFunction(() => false, { timeout: 40 }).catch((e: Error) => e)

    expect(fromSelector).toBeInstanceOf(TimeoutError)
    expect(fromFunction).toBeInstanceOf(TimeoutError)
  })

  test('waitForFunction reports what it last saw', async () => {
    const failure = await page.waitForFunction(() => 0, { timeout: 40 }).catch((error: Error) => error)

    expect(failure.message).toContain('it last returned 0')
  })

  test('the element is returned when it arrives', async () => {
    setTimeout(() => { document.body.innerHTML = '<div class="late">here</div>' }, 20)

    const element = await page.waitForSelector('.late')

    expect(element).toBe(document.querySelector('.late'))
  })

  test('an element already there costs nothing', async () => {
    document.body.innerHTML = '<div class="here"></div>'

    const started = Date.now()
    expect(await page.waitForSelector('.here')).not.toBeNull()
    expect(Date.now() - started).toBeLessThan(15)
  })
})

describe('the state option', () => {
  test('visible waits past an element that is present but hidden', async () => {
    document.head.innerHTML = '<style>.closed { display: none }</style>'
    document.body.innerHTML = '<div class="closed" id="p">shut</div>'
    setTimeout(() => { document.querySelector('#p').className = '' }, 20)

    const element = await page.waitForSelector('#p', { state: 'visible' })

    expect(element).toBe(document.querySelector('#p'))
  })

  test('the older visible: true option still means the same', async () => {
    document.head.innerHTML = '<style>.closed { display: none }</style>'
    document.body.innerHTML = '<div class="closed" id="p">shut</div>'

    await expect(page.waitForSelector('#p', { visible: true, timeout: 40 }))
      .rejects
      .toThrow(/to be visible/)
    // attached is satisfied by the same markup, which is the distinction.
    expect(await page.waitForSelector('#p')).not.toBeNull()
  })

  test('detached resolves to null once the element is removed', async () => {
    // The only legitimate null: a wait that was asking for an absence.
    document.body.innerHTML = '<div id="spinner"></div>'
    setTimeout(() => { document.querySelector('#spinner').remove() }, 20)

    expect(await page.waitForSelector('#spinner', { state: 'detached' })).toBeNull()
  })

  test('detached times out while the element stays', async () => {
    document.body.innerHTML = '<div id="here"></div>'

    await expect(page.waitForSelector('#here', { state: 'detached', timeout: 40 }))
      .rejects
      .toThrow(/still attached/)
  })

  test('hidden resolves with the element when it is present but not painted', async () => {
    document.body.innerHTML = '<div id="modal">open</div>'
    setTimeout(() => { document.querySelector('#modal').style.display = 'none' }, 20)

    const element = await page.waitForSelector('#modal', { state: 'hidden' })

    // Still in the document — hidden and detached are different questions.
    expect(element).toBe(document.querySelector('#modal'))
  })

  test('hidden is satisfied by an element that was never there', async () => {
    expect(await page.waitForSelector('#never', { state: 'hidden' })).toBeNull()
  })

  test('hidden times out while the element is painted', async () => {
    document.body.innerHTML = '<div id="shown">x</div>'

    await expect(page.waitForSelector('#shown', { state: 'hidden', timeout: 40 }))
      .rejects
      .toThrow(/still visible/)
  })
})
