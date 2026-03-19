import { describe, expect, test } from 'bun:test'
import {
  VirtualDocument,
  VirtualElement,
} from '../src'

// =============================================================================
// Range: createContextualFragment
// =============================================================================
describe('Range: createContextualFragment', () => {
  test('creates document fragment from HTML', () => {
    const doc = new VirtualDocument()
    const range = doc.createRange()
    range.selectNodeContents(doc.body!)
    const fragment = range.createContextualFragment('<div>hello</div><span>world</span>')
    expect(fragment.childNodes.length).toBe(2)
    expect((fragment.childNodes[0] as VirtualElement).tagName).toBe('DIV')
    expect((fragment.childNodes[1] as VirtualElement).tagName).toBe('SPAN')
  })

  test('returns empty fragment for empty string', () => {
    const doc = new VirtualDocument()
    const range = doc.createRange()
    range.selectNodeContents(doc.body!)
    const fragment = range.createContextualFragment('')
    expect(fragment.childNodes.length).toBe(0)
  })

  test('fragment can be inserted into DOM', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    doc.body!.appendChild(div)
    const range = doc.createRange()
    range.selectNodeContents(div)
    const fragment = range.createContextualFragment('<p>inserted</p>')
    div.appendChild(fragment)
    expect(div.childNodes.length).toBe(1)
    expect((div.childNodes[0] as VirtualElement).tagName).toBe('P')
  })

  test('Range has getBoundingClientRect and getClientRects', () => {
    const doc = new VirtualDocument()
    const range = doc.createRange()
    expect(typeof range.getBoundingClientRect).toBe('function')
    expect(typeof range.getClientRects).toBe('function')
    const rect = range.getBoundingClientRect()
    expect(rect.x).toBe(0)
    expect(range.getClientRects()).toEqual([])
  })
})

// =============================================================================
// Range: getBoundingClientRect and getClientRects
// =============================================================================
describe('Range: getBoundingClientRect and getClientRects', () => {
  test('getBoundingClientRect returns zeroed DOMRect', () => {
    const doc = new VirtualDocument()
    const range = doc.createRange()
    const rect = range.getBoundingClientRect()
    expect(rect.x).toBe(0)
    expect(rect.y).toBe(0)
    expect(rect.width).toBe(0)
    expect(rect.height).toBe(0)
  })

  test('getClientRects returns empty array', () => {
    const doc = new VirtualDocument()
    const range = doc.createRange()
    expect(range.getClientRects()).toEqual([])
  })
})

// =============================================================================
// Selection: removeRange
// =============================================================================
describe('Selection: removeRange', () => {
  test('removeRange removes matching range', () => {
    const doc = new VirtualDocument()
    const selection = doc.getSelection()
    const range = doc.createRange()
    selection.addRange(range)
    expect(selection.rangeCount).toBe(1)

    selection.removeRange(range)
    expect(selection.rangeCount).toBe(0)
  })

  test('removeRange does nothing for non-matching range', () => {
    const doc = new VirtualDocument()
    const selection = doc.getSelection()
    const range1 = doc.createRange()
    const range2 = doc.createRange()
    selection.addRange(range1)

    selection.removeRange(range2) // different range object
    expect(selection.rangeCount).toBe(1) // still has range1
  })
})

// =============================================================================
// Selection: containsNode
// =============================================================================
describe('Selection: containsNode', () => {
  test('containsNode returns false when no selection', () => {
    const doc = new VirtualDocument()
    const selection = doc.getSelection()
    const div = doc.createElement('div')
    doc.body!.appendChild(div)
    expect(selection.containsNode(div)).toBe(false)
  })

  test('containsNode returns true for selected node', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const text = doc.createTextNode('hello')
    div.appendChild(text)
    doc.body!.appendChild(div)

    const selection = doc.getSelection()
    const range = doc.createRange()
    range.selectNode(div)
    selection.addRange(range)
    expect(selection.containsNode(div)).toBe(true)
  })
})
