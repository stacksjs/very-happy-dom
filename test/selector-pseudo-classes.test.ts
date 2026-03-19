import { describe, expect, test } from 'bun:test'
import {
  VirtualDocument,
  VirtualElement,
} from '../src'

// =============================================================================
// Selector: :root pseudo-class
// =============================================================================
describe('Selector: :root pseudo-class', () => {
  test(':root matches the document element', () => {
    const doc = new VirtualDocument()
    const results = doc.querySelectorAll(':root')
    expect(results.length).toBe(1)
    expect(results[0]).toBe(doc.documentElement)
  })

  test(':root does not match other elements', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    doc.body!.appendChild(div)
    expect(div.matches(':root')).toBe(false)
  })

  test(':root can be combined with other selectors', () => {
    const doc = new VirtualDocument()
    // The document element is <html>
    expect(doc.documentElement!.matches(':root')).toBe(true)
  })
})

// =============================================================================
// Selector: :has() pseudo-class
// =============================================================================
describe('Selector: :has() pseudo-class', () => {
  test(':has() matches parent containing matching child', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const span = doc.createElement('span')
    div.appendChild(span)
    doc.body!.appendChild(div)

    const results = doc.querySelectorAll('div:has(span)')
    expect(results.length).toBe(1)
    expect(results[0]).toBe(div)
  })

  test(':has() does not match when child is absent', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const p = doc.createElement('p')
    div.appendChild(p)
    doc.body!.appendChild(div)

    const results = doc.querySelectorAll('div:has(span)')
    expect(results.length).toBe(0)
  })

  test(':has() with class selector', () => {
    const doc = new VirtualDocument()
    const container = doc.createElement('div')
    container.setAttribute('class', 'parent')
    const child = doc.createElement('span')
    child.setAttribute('class', 'target')
    container.appendChild(child)
    doc.body!.appendChild(container)

    const empty = doc.createElement('div')
    empty.setAttribute('class', 'parent')
    doc.body!.appendChild(empty)

    const results = doc.querySelectorAll('.parent:has(.target)')
    expect(results.length).toBe(1)
    expect(results[0]).toBe(container)
  })

  test(':has() matches deeply nested descendants', () => {
    const doc = new VirtualDocument()
    const outer = doc.createElement('div')
    const inner = doc.createElement('div')
    const deep = doc.createElement('span')
    deep.setAttribute('class', 'deep')
    inner.appendChild(deep)
    outer.appendChild(inner)
    doc.body!.appendChild(outer)

    const results = doc.querySelectorAll('div:has(.deep)')
    // Both outer and inner div contain .deep
    expect(results.length).toBe(2)
  })
})

// =============================================================================
// Selector: :scope pseudo-class
// =============================================================================
describe('Selector: :scope pseudo-class', () => {
  test('element.matches(":scope") matches itself', () => {
    const el = new VirtualElement('div')
    // When called via matches(), the scope root is the element itself
    expect(el.matches(':scope')).toBe(true)
  })

  test(':scope combined with class', () => {
    const el = new VirtualElement('div')
    el.setAttribute('class', 'active')
    expect(el.matches(':scope.active')).toBe(true)
    expect(el.matches(':scope.other')).toBe(false)
  })
})

// =============================================================================
// Selector: :required and :optional
// =============================================================================
describe('Selector: :required and :optional', () => {
  test(':required matches elements with required attribute', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    input.setAttribute('required', '')
    doc.body!.appendChild(input)
    expect(input.matches(':required')).toBe(true)
  })

  test(':optional matches input without required', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    doc.body!.appendChild(input)
    expect(input.matches(':optional')).toBe(true)
  })

  test(':optional does not match non-form elements', () => {
    const el = new VirtualElement('div')
    expect(el.matches(':optional')).toBe(false)
  })

  test('querySelectorAll finds required inputs', () => {
    const doc = new VirtualDocument()
    const i1 = doc.createElement('input')
    i1.setAttribute('required', '')
    const i2 = doc.createElement('input')
    doc.body!.appendChild(i1)
    doc.body!.appendChild(i2)
    expect(doc.querySelectorAll(':required').length).toBe(1)
    expect(doc.querySelectorAll(':optional').length).toBe(1)
  })
})

// =============================================================================
// Selector: :valid and :invalid
// =============================================================================
describe('Selector: :valid and :invalid', () => {
  test(':valid matches valid input', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    input.setAttribute('type', 'text')
    doc.body!.appendChild(input)
    expect(input.matches(':valid')).toBe(true)
  })

  test(':invalid matches required empty input', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    input.setAttribute('required', '')
    doc.body!.appendChild(input)
    expect(input.matches(':invalid')).toBe(true)
  })

  test(':valid and :invalid are mutually exclusive for form elements', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    input.setAttribute('required', '')
    input.value = 'filled'
    doc.body!.appendChild(input)
    expect(input.matches(':valid')).toBe(true)
    expect(input.matches(':invalid')).toBe(false)
  })
})

// =============================================================================
// Selector: :placeholder-shown
// =============================================================================
describe('Selector: :placeholder-shown', () => {
  test(':placeholder-shown matches empty input with placeholder', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    input.setAttribute('placeholder', 'Enter text')
    doc.body!.appendChild(input)
    expect(input.matches(':placeholder-shown')).toBe(true)
  })

  test(':placeholder-shown does not match input with value', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    input.setAttribute('placeholder', 'Enter text')
    input.value = 'hello'
    doc.body!.appendChild(input)
    expect(input.matches(':placeholder-shown')).toBe(false)
  })

  test(':placeholder-shown does not match input without placeholder', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    doc.body!.appendChild(input)
    expect(input.matches(':placeholder-shown')).toBe(false)
  })

  test(':placeholder-shown does not match non-input elements', () => {
    const el = new VirtualElement('div')
    el.setAttribute('placeholder', 'test')
    expect(el.matches(':placeholder-shown')).toBe(false)
  })
})

// =============================================================================
// Selector: :read-only and :read-write
// =============================================================================
describe('Selector: :read-only and :read-write', () => {
  test(':read-write matches editable input', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    doc.body!.appendChild(input)
    expect(input.matches(':read-write')).toBe(true)
    expect(input.matches(':read-only')).toBe(false)
  })

  test(':read-only matches readonly input', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    input.setAttribute('readonly', '')
    doc.body!.appendChild(input)
    expect(input.matches(':read-only')).toBe(true)
    expect(input.matches(':read-write')).toBe(false)
  })

  test(':read-only matches disabled input', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    input.setAttribute('disabled', '')
    doc.body!.appendChild(input)
    expect(input.matches(':read-only')).toBe(true)
  })

  test(':read-write matches contenteditable div', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    div.contentEditable = 'true'
    doc.body!.appendChild(div)
    expect(div.matches(':read-write')).toBe(true)
  })

  test(':read-only matches non-editable div', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    doc.body!.appendChild(div)
    expect(div.matches(':read-only')).toBe(true)
  })
})

// =============================================================================
// Selector: :any-link and :link
// =============================================================================
describe('Selector: :any-link and :link', () => {
  test(':any-link matches anchor with href', () => {
    const doc = new VirtualDocument()
    const a = doc.createElement('a')
    a.setAttribute('href', '/page')
    doc.body!.appendChild(a)
    expect(a.matches(':any-link')).toBe(true)
  })

  test(':any-link does not match anchor without href', () => {
    const doc = new VirtualDocument()
    const a = doc.createElement('a')
    doc.body!.appendChild(a)
    expect(a.matches(':any-link')).toBe(false)
  })

  test(':any-link matches area with href', () => {
    const doc = new VirtualDocument()
    const area = doc.createElement('area')
    area.setAttribute('href', '/region')
    doc.body!.appendChild(area)
    expect(area.matches(':any-link')).toBe(true)
  })

  test(':link also works', () => {
    const doc = new VirtualDocument()
    const a = doc.createElement('a')
    a.setAttribute('href', '/test')
    doc.body!.appendChild(a)
    expect(a.matches(':link')).toBe(true)
  })
})

// =============================================================================
// Selector: pseudo-elements (::before, ::after)
// =============================================================================
describe('Selector: pseudo-elements (::before, ::after)', () => {
  test('::before does not throw in selector matching', () => {
    const el = new VirtualElement('p')
    expect(() => el.matches('p::before')).not.toThrow()
  })

  test('::after does not throw', () => {
    const el = new VirtualElement('div')
    expect(() => el.matches('div::after')).not.toThrow()
  })

  test('::placeholder does not throw', () => {
    const el = new VirtualElement('input')
    expect(() => el.matches('input::placeholder')).not.toThrow()
  })

  test('querySelectorAll with pseudo-element does not throw', () => {
    const doc = new VirtualDocument()
    doc.body!.innerHTML = '<p>test</p>'
    expect(() => doc.querySelectorAll('p::first-line')).not.toThrow()
  })

  test('interactive pseudo-classes return false silently', () => {
    const el = new VirtualElement('div')
    expect(el.matches(':hover')).toBe(false)
    expect(el.matches(':active')).toBe(false)
    expect(el.matches(':focus')).toBe(false)
    expect(el.matches(':visited')).toBe(false)
    expect(el.matches(':target')).toBe(false)
  })
})

// =============================================================================
// Selector: nth-child An+B notation
// =============================================================================
describe('Selector: nth-child An+B notation', () => {
  function createList(count: number): VirtualDocument {
    const doc = new VirtualDocument()
    const ul = doc.createElement('ul')
    doc.body!.appendChild(ul)
    for (let i = 0; i < count; i++) {
      const li = doc.createElement('li')
      li.setAttribute('class', `item-${i + 1}`)
      ul.appendChild(li)
    }
    return doc
  }

  test(':nth-child(2n+1) matches odd items', () => {
    const doc = createList(6)
    const items = doc.querySelectorAll('li:nth-child(2n+1)')
    expect(items.length).toBe(3)
    expect(items[0].getAttribute('class')).toBe('item-1')
    expect(items[1].getAttribute('class')).toBe('item-3')
    expect(items[2].getAttribute('class')).toBe('item-5')
  })

  test(':nth-child(2n) matches even items', () => {
    const doc = createList(6)
    const items = doc.querySelectorAll('li:nth-child(2n)')
    expect(items.length).toBe(3)
    expect(items[0].getAttribute('class')).toBe('item-2')
    expect(items[1].getAttribute('class')).toBe('item-4')
    expect(items[2].getAttribute('class')).toBe('item-6')
  })

  test(':nth-child(3n) matches every 3rd', () => {
    const doc = createList(9)
    const items = doc.querySelectorAll('li:nth-child(3n)')
    expect(items.length).toBe(3)
    expect(items[0].getAttribute('class')).toBe('item-3')
    expect(items[1].getAttribute('class')).toBe('item-6')
    expect(items[2].getAttribute('class')).toBe('item-9')
  })

  test(':nth-child(-n+3) matches first 3', () => {
    const doc = createList(6)
    const items = doc.querySelectorAll('li:nth-child(-n+3)')
    expect(items.length).toBe(3)
    expect(items[0].getAttribute('class')).toBe('item-1')
    expect(items[1].getAttribute('class')).toBe('item-2')
    expect(items[2].getAttribute('class')).toBe('item-3')
  })

  test(':nth-last-child(2n+1) matches odd from end', () => {
    const doc = createList(4)
    const items = doc.querySelectorAll('li:nth-last-child(2n+1)')
    expect(items.length).toBe(2)
    // Positions from end: 4=1st, 3=2nd, 2=3rd, 1=4th
    // 2n+1 matches positions 1,3 from end = item-4, item-2
    expect(items[0].getAttribute('class')).toBe('item-2')
    expect(items[1].getAttribute('class')).toBe('item-4')
  })

  test(':nth-last-of-type(2n) matches even from end', () => {
    const doc = createList(4)
    const items = doc.querySelectorAll('li:nth-last-of-type(2n)')
    expect(items.length).toBe(2)
    // Positions from end: 4=1, 3=2, 2=3, 1=4
    // 2n matches positions 2,4 from end = item-3, item-1
    expect(items[0].getAttribute('class')).toBe('item-1')
    expect(items[1].getAttribute('class')).toBe('item-3')
  })
})

// =============================================================================
// Selector: type-based pseudo-classes
// =============================================================================
describe('Selector: type-based pseudo-classes', () => {
  function createMixedList(): { doc: VirtualDocument, ul: VirtualElement } {
    const doc = new VirtualDocument()
    const ul = doc.createElement('ul')
    doc.body!.appendChild(ul)
    // Create: li, span, li, span, li
    for (let i = 0; i < 5; i++) {
      const tag = i % 2 === 0 ? 'li' : 'span'
      const el = doc.createElement(tag)
      el.setAttribute('class', `item-${i + 1}`)
      ul.appendChild(el)
    }
    return { doc, ul }
  }

  test(':first-of-type matches first of each tag type', () => {
    const { doc } = createMixedList()
    const firstLi = doc.querySelectorAll('li:first-of-type')
    expect(firstLi.length).toBe(1)
    expect(firstLi[0].getAttribute('class')).toBe('item-1')

    const firstSpan = doc.querySelectorAll('span:first-of-type')
    expect(firstSpan.length).toBe(1)
    expect(firstSpan[0].getAttribute('class')).toBe('item-2')
  })

  test(':last-of-type matches last of each tag type', () => {
    const { doc } = createMixedList()
    const lastLi = doc.querySelectorAll('li:last-of-type')
    expect(lastLi.length).toBe(1)
    expect(lastLi[0].getAttribute('class')).toBe('item-5')

    const lastSpan = doc.querySelectorAll('span:last-of-type')
    expect(lastSpan.length).toBe(1)
    expect(lastSpan[0].getAttribute('class')).toBe('item-4')
  })

  test(':only-child matches element that is the only child', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const p = doc.createElement('p')
    div.appendChild(p)
    doc.body!.appendChild(div)

    expect(p.matches(':only-child')).toBe(true)

    // Add another child
    const span = doc.createElement('span')
    div.appendChild(span)
    expect(p.matches(':only-child')).toBe(false)
  })

  test(':only-of-type matches element that is the only one of its type', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const p = doc.createElement('p')
    const span = doc.createElement('span')
    div.appendChild(p)
    div.appendChild(span)
    doc.body!.appendChild(div)

    // p is the only <p> among siblings
    expect(p.matches(':only-of-type')).toBe(true)
    // span is the only <span> among siblings
    expect(span.matches(':only-of-type')).toBe(true)

    // Add another p - now p is no longer only-of-type
    const p2 = doc.createElement('p')
    div.appendChild(p2)
    expect(p.matches(':only-of-type')).toBe(false)
  })

  test(':nth-of-type matches nth element of its type', () => {
    const { doc } = createMixedList()
    // li elements are at positions 1, 3, 5 in childNodes but 1st, 2nd, 3rd among <li>
    const secondLi = doc.querySelectorAll('li:nth-of-type(2)')
    expect(secondLi.length).toBe(1)
    expect(secondLi[0].getAttribute('class')).toBe('item-3')
  })

  test(':nth-last-child matches from the end', () => {
    const doc = new VirtualDocument()
    const ul = doc.createElement('ul')
    doc.body!.appendChild(ul)
    for (let i = 0; i < 5; i++) {
      const li = doc.createElement('li')
      li.setAttribute('class', `item-${i + 1}`)
      ul.appendChild(li)
    }

    // :nth-last-child(1) = last child
    const last = doc.querySelectorAll('li:nth-last-child(1)')
    expect(last.length).toBe(1)
    expect(last[0].getAttribute('class')).toBe('item-5')

    // :nth-last-child(2) = second to last
    const secondLast = doc.querySelectorAll('li:nth-last-child(2)')
    expect(secondLast.length).toBe(1)
    expect(secondLast[0].getAttribute('class')).toBe('item-4')
  })

  test(':nth-last-of-type matches from the end by type', () => {
    const { doc } = createMixedList()
    // li elements are item-1, item-3, item-5 (3 total)
    // :nth-last-of-type(1) = last li = item-5
    const lastLi = doc.querySelectorAll('li:nth-last-of-type(1)')
    expect(lastLi.length).toBe(1)
    expect(lastLi[0].getAttribute('class')).toBe('item-5')
  })
})
