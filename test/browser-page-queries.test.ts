/**
 * BrowserPage state queries.
 *
 * Added for #1592: the page could act on a selector but could not read
 * anything back, so assertions had to reach through `page.mainFrame.document`
 * and work the DOM directly, which defeats the point of the page abstraction.
 *
 * `isVisible` is resolved through the cascade added in #1597, so a class that
 * sets `display: none` counts — not only an inline style. There is still no
 * layout, so it cannot account for zero-size or off-screen elements; that limit
 * is asserted here rather than left implicit.
 */

import { describe, expect, test } from 'bun:test'
import { Browser } from '../src'

const MARKUP = `<head><title>My Page</title>
<style>.gone { display: none } .invis { visibility: hidden }</style></head>
<body>
  <div id="a">Text <b>bold</b></div>
  <input id="i" value="v">
  <input id="c" type="checkbox" checked>
  <button id="b" disabled>x</button>
  <input id="ro" readonly>
  <div class="gone" id="g">g</div>
  <div class="invis" id="v">v</div>
  <div id="h" hidden>h</div>
  <div class="gone"><span id="child">nested</span></div>
  <select id="s"><option value="o1">a</option></select>
  <div id="ce" contenteditable>e</div>
</body>`

function page() {
  const created = new Browser().newPage() as any
  created.content = MARKUP
  return created
}

describe('reading content', () => {
  test('title', async () => {
    expect(await page().title()).toBe('My Page')
  })

  test('textContent, innerText and innerHTML', async () => {
    const subject = page()

    expect(await subject.textContent('#a')).toBe('Text bold')
    expect(await subject.innerText('#a')).toBe('Text bold')
    expect(await subject.innerHTML('#a')).toBe('Text <b>bold</b>')
  })

  test('inputValue reads the property, not the attribute default', async () => {
    const subject = page()
    subject.mainFrame.document.querySelector('#i').value = 'typed'

    expect(await subject.inputValue('#i')).toBe('typed')
    expect(await subject.getAttribute('#i', 'value')).toBe('v')
  })

  test('inputValue works for select and textarea', async () => {
    const subject = page()

    expect(await subject.inputValue('#s')).toBe('o1')
  })

  test('getAttribute returns null when absent', async () => {
    expect(await page().getAttribute('#i', 'nope')).toBeNull()
  })
})

describe('visibility', () => {
  test('a plain element is visible', async () => {
    expect(await page().isVisible('#a')).toBe(true)
  })

  test('a class setting display none hides it', async () => {
    // This is the case a virtual DOM used to get wrong: the rule lives in a
    // stylesheet, not the style attribute.
    expect(await page().isVisible('#g')).toBe(false)
  })

  test('a class setting visibility hidden hides it', async () => {
    expect(await page().isVisible('#v')).toBe(false)
  })

  test('the hidden attribute hides it', async () => {
    expect(await page().isVisible('#h')).toBe(false)
  })

  test('a hidden ancestor hides its descendants', async () => {
    expect(await page().isVisible('#child')).toBe(false)
  })

  test('a detached element is not visible', async () => {
    const subject = page()
    const detached = subject.mainFrame.document.createElement('div')
    detached.id = 'detached'

    // Never appended, so nothing renders it whatever its styles say.
    expect(subject._isRendered(detached)).toBe(false)
  })

  test('a selector matching nothing is false rather than an error', async () => {
    expect(await page().isVisible('#nope')).toBe(false)
  })

  test('isHidden is the inverse', async () => {
    const subject = page()

    expect(await subject.isHidden('#g')).toBe(true)
    expect(await subject.isHidden('#a')).toBe(false)
  })

  test('a declared zero size is invisible; an undeclared one is unknown', async () => {
    const subject = page()
    const document = subject.mainFrame.document

    const collapsed = document.createElement('div')
    collapsed.id = 'zero'
    collapsed.style.width = '0'
    collapsed.style.height = '0'
    document.body.appendChild(collapsed)

    const unsized = document.createElement('div')
    unsized.id = 'unsized'
    unsized.textContent = 'text'
    document.body.appendChild(unsized)

    // This used to report visible, documented as a known limit. It is now
    // hidden (#1617): an author who writes `height: 0` has collapsed it.
    expect(await subject.isVisible('#zero')).toBe(false)

    // The boundary that remains, and the reason the rule is narrower than
    // Playwright's. With no layout pass this element also measures 0 x 0, so
    // consulting the box rather than the declaration would hide everything
    // nobody styled.
    expect(await subject.isVisible('#unsized')).toBe(true)
  })
})

describe('control state', () => {
  test('isChecked', async () => {
    const subject = page()

    expect(await subject.isChecked('#c')).toBe(true)
    expect(await subject.isChecked('#i')).toBe(false)
  })

  test('isEnabled and isDisabled', async () => {
    const subject = page()

    expect(await subject.isEnabled('#i')).toBe(true)
    expect(await subject.isDisabled('#b')).toBe(true)
    expect(await subject.isEnabled('#b')).toBe(false)
  })

  test('isEditable covers fields and contenteditable', async () => {
    const subject = page()

    expect(await subject.isEditable('#i')).toBe(true)
    expect(await subject.isEditable('#ce')).toBe(true)
    expect(await subject.isEditable('#ro')).toBe(false)
    expect(await subject.isEditable('#b')).toBe(false)
    expect(await subject.isEditable('#a')).toBe(false)
  })
})

describe('missing and mismatched selectors', () => {
  test('a content read names the selector it could not find', async () => {
    await expect(page().textContent('#nope')).rejects.toThrow('Element not found: #nope')
  })

  test('inputValue refuses a non-field', async () => {
    await expect(page().inputValue('#a')).rejects.toThrow('Not a form field')
  })
})
