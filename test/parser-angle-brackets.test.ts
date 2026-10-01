import { describe, expect, test } from 'bun:test'
import { Window } from '../src/window/Window'

// =============================================================================
// A `<` that does not open a tag is text.
//
// Found by pointing the parser at a real application's served HTML, which it
// crashed on: `Invalid tag name`. Minimised from 634KB to a fragment of an
// attribute expression — `rating() < 1 || submitting()` — and from there to the
// shape below, which no synthetic fixture in this suite had ever contained.
//
// The two failures pulled in opposite directions. `a < b` threw, so a document
// with a comparison in it could not be parsed at all. `a <1 b` did not throw and
// was worse: the `<1` was read as a tag and the rest of the line was silently
// discarded, so the text simply went missing.
//
// A tag name has to begin with an ASCII letter, which is what distinguishes the
// two cases from a real tag.
// =============================================================================

function body(html: string): any {
  const window = new Window() as any
  window.document.body.innerHTML = html
  return window.document.body
}

describe('a bare < in text content', () => {
  test('a comparison survives as text', () => {
    expect(body('<p>a < b</p>').textContent).toBe('a < b')
  })

  test('the shape that crashed on real markup', () => {
    expect(body('<p>rating() < 1 || submitting()</p>').textContent)
      .toBe('rating() < 1 || submitting()')
  })

  test('a digit after < does not start a tag, and nothing is swallowed', () => {
    // The quiet half: this used to report "a " and drop the rest.
    expect(body('<p>a <1 b</p>').textContent).toBe('a <1 b')
  })

  test('a trailing < is text', () => {
    expect(body('<p>a <</p>').textContent).toBe('a <')
  })

  test('< followed by punctuation is text', () => {
    expect(body('<p>a <= b and c <> d</p>').textContent).toBe('a <= b and c <> d')
  })

  test('a <! that is neither a comment nor a DOCTYPE is text', () => {
    // Narrower than a browser, which makes a bogus comment of it. Text cannot
    // crash and cannot discard content, which are the failures that matter.
    expect(body('<p>a <!x b</p>').textContent).toBe('a <!x b')
  })

  test('a closing tag with no name is text', () => {
    expect(body('<p>a </> b</p>').textContent).toBe('a </> b')
  })

  test('a processing instruction is text', () => {
    expect(body('<p>a <? b</p>').textContent).toBe('a <? b')
  })

  test('surrounding elements still parse', () => {
    const parsed = body('<p>a < b</p><span id="after">ok</span>')
    expect(parsed.querySelector('#after')?.textContent).toBe('ok')
    expect(parsed.querySelectorAll('p,span').length).toBe(2)
  })
})

describe('what must still open markup', () => {
  test('an ordinary tag', () => {
    expect(body('<div><span>in</span></div>').querySelector('span')?.textContent).toBe('in')
  })

  test('a closing tag', () => {
    expect(body('<p>one</p><p>two</p>').querySelectorAll('p').length).toBe(2)
  })

  test('a comment', () => {
    const parsed = body('<p>a</p><!-- note --><p>b</p>')
    expect(parsed.querySelectorAll('p').length).toBe(2)
    expect(parsed.textContent).toBe('ab')
  })

  test('an uppercase tag name', () => {
    expect(body('<DIV><SPAN>in</SPAN></DIV>').querySelector('span')?.textContent).toBe('in')
  })

  test('a tag name containing digits and hyphens', () => {
    const parsed = body('<h1>t</h1><my-element>c</my-element>')
    expect(parsed.querySelector('h1')?.textContent).toBe('t')
    expect(parsed.querySelector('my-element')?.textContent).toBe('c')
  })
})

describe('a < inside an attribute value', () => {
  test('is kept, double-quoted', () => {
    const parsed = body('<button data-x="(s <= f()) ? 1 : 0">i</button>')
    expect(parsed.querySelector('button')?.getAttribute('data-x')).toBe('(s <= f()) ? 1 : 0')
  })

  test('is kept, single-quoted', () => {
    const parsed = body(`<button data-x='a < b'>i</button>`)
    expect(parsed.querySelector('button')?.getAttribute('data-x')).toBe('a < b')
  })

  test('the real template expression that started this', () => {
    const parsed = body('<button :disabled="formRating() < 1 || submittingReview()">Send</button>')
    expect(parsed.querySelector('button')?.getAttribute(':disabled'))
      .toBe('formRating() < 1 || submittingReview()')
  })
})

describe('a colon inside a quoted attribute value', () => {
  // Found with the same real document: `meta[property="og:title"]` threw
  // "Unsupported pseudo-class: :title", because the pseudo scan read the raw
  // selector including the inside of `[...]`. Every og: meta selector, and every
  // value holding a URL or a time, failed that way.
  function head(html: string): any {
    const window = new Window() as any
    window.document.head.innerHTML = html
    return window.document
  }

  test('an og: meta selector resolves', () => {
    const document = head('<meta property="og:title" content="T">')
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('T')
  })

  test('any colon-bearing value resolves', () => {
    const document = head('<meta name="x" content="12:30">')
    expect(document.querySelector('[content="12:30"]')).not.toBeNull()
  })

  test('a real pseudo-class still works beside one', () => {
    const document = head('<meta property="og:title" content="T"><meta property="og:image" content="I">')
    expect(document.querySelectorAll('meta[property="og:title"]:first-of-type').length).toBe(1)
  })

  test('a pseudo-class with an attribute argument still works', () => {
    const document = head('<meta name="a"><meta property="og:x">')
    expect(document.querySelectorAll('meta:not([property="og:x"])').length).toBe(1)
  })
})
