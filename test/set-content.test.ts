import { beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'

// =============================================================================
// page.setContent() (#1610).
//
// `page.content` was a getter with no setter, so putting markup in a page meant
// reaching through three objects to mainFrame.window.document.body.innerHTML.
// That is not only verbose. It assumes there is a body, which is not true of a
// page whose document was replaced — the bug fixed in #1595 — and it skips what
// setContent does around the assignment: replacing the whole document, and firing
// the load events so an assertion straight afterwards is safe.
//
// Its absence was felt from inside this suite first: two test files opened with a
// local `render()` helper that was a setContent under another name, written twice
// because there was nothing to call. Both now call this.
// =============================================================================

let page: any
let document: any

beforeEach(() => {
  page = new Browser().newPage()
  document = page.mainFrame.window.document
  page.setDefaultTimeout(200)
})

describe('a fragment becomes the body', () => {
  test('markup is queryable with no wait in between', async () => {
    await page.setContent('<button>Save</button>')

    expect(await page.getByRole('button', { name: 'Save' }).count()).toBe(1)
  })

  test('content reports the whole document, wrapper included', async () => {
    // `page.content` serialises the document rather than echoing the input, so a
    // fragment comes back wrapped. Asserted as it is, since the wrapping is the
    // observable part of "a fragment becomes the body".
    await page.setContent('<p>hello</p>')

    expect(page.content).toBe('<html><head></head><body><p>hello</p></body></html>')
  })

  test('it replaces rather than appends', async () => {
    await page.setContent('<p id="first">one</p>')
    await page.setContent('<p id="second">two</p>')

    expect(document.querySelector('#first')).toBeNull()
    expect(document.querySelector('#second')).not.toBeNull()
  })
})

describe('a full document lands intact', () => {
  test('the head is honoured, not discarded', async () => {
    // The distinction from `body.innerHTML = ...`: this is where a full document
    // string used to end up in the wrong place.
    await page.setContent('<!DOCTYPE html><html><head><title>Trails</title></head><body><h1>Hi</h1></body></html>')

    expect(document.title).toBe('Trails')
    expect(await page.getByRole('heading').textContent()).toBe('Hi')
  })

  test('a stylesheet in the head reaches the cascade', async () => {
    await page.setContent('<html><head><style>.box { width: 120px }</style></head>'
      + '<body><div class="box" id="b"></div></body></html>')

    expect(document.querySelector('#b').getBoundingClientRect().width).toBe(120)
  })

  test('head and body are rebuilt, not left stale', async () => {
    // #1595's failure mode, which the reach-through is exposed to and this is not.
    await page.setContent('<html><head><title>One</title></head><body><p>a</p></body></html>')
    const firstBody = document.body

    await page.setContent('<html><head><title>Two</title></head><body><p>b</p></body></html>')

    expect(document.title).toBe('Two')
    expect(document.body.textContent).toBe('b')
    expect(document.body).not.toBe(firstBody)
  })
})

describe('the load events fire', () => {
  test('domcontentloaded then load, in that order', async () => {
    const order: string[] = []
    page.on('domcontentloaded', () => order.push('domcontentloaded'))
    page.on('load', () => order.push('load'))

    await page.setContent('<p>ok</p>')

    expect(order).toEqual(['domcontentloaded', 'load'])
  })

  test('readyState ends up complete, so waitForLoadState returns at once', async () => {
    await page.setContent('<p>ok</p>')

    expect(document.readyState).toBe('complete')

    const started = Date.now()
    await page.waitForLoadState('load')
    expect(Date.now() - started).toBeLessThan(30)
  })
})

describe('the URL is left alone', () => {
  test('setting content is not navigating', async () => {
    // Rewriting the URL would make toHaveURL disagree with where the page is.
    page.route('https://example.test/**', (route: any) =>
      route.fulfill({ status: 200, body: '<html><body>ok</body></html>', contentType: 'text/html' }))
    await page.goto('https://example.test/trails')

    await page.setContent('<p>replaced</p>')

    expect(page.url).toBe('https://example.test/trails')
    await page.unroute()
  })
})

describe('it is the same parse path a navigation uses', () => {
  test('a fragment and a navigation to the same markup agree', async () => {
    // One HTML entry point. Two that disagreed about how a fragment is wrapped
    // would be a new class of bug.
    await page.setContent('<div class="a">x</div>')
    const fromSetContent = document.documentElement.innerHTML

    page.route('https://example.test/**', (route: any) =>
      route.fulfill({ status: 200, body: '<div class="a">x</div>', contentType: 'text/html' }))
    await page.goto('https://example.test/')
    const fromNavigation = document.documentElement.innerHTML
    await page.unroute()

    expect(fromSetContent).toBe(fromNavigation)
  })
})
