import { beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'
import { Window } from '../src/window/Window'

// =============================================================================
// page.on('dialog') (#1612).
//
// `confirm()` returned a hardcoded `false`, so a confirm-gated action could only
// ever be cancelled. The test clicked the button, nothing happened, and the
// assertion failed with no hint that a dialog was involved — so the "delete" half
// of every destructive flow was untestable, and destructive flows are the ones
// most worth a test.
//
// The synchronous-handler rule is the part worth reading twice. `confirm()` is a
// synchronous DOM API, so a decision made after an await arrives once the page
// has already acted on the default. That is reported rather than allowed.
// =============================================================================

let page: any
let document: any

beforeEach(() => {
  page = new Browser().newPage()
  document = page.mainFrame.window.document
  page.setDefaultTimeout(200)
})

/**
 * A delete button gated on confirm, as an application writes it.
 *
 * Returns the log the handler appends to, so a test can see whether the guarded
 * work actually ran.
 */
async function mountGatedDelete(): Promise<string[]> {
  const done: string[] = []
  await page.setContent('<button id="del">Delete</button>')
  document.querySelector('#del').addEventListener('click', () => {
    if (!page.mainFrame.window.confirm('Delete this trail?'))
      return
    done.push('removed')
  })
  return done
}

describe('confirm', () => {
  test('accepting reaches the guarded work', async () => {
    // The reproduction from the issue: this was unreachable.
    const done = await mountGatedDelete()
    page.on('dialog', (dialog: any) => dialog.accept())

    await page.locator('#del').click()

    expect(done).toEqual(['removed'])
  })

  test('dismissing cancels it', async () => {
    const done = await mountGatedDelete()
    page.on('dialog', (dialog: any) => dialog.dismiss())

    await page.locator('#del').click()

    expect(done).toEqual([])
  })

  test('with no handler it is still cancelled', async () => {
    // The default is unchanged, so nothing breaks for code that does not opt in.
    const done = await mountGatedDelete()

    await page.locator('#del').click()

    expect(done).toEqual([])
  })

  test('the handler is told which dialog and what it said', async () => {
    // The other reason to care: asserting *which* dialog appeared.
    const seen: Array<{ type: string, message: string }> = []
    page.on('dialog', (dialog: any) => {
      seen.push({ type: dialog.type, message: dialog.message })
      dialog.accept()
    })

    await page.setContent('<div></div>')
    page.mainFrame.window.confirm('Delete this trail?')

    expect(seen).toEqual([{ type: 'confirm', message: 'Delete this trail?' }])
  })
})

describe('prompt', () => {
  test('accepting with text returns that text', async () => {
    page.on('dialog', (dialog: any) => dialog.accept('Ridge Loop'))

    expect(page.mainFrame.window.prompt('Name the trail')).toBe('Ridge Loop')
  })

  test('accepting with nothing returns the default value', async () => {
    page.on('dialog', (dialog: any) => dialog.accept())

    expect(page.mainFrame.window.prompt('Name the trail', 'Untitled')).toBe('Untitled')
  })

  test('the default value reaches the handler', async () => {
    let seen = ''
    page.on('dialog', (dialog: any) => {
      seen = dialog.defaultValue
      dialog.accept()
    })

    page.mainFrame.window.prompt('Name the trail', 'Untitled')

    expect(seen).toBe('Untitled')
  })

  test('dismissing returns null', async () => {
    page.on('dialog', (dialog: any) => dialog.dismiss())

    expect(page.mainFrame.window.prompt('Name the trail', 'Untitled')).toBeNull()
  })

  test('with no handler it returns null, as before', async () => {
    expect(page.mainFrame.window.prompt('Name the trail')).toBeNull()
  })
})

describe('alert', () => {
  test('it is reported, which used to be impossible', async () => {
    // A no-op was close enough to auto-dismissing, except that there was no way
    // to assert an alert had happened at all.
    const seen: string[] = []
    page.on('dialog', (dialog: any) => {
      seen.push(`${dialog.type}:${dialog.message}`)
      dialog.accept()
    })

    page.mainFrame.window.alert('Saved')

    expect(seen).toEqual(['alert:Saved'])
  })

  test('it returns nothing either way', async () => {
    page.on('dialog', (dialog: any) => dialog.dismiss())

    expect(page.mainFrame.window.alert('Saved')).toBeUndefined()
  })
})

describe('a decision has to be synchronous', () => {
  test('an async handler that awaits first is reported, not silently defaulted', async () => {
    // The decision is coming, but it arrives after confirm() has returned the
    // default and the page has acted on it. Letting that through would be the
    // wrong-answer failure this feature exists to remove.
    page.on('dialog', async (dialog: any) => {
      await Promise.resolve()
      await dialog.accept()
    })

    expect(() => page.mainFrame.window.confirm('Delete?'))
      .toThrow(/did not decide before returning/)
  })

  test('an async handler that decides before awaiting is fine', async () => {
    // accept() records the decision synchronously, so this is in time.
    page.on('dialog', async (dialog: any) => {
      await dialog.accept()
    })

    expect(page.mainFrame.window.confirm('Delete?')).toBe(true)
  })

  test('a handler that only inspects leaves it dismissed', async () => {
    // Legitimate — it fails loudly in the test rather than quietly in the page —
    // and it must not be mistaken for the async case.
    const seen: string[] = []
    page.on('dialog', (dialog: any) => { seen.push(dialog.message) })

    expect(page.mainFrame.window.confirm('Delete?')).toBe(false)
    expect(seen).toEqual(['Delete?'])
  })
})

describe('several handlers', () => {
  test('the first decision wins', async () => {
    // Two handlers disagreeing is the caller's problem; letting the last one
    // silently override the first would hide it.
    page.on('dialog', (dialog: any) => dialog.accept())
    page.on('dialog', (dialog: any) => dialog.dismiss())

    expect(page.mainFrame.window.confirm('Delete?')).toBe(true)
  })

  test('every handler still sees the dialog', async () => {
    const seen: string[] = []
    page.on('dialog', (dialog: any) => { seen.push('first'); dialog.accept() })
    page.on('dialog', () => { seen.push('second') })

    page.mainFrame.window.confirm('Delete?')

    expect(seen).toEqual(['first', 'second'])
  })

  test('removing the handler restores the default', async () => {
    const accept = (dialog: any): void => { dialog.accept() }
    page.on('dialog', accept)
    expect(page.mainFrame.window.confirm('Delete?')).toBe(true)

    page.off('dialog', accept)
    expect(page.mainFrame.window.confirm('Delete?')).toBe(false)
  })
})

describe('the dialog survives a navigation', () => {
  test('setContent replaces the document, not the window', async () => {
    page.on('dialog', (dialog: any) => dialog.accept())
    await page.setContent('<p>one</p>')
    expect(page.mainFrame.window.confirm('?')).toBe(true)

    await page.setContent('<p>two</p>')

    // The overrides live on the window, so replacing the document leaves them.
    expect(page.mainFrame.window.confirm('?')).toBe(true)
  })
})

describe('a standalone Window keeps its stubs', () => {
  test('there is no page to ask, so the defaults stand', () => {
    const window = new Window()

    expect(window.confirm('?')).toBe(false)
    expect(window.prompt('?')).toBeNull()
    expect(window.alert('?')).toBeUndefined()
  })
})
