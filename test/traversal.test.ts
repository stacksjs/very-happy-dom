import { describe, expect, test } from 'bun:test'
import { FILTER_REJECT, FILTER_SKIP, SHOW_ELEMENT, SHOW_TEXT, createDocument } from '../src'

describe('Traversal APIs', () => {
  test('TreeWalker should traverse filtered element nodes in document order', () => {
    const doc = createDocument()
    doc.body!.innerHTML = '<section><span>A</span><span>B</span></section><footer></footer>'

    const walker = doc.createTreeWalker(doc.body!, SHOW_ELEMENT)

    expect(walker.firstChild()?.nodeName).toBe('SECTION')
    expect(walker.firstChild()?.nodeName).toBe('SPAN')
    expect(walker.nextNode()?.nodeName).toBe('SPAN')
    expect(walker.parentNode()?.nodeName).toBe('SECTION')
    expect(walker.nextSibling()?.nodeName).toBe('FOOTER')
  })

  test('NodeIterator should iterate filtered text nodes', () => {
    const doc = createDocument()
    doc.body!.innerHTML = '<div>Hello <span>world</span><em>!</em></div>'

    const iterator = doc.createNodeIterator(doc.body!, SHOW_TEXT)

    expect(iterator.nextNode()?.textContent).toBe('Hello ')
    expect(iterator.nextNode()?.textContent).toBe('world')
    expect(iterator.nextNode()?.textContent).toBe('!')
    expect(iterator.nextNode()).toBeNull()
    expect(iterator.previousNode()?.textContent).toBe('!')
    expect(iterator.referenceNode.textContent).toBe('world')
    expect(iterator.pointerBeforeReferenceNode).toBe(false)
  })

  test('TreeWalker should honor skip and reject filters', () => {
    const doc = createDocument()
    doc.body!.innerHTML = '<div class="skip"><span>keep</span></div><p class="reject">drop</p><section>tail</section>'

    const walker = doc.createTreeWalker(doc.body!, SHOW_ELEMENT, (node) => {
      if ((node as any).getAttribute?.('class') === 'skip') {
        return FILTER_SKIP
      }
      if ((node as any).getAttribute?.('class') === 'reject') {
        return FILTER_REJECT
      }
      return 1
    })

    expect(walker.nextNode()?.nodeName).toBe('SPAN')
    expect(walker.nextNode()?.nodeName).toBe('SECTION')
    expect(walker.nextNode()).toBeNull()
  })

  test('Range should support text selection, cloning, and deletion', () => {
    const doc = createDocument()
    const text = doc.createTextNode('hello world')
    doc.body!.appendChild(text)

    const range = doc.createRange()
    range.setStart(text, 0)
    range.setEnd(text, 5)

    expect(range.toString()).toBe('hello')
    expect(range.cloneContents().textContent).toBe('hello')

    range.deleteContents()
    expect(text.textContent).toBe(' world')
    expect(range.collapsed).toBe(true)
  })

  test('Range should select element children and compare boundaries', () => {
    const doc = createDocument()
    doc.body!.innerHTML = '<div><span>A</span><span>B</span><span>C</span></div>'
    const div = doc.querySelector('div')!
    const spans = div.querySelectorAll('span')

    const rangeA = doc.createRange()
    rangeA.setStart(div, 0)
    rangeA.setEnd(div, 2)

    const rangeB = doc.createRange()
    rangeB.selectNode(spans[1])

    expect(rangeA.cloneContents().textContent).toBe('AB')
    expect(rangeA.compareBoundaryPoints(rangeA.END_TO_START, rangeB)).toBeGreaterThan(0)

    rangeB.extractContents()
    expect(div.textContent).toBe('AC')
  })
})
