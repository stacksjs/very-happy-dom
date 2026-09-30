import { beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'
import { matchesMediaQuery } from '../src/css/media'
import { Window } from '../src/window/Window'
import '../src/matchers'

// =============================================================================
// @media rules apply, and the media can be emulated (#1611).
//
// Two halves of media support disagreed. matchMedia answered queries; the
// cascade refused to look inside @media blocks, because the parser flattened
// them into a rule whose body was read as declarations. So matchMedia could
// report dark mode active while getComputedStyle returned the light value.
//
// That is #1600's shape again: someone confirms the query matches, reasonably
// concludes the rules apply, and writes an assertion comparing the light value
// to the light value.
// =============================================================================

let page: any
let document: any

beforeEach(() => {
  page = new Browser().newPage()
  document = page.mainFrame.window.document
  page.setDefaultTimeout(200)
})

const DARK_SHEET = '<head><style>'
  + '.b { color: red }'
  + '@media (prefers-color-scheme: dark) { .b { color: blue } }'
  + '</style></head>'

describe('a matching @media block reaches the cascade', () => {
  test('the reproduction from the issue', async () => {
    await page.setContent(`${DARK_SHEET}<body><div class="b" id="b"></div></body>`)
    const style = () => page.mainFrame.window.getComputedStyle(document.querySelector('#b')).getPropertyValue('color')

    expect(style()).toBe('red')

    await page.emulateMedia({ colorScheme: 'dark' })

    expect(style()).toBe('blue')
  })

  test('matchMedia and the cascade agree', async () => {
    // Asserted together, because evaluating the query in two places is how they
    // came to disagree.
    await page.setContent(`${DARK_SHEET}<body><div class="b" id="b"></div></body>`)
    const window = page.mainFrame.window

    for (const scheme of ['dark', 'light'] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      const matches = window.matchMedia('(prefers-color-scheme: dark)').matches
      const colour = window.getComputedStyle(document.querySelector('#b')).getPropertyValue('color')

      expect({ scheme, matches, applied: colour === 'blue' })
        .toEqual({ scheme, matches: scheme === 'dark', applied: scheme === 'dark' })
    }
  })

  test('a width query follows the viewport', async () => {
    await page.setContent('<head><style>'
      + '.b { width: 400px }'
      + '@media (max-width: 640px) { .b { width: 100px } }'
      + '</style></head><body><div class="b" id="b"></div></body>')
    const width = () => document.querySelector('#b').getBoundingClientRect().width

    page.setViewport({ width: 1280, height: 800 })
    expect(width()).toBe(400)

    page.setViewport({ width: 375, height: 800 })
    expect(width()).toBe(100)
  })

  test('box metrics follow too, since #1600 routed them through the same resolution', async () => {
    await page.setContent('<head><style>'
      + '.b { height: 50px }'
      + '@media (prefers-color-scheme: dark) { .b { height: 10px } }'
      + '</style></head><body><div class="b" id="b"></div></body>')

    expect((await page.locator('#b').boundingBox())!.height).toBe(50)

    await page.emulateMedia({ colorScheme: 'dark' })

    expect((await page.locator('#b').boundingBox())!.height).toBe(10)
  })

  test('document order still decides between equal specificity', async () => {
    // A declaration inside a matching @media beats one written above it and
    // loses to one written below, which is what a browser does.
    await page.setContent('<head><style>'
      + '@media screen { .b { color: blue } }'
      + '.b { color: green }'
      + '</style></head><body><div class="b" id="b"></div></body>')

    expect(page.mainFrame.window.getComputedStyle(document.querySelector('#b')).getPropertyValue('color'))
      .toBe('green')
  })

  test('a non-matching block is skipped', async () => {
    await page.setContent('<head><style>'
      + '.b { color: red }'
      + '@media print { .b { color: blue } }'
      + '</style></head><body><div class="b" id="b"></div></body>')

    expect(page.mainFrame.window.getComputedStyle(document.querySelector('#b')).getPropertyValue('color'))
      .toBe('red')

    await page.emulateMedia({ media: 'print' })

    expect(page.mainFrame.window.getComputedStyle(document.querySelector('#b')).getPropertyValue('color'))
      .toBe('blue')
  })

  test('the parsed sheet reports a real CSSMediaRule', async () => {
    // Not only the cascade: anyone inspecting the CSSOM used to see a
    // CSSStyleRule whose selectorText was the whole @media line.
    await page.setContent(`${DARK_SHEET}<body></body>`)
    const rules = document.styleSheets[0].cssRules

    expect(rules.length).toBe(2)
    expect(rules[1].constructor.name).toBe('CSSMediaRule')
    expect(rules[1].conditionText).toBe('(prefers-color-scheme: dark)')
    expect(rules[1].cssRules.length).toBe(1)
  })
})

describe('the query evaluator', () => {
  const context = {
    width: 800,
    height: 600,
    colorScheme: 'light' as const,
    reducedMotion: 'no-preference' as const,
    forcedColors: 'none' as const,
    type: 'screen' as const,
  }

  test('terms joined by and must all hold', () => {
    // The old implementation checked each feature with a separate `if` that
    // overwrote the running answer, so this reported whatever the last clause
    // happened to say.
    expect(matchesMediaQuery('(min-width: 100px) and (max-width: 50px)', context)).toBe(false)
    expect(matchesMediaQuery('(min-width: 100px) and (max-width: 900px)', context)).toBe(true)
  })

  test('a comma-separated list is a union', () => {
    expect(matchesMediaQuery('print, (min-width: 100px)', context)).toBe(true)
    expect(matchesMediaQuery('print, (min-width: 5000px)', context)).toBe(false)
  })

  test('media types', () => {
    expect(matchesMediaQuery('screen', context)).toBe(true)
    expect(matchesMediaQuery('print', context)).toBe(false)
    expect(matchesMediaQuery('all', context)).toBe(true)
    expect(matchesMediaQuery('screen and (min-width: 100px)', context)).toBe(true)
  })

  test('not inverts, only is ignored', () => {
    expect(matchesMediaQuery('not screen', context)).toBe(false)
    expect(matchesMediaQuery('not print', context)).toBe(true)
    expect(matchesMediaQuery('only screen', context)).toBe(true)
  })

  test('orientation comes from the viewport', () => {
    expect(matchesMediaQuery('(orientation: landscape)', context)).toBe(true)
    expect(matchesMediaQuery('(orientation: portrait)', { ...context, width: 600, height: 800 })).toBe(true)
  })

  test('em and rem lengths assume 16px', () => {
    expect(matchesMediaQuery('(min-width: 40em)', context)).toBe(true)
    expect(matchesMediaQuery('(min-width: 60em)', context)).toBe(false)
  })

  test('an unknown feature makes the query false, as in a browser', () => {
    // Documented rather than silently treated as true: @media (hover: hover) is
    // one of them today.
    expect(matchesMediaQuery('(hover: hover)', context)).toBe(false)
  })

  test('reduced motion and forced colors', () => {
    expect(matchesMediaQuery('(prefers-reduced-motion: reduce)', context)).toBe(false)
    expect(matchesMediaQuery('(prefers-reduced-motion: reduce)', { ...context, reducedMotion: 'reduce' })).toBe(true)
    expect(matchesMediaQuery('(forced-colors: active)', { ...context, forcedColors: 'active' })).toBe(true)
  })
})

describe('emulateMedia', () => {
  test('it reaches a page that is already open', async () => {
    // prefersColorScheme could only be set on the Browser constructor before.
    const window = page.mainFrame.window
    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(false)

    await page.emulateMedia({ colorScheme: 'dark' })

    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(true)
  })

  test('null restores what the browser was configured with', async () => {
    const browser = new Browser({ settings: { device: { prefersColorScheme: 'dark' } } })
    const scoped: any = browser.newPage()
    const query = () => scoped.mainFrame.window.matchMedia('(prefers-color-scheme: dark)').matches

    expect(query()).toBe(true)

    await scoped.emulateMedia({ colorScheme: 'light' })
    expect(query()).toBe(false)

    await scoped.emulateMedia({ colorScheme: null })
    expect(query()).toBe(true)
  })

  test('a context that was never asked does not reset the browser setting', async () => {
    // The override is sparse for this reason: filling it with defaults would
    // silently overwrite what `new Browser({ settings })` established.
    const browser = new Browser({ settings: { device: { prefersColorScheme: 'dark' } } })
    const scoped: any = browser.newPage()

    await scoped.emulateMedia({ reducedMotion: 'reduce' })

    expect(scoped.mainFrame.window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(true)
  })

  test('it applies to every page in the context', async () => {
    const browser = new Browser()
    const context = browser.newIncognitoContext()
    const first: any = context.newPage()
    const second: any = context.newPage()

    await context.emulateMedia({ colorScheme: 'dark' })

    for (const scoped of [first, second])
      expect(scoped.mainFrame.window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(true)
  })
})

describe('a plain Window still works', () => {
  test('matchMedia without a browser around it', () => {
    const window = new Window({ width: 800, height: 600 })

    expect(window.matchMedia('(min-width: 640px)').matches).toBe(true)
    expect(window.matchMedia('(min-width: 1000px)').matches).toBe(false)
  })
})
