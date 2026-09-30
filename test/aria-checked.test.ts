import { beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'
import { matchers } from '../src/matchers'
import '../src/matchers'

// =============================================================================
// Checked state is read through ARIA, not only the DOM property (#1616).
//
// A native <input type=checkbox> cannot be styled far enough for most component
// libraries, so a design system's checkbox is a div, span or button with
// role="checkbox" driving aria-checked. That attribute *is* the contract: it is
// what makes the element a checkbox to a screen reader.
//
// Three readers each compared `element.checked === true`, which is false for
// every custom control. The loud half was a failing toBeChecked(). The quiet
// half was worse: not.toBeChecked() and getByRole({ checked: false }) passed
// unconditionally, so "the box starts unticked" passed whether it did or not —
// and kept passing after the bug that left it ticked.
// =============================================================================

let page: any
let document: any

beforeEach(() => {
  page = new Browser().newPage()
  document = page.mainFrame.window.document
  page.setDefaultTimeout(200)
})

/** Call a matcher directly, to read its verdict instead of failing this test. */
function verdict(name: keyof typeof matchers, subject: any, ...args: any[]): Promise<any> {
  return (matchers[name] as any).call({ isNot: false }, subject, ...args)
}

const CUSTOM = '<div role="checkbox" aria-checked="true" id="c"></div>'
  + '<div role="switch" aria-checked="true" id="s"></div>'
  + '<div role="radio" aria-checked="true" id="r"></div>'

describe('isChecked reads aria-checked', () => {
  test('checkbox, switch and radio roles all report true', async () => {
    document.body.innerHTML = CUSTOM

    expect(await page.locator('#c').isChecked()).toBe(true)
    expect(await page.locator('#s').isChecked()).toBe(true)
    expect(await page.locator('#r').isChecked()).toBe(true)
  })

  test('aria-checked="false" reports false', async () => {
    document.body.innerHTML = '<div role="checkbox" aria-checked="false" id="c"></div>'

    expect(await page.locator('#c').isChecked()).toBe(false)
  })

  test('a checkbox role with no aria-checked is unchecked, not unknown', async () => {
    // The role is the author saying this is a checkbox, so absent means clear.
    document.body.innerHTML = '<div role="checkbox" id="c"></div>'

    expect(await page.locator('#c').isChecked()).toBe(false)
    expect(await page.locator('#c').checkedState()).toBe(false)
  })

  test('aria-checked on an element with no checkable role is ignored', async () => {
    // Not a checkbox, so there is nothing to be checked. `undefined` rather than
    // `false`, which is how the matcher can refuse instead of answering.
    document.body.innerHTML = '<div aria-checked="true" id="d"></div>'

    expect(await page.locator('#d').checkedState()).toBeUndefined()
    expect(await page.locator('#d').isChecked()).toBe(false)
  })

  test('the page-level isChecked agrees with the locator', async () => {
    // Two readers of the same state must not drift apart.
    document.body.innerHTML = CUSTOM

    expect(await page.isChecked('#c')).toBe(true)
    expect(await page.isChecked('#c')).toBe(await page.locator('#c').isChecked())
  })
})

describe('native controls are unchanged', () => {
  test('a checked input still reports true, unchecked false', async () => {
    document.body.innerHTML = '<input type="checkbox" id="a" checked>'
      + '<input type="radio" id="b" checked><input type="checkbox" id="c">'

    expect(await page.locator('#a').isChecked()).toBe(true)
    expect(await page.locator('#b').isChecked()).toBe(true)
    expect(await page.locator('#c').isChecked()).toBe(false)
  })

  test('the live property wins over aria-checked on a native input', async () => {
    // Duplicating what the browser already tracks; the browser's copy is live.
    document.body.innerHTML = '<input type="checkbox" id="x" aria-checked="true">'

    expect(await page.locator('#x').isChecked()).toBe(false)
  })

  test('a text input is not checkable at all', async () => {
    document.body.innerHTML = '<input type="text" id="t">'

    expect(await page.locator('#t').checkedState()).toBeUndefined()
  })
})

describe('tri-state', () => {
  test('mixed is neither checked nor unchecked', async () => {
    document.body.innerHTML = '<div role="checkbox" aria-checked="mixed" id="m"></div>'

    expect(await page.locator('#m').checkedState()).toBe('mixed')
    // isChecked returns a boolean and cannot say 'mixed', so it answers false.
    expect(await page.locator('#m').isChecked()).toBe(false)
  })

  test('toBeChecked({ indeterminate: true }) is how to ask about it', async () => {
    document.body.innerHTML = '<div role="checkbox" aria-checked="mixed" id="m"></div>'

    await expect(page.locator('#m')).toBeChecked({ indeterminate: true })
    await expect(page.locator('#m')).not.toBeChecked()
  })
})

describe('getByRole({ checked })', () => {
  test('selects a custom checkbox by its aria state', async () => {
    document.body.innerHTML = CUSTOM

    expect(await page.getByRole('checkbox', { checked: true }).count()).toBe(1)
    expect(await page.getByRole('switch', { checked: true }).count()).toBe(1)
  })

  test('checked: false no longer matches everything', async () => {
    // The unconditional pass: every custom checkbox used to look unchecked, so
    // this returned 1 whatever the aria state said.
    document.body.innerHTML = '<div role="checkbox" aria-checked="true" id="on"></div>'
      + '<div role="checkbox" aria-checked="false" id="off"></div>'

    expect(await page.getByRole('checkbox', { checked: false }).count()).toBe(1)
    expect(await page.getByRole('checkbox', { checked: false }).getAttribute('id')).toBe('off')
  })

  test('aria-selected is matched the same way', async () => {
    document.body.innerHTML = '<div role="tab" aria-selected="true" id="t1">One</div>'
      + '<div role="tab" aria-selected="false" id="t2">Two</div>'

    expect(await page.getByRole('tab', { selected: true }).count()).toBe(1)
    expect(await page.getByRole('tab', { selected: true }).textContent()).toBe('One')
  })

  test('a native <option selected> is still matched', async () => {
    document.body.innerHTML = '<select><option>a</option><option selected>b</option></select>'

    expect(await page.getByRole('option', { selected: true }).textContent()).toBe('b')
  })
})

describe('check() and uncheck() on a custom control', () => {
  /** A checkbox that keeps its own aria state, the way a component would. */
  function mountCustom(checked: boolean): number[] {
    document.body.innerHTML = `<div role="checkbox" tabindex="0" aria-checked="${checked}" id="c"></div>`
    const element = document.querySelector('#c')
    const clicks: number[] = []
    element.addEventListener('click', () => {
      clicks.push(clicks.length)
      element.setAttribute('aria-checked', element.getAttribute('aria-checked') === 'true' ? 'false' : 'true')
    })
    return clicks
  }

  test('check() does not click a control that is already ticked', async () => {
    // The bug in its most damaging form: check() read element.checked, saw
    // false, clicked, and turned the control OFF — the opposite of the promise.
    const clicks = mountCustom(true)

    await page.locator('#c').check()

    expect(clicks).toEqual([])
    expect(document.querySelector('#c').getAttribute('aria-checked')).toBe('true')
  })

  test('check() ticks one that is clear', async () => {
    const clicks = mountCustom(false)

    await page.locator('#c').check()

    expect(clicks).toEqual([0])
    expect(document.querySelector('#c').getAttribute('aria-checked')).toBe('true')
  })

  test('uncheck() clears a ticked control, and leaves a clear one alone', async () => {
    const clicks = mountCustom(true)
    await page.locator('#c').uncheck()
    expect(document.querySelector('#c').getAttribute('aria-checked')).toBe('false')

    await page.locator('#c').uncheck()
    expect(clicks).toEqual([0])
  })
})

describe('toBeChecked', () => {
  test('passes for a custom checkbox that is ticked', async () => {
    document.body.innerHTML = CUSTOM

    await expect(page.locator('#c')).toBeChecked()
    await expect(page.locator('#s')).toBeChecked()
  })

  test('not.toBeChecked fails against aria-checked="true"', async () => {
    // The assertion that used to pass unconditionally.
    document.body.innerHTML = CUSTOM

    const result = await (matchers.toBeChecked as any).call({ isNot: true }, page.locator('#c'), { timeout: 40 })
    expect(result.pass).toBe(true)
    expect(result.message()).toContain('Received: checked')
  })

  test('it refuses an element with no checked state rather than answering', async () => {
    // Answering `false` here would move the unconditional pass somewhere harder
    // to notice: `.not.toBeChecked()` on a <div> would always succeed.
    document.body.innerHTML = '<div id="d">plain</div>'

    await expect(verdict('toBeChecked', page.locator('#d'), { timeout: 5000 }))
      .rejects
      .toThrow(/expects a checkbox, radio or switch/)
  })

  test('refusing is immediate, not a timeout', async () => {
    document.body.innerHTML = '<div id="d">plain</div>'

    const started = Date.now()
    await verdict('toBeChecked', page.locator('#d'), { timeout: 5000 }).catch(() => {})
    expect(Date.now() - started).toBeLessThan(200)
  })

  test('it retries, so a control ticked on a later tick is caught', async () => {
    document.body.innerHTML = '<div role="checkbox" aria-checked="false" id="c"></div>'
    setTimeout(() => { document.querySelector('#c').setAttribute('aria-checked', 'true') }, 20)

    await expect(page.locator('#c')).toBeChecked()
  })
})
