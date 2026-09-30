import { beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'
import { codeFor, parseCombination } from '../src/browser/keys'

// =============================================================================
// Modifier combinations and `code` (#1615).
//
// `press('Control+a')` dispatched a keydown whose `key` was the literal string
// 'Control+a' with every modifier flag false. No real KeyboardEvent can carry
// that value, so a handler checking `key === 'a' && ctrlKey` did not match — and
// nothing reported a problem. The press resolved, an event fired, and the test
// asserted that nothing happened, which was true.
//
// `code` was always '', so a handler reading the physical key never matched
// either.
// =============================================================================

let page: any
let document: any
let seen: Array<Record<string, unknown>>

beforeEach(() => {
  page = new Browser().newPage()
  document = page.mainFrame.window.document
  document.body.innerHTML = '<input id="i">'
  seen = []
})

/** Record every keyboard event reaching the field. */
async function watch(): Promise<void> {
  const element = document.querySelector('#i')
  for (const type of ['keydown', 'keyup']) {
    element.addEventListener(type, (event: any) => seen.push({
      type,
      key: event.key,
      code: event.code,
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey,
    }))
  }
  await page.locator('#i').focus()
}

const keys = () => seen.map(e => `${e.type}:${e.key}`)

describe('a combination sets the flag and reports the real key', () => {
  test('Control+a', async () => {
    await watch()

    await page.keyboard.press('Control+a')

    const pressed = seen.find(e => e.type === 'keydown' && e.key === 'a')
    expect(pressed).toBeDefined()
    expect(pressed!.ctrl).toBe(true)
    // The value that used to arrive, and which no browser can produce.
    expect(seen.some(e => e.key === 'Control+a')).toBe(false)
  })

  test('the modifier is pressed before the key and released after', async () => {
    await watch()

    await page.keyboard.press('Control+a')

    expect(keys()).toEqual(['keydown:Control', 'keydown:a', 'keyup:a', 'keyup:Control'])
  })

  test('several modifiers, released in reverse', async () => {
    await watch()

    await page.keyboard.press('Control+Shift+z')

    expect(keys()).toEqual([
      'keydown:Control',
      'keydown:Shift',
      'keydown:Z',
      'keyup:Z',
      'keyup:Shift',
      'keyup:Control',
    ])
    const pressed = seen.find(e => e.key === 'Z' && e.type === 'keydown')
    expect({ ctrl: pressed!.ctrl, shift: pressed!.shift }).toEqual({ ctrl: true, shift: true })
  })

  test('Meta, Cmd and Command are the same modifier', async () => {
    await watch()

    for (const spelling of ['Meta+k', 'Cmd+k', 'Command+k'])
      await page.keyboard.press(spelling)

    const downs = seen.filter(e => e.type === 'keydown' && e.key === 'k')
    expect(downs).toHaveLength(3)
    expect(downs.every(e => e.meta === true)).toBe(true)
  })

  test('Ctrl is Control, and Option is Alt', async () => {
    await watch()

    await page.keyboard.press('Ctrl+s')
    await page.keyboard.press('Option+s')

    const downs = seen.filter(e => e.type === 'keydown' && e.key === 's')
    expect(downs.map(e => ({ ctrl: e.ctrl, alt: e.alt })))
      .toEqual([{ ctrl: true, alt: false }, { ctrl: false, alt: true }])
  })

  test('Shift+Tab reports Tab with shift held', async () => {
    await watch()

    await page.keyboard.press('Shift+Tab')

    const pressed = seen.find(e => e.type === 'keydown' && e.key === 'Tab')
    expect(pressed!.shift).toBe(true)
  })

  test('releasing a modifier reports its own flag as cleared', async () => {
    // A browser reports ctrlKey false on the keyup of Control itself.
    await watch()

    await page.keyboard.press('Control+a')

    expect(seen.find(e => e.type === 'keyup' && e.key === 'Control')!.ctrl).toBe(false)
  })
})

describe('a plain key is untouched', () => {
  test('Enter still reports Enter', async () => {
    await watch()

    await page.keyboard.press('Enter')

    expect(keys()).toEqual(['keydown:Enter', 'keyup:Enter'])
    expect(seen.every(e => e.ctrl === false && e.shift === false)).toBe(true)
  })

  test('an unrecognised prefix is left as a literal key', async () => {
    // The guard that keeps the parsing from reinterpreting key names: only a
    // known modifier is consumed, so nonsense stays nonsense rather than
    // silently becoming something else.
    expect(parseCombination('a+b')).toEqual({ held: [], key: 'a+b' })
    expect(parseCombination('Enter')).toEqual({ held: [], key: 'Enter' })
  })

  test('a bare plus is a key', async () => {
    expect(parseCombination('+')).toEqual({ held: [], key: '+' })
    expect(parseCombination('Shift++')).toEqual({ held: ['Shift'], key: '+' })
  })
})

describe('code is populated', () => {
  test('letters, digits, named keys and punctuation', () => {
    expect(codeFor('a')).toBe('KeyA')
    expect(codeFor('A')).toBe('KeyA')
    expect(codeFor('1')).toBe('Digit1')
    expect(codeFor('Enter')).toBe('Enter')
    expect(codeFor('Tab')).toBe('Tab')
    expect(codeFor('ArrowDown')).toBe('ArrowDown')
    expect(codeFor('F5')).toBe('F5')
    expect(codeFor(' ')).toBe('Space')
    expect(codeFor('-')).toBe('Minus')
    expect(codeFor('/')).toBe('Slash')
  })

  test('a modifier names its physical side', () => {
    expect(codeFor('Shift')).toBe('ShiftLeft')
    expect(codeFor('Control')).toBe('ControlLeft')
  })

  test('an unknown key stays empty rather than being guessed at', () => {
    expect(codeFor('Unobtanium')).toBe('')
  })

  test('the event carries it', async () => {
    await watch()

    await page.keyboard.press('Control+a')

    expect(seen.find(e => e.key === 'a')!.code).toBe('KeyA')
    expect(seen.find(e => e.key === 'Control')!.code).toBe('ControlLeft')
  })
})

describe('what gets typed', () => {
  test('a modified key does not insert text', async () => {
    // Control+A selects; it does not type an "a". Inserting one is how a test
    // asserting "the field was replaced" would silently check the wrong thing.
    await page.locator('#i').fill('hello')
    await page.locator('#i').focus()

    await page.keyboard.press('Control+a')

    expect(document.querySelector('#i').value).toBe('hello')
  })

  test('Shift inserts the capital', async () => {
    await page.locator('#i').focus()

    await page.keyboard.press('Shift+a')

    expect(document.querySelector('#i').value).toBe('A')
  })

  test('an unmodified key still types', async () => {
    await page.locator('#i').focus()

    await page.keyboard.press('a')
    await page.keyboard.type('bc')

    expect(document.querySelector('#i').value).toBe('abc')
  })

  test('Backspace still deletes', async () => {
    await page.locator('#i').fill('abc')
    await page.locator('#i').focus()

    await page.keyboard.press('Backspace')

    expect(document.querySelector('#i').value).toBe('ab')
  })

  test('Meta+Backspace does not delete a character', async () => {
    await page.locator('#i').fill('abc')
    await page.locator('#i').focus()

    await page.keyboard.press('Meta+Backspace')

    expect(document.querySelector('#i').value).toBe('abc')
  })
})

describe('down and up hold a modifier across presses', () => {
  test('a held Shift reaches a later press', async () => {
    await watch()

    await page.keyboard.down('Shift')
    await page.keyboard.press('Tab')
    await page.keyboard.up('Shift')

    expect(seen.find(e => e.type === 'keydown' && e.key === 'Tab')!.shift).toBe(true)
  })

  test('a held modifier survives several presses and then stops', async () => {
    await watch()

    await page.keyboard.down('Control')
    await page.keyboard.press('a')
    await page.keyboard.press('c')
    await page.keyboard.up('Control')
    await page.keyboard.press('v')

    const downs = seen.filter(e => e.type === 'keydown' && ['a', 'c', 'v'].includes(e.key as string))
    expect(downs.map(e => ({ key: e.key, ctrl: e.ctrl })))
      .toEqual([{ key: 'a', ctrl: true }, { key: 'c', ctrl: true }, { key: 'v', ctrl: false }])
  })

  test('holding Control suppresses typing, releasing it restores it', async () => {
    await page.locator('#i').focus()

    await page.keyboard.down('Control')
    await page.keyboard.press('a')
    await page.keyboard.up('Control')
    await page.keyboard.press('b')

    expect(document.querySelector('#i').value).toBe('b')
  })
})
