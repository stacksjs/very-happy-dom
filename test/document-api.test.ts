import { describe, expect, test } from 'bun:test'
import { VirtualDocument, VirtualElement, VirtualEvent, Window } from '../src'
import { VirtualDocumentFragment } from '../src/nodes/VirtualDocumentFragment'

// =============================================================================
// Document: properties (readyState, compatMode, contentType, etc.)
// =============================================================================
describe('Document: properties (readyState, compatMode, contentType, etc.)', () => {
  test('readyState is complete', () => {
    const doc = new VirtualDocument()
    expect(doc.readyState).toBe('complete')
  })

  test('compatMode is CSS1Compat', () => {
    const doc = new VirtualDocument()
    expect(doc.compatMode).toBe('CSS1Compat')
  })

  test('contentType is text/html', () => {
    const doc = new VirtualDocument()
    expect(doc.contentType).toBe('text/html')
  })

  test('characterSet and aliases', () => {
    const doc = new VirtualDocument()
    expect(doc.characterSet).toBe('UTF-8')
    expect(doc.charset).toBe('UTF-8')
    expect(doc.inputEncoding).toBe('UTF-8')
  })

  test('visibilityState and hidden', () => {
    const doc = new VirtualDocument()
    expect(doc.visibilityState).toBe('visible')
    expect(doc.hidden).toBe(false)
  })

  test('scrollingElement returns documentElement', () => {
    const doc = new VirtualDocument()
    expect(doc.scrollingElement).toBe(doc.documentElement)
  })

  test('implementation.createHTMLDocument', () => {
    const doc = new VirtualDocument()
    const newDoc = doc.implementation.createHTMLDocument('Test')
    expect(newDoc).toBeInstanceOf(VirtualDocument)
    expect(newDoc.title).toBe('Test')
  })

  test('implementation.hasFeature', () => {
    const doc = new VirtualDocument()
    expect(doc.implementation.hasFeature()).toBe(true)
  })

  test('domain returns hostname', () => {
    const win = new Window({ url: 'https://example.com:8080/path' })
    expect(win.document.domain).toBe('example.com')
  })
})

// =============================================================================
// Document: createEvent
// =============================================================================
describe('Document: createEvent', () => {
  test('createEvent returns uninitialized event', () => {
    const doc = new VirtualDocument()
    const event = doc.createEvent('Event')
    expect(event).toBeDefined()
    expect(event).toBeInstanceOf(VirtualEvent)
  })

  test('createEvent + initEvent sets type', () => {
    const doc = new VirtualDocument()
    const event = doc.createEvent('Event')
    event.initEvent('click', true, true)
    expect(event.type).toBe('click')
  })

  test('createEvent with MouseEvents returns MouseEvent-compatible instance', () => {
    const doc = new VirtualDocument()
    const event = doc.createEvent('MouseEvents')
    expect(event).toBeInstanceOf(VirtualEvent)
  })

  test('createEvent with empty string still works', () => {
    const doc = new VirtualDocument()
    const event = doc.createEvent('')
    expect(event).toBeInstanceOf(VirtualEvent)
  })
})

// =============================================================================
// Document: importNode
// =============================================================================
describe('Document: importNode', () => {
  test('importNode clones and sets ownerDocument', () => {
    const doc1 = new VirtualDocument()
    const doc2 = new VirtualDocument()
    const el = doc1.createElement('div')
    el.setAttribute('id', 'test')
    const imported = doc2.importNode(el, false)
    expect((imported as VirtualElement).getAttribute('id')).toBe('test')
    expect(imported.ownerDocument).toBe(doc2)
    expect(imported).not.toBe(el)
  })

  test('importNode throws if node lacks cloneNode', () => {
    const doc = new VirtualDocument()
    const fakeNode = { nodeType: 1, nodeName: 'DIV' } as any
    expect(() => doc.importNode(fakeNode)).toThrow()
  })

  test('importNode works with valid node', () => {
    const doc1 = new VirtualDocument()
    const doc2 = new VirtualDocument()
    const el = doc1.createElement('div')
    el.setAttribute('id', 'test')
    const imported = doc2.importNode(el, false)
    expect((imported as VirtualElement).getAttribute('id')).toBe('test')
    expect(imported.ownerDocument).toBe(doc2)
    expect(imported).not.toBe(el)
  })

  test('importNode deep clones children', () => {
    const doc1 = new VirtualDocument()
    const doc2 = new VirtualDocument()
    const parent = doc1.createElement('div')
    const child = doc1.createElement('span')
    parent.appendChild(child)
    const imported = doc2.importNode(parent, true) as VirtualElement
    expect(imported.childNodes.length).toBe(1)
    expect((imported.childNodes[0] as VirtualElement).tagName).toBe('SPAN')
    expect(imported.childNodes[0].ownerDocument).toBe(doc2)
  })
})

// =============================================================================
// Document: adoptNode
// =============================================================================
describe('Document: adoptNode', () => {
  test('adoptNode changes ownerDocument', () => {
    const doc1 = new VirtualDocument()
    const doc2 = new VirtualDocument()
    const el = doc1.createElement('div')
    doc1.body!.appendChild(el)
    const adopted = doc2.adoptNode(el)
    expect(adopted).toBe(el)
    expect(adopted.ownerDocument).toBe(doc2)
    expect(adopted.parentNode).toBeNull()
  })
})

// =============================================================================
// Document: focus tracking (hasFocus, activeElement)
// =============================================================================
describe('Document: focus tracking (hasFocus, activeElement)', () => {
  test('hasFocus returns false when nothing focused', () => {
    const doc = new VirtualDocument()
    expect(doc.hasFocus()).toBe(false)
  })

  test('activeElement returns body when nothing focused', () => {
    const doc = new VirtualDocument()
    expect(doc.activeElement).toBe(doc.body)
  })

  test('hasFocus returns false when no element is focused', () => {
    const doc = new VirtualDocument()
    expect(doc.hasFocus()).toBe(false)
  })

  test('hasFocus returns true when an element is focused', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    doc.body!.appendChild(input)
    input.focus()
    expect(doc.hasFocus()).toBe(true)
  })

  test('hasFocus returns false after element is blurred', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    doc.body!.appendChild(input)
    input.focus()
    expect(doc.hasFocus()).toBe(true)
    input.blur()
    expect(doc.hasFocus()).toBe(false)
  })
})

// =============================================================================
// Document: collection getters (forms, images, scripts, anchors, embeds)
// =============================================================================
describe('Document: collection getters (forms, images, scripts, anchors, embeds)', () => {
  test('forms getter', () => {
    const doc = new VirtualDocument()
    const form = doc.createElement('form')
    doc.body!.appendChild(form)
    expect(doc.forms.length).toBe(1)
  })

  test('images getter', () => {
    const doc = new VirtualDocument()
    const img = doc.createElement('img')
    doc.body!.appendChild(img)
    expect(doc.images.length).toBe(1)
  })

  test('scripts getter', () => {
    const doc = new VirtualDocument()
    const script = doc.createElement('script')
    doc.body!.appendChild(script)
    expect(doc.scripts.length).toBe(1)
  })

  test('document.anchors returns a[name] elements', () => {
    const doc = new VirtualDocument()
    const a1 = doc.createElement('a')
    a1.setAttribute('name', 'top')
    const a2 = doc.createElement('a')
    a2.setAttribute('href', '/page')
    doc.body!.appendChild(a1)
    doc.body!.appendChild(a2)
    expect(doc.anchors.length).toBe(1)
    expect(doc.anchors[0]).toBe(a1)
  })

  test('document.embeds returns embed elements', () => {
    const doc = new VirtualDocument()
    const embed = doc.createElement('embed')
    doc.body!.appendChild(embed)
    expect(doc.embeds.length).toBe(1)
  })

  test('document.plugins is alias for embeds', () => {
    const doc = new VirtualDocument()
    const embed = doc.createElement('embed')
    doc.body!.appendChild(embed)
    expect(doc.plugins).toEqual(doc.embeds)
  })

  test('document.currentScript defaults to null', () => {
    const doc = new VirtualDocument()
    expect(doc.currentScript).toBeNull()
  })
})

// =============================================================================
// Document: createElement and factory methods
// =============================================================================
describe('Document: createElement and factory methods', () => {
  test('implementation.createHTMLDocument creates a new document', () => {
    const doc = new VirtualDocument()
    const newDoc = doc.implementation.createHTMLDocument('Test')
    expect(newDoc).toBeInstanceOf(VirtualDocument)
    expect(newDoc.title).toBe('Test')
  })

  test('implementation.hasFeature returns true', () => {
    const doc = new VirtualDocument()
    expect(doc.implementation.hasFeature()).toBe(true)
  })
})

// =============================================================================
// Document: open, close, write, writeln
// =============================================================================
describe('Document: open, close, write, writeln', () => {
  test('document.open() returns the document', () => {
    const doc = new VirtualDocument()
    const result = doc.open()
    expect(result).toBe(doc)
  })

  test('document.open() clears body', () => {
    const doc = new VirtualDocument()
    doc.body!.innerHTML = '<p>old content</p>'
    expect(doc.body!.childNodes.length).toBeGreaterThan(0)
    doc.open()
    expect(doc.body!.childNodes.length).toBe(0)
  })

  test('document.close() does not throw', () => {
    const doc = new VirtualDocument()
    expect(() => doc.close()).not.toThrow()
  })

  test('document.writeln() adds content with newline', () => {
    const doc = new VirtualDocument()
    doc.writeln('<p>line1</p>')
    doc.writeln('<p>line2</p>')
    const paragraphs = doc.querySelectorAll('p')
    expect(paragraphs.length).toBe(2)
  })

  test('open/write/close pattern works', () => {
    const doc = new VirtualDocument()
    doc.open()
    doc.write('<p>fresh</p>')
    doc.close()
    expect(doc.querySelectorAll('p').length).toBe(1)
  })
})

// =============================================================================
// Document: getElementsByName
// =============================================================================
describe('Document: getElementsByName', () => {
  test('finds elements by name attribute', () => {
    const doc = new VirtualDocument()
    const input1 = doc.createElement('input')
    input1.setAttribute('name', 'email')
    const input2 = doc.createElement('input')
    input2.setAttribute('name', 'email')
    const input3 = doc.createElement('input')
    input3.setAttribute('name', 'password')
    doc.body!.appendChild(input1)
    doc.body!.appendChild(input2)
    doc.body!.appendChild(input3)

    const results = doc.getElementsByName('email')
    expect(results.length).toBe(2)
  })

  test('returns empty array when no match', () => {
    const doc = new VirtualDocument()
    expect(doc.getElementsByName('nonexistent').length).toBe(0)
  })
})

// =============================================================================
// Document: createAttribute
// =============================================================================
describe('Document: createAttribute', () => {
  test('creates attribute node with name', () => {
    const doc = new VirtualDocument()
    const attr = doc.createAttribute('data-test')
    expect(attr.name).toBe('data-test')
    expect(attr.value).toBe('')
    expect(attr.specified).toBe(true)
  })

  test('attribute name is lowercased', () => {
    const doc = new VirtualDocument()
    const attr = doc.createAttribute('DATA-TEST')
    expect(attr.name).toBe('data-test')
  })
})

// =============================================================================
// Document: execCommand (legacy)
// =============================================================================
describe('Document: execCommand (legacy)', () => {
  test('execCommand returns false', () => {
    const doc = new VirtualDocument()
    expect(doc.execCommand('bold')).toBe(false)
    expect(doc.execCommand('insertText', false, 'hello')).toBe(false)
  })

  test('queryCommandSupported returns false', () => {
    const doc = new VirtualDocument()
    expect(doc.queryCommandSupported('bold')).toBe(false)
    expect(doc.queryCommandSupported('copy')).toBe(false)
  })

  test('queryCommandEnabled returns false', () => {
    const doc = new VirtualDocument()
    expect(doc.queryCommandEnabled('bold')).toBe(false)
  })
})

// =============================================================================
// DocumentFragment: getElementById
// =============================================================================
describe('DocumentFragment: getElementById', () => {
  test('getElementById finds element in fragment', () => {
    const doc = new VirtualDocument()
    const fragment = doc.createDocumentFragment()
    const div = doc.createElement('div')
    div.setAttribute('id', 'myId')
    fragment.appendChild(div)

    const found = (fragment as VirtualDocumentFragment).getElementById('myId')
    expect(found).toBe(div)
  })

  test('getElementById returns null when not found', () => {
    const doc = new VirtualDocument()
    const fragment = doc.createDocumentFragment()
    const found = (fragment as VirtualDocumentFragment).getElementById('nonexistent')
    expect(found).toBeNull()
  })

  test('getElementById finds nested elements', () => {
    const doc = new VirtualDocument()
    const fragment = doc.createDocumentFragment()
    const outer = doc.createElement('div')
    const inner = doc.createElement('span')
    inner.setAttribute('id', 'nested')
    outer.appendChild(inner)
    fragment.appendChild(outer)

    const found = (fragment as VirtualDocumentFragment).getElementById('nested')
    expect(found).toBe(inner)
  })
})
