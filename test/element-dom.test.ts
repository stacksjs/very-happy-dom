import { beforeEach, describe, expect, test } from 'bun:test'
import { VirtualDocument, VirtualElement, VirtualEvent, Window } from '../src'

// =============================================================================
// Element: focus and blur tracking
// =============================================================================
describe('Element: focus and blur tracking', () => {
  let doc: VirtualDocument

  beforeEach(() => {
    doc = new VirtualDocument()
  })

  test('focus() updates document.activeElement', () => {
    const input = doc.createElement('input')
    doc.body!.appendChild(input)
    input.focus()
    expect(doc.activeElement).toBe(input)
  })

  test('blur() resets document.activeElement to body', () => {
    const input = doc.createElement('input')
    doc.body!.appendChild(input)
    input.focus()
    expect(doc.activeElement).toBe(input)
    input.blur()
    expect(doc.activeElement).toBe(doc.body)
  })

  test('focusing one element blurs the previously focused element', () => {
    const input1 = doc.createElement('input')
    const input2 = doc.createElement('input')
    doc.body!.appendChild(input1)
    doc.body!.appendChild(input2)

    let blurCount = 0
    input1.addEventListener('blur', () => { blurCount++ })

    input1.focus()
    expect(doc.activeElement).toBe(input1)

    input2.focus()
    expect(doc.activeElement).toBe(input2)
    expect(blurCount).toBe(1)
  })

  test('focus dispatches focus event', () => {
    const input = doc.createElement('input')
    doc.body!.appendChild(input)
    let focused = false
    input.addEventListener('focus', () => { focused = true })
    input.focus()
    expect(focused).toBe(true)
  })

  test('blur dispatches blur event', () => {
    const input = doc.createElement('input')
    doc.body!.appendChild(input)
    let blurred = false
    input.addEventListener('blur', () => { blurred = true })
    input.focus()
    input.blur()
    expect(blurred).toBe(true)
  })

  test('focus dispatches focus event (standalone element)', () => {
    const doc = new VirtualDocument()
    const el = doc.createElement('input')
    let focused = false
    el.addEventListener('focus', () => { focused = true })
    el.focus()
    expect(focused).toBe(true)
  })

  test('blur dispatches blur event (standalone element)', () => {
    const doc = new VirtualDocument()
    const el = doc.createElement('input')
    let blurred = false
    el.addEventListener('blur', () => { blurred = true })
    el.blur()
    expect(blurred).toBe(true)
  })
})

// =============================================================================
// Element: isVisible walks ancestor chain
// =============================================================================
describe('Element: isVisible walks ancestor chain', () => {
  test('element with display:none is not visible', () => {
    const el = new VirtualElement('div')
    el.style.display = 'none'
    expect(el.isVisible()).toBe(false)
  })

  test('element with visible parent is visible', () => {
    const parent = new VirtualElement('div')
    const child = new VirtualElement('span')
    parent.appendChild(child)
    expect(child.isVisible()).toBe(true)
  })

  test('element with hidden parent is not visible', () => {
    const parent = new VirtualElement('div')
    parent.style.display = 'none'
    const child = new VirtualElement('span')
    parent.appendChild(child)
    expect(child.isVisible()).toBe(false)
  })

  test('deeply nested element with hidden ancestor is not visible', () => {
    const grandparent = new VirtualElement('div')
    grandparent.style.visibility = 'hidden'
    const parent = new VirtualElement('div')
    grandparent.appendChild(parent)
    const child = new VirtualElement('span')
    parent.appendChild(child)
    expect(child.isVisible()).toBe(false)
  })

  test('visibility: collapse is treated as hidden', () => {
    const el = new VirtualElement('tr')
    el.style.visibility = 'collapse'
    expect(el.isVisible()).toBe(false)
  })

  test('ancestor with opacity 0 makes child not visible', () => {
    const parent = new VirtualElement('div')
    parent.style.opacity = '0'
    const child = new VirtualElement('span')
    parent.appendChild(child)
    expect(child.isVisible()).toBe(false)
  })

  test('element with no hidden ancestors is visible', () => {
    const a = new VirtualElement('div')
    const b = new VirtualElement('div')
    a.appendChild(b)
    const c = new VirtualElement('span')
    b.appendChild(c)
    expect(c.isVisible()).toBe(true)
  })
})

// =============================================================================
// Element: layout properties (offset, scroll, clientRects)
// =============================================================================
describe('Element: layout properties (offset, scroll, clientRects)', () => {
  test('offsetWidth returns 0', () => {
    const el = new VirtualElement('div')
    expect(el.offsetWidth).toBe(0)
  })

  test('offsetHeight returns 0', () => {
    const el = new VirtualElement('div')
    expect(el.offsetHeight).toBe(0)
  })

  test('offsetTop returns 0', () => {
    const el = new VirtualElement('div')
    expect(el.offsetTop).toBe(0)
  })

  test('offsetLeft returns 0', () => {
    const el = new VirtualElement('div')
    expect(el.offsetLeft).toBe(0)
  })

  test('offsetParent returns parentElement', () => {
    const doc = new VirtualDocument()
    const parent = doc.createElement('div')
    const child = doc.createElement('span')
    parent.appendChild(child)
    doc.body!.appendChild(parent)
    expect(child.offsetParent).toBe(parent)
  })

  test('offsetParent returns null for detached element', () => {
    const el = new VirtualElement('div')
    expect(el.offsetParent).toBeNull()
  })

  test('getBoundingClientRect has toJSON method', () => {
    const el = new VirtualElement('div')
    const rect = el.getBoundingClientRect()
    expect(typeof rect.toJSON).toBe('function')
    const json = rect.toJSON()
    expect(json.x).toBe(0)
    expect(json.width).toBe(0)
  })

  test('scrollTop defaults to 0', () => {
    const el = new VirtualElement('div')
    expect(el.scrollTop).toBe(0)
  })

  test('scrollTop is writable', () => {
    const el = new VirtualElement('div')
    el.scrollTop = 100
    expect(el.scrollTop).toBe(100)
  })

  test('scrollLeft defaults to 0', () => {
    const el = new VirtualElement('div')
    expect(el.scrollLeft).toBe(0)
  })

  test('scrollLeft is writable', () => {
    const el = new VirtualElement('div')
    el.scrollLeft = 50
    expect(el.scrollLeft).toBe(50)
  })

  test('scrollTop and scrollLeft are independent', () => {
    const el = new VirtualElement('div')
    el.scrollTop = 10
    el.scrollLeft = 20
    expect(el.scrollTop).toBe(10)
    expect(el.scrollLeft).toBe(20)
  })

  test('scrollIntoView is a no-op', () => {
    const el = new VirtualElement('div')
    expect(() => el.scrollIntoView()).not.toThrow()
    expect(() => el.scrollIntoView(true)).not.toThrow()
    expect(() => el.scrollIntoView({ behavior: 'smooth' })).not.toThrow()
  })

  test('getClientRects returns empty array', () => {
    const el = new VirtualElement('div')
    expect(el.getClientRects()).toEqual([])
  })
})

// =============================================================================
// Element: insertAdjacent methods
// =============================================================================
describe('Element: insertAdjacent methods', () => {
  test('insertAdjacentHTML throws on invalid position', () => {
    const doc = new VirtualDocument()
    const el = doc.createElement('div')
    expect(() => el.insertAdjacentHTML('invalid', '<span>x</span>')).toThrow()
  })

  test('insertAdjacentElement throws on invalid position', () => {
    const doc = new VirtualDocument()
    const el = doc.createElement('div')
    const span = doc.createElement('span')
    expect(() => el.insertAdjacentElement('invalid', span)).toThrow()
  })

  test('insertAdjacentText throws on invalid position', () => {
    const doc = new VirtualDocument()
    const el = doc.createElement('div')
    expect(() => el.insertAdjacentText('invalid', 'text')).toThrow()
  })

  test('valid positions still work for insertAdjacentHTML', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    doc.body!.appendChild(div)
    expect(() => div.insertAdjacentHTML('beforeend', '<span>ok</span>')).not.toThrow()
    expect(div.childNodes.length).toBe(1)
  })

  test('valid positions still work for insertAdjacentElement', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    doc.body!.appendChild(div)
    const span = doc.createElement('span')
    const result = div.insertAdjacentElement('beforeend', span)
    expect(result).toBe(span)
  })

  test('case-insensitive position works', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    doc.body!.appendChild(div)
    expect(() => div.insertAdjacentHTML('BeforeEnd', '<span>ok</span>')).not.toThrow()
  })

  test('insertAdjacentHTML beforeend', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    div.innerHTML = '<p>existing</p>'
    div.insertAdjacentHTML('beforeend', '<span>added</span>')
    expect(div.childNodes.length).toBe(2)
    expect((div.childNodes[1] as VirtualElement).tagName).toBe('SPAN')
  })

  test('insertAdjacentHTML afterbegin', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    div.innerHTML = '<p>existing</p>'
    div.insertAdjacentHTML('afterbegin', '<span>first</span>')
    expect((div.childNodes[0] as VirtualElement).tagName).toBe('SPAN')
  })

  test('insertAdjacentHTML beforebegin and afterend', () => {
    const doc = new VirtualDocument()
    const container = doc.createElement('div')
    const child = doc.createElement('p')
    container.appendChild(child)
    child.insertAdjacentHTML('beforebegin', '<span>before</span>')
    child.insertAdjacentHTML('afterend', '<em>after</em>')
    expect(container.childNodes.length).toBe(3)
    expect((container.childNodes[0] as VirtualElement).tagName).toBe('SPAN')
    expect((container.childNodes[2] as VirtualElement).tagName).toBe('EM')
  })

  test('insertAdjacentElement', () => {
    const doc = new VirtualDocument()
    const container = doc.createElement('div')
    const child = doc.createElement('p')
    container.appendChild(child)
    const span = doc.createElement('span')
    const result = child.insertAdjacentElement('afterend', span)
    expect(result).toBe(span)
    expect(container.childNodes.length).toBe(2)
    expect((container.childNodes[1] as VirtualElement).tagName).toBe('SPAN')
  })

  test('insertAdjacentText', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    div.insertAdjacentText('beforeend', 'hello')
    expect(div.textContent).toBe('hello')
  })
})

// =============================================================================
// Element: cloneNode with shadow DOM
// =============================================================================
describe('Element: cloneNode with shadow DOM', () => {
  test('deep clone includes shadow root', () => {
    const doc = new VirtualDocument()
    const host = doc.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })
    const slot = doc.createElement('slot')
    shadow.appendChild(slot)

    const clone = host.cloneNode(true) as VirtualElement
    expect(clone.shadowRoot).not.toBeNull()
    expect(clone.shadowRoot!.childNodes.length).toBe(1)
    expect((clone.shadowRoot!.childNodes[0] as VirtualElement).tagName).toBe('SLOT')
  })

  test('shallow clone does not include shadow root', () => {
    const doc = new VirtualDocument()
    const host = doc.createElement('div')
    host.attachShadow({ mode: 'open' })
    const clone = host.cloneNode(false) as VirtualElement
    expect(clone.shadowRoot).toBeNull()
  })

  test('cloned shadow root is independent', () => {
    const doc = new VirtualDocument()
    const host = doc.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })
    const p = doc.createElement('p')
    p.textContent = 'original'
    shadow.appendChild(p)

    const clone = host.cloneNode(true) as VirtualElement
    // Mutating the clone's shadow should not affect the original
    const clonedP = clone.shadowRoot!.childNodes[0] as VirtualElement
    clonedP.textContent = 'modified'
    expect(p.textContent).toBe('original')
  })
})

// =============================================================================
// Element: radio group synchronization
// =============================================================================
describe('Element: radio group synchronization', () => {
  test('checking one radio unchecks others in same group', () => {
    const doc = new VirtualDocument()
    const form = doc.createElement('form')
    doc.body!.appendChild(form)

    const r1 = doc.createElement('input')
    r1.setAttribute('type', 'radio')
    r1.setAttribute('name', 'group')
    form.appendChild(r1)

    const r2 = doc.createElement('input')
    r2.setAttribute('type', 'radio')
    r2.setAttribute('name', 'group')
    form.appendChild(r2)

    r1.checked = true
    expect(r1.checked).toBe(true)
    expect(r2.checked).toBe(false)

    r2.checked = true
    expect(r2.checked).toBe(true)
    expect(r1.checked).toBe(false)
  })

  test('radios in different groups are independent', () => {
    const doc = new VirtualDocument()
    const form = doc.createElement('form')
    doc.body!.appendChild(form)

    const r1 = doc.createElement('input')
    r1.setAttribute('type', 'radio')
    r1.setAttribute('name', 'groupA')
    form.appendChild(r1)

    const r2 = doc.createElement('input')
    r2.setAttribute('type', 'radio')
    r2.setAttribute('name', 'groupB')
    form.appendChild(r2)

    r1.checked = true
    r2.checked = true
    expect(r1.checked).toBe(true)
    expect(r2.checked).toBe(true)
  })
})

// =============================================================================
// Element: normalize()
// =============================================================================
describe('Element: normalize()', () => {
  test('normalize merges adjacent text nodes', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const t1 = doc.createTextNode('Hello')
    const t2 = doc.createTextNode(' World')
    div.childNodes.push(t1, t2)
    t1.parentNode = div
    t2.parentNode = div
    doc.body!.appendChild(div)

    expect(div.childNodes.length).toBe(2)
    div.normalize()
    expect(div.childNodes.length).toBe(1)
    expect(div.childNodes[0].nodeValue).toBe('Hello World')
  })

  test('normalize removes empty text nodes', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const t1 = doc.createTextNode('')
    const span = doc.createElement('span')
    div.childNodes.push(t1, span)
    t1.parentNode = div
    span.parentNode = div

    div.normalize()
    expect(div.childNodes.length).toBe(1)
    expect((div.childNodes[0] as VirtualElement).tagName).toBe('SPAN')
  })

  test('normalize handles nested elements', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const inner = doc.createElement('p')
    const t1 = doc.createTextNode('a')
    const t2 = doc.createTextNode('b')
    inner.childNodes.push(t1, t2)
    t1.parentNode = inner
    t2.parentNode = inner
    div.appendChild(inner)
    doc.body!.appendChild(div)

    div.normalize()
    expect(inner.childNodes.length).toBe(1)
    expect(inner.childNodes[0].nodeValue).toBe('ab')
  })

  test('normalize with no text nodes does nothing', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const span = doc.createElement('span')
    div.appendChild(span)
    div.normalize()
    expect(div.childNodes.length).toBe(1)
  })
})

// =============================================================================
// Element: compareDocumentPosition()
// =============================================================================
describe('Element: compareDocumentPosition()', () => {
  test('same node returns 0', () => {
    const el = new VirtualElement('div')
    expect(el.compareDocumentPosition(el)).toBe(0)
  })

  test('parent.compareDocumentPosition(child) returns CONTAINS', () => {
    const doc = new VirtualDocument()
    const parent = doc.createElement('div')
    const child = doc.createElement('span')
    parent.appendChild(child)
    doc.body!.appendChild(parent)

    const result = parent.compareDocumentPosition(child)
    // parent contains child: DOCUMENT_POSITION_CONTAINS (0x08) | DOCUMENT_POSITION_PRECEDING (0x02) — but our implementation inverts:
    // this.contains(other) → CONTAINS | PRECEDING
    expect(result & 0x08).toBeTruthy() // CONTAINS
  })

  test('child.compareDocumentPosition(parent) returns CONTAINED_BY', () => {
    const doc = new VirtualDocument()
    const parent = doc.createElement('div')
    const child = doc.createElement('span')
    parent.appendChild(child)
    doc.body!.appendChild(parent)

    const result = child.compareDocumentPosition(parent)
    // other.contains(this) → CONTAINED_BY | FOLLOWING
    expect(result & 0x10).toBeTruthy() // CONTAINED_BY
  })

  test('sibling ordering (following)', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const a = doc.createElement('span')
    const b = doc.createElement('span')
    div.appendChild(a)
    div.appendChild(b)
    doc.body!.appendChild(div)

    const result = a.compareDocumentPosition(b)
    expect(result & 0x04).toBeTruthy() // FOLLOWING
  })

  test('sibling ordering (preceding)', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const a = doc.createElement('span')
    const b = doc.createElement('span')
    div.appendChild(a)
    div.appendChild(b)
    doc.body!.appendChild(div)

    const result = b.compareDocumentPosition(a)
    expect(result & 0x02).toBeTruthy() // PRECEDING
  })

  test('disconnected nodes', () => {
    const a = new VirtualElement('div')
    const b = new VirtualElement('span')
    const result = a.compareDocumentPosition(b)
    expect(result & 0x01).toBeTruthy() // DISCONNECTED
  })
})

// =============================================================================
// Element: getRootNode()
// =============================================================================
describe('Element: getRootNode()', () => {
  test('detached node returns itself', () => {
    const el = new VirtualElement('div')
    expect(el.getRootNode()).toBe(el)
  })

  test('attached node returns document', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    doc.body!.appendChild(div)
    expect(div.getRootNode()).toBe(doc)
  })

  test('deeply nested node returns document', () => {
    const doc = new VirtualDocument()
    const a = doc.createElement('div')
    const b = doc.createElement('div')
    const c = doc.createElement('span')
    a.appendChild(b)
    b.appendChild(c)
    doc.body!.appendChild(a)
    expect(c.getRootNode()).toBe(doc)
  })

  test('node in shadow DOM returns shadow root (without composed)', () => {
    const doc = new VirtualDocument()
    const host = doc.createElement('div')
    doc.body!.appendChild(host)
    const shadow = host.attachShadow({ mode: 'open' })
    const inner = doc.createElement('span')
    shadow.appendChild(inner)
    // Without composed flag, should return shadow root
    expect(inner.getRootNode()).toBe(shadow)
  })

  test('node in shadow DOM with composed:true returns document', () => {
    const doc = new VirtualDocument()
    const host = doc.createElement('div')
    doc.body!.appendChild(host)
    const shadow = host.attachShadow({ mode: 'open' })
    const inner = doc.createElement('span')
    shadow.appendChild(inner)
    expect(inner.getRootNode({ composed: true })).toBe(doc)
  })
})
