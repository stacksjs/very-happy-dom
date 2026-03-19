import { describe, expect, test } from 'bun:test'
import { VirtualDocument } from '../src'
import { decodeHtmlEntities } from '../src/parsers/html-utils'

// =============================================================================
// HTML entities: named entities
// =============================================================================
describe('HTML entities: named entities', () => {
  test('basic entities still work', () => {
    expect(decodeHtmlEntities('&amp;')).toBe('&')
    expect(decodeHtmlEntities('&lt;')).toBe('<')
    expect(decodeHtmlEntities('&gt;')).toBe('>')
    expect(decodeHtmlEntities('&quot;')).toBe('"')
    expect(decodeHtmlEntities('&nbsp;')).toBe('\u00A0')
  })

  test('copyright and registration symbols', () => {
    expect(decodeHtmlEntities('&copy;')).toBe('\u00A9')
    expect(decodeHtmlEntities('&reg;')).toBe('\u00AE')
  })

  test('typographic entities', () => {
    expect(decodeHtmlEntities('&ndash;')).toBe('\u2013')
    expect(decodeHtmlEntities('&mdash;')).toBe('\u2014')
    expect(decodeHtmlEntities('&bull;')).toBe('\u2022')
    expect(decodeHtmlEntities('&hellip;')).toBe('\u2026')
    expect(decodeHtmlEntities('&trade;')).toBe('\u2122')
    expect(decodeHtmlEntities('&euro;')).toBe('\u20AC')
  })

  test('quote entities', () => {
    expect(decodeHtmlEntities('&laquo;')).toBe('\u00AB')
    expect(decodeHtmlEntities('&raquo;')).toBe('\u00BB')
    expect(decodeHtmlEntities('&ldquo;')).toBe('\u201C')
    expect(decodeHtmlEntities('&rdquo;')).toBe('\u201D')
    expect(decodeHtmlEntities('&lsquo;')).toBe('\u2018')
    expect(decodeHtmlEntities('&rsquo;')).toBe('\u2019')
  })

  test('arrow entities', () => {
    expect(decodeHtmlEntities('&larr;')).toBe('\u2190')
    expect(decodeHtmlEntities('&rarr;')).toBe('\u2192')
    expect(decodeHtmlEntities('&uarr;')).toBe('\u2191')
    expect(decodeHtmlEntities('&darr;')).toBe('\u2193')
  })

  test('Greek letters', () => {
    expect(decodeHtmlEntities('&alpha;')).toBe('\u03B1')
    expect(decodeHtmlEntities('&beta;')).toBe('\u03B2')
    expect(decodeHtmlEntities('&pi;')).toBe('\u03C0')
    expect(decodeHtmlEntities('&Omega;')).toBe('\u03A9')
  })

  test('math entities', () => {
    expect(decodeHtmlEntities('&infin;')).toBe('\u221E')
    expect(decodeHtmlEntities('&ne;')).toBe('\u2260')
    expect(decodeHtmlEntities('&le;')).toBe('\u2264')
    expect(decodeHtmlEntities('&ge;')).toBe('\u2265')
  })

  test('unknown entities pass through', () => {
    expect(decodeHtmlEntities('&unknownentity;')).toBe('&unknownentity;')
  })
})

// =============================================================================
// HTML entities: numeric references
// =============================================================================
describe('HTML entities: numeric references', () => {
  test('numeric character references still work', () => {
    expect(decodeHtmlEntities('&#65;')).toBe('A')
    expect(decodeHtmlEntities('&#x41;')).toBe('A')
    expect(decodeHtmlEntities('&#169;')).toBe('\u00A9')
  })

  test('entities in real HTML content', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    div.innerHTML = 'Price: &euro;10 &mdash; 50&percnt; off'
    // &percnt; is not in our list, so it stays as-is
    expect(div.textContent).toContain('\u20AC')
    expect(div.textContent).toContain('\u2014')
  })
})
