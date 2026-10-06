import { beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'
import { matchers } from '../src/matchers'
import '../src/matchers'

// =============================================================================
// The second matcher batch (#1618).
//
// toHaveRole and toHaveAccessibleName are the two that pull their weight: they
// assert the thing getByRole queries on. A role query that finds nothing tells
// you nothing about why, and the obvious next question — what role does this
// element actually have, and what name does it compute? — had to be asked through
// a plain expect, losing the retry.
//
// toBeInViewport is registered now. It was withheld while every box sat at the
// origin, when it could only ever answer "yes" — the silent-pass failure #1602
// was about. The layout pass gave positions, so the tests at the bottom check it
// can answer no.
// =============================================================================

let page: any
let document: any

beforeEach(() => {
  page = new Browser().newPage()
  document = page.mainFrame.window.document
  page.setDefaultTimeout(200)
})

function verdict(name: keyof typeof matchers, subject: any, ...args: any[]): Promise<any> {
  return (matchers[name] as any).call({ isNot: false }, subject, ...args)
}

describe('toHaveRole', () => {
  test('the implicit role of a native element', async () => {
    await page.setContent('<button id="b">Save</button><a href="/x" id="l">Link</a><h2 id="h">Title</h2>')

    await expect(page.locator('#b')).toHaveRole('button')
    await expect(page.locator('#l')).toHaveRole('link')
    await expect(page.locator('#h')).toHaveRole('heading')
  })

  test('an explicit role wins', async () => {
    await page.setContent('<div role="checkbox" id="c"></div>')

    await expect(page.locator('#c')).toHaveRole('checkbox')
    await expect(page.locator('#c')).not.toHaveRole('generic')
  })

  test('it agrees with getByRole about the same element', async () => {
    // A query and an assertion about the same role must not disagree.
    await page.setContent('<input type="submit" value="Send" id="s">')

    await expect(page.locator('#s')).toHaveRole('button')
    expect(await page.getByRole('button', { name: 'Send' }).count()).toBe(1)
  })

  test('an element with no role says so', async () => {
    await page.setContent('<a id="a">no href</a>')

    const result = await verdict('toHaveRole', page.locator('#a'), 'link', { timeout: 40 })

    expect(result.pass).toBe(false)
    expect(result.message()).toContain('Received: no role')
  })

  test('it retries', async () => {
    await page.setContent('<div id="c"></div>')
    setTimeout(() => { document.querySelector('#c').setAttribute('role', 'alert') }, 20)

    await expect(page.locator('#c')).toHaveRole('alert')
  })
})

describe('toHaveAccessibleName', () => {
  test('from the element text, an aria-label, and a native label', async () => {
    await page.setContent('<button id="b">Save changes</button>'
      + '<button id="l" aria-label="Close dialog">x</button>'
      + '<label for="e">Email</label><input id="e">')

    await expect(page.locator('#b')).toHaveAccessibleName('Save changes')
    await expect(page.locator('#l')).toHaveAccessibleName('Close dialog')
    await expect(page.locator('#e')).toHaveAccessibleName('Email')
  })

  test('a RegExp and an inexact match', async () => {
    await page.setContent('<button id="b">Save changes</button>')

    await expect(page.locator('#b')).toHaveAccessibleName(/^Save/)
    await expect(page.locator('#b')).toHaveAccessibleName('Save', { exact: false })
    // Exact is the default, as in Playwright.
    await expect(page.locator('#b')).not.toHaveAccessibleName('Save', { timeout: 40 })
  })

  test('it explains a failing role query', async () => {
    // The reason this matcher earns its place.
    await page.setContent('<button id="b" aria-label="Remove">Delete</button>')

    expect(await page.getByRole('button', { name: 'Delete' }).count()).toBe(0)
    await expect(page.locator('#b')).toHaveAccessibleName('Remove')
  })
})

describe('toHaveAccessibleDescription', () => {
  test('from aria-describedby', async () => {
    await page.setContent('<span id="hint">Pick a trail from the list</span>'
      + '<input id="i" aria-describedby="hint">')

    await expect(page.locator('#i')).toHaveAccessibleDescription('Pick a trail from the list')
  })

  test('from aria-description, and from title', async () => {
    await page.setContent('<input id="a" aria-description="Inline hint">'
      + '<button id="b" title="Tooltip">Go</button>')

    await expect(page.locator('#a')).toHaveAccessibleDescription('Inline hint')
    await expect(page.locator('#b')).toHaveAccessibleDescription('Tooltip')
  })

  test('a title already serving as the name is not also the description', async () => {
    // The same string answering both questions would be worse than an empty one.
    await page.setContent('<span id="s" title="Only text"></span>')

    expect(await page.locator('#s').accessibleName()).toBe('Only text')
    expect(await page.locator('#s').accessibleDescription()).toBe('')
  })
})

describe('toHaveCSS', () => {
  test('a value from a stylesheet, since the cascade resolves it', async () => {
    await page.setContent('<head><style>.b { color: rgb(1, 2, 3); display: flex }</style></head>'
      + '<body><div class="b" id="b"></div></body>')

    await expect(page.locator('#b')).toHaveCSS('color', 'rgb(1, 2, 3)')
    await expect(page.locator('#b')).toHaveCSS('display', 'flex')
  })

  test('values are compared as the engine reports them', async () => {
    // The mistake everyone makes first, so the message says what happened rather
    // than leaving a bare mismatch.
    await page.setContent('<head><style>.b { color: rgb(255, 0, 0) }</style></head>'
      + '<body><div class="b" id="b"></div></body>')

    const result = await verdict('toHaveCSS', page.locator('#b'), 'color', 'red', { timeout: 40 })

    expect(result.pass).toBe(false)
    expect(result.message()).toContain('not normalised')
  })

  test('a RegExp sidesteps the exact form', async () => {
    await page.setContent('<head><style>.b { color: rgb(255, 0, 0) }</style></head>'
      + '<body><div class="b" id="b"></div></body>')

    await expect(page.locator('#b')).toHaveCSS('color', /^rgb\(255/)
  })

  test('it retries, so a class added later is seen', async () => {
    await page.setContent('<head><style>.on { display: none }</style></head><body><div id="b"></div></body>')
    setTimeout(() => { document.querySelector('#b').className = 'on' }, 20)

    await expect(page.locator('#b')).toHaveCSS('display', 'none')
  })
})

describe('toHaveId and toHaveJSProperty', () => {
  test('toHaveId', async () => {
    await page.setContent('<div id="panel"></div>')

    await expect(page.locator('#panel')).toHaveId('panel')
    await expect(page.locator('#panel')).toHaveId(/^pan/)
    await expect(page.locator('#panel')).not.toHaveId('other', { timeout: 40 })
  })

  test('toHaveJSProperty reads a plain property', async () => {
    await page.setContent('<input id="i" value="typed">')

    await expect(page.locator('#i')).toHaveJSProperty('value', 'typed')
    await expect(page.locator('#i')).toHaveJSProperty('disabled', false)
  })

  test('toHaveJSProperty reaches a nested path', async () => {
    // `validity.valid` is the case Playwright's docs use.
    await page.setContent('<input id="i" required>')

    await expect(page.locator('#i')).toHaveJSProperty('validity.valueMissing', true)
  })
})

describe('toHaveValues', () => {
  test('every selected value of a multiple select', async () => {
    await page.setContent('<select id="m" multiple>'
      + '<option value="x">X</option><option value="y">Y</option><option value="z">Z</option></select>')

    await page.locator('#m').selectOption(['x', 'z'])

    await expect(page.locator('#m')).toHaveValues(['x', 'z'])
  })

  test('order and count both matter', async () => {
    await page.setContent('<select id="m" multiple>'
      + '<option value="x">X</option><option value="y">Y</option></select>')
    await page.locator('#m').selectOption(['x'])

    await expect(page.locator('#m')).not.toHaveValues(['x', 'y'], { timeout: 40 })
  })

  test('a RegExp per value', async () => {
    await page.setContent('<select id="m" multiple><option value="trail-7">A</option></select>')
    await page.locator('#m').selectOption(['trail-7'])

    await expect(page.locator('#m')).toHaveValues([/^trail-\d+$/])
  })
})

describe('toBeInViewport', () => {
  // Withheld while there was no layout pass: every box sat at the origin, so
  // the matcher could only ever answer "yes" — a silent pass wearing an
  // assertion's clothes. Positions are computed now, and these check it can
  // say no, which is the only thing that made it worth adding.
  test('an element on screen passes', async () => {
    await page.setContent('<body><div id="a" style="width: 10px; height: 10px"></div></body>')

    await expect(verdict('toBeInViewport', page.locator('#a'))).resolves.toMatchObject({ pass: true })
  })

  test('an element pushed past the bottom of the viewport fails', async () => {
    // The viewport is 768 tall by default.
    await page.setContent('<body><div style="height: 2000px"></div>'
      + '<div id="below" style="width: 10px; height: 10px"></div></body>')

    const box = await page.locator('#below').boundingBox()
    expect(box!.y).toBeGreaterThan(768)

    await expect(verdict('toBeInViewport', page.locator('#below'))).resolves.toMatchObject({ pass: false })
  })

  test('a ratio asks for more than a sliver', async () => {
    // Starts 8px above the fold, so a tenth of its height is visible.
    await page.setContent('<body><div style="height: 758px"></div>'
      + '<div id="edge" style="width: 10px; height: 100px"></div></body>')

    await expect(verdict('toBeInViewport', page.locator('#edge'))).resolves.toMatchObject({ pass: true })
    await expect(verdict('toBeInViewport', page.locator('#edge'), { ratio: 0.5 })).resolves.toMatchObject({ pass: false })
  })

  test('a hidden element is not in the viewport', async () => {
    await page.setContent('<body><div id="a" style="display: none; width: 10px; height: 10px"></div></body>')

    await expect(verdict('toBeInViewport', page.locator('#a'))).resolves.toMatchObject({ pass: false })
  })
})
