/**
 * ARIA role and accessible-name computation.
 *
 * Added with the locators in #1591: `getByRole` needs the role an element
 * carries without anyone writing one, and the name a screen reader would
 * announce. Neither existed in this package before.
 *
 * This is a working subset rather than the full specification; these tests pin
 * the parts that decide real queries.
 */

import { describe, expect, test } from 'bun:test'
import { accessibleName, computeRole, headingLevel } from '../src/aria/roles'
import { Window } from '../src'

function element(html: string, selector: string): any {
  const window = new Window()
  window.document.body!.innerHTML = html
  return window.document.querySelector(selector)
}

describe('implicit roles', () => {
  const cases: Array<[string, string, string | null]> = [
    ['<a href="/x" id="t">x</a>', '#t', 'link'],
    ['<a id="t">x</a>', '#t', null],
    ['<button id="t"></button>', '#t', 'button'],
    ['<input id="t">', '#t', 'textbox'],
    ['<input id="t" type="checkbox">', '#t', 'checkbox'],
    ['<input id="t" type="radio">', '#t', 'radio'],
    ['<input id="t" type="submit">', '#t', 'button'],
    ['<input id="t" type="range">', '#t', 'slider'],
    ['<input id="t" type="number">', '#t', 'spinbutton'],
    ['<input id="t" type="search">', '#t', 'searchbox'],
    ['<input id="t" type="hidden">', '#t', null],
    ['<textarea id="t"></textarea>', '#t', 'textbox'],
    ['<select id="t"></select>', '#t', 'combobox'],
    ['<select id="t" multiple></select>', '#t', 'listbox'],
    ['<select id="t" size="3"></select>', '#t', 'listbox'],
    ['<img id="t" alt="cat">', '#t', 'img'],
    ['<img id="t" alt="">', '#t', 'presentation'],
    ['<h2 id="t">x</h2>', '#t', 'heading'],
    ['<ul id="t"></ul>', '#t', 'list'],
    ['<li id="t"></li>', '#t', 'listitem'],
    ['<nav id="t"></nav>', '#t', 'navigation'],
    ['<main id="t"></main>', '#t', 'main'],
    ['<fieldset id="t"></fieldset>', '#t', 'group'],
    ['<table id="t"></table>', '#t', 'table'],
    ['<progress id="t"></progress>', '#t', 'progressbar'],
  ]

  for (const [html, selector, expected] of cases) {
    test(`${html} is ${expected ?? 'unmapped'}`, () => {
      expect(computeRole(element(html, selector))).toBe(expected)
    })
  }

  test('an explicit role attribute wins', () => {
    expect(computeRole(element('<div id="t" role="tab">x</div>', '#t'))).toBe('tab')
    expect(computeRole(element('<button id="t" role="link">x</button>', '#t'))).toBe('link')
  })

  test('the first token of a role list is used', () => {
    expect(computeRole(element('<div id="t" role="tab button">x</div>', '#t'))).toBe('tab')
  })

  test('a section is a region only once it is named', () => {
    expect(computeRole(element('<section id="t"></section>', '#t'))).toBeNull()
    expect(computeRole(element('<section id="t" aria-label="Named">x</section>', '#t'))).toBe('region')
  })
})

describe('accessible name', () => {
  test('aria-labelledby wins, then aria-label', () => {
    expect(accessibleName(element('<span id="l">From ref</span><input id="t" aria-labelledby="l" aria-label="From attr">', '#t')))
      .toBe('From ref')
    expect(accessibleName(element('<input id="t" aria-label="From attr">', '#t'))).toBe('From attr')
  })

  test('aria-labelledby joins several references', () => {
    expect(accessibleName(element('<span id="a">One</span><span id="b">Two</span><input id="t" aria-labelledby="a b">', '#t')))
      .toBe('One Two')
  })

  test('a control takes its label, whether associated or wrapping', () => {
    expect(accessibleName(element('<label for="t">Your name</label><input id="t">', '#t'))).toBe('Your name')
    expect(accessibleName(element('<label>Wrapped <input id="t"></label>', '#t'))).toBe('Wrapped')
  })

  test('a push button takes its value', () => {
    expect(accessibleName(element('<input id="t" type="submit" value="Send">', '#t'))).toBe('Send')
  })

  test('name from content applies to buttons and links, not textboxes', () => {
    expect(accessibleName(element('<button id="t">Save</button>', '#t'))).toBe('Save')
    expect(accessibleName(element('<a id="t" href="/x">Home</a>', '#t'))).toBe('Home')
    // A textbox is not named by whatever text happens to sit inside it.
    expect(accessibleName(element('<input id="t">', '#t'))).toBe('')
  })

  test('images, fieldsets and tables use their native naming', () => {
    expect(accessibleName(element('<img id="t" alt="a cat">', '#t'))).toBe('a cat')
    expect(accessibleName(element('<fieldset id="t"><legend>Group</legend></fieldset>', '#t'))).toBe('Group')
    expect(accessibleName(element('<table id="t"><caption>Cap</caption></table>', '#t'))).toBe('Cap')
  })

  test('title, then placeholder, are the fallbacks', () => {
    expect(accessibleName(element('<button id="t" title="Tip"></button>', '#t'))).toBe('Tip')
    expect(accessibleName(element('<input id="t" placeholder="Search…">', '#t'))).toBe('Search…')
  })

  test('whitespace is collapsed', () => {
    expect(accessibleName(element('<button id="t">  Save   changes \n </button>', '#t'))).toBe('Save changes')
  })
})

describe('heading level', () => {
  test('comes from the tag', () => {
    expect(headingLevel(element('<h1 id="t">x</h1>', '#t'))).toBe(1)
    expect(headingLevel(element('<h6 id="t">x</h6>', '#t'))).toBe(6)
  })

  test('aria-level overrides it', () => {
    expect(headingLevel(element('<h3 id="t" aria-level="5">x</h3>', '#t'))).toBe(5)
  })

  test('is null for anything else', () => {
    expect(headingLevel(element('<div id="t">x</div>', '#t'))).toBeNull()
  })
})
