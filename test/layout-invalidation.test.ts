/**
 * The layout cache must never answer from a stale pass.
 *
 * A document is laid out whole and cached, because one element's position
 * depends on every preceding sibling's height. Staleness is the risk that
 * carries: a missed invalidation does not make a read slow, it makes it wrong,
 * and silently.
 *
 * So this walks every route that can move a box — the DOM, the inline style,
 * the stylesheets, the CSSOM, the viewport, the media context — and checks the
 * next read reflects it. A new route that bypasses the invalidation shows up
 * here as a failure rather than as a wrong number somewhere else.
 */
import { beforeEach, describe, expect, test } from 'bun:test'
import { Window } from '../src/window/Window'

let window: Window
let document: any

beforeEach(() => {
  window = new Window()
  document = window.document
})

/** The second element's y, which only moves when the first one's height does. */
function secondY(): number {
  return document.getElementById('second').getBoundingClientRect().y
}

function setup(firstHeight: string | null = '20px'): void {
  // `null` leaves the style attribute off entirely. An inline `height: 0px`
  // would beat a stylesheet rule — correctly — so a test about stylesheets has
  // to start without one.
  const style = firstHeight === null ? '' : ` style="height: ${firstHeight}"`
  document.body.innerHTML = `<div id="first"${style}></div><div id="second"></div>`
}

describe('DOM mutations invalidate the layout', () => {
  test('setAttribute', () => {
    setup()
    expect(secondY()).toBe(20)

    document.getElementById('first').setAttribute('style', 'height: 90px')
    expect(secondY()).toBe(90)
  })

  test('removeAttribute', () => {
    setup()
    expect(secondY()).toBe(20)

    document.getElementById('first').removeAttribute('style')
    expect(secondY()).toBe(0)
  })

  test('a style property written through the proxy', () => {
    setup()
    expect(secondY()).toBe(20)

    document.getElementById('first').style.height = '45px'
    expect(secondY()).toBe(45)
  })

  test('setProperty', () => {
    setup()
    document.getElementById('first').style.setProperty('height', '33px')
    expect(secondY()).toBe(33)
  })

  test('removeProperty', () => {
    setup()
    document.getElementById('first').style.removeProperty('height')
    expect(secondY()).toBe(0)
  })

  test('cssText', () => {
    setup()
    document.getElementById('first').style.cssText = 'height: 12px'
    expect(secondY()).toBe(12)
  })

  test('a class change that brings a rule into play', () => {
    document.head.innerHTML = '<style>.tall { height: 70px }</style>'
    setup(null)
    expect(secondY()).toBe(0)

    document.getElementById('first').className = 'tall'
    expect(secondY()).toBe(70)
  })

  test('appendChild', () => {
    setup()
    const extra = document.createElement('div')
    extra.style.height = '15px'
    document.getElementById('first').appendChild(extra)

    expect(secondY()).toBe(20)
    // The parent has no declared height of its own now, so the child drives it.
    document.getElementById('first').style.removeProperty('height')
    expect(secondY()).toBe(15)
  })

  test('removeChild', () => {
    document.body.innerHTML = '<div id="first"><div style="height: 40px"></div></div><div id="second"></div>'
    expect(secondY()).toBe(40)

    const first = document.getElementById('first')
    first.removeChild(first.firstElementChild)
    expect(secondY()).toBe(0)
  })

  test('insertBefore', () => {
    setup()
    const extra = document.createElement('div')
    extra.style.height = '25px'
    document.body.insertBefore(extra, document.getElementById('first'))

    expect(secondY()).toBe(45)
  })

  test('replaceChild', () => {
    setup()
    const replacement = document.createElement('div')
    replacement.style.height = '60px'
    document.body.replaceChild(replacement, document.getElementById('first'))

    expect(secondY()).toBe(60)
  })

  test('remove()', () => {
    setup()
    document.getElementById('first').remove()
    expect(secondY()).toBe(0)
  })

  test('innerHTML', () => {
    setup()
    expect(secondY()).toBe(20)

    document.body.innerHTML = '<div id="first" style="height: 80px"></div><div id="second"></div>'
    expect(secondY()).toBe(80)
  })

  test('insertAdjacentHTML', () => {
    setup()
    document.getElementById('first').insertAdjacentHTML('beforebegin', '<div style="height: 11px"></div>')
    expect(secondY()).toBe(31)
  })

  test('textContent, which changes how tall the text is', () => {
    document.body.innerHTML = '<div id="first" style="width: 100px"></div><div id="second"></div>'
    expect(secondY()).toBe(0)

    document.getElementById('first').textContent = 'some words here'
    expect(secondY()).toBeGreaterThan(0)
  })

  test('a text node edited in place', () => {
    document.body.innerHTML = '<div id="first" style="width: 40px">short</div><div id="second"></div>'
    const before = secondY()

    document.getElementById('first').firstChild.nodeValue
      = 'a much longer run of text that has to wrap several times over'
    expect(secondY()).toBeGreaterThan(before)
  })
})

describe('stylesheet changes invalidate the layout', () => {
  test('a <style> element added', () => {
    setup(null)
    expect(secondY()).toBe(0)

    document.head.innerHTML = '<style>#first { height: 55px }</style>'
    expect(secondY()).toBe(55)
  })

  test('a <style> element edited', () => {
    document.head.innerHTML = '<style>#first { height: 10px }</style>'
    setup(null)
    expect(secondY()).toBe(10)

    document.head.firstElementChild.textContent = '#first { height: 65px }'
    expect(secondY()).toBe(65)
  })

  test('a <style> element removed', () => {
    document.head.innerHTML = '<style>#first { height: 10px }</style>'
    setup(null)
    expect(secondY()).toBe(10)

    document.head.firstElementChild.remove()
    expect(secondY()).toBe(0)
  })

  test('insertRule on a live sheet', () => {
    document.head.innerHTML = '<style></style>'
    setup(null)
    expect(secondY()).toBe(0)

    // Nothing about the DOM changed here, which is why the CSSOM keeps its own
    // revision for the cache to watch.
    document.styleSheets[0].insertRule('#first { height: 48px }', 0)
    expect(secondY()).toBe(48)
  })

  test('deleteRule on a live sheet', () => {
    document.head.innerHTML = '<style>#first { height: 48px }</style>'
    setup(null)
    expect(secondY()).toBe(48)

    document.styleSheets[0].deleteRule(0)
    expect(secondY()).toBe(0)
  })

  test('a property set on a live rule', () => {
    document.head.innerHTML = '<style>#first { height: 10px }</style>'
    setup(null)
    expect(secondY()).toBe(10)

    ;(document.styleSheets[0].cssRules[0] as any).style.setProperty('height', '72px')
    expect(secondY()).toBe(72)
  })

  test('adoptedStyleSheets', () => {
    setup(null)
    expect(secondY()).toBe(0)

    const sheet = new (window as any).CSSStyleSheet()
    sheet.replaceSync('#first { height: 36px }')
    document.adoptedStyleSheets = [sheet]
    expect(secondY()).toBe(36)
  })
})

describe('the environment invalidates the layout', () => {
  test('a narrower viewport changes an auto width', () => {
    document.body.innerHTML = '<div id="w"></div>'
    expect(document.getElementById('w').offsetWidth).toBe(1024)

    window.happyDOM.setViewport({ width: 600 })
    expect(document.getElementById('w').offsetWidth).toBe(600)
  })

  test('a shorter viewport changes a viewport-unit height', () => {
    document.body.innerHTML = '<div id="first" style="height: 50vh"></div><div id="second"></div>'
    expect(secondY()).toBe(384)

    window.happyDOM.setViewport({ height: 1000 })
    expect(secondY()).toBe(500)
  })

  test('a media condition that changes which rules apply', () => {
    // Set up a dark-scheme window and a light one from the same markup. Neither
    // the DOM nor the CSSOM differs between them — only the conditions the
    // cascade resolves under, which the cache has to account for.
    const markup = '<style>'
      + '#first { height: 20px }'
      + '@media (prefers-color-scheme: dark) { #first { height: 90px } }'
      + '</style>'

    const read = (scheme: 'light' | 'dark'): number => {
      const scoped = new Window({ settings: { device: { prefersColorScheme: scheme } } })
      scoped.document.head!.innerHTML = markup
      scoped.document.body!.innerHTML = '<div id="first"></div><div id="second"></div>'
      return (scoped.document.getElementById('second') as any).getBoundingClientRect().y
    }

    expect(read('light')).toBe(20)
    expect(read('dark')).toBe(90)
  })
})

describe('the cache is actually a cache', () => {
  test('repeated reads with nothing changed agree', () => {
    setup('37px')

    const readings = Array.from({ length: 5 }, () => secondY())
    expect(readings).toEqual([37, 37, 37, 37, 37])
  })

  test('every box comes from one pass, so siblings are consistent', () => {
    document.body.innerHTML = Array.from(
      { length: 10 },
      (_, i) => `<div id="r${i}" style="height: 10px"></div>`,
    ).join('')

    // Read them out of order: a per-element cache keyed wrongly would show it.
    const ys = [7, 2, 9, 0, 5].map(i => document.getElementById(`r${i}`).getBoundingClientRect().y)
    expect(ys).toEqual([70, 20, 90, 0, 50])
  })
})
