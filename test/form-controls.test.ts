import { beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'

// =============================================================================
// Form-control actions (#1608).
//
// <select> and <input type=file> are the two controls with no reasonable
// hand-rolled substitute. Setting `select.value` does not fire `change`, so a
// component listening for it never updates and the test passes against a DOM the
// application never saw. Assigning `input.files` needs a FileList, which is why
// Playwright has a method for it at all.
//
// `press` matters for the keys that are behaviour rather than text: Enter to
// submit, Escape to close, Tab to move focus. `page.keyboard` can reach them, but
// only against whatever already has focus, so the call site becomes
// focus-then-press and the focus half is the easy part to forget.
// =============================================================================

let page: any
let document: any

beforeEach(() => {
  page = new Browser().newPage()
  document = page.mainFrame.window.document
  page.setDefaultTimeout(200)
})

const SELECT = '<select id="s">'
  + '<option value="a">Alpha</option>'
  + '<option value="b">Beta</option>'
  + '<option value="c">Gamma</option>'
  + '</select>'

/** Record input/change so a silent mutation cannot pass for an interaction. */
function watchEvents(selector: string): string[] {
  const order: string[] = []
  const element = document.querySelector(selector)
  for (const type of ['input', 'change'])
    element.addEventListener(type, () => order.push(type))
  return order
}

describe('selectOption', () => {
  test('a bare string selects by value, and reports what was chosen', async () => {
    document.body.innerHTML = SELECT

    expect(await page.locator('#s').selectOption('b')).toEqual(['b'])
    expect(document.querySelector('#s').value).toBe('b')
  })

  test('it fires input then change, in that order', async () => {
    // The whole reason this method exists. A component reading
    // event.target.value only hears about it through change.
    document.body.innerHTML = SELECT
    const order = watchEvents('#s')
    let heard = ''
    document.querySelector('#s').addEventListener('change', (event: any) => { heard = event.target.value })

    await page.locator('#s').selectOption('c')

    expect(order).toEqual(['input', 'change'])
    expect(heard).toBe('c')
  })

  test('{ label } matches the option text', async () => {
    document.body.innerHTML = SELECT

    expect(await page.locator('#s').selectOption({ label: 'Gamma' })).toEqual(['c'])
  })

  test('{ index } and { value } both work', async () => {
    document.body.innerHTML = SELECT

    expect(await page.locator('#s').selectOption({ index: 1 })).toEqual(['b'])
    expect(await page.locator('#s').selectOption({ value: 'a' })).toEqual(['a'])
  })

  test('several values on a multiple select', async () => {
    document.body.innerHTML = '<select id="m" multiple>'
      + '<option value="x">X</option><option value="y">Y</option><option value="z">Z</option></select>'

    expect(await page.locator('#m').selectOption(['x', 'z'])).toEqual(['x', 'z'])
    expect([...document.querySelectorAll('#m option')].map((o: any) => o.selected)).toEqual([true, false, true])
  })

  test('several values on a single select is refused, not silently truncated', async () => {
    // Taking the last would leave the test asserting against a selection it
    // never asked for.
    document.body.innerHTML = SELECT

    await expect(page.locator('#s').selectOption(['a', 'b']))
      .rejects
      .toThrow(/not multiple/)
  })

  test('a value that matches nothing is an error', async () => {
    document.body.innerHTML = SELECT

    await expect(page.locator('#s').selectOption('nope')).rejects.toThrow(/no <option> matching/)
  })

  test('null deselects everything', async () => {
    document.body.innerHTML = '<select id="m" multiple><option value="x" selected>X</option></select>'

    expect(await page.locator('#m').selectOption(null)).toEqual([])
    expect(document.querySelector('#m option').selected).toBe(false)
  })

  test('a previous selection is replaced, not added to', async () => {
    document.body.innerHTML = SELECT

    await page.locator('#s').selectOption('b')
    await page.locator('#s').selectOption('c')

    expect([...document.querySelectorAll('#s option')].map((o: any) => o.selected)).toEqual([false, false, true])
  })

  test('it refuses something that is not a select', async () => {
    document.body.innerHTML = '<input id="i">'

    await expect(page.locator('#i').selectOption('a')).rejects.toThrow(/expects a <select>/)
  })

  test('the page-level form agrees', async () => {
    document.body.innerHTML = SELECT

    expect(await page.selectOption('#s', 'b')).toEqual(['b'])
  })
})

describe('setInputFiles', () => {
  test('bytes become a FileList and fire change', async () => {
    document.body.innerHTML = '<input type="file" id="f">'
    const order = watchEvents('#f')

    await page.locator('#f').setInputFiles({ name: 'trail.gpx', mimeType: 'application/gpx+xml', buffer: '<gpx/>' })

    const files = document.querySelector('#f').files
    expect(files.length).toBe(1)
    expect(files.item(0).name).toBe('trail.gpx')
    expect(files.item(0).type).toBe('application/gpx+xml')
    expect(order).toEqual(['input', 'change'])
  })

  test('the bytes survive, so a reader sees the content', async () => {
    document.body.innerHTML = '<input type="file" id="f">'

    await page.locator('#f').setInputFiles({ name: 'note.txt', buffer: 'hello' })

    expect(await document.querySelector('#f').files.item(0).text()).toBe('hello')
  })

  test('a path is read from disk', async () => {
    const path = `${process.env.TMPDIR ?? '/tmp'}/vhd-setinputfiles-${crypto.randomUUID()}.txt`
    await Bun.write(path, 'from disk')
    document.body.innerHTML = '<input type="file" id="f">'

    try {
      await page.locator('#f').setInputFiles(path)

      const file = document.querySelector('#f').files.item(0)
      expect(file.name.startsWith('vhd-setinputfiles-')).toBe(true)
      expect(await file.text()).toBe('from disk')
    }
    finally {
      await Bun.file(path).unlink()
    }
  })

  test('several files need the multiple attribute', async () => {
    document.body.innerHTML = '<input type="file" id="f">'

    await expect(page.locator('#f').setInputFiles([
      { name: 'a.txt', buffer: 'a' },
      { name: 'b.txt', buffer: 'b' },
    ])).rejects.toThrow(/not multiple/)
  })

  test('several files on a multiple input', async () => {
    document.body.innerHTML = '<input type="file" id="f" multiple>'

    await page.locator('#f').setInputFiles([
      { name: 'a.txt', buffer: 'a' },
      { name: 'b.txt', buffer: 'b' },
    ])

    expect(document.querySelector('#f').files.length).toBe(2)
  })

  test('null clears the selection', async () => {
    document.body.innerHTML = '<input type="file" id="f">'
    await page.locator('#f').setInputFiles({ name: 'a.txt', buffer: 'a' })

    await page.locator('#f').setInputFiles(null)

    expect(document.querySelector('#f').files.length).toBe(0)
  })

  test('it refuses an input that is not type=file', async () => {
    document.body.innerHTML = '<input type="text" id="t">'

    await expect(page.locator('#t').setInputFiles({ name: 'a', buffer: 'a' }))
      .rejects
      .toThrow(/expects an <input type="file">/)
  })
})

describe('press', () => {
  test('it focuses the element first', async () => {
    // page.keyboard only reaches whatever already has focus, which is the half
    // that is easy to forget at a call site.
    document.body.innerHTML = '<input id="a"><input id="b">'
    const keys: string[] = []
    document.querySelector('#b').addEventListener('keydown', (e: any) => keys.push(e.key))

    await page.locator('#b').press('Enter')

    expect(keys).toEqual(['Enter'])
    expect(document.activeElement.id).toBe('b')
  })

  test('a modifier combination goes through the shared parsing', async () => {
    document.body.innerHTML = '<input id="i">'
    const seen: Array<{ key: string, ctrl: boolean }> = []
    document.querySelector('#i').addEventListener('keydown', (e: any) => seen.push({ key: e.key, ctrl: e.ctrlKey }))

    await page.locator('#i').press('Control+Enter')

    expect(seen).toContainEqual({ key: 'Enter', ctrl: true })
  })

  test('Enter on a field inside a form reaches a submit handler', async () => {
    document.body.innerHTML = '<form id="f"><input id="i"></form>'
    const keys: string[] = []
    document.querySelector('#f').addEventListener('keydown', (e: any) => keys.push(e.key))

    await page.locator('#i').press('Enter')

    // Bubbles to the form, which is how a submit-on-enter handler hears it.
    expect(keys).toEqual(['Enter'])
  })

  test('the page-level form works too', async () => {
    document.body.innerHTML = '<input id="i">'
    const keys: string[] = []
    document.querySelector('#i').addEventListener('keydown', (e: any) => keys.push(e.key))

    await page.press('#i', 'Escape')

    expect(keys).toEqual(['Escape'])
  })
})

describe('clear, dblclick and setChecked', () => {
  test('clear empties a field and fires the same events fill does', async () => {
    document.body.innerHTML = '<input id="i" value="something">'
    const order = watchEvents('#i')

    await page.locator('#i').clear()

    expect(document.querySelector('#i').value).toBe('')
    expect(order).toEqual(['input', 'change'])
  })

  test('dblclick fires two clicks and a dblclick', async () => {
    // The dblclick is the part two click() calls does not give, and it is the
    // one a double-click handler listens for.
    document.body.innerHTML = '<button id="b">Go</button>'
    const order: string[] = []
    for (const type of ['click', 'dblclick'])
      document.querySelector('#b').addEventListener(type, () => order.push(type))

    await page.locator('#b').dblclick()

    expect(order).toEqual(['click', 'click', 'dblclick'])
  })

  test('setChecked ticks and unticks', async () => {
    document.body.innerHTML = '<input type="checkbox" id="c">'

    await page.locator('#c').setChecked(true)
    expect(document.querySelector('#c').checked).toBe(true)

    await page.locator('#c').setChecked(false)
    expect(document.querySelector('#c').checked).toBe(false)
  })

  test('page.check reads aria state, like the locator does', async () => {
    // Shares the predicate from #1616, so the two cannot disagree.
    document.body.innerHTML = '<div role="checkbox" aria-checked="true" id="c"></div>'
    const clicks: string[] = []
    document.querySelector('#c').addEventListener('click', () => clicks.push('click'))

    await page.check('#c')

    expect(clicks).toEqual([])
  })
})
