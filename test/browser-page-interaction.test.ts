/**
 * BrowserPage input interaction.
 *
 * Regression guard for #1588: `type()` wrote the `value` *attribute* and
 * dispatched nothing, so the field appeared to change while `element.value` did
 * not and no listener ran — reactive forms never saw the input. `focus()` only
 * dispatched an event, leaving `document.activeElement` untouched, so anything
 * reading it disagreed with the event that had just fired. `keyboard.press`
 * dispatched on the document regardless of focus and inserted no text.
 */

import { describe, expect, test } from 'bun:test'
import { Browser } from '../src'

function pageWith(html: string) {
  const page = new Browser().newPage() as any
  page.content = `<body>${html}</body>`
  return { page, document: page.mainFrame.document as any }
}

describe('type', () => {
  test('sets the value property and fires input per character', async () => {
    const { page, document } = pageWith('<input id="name">')
    const input = document.querySelector('#name')
    let inputEvents = 0
    input.addEventListener('input', () => inputEvents++)

    await page.type('#name', 'Ada')

    expect(input.value).toBe('Ada')
    expect(inputEvents).toBe(3)
  })

  test('leaves the value attribute alone', async () => {
    const { page, document } = pageWith('<input id="name">')

    await page.type('#name', 'Ada')

    // The attribute is the field's default, not the current value.
    expect(document.querySelector('#name').getAttribute('value')).toBeNull()
  })

  test('focuses the target', async () => {
    const { page, document } = pageWith('<input id="name">')

    await page.type('#name', 'Ada')

    expect(document.activeElement).toBe(document.querySelector('#name'))
  })

  test('emits keyboard events carrying the character', async () => {
    const { page, document } = pageWith('<input id="name">')
    const keys: string[] = []
    const ups: string[] = []
    document.querySelector('#name').addEventListener('keydown', (event: any) => keys.push(event.key))
    document.querySelector('#name').addEventListener('keyup', (event: any) => ups.push(event.key))

    await page.type('#name', 'Ada')

    expect(keys).toEqual(['A', 'd', 'a'])
    expect(ups).toEqual(['A', 'd', 'a'])
  })

  test('emits beforeinput ahead of input', async () => {
    const { page, document } = pageWith('<input id="name">')
    const order: string[] = []
    const input = document.querySelector('#name')
    input.addEventListener('beforeinput', () => order.push('beforeinput'))
    input.addEventListener('input', () => order.push('input'))

    await page.type('#name', 'a')

    expect(order).toEqual(['beforeinput', 'input'])
  })

  test('appends to a value that was assigned programmatically', async () => {
    const { page, document } = pageWith('<input id="name" value="default">')
    const input = document.querySelector('#name')
    input.value = 'Set '

    // Reading the attribute here would have lost the assignment entirely.
    await page.type('#name', 'Ada')

    expect(input.value).toBe('Set Ada')
  })

  test('types into a textarea', async () => {
    const { page, document } = pageWith('<textarea id="t"></textarea>')

    await page.type('#t', 'abc')

    expect(document.querySelector('#t').value).toBe('abc')
  })

  test('types into a contenteditable element as text', async () => {
    const { page, document } = pageWith('<div id="d" contenteditable></div>')

    await page.type('#d', 'xy')

    expect(document.querySelector('#d').textContent).toBe('xy')
  })
})

describe('fill', () => {
  test('replaces the value and fires input once', async () => {
    const { page, document } = pageWith('<input id="name" value="old">')
    const input = document.querySelector('#name')
    let inputEvents = 0
    input.addEventListener('input', () => inputEvents++)

    await page.fill('#name', 'new value')

    expect(input.value).toBe('new value')
    expect(inputEvents).toBe(1)
  })

  test('fires change and focuses the field', async () => {
    const { page, document } = pageWith('<input id="name">')
    let changes = 0
    document.querySelector('#name').addEventListener('change', () => changes++)

    await page.fill('#name', 'x')

    expect(changes).toBe(1)
    expect(document.activeElement).toBe(document.querySelector('#name'))
  })
})

describe('focus and blur', () => {
  test('focus sets activeElement and fires the event', async () => {
    const { page, document } = pageWith('<input id="a">')
    let focuses = 0
    document.querySelector('#a').addEventListener('focus', () => focuses++)

    await page.focus('#a')

    expect(document.activeElement).toBe(document.querySelector('#a'))
    expect(focuses).toBe(1)
  })

  test('blur gives up focus', async () => {
    const { page, document } = pageWith('<input id="a">')

    await page.focus('#a')
    await page.blur('#a')

    expect(document.activeElement).not.toBe(document.querySelector('#a'))
  })
})

describe('click', () => {
  test('fires click and focuses the target', async () => {
    const { page, document } = pageWith('<button id="b">go</button>')
    let clicks = 0
    document.querySelector('#b').addEventListener('click', () => clicks++)

    await page.click('#b')

    expect(clicks).toBe(1)
    expect(document.activeElement).toBe(document.querySelector('#b'))
  })

  test('reports a selector that matches nothing', async () => {
    const { page } = pageWith('<button id="b">go</button>')

    await expect(page.click('#missing')).rejects.toThrow('Element not found: #missing')
  })
})

describe('keyboard', () => {
  test('delivers to the focused element, not the document', async () => {
    const { page, document } = pageWith('<input id="n">')
    const seen: string[] = []
    document.querySelector('#n').addEventListener('keydown', (event: any) => seen.push(event.key))

    await page.focus('#n')
    await page.keyboard.press('a')

    expect(seen).toEqual(['a'])
  })

  test('type inserts the text into the focused field', async () => {
    const { page, document } = pageWith('<input id="n">')

    await page.focus('#n')
    await page.keyboard.type('hey')

    expect(document.querySelector('#n').value).toBe('hey')
  })

  test('Backspace removes the last character', async () => {
    const { page, document } = pageWith('<input id="n">')

    await page.focus('#n')
    await page.keyboard.type('hey')
    await page.keyboard.press('Backspace')

    expect(document.querySelector('#n').value).toBe('he')
  })

  test('Backspace on an empty field is harmless', async () => {
    const { page, document } = pageWith('<input id="n">')

    await page.focus('#n')
    await page.keyboard.press('Backspace')

    expect(document.querySelector('#n').value).toBe('')
  })

  test('a named key does not insert itself as text', async () => {
    const { page, document } = pageWith('<input id="n">')

    await page.focus('#n')
    await page.keyboard.press('Enter')

    expect(document.querySelector('#n').value).toBe('')
  })
})
