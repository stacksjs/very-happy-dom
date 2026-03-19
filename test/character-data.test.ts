import { describe, expect, test } from 'bun:test'
import {
  VirtualDocument,
  VirtualElement,
} from '../src'
import { VirtualCommentNode } from '../src/nodes/VirtualCommentNode'
import { VirtualTextNode } from '../src/nodes/VirtualTextNode'

// =============================================================================
// CommentNode: textContent and CharacterData
// =============================================================================
describe('CommentNode: textContent and CharacterData', () => {
  test('textContent returns the comment data', () => {
    const comment = new VirtualCommentNode('hello world')
    expect(comment.textContent).toBe('hello world')
  })

  test('textContent setter updates the data', () => {
    const comment = new VirtualCommentNode('old')
    comment.textContent = 'new'
    expect(comment.textContent).toBe('new')
    expect(comment.nodeValue).toBe('new')
  })

  test('CharacterData.data is alias for nodeValue', () => {
    const comment = new VirtualCommentNode('test')
    expect(comment.data).toBe('test')
    comment.data = 'updated'
    expect(comment.nodeValue).toBe('updated')
  })

  test('CharacterData.length', () => {
    const comment = new VirtualCommentNode('abcdef')
    expect(comment.length).toBe(6)
  })

  test('substringData', () => {
    const comment = new VirtualCommentNode('Hello World')
    expect(comment.substringData(0, 5)).toBe('Hello')
    expect(comment.substringData(6, 5)).toBe('World')
  })

  test('appendData', () => {
    const comment = new VirtualCommentNode('Hello')
    comment.appendData(' World')
    expect(comment.data).toBe('Hello World')
  })

  test('insertData', () => {
    const comment = new VirtualCommentNode('Helo')
    comment.insertData(2, 'l')
    expect(comment.data).toBe('Hello')
  })

  test('deleteData', () => {
    const comment = new VirtualCommentNode('Hello World')
    comment.deleteData(5, 6)
    expect(comment.data).toBe('Hello')
  })

  test('replaceData', () => {
    const comment = new VirtualCommentNode('Hello World')
    comment.replaceData(6, 5, 'Earth')
    expect(comment.data).toBe('Hello Earth')
  })

  test('substringData throws on invalid offset', () => {
    const comment = new VirtualCommentNode('abc')
    expect(() => comment.substringData(-1, 1)).toThrow()
    expect(() => comment.substringData(10, 1)).toThrow()
  })
})

// =============================================================================
// TextNode: CharacterData interface
// =============================================================================
describe('TextNode: CharacterData interface', () => {
  test('data property is alias for nodeValue', () => {
    const text = new VirtualTextNode('hello')
    expect(text.data).toBe('hello')
    text.data = 'world'
    expect(text.nodeValue).toBe('world')
  })

  test('length property', () => {
    const text = new VirtualTextNode('abcdef')
    expect(text.length).toBe(6)
  })

  test('substringData', () => {
    const text = new VirtualTextNode('Hello World')
    expect(text.substringData(0, 5)).toBe('Hello')
    expect(text.substringData(6, 5)).toBe('World')
  })

  test('appendData', () => {
    const text = new VirtualTextNode('Hello')
    text.appendData(' World')
    expect(text.data).toBe('Hello World')
  })

  test('insertData', () => {
    const text = new VirtualTextNode('Hllo')
    text.insertData(1, 'e')
    expect(text.data).toBe('Hello')
  })

  test('deleteData', () => {
    const text = new VirtualTextNode('Hello World')
    text.deleteData(5, 6)
    expect(text.data).toBe('Hello')
  })

  test('replaceData', () => {
    const text = new VirtualTextNode('Hello World')
    text.replaceData(6, 5, 'Earth')
    expect(text.data).toBe('Hello Earth')
  })

  test('splitText splits node and inserts sibling', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const text = doc.createTextNode('HelloWorld')
    div.appendChild(text)
    doc.body!.appendChild(div)

    const newNode = (text as VirtualTextNode).splitText(5)
    expect(text.nodeValue).toBe('Hello')
    expect(newNode.nodeValue).toBe('World')
    expect(div.childNodes.length).toBe(2)
    expect(div.childNodes[0]).toBe(text)
    expect(div.childNodes[1]).toBe(newNode)
  })

  test('splitText on detached node', () => {
    const text = new VirtualTextNode('HelloWorld')
    const newNode = text.splitText(5)
    expect(text.nodeValue).toBe('Hello')
    expect(newNode.nodeValue).toBe('World')
    // No parent, so newNode is just detached
    expect(newNode.parentNode).toBeNull()
  })

  test('splitText throws on invalid offset', () => {
    const text = new VirtualTextNode('abc')
    expect(() => text.splitText(-1)).toThrow()
    expect(() => text.splitText(10)).toThrow()
  })

  test('wholeText returns contiguous text', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const t1 = doc.createTextNode('Hello')
    const t2 = doc.createTextNode(' ')
    const t3 = doc.createTextNode('World')
    div.appendChild(t1)
    div.appendChild(t2)
    div.appendChild(t3)
    doc.body!.appendChild(div)

    expect((t1 as VirtualTextNode).wholeText).toBe('Hello World')
    expect((t2 as VirtualTextNode).wholeText).toBe('Hello World')
    expect((t3 as VirtualTextNode).wholeText).toBe('Hello World')
  })
})
