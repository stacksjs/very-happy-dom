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

  test('TreeWalker should continue across sibling removal during traversal', () => {
    const doc = createDocument()
    doc.body!.innerHTML = '<div><span id="a">A</span><span id="b">B</span><span id="c">C</span></div>'
    const root = doc.querySelector('div')!
    const walker = doc.createTreeWalker(root, SHOW_ELEMENT)

    expect((walker.nextNode() as any).id).toBe('a')
    root.removeChild(doc.getElementById('a')!)

    expect((walker.nextNode() as any).id).toBe('b')
    expect((walker.nextNode() as any).id).toBe('c')
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

  test('Range should support surroundContents for text selections', () => {
    const doc = createDocument()
    doc.body!.innerHTML = '<div>hello world</div>'
    const div = doc.querySelector('div')!
    const text = div.firstChild as any
    const range = doc.createRange()
    const strong = doc.createElement('strong')

    range.setStart(text, 6)
    range.setEnd(text, 11)
    range.surroundContents(strong)

    expect(div.textContent).toBe('hello world')
    expect(div.querySelector('strong')?.textContent).toBe('world')
    expect(range.toString()).toBe('world')
  })

  test('Range surroundContents should reject unsupported partial non-text selections', () => {
    const doc = createDocument()
    doc.body!.innerHTML = '<div><em>hello</em><strong>world</strong></div>'
    const div = doc.querySelector('div')!
    const emText = doc.querySelector('em')!.firstChild as any
    const wrapper = doc.createElement('span')
    const range = doc.createRange()

    range.setStart(emText, 2)
    range.setEnd(div, 2)

    expect(() => range.surroundContents(wrapper)).toThrow()
  })

  test('Document selection should track added and collapsed ranges', () => {
    const doc = createDocument()
    doc.body!.innerHTML = '<p>Hello <span>world</span></p>'
    const selection = doc.getSelection()
    const span = doc.querySelector('span')!
    const range = doc.createRange()

    range.selectNodeContents(span)
    selection.addRange(range)

    expect(selection.rangeCount).toBe(1)
    expect(selection.type).toBe('Range')
    expect(selection.toString()).toBe('world')
    expect(selection.getRangeAt(0)).toBe(range)

    selection.collapse(span.firstChild as any, 3)

    expect(selection.type).toBe('Caret')
    expect(selection.isCollapsed).toBe(true)
    expect(selection.anchorOffset).toBe(3)

    selection.removeAllRanges()
    expect(selection.rangeCount).toBe(0)
  })
})
