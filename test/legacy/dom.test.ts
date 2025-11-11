import { describe, expect, test } from 'bun:test'
import { createDocument, parseHTML } from '../../src'

describe('Virtual DOM', () => {
  test('should create a document', () => {
    const doc = createDocument()
    expect(doc).toBeDefined()
    expect(doc.documentElement).not.toBeNull()
    expect(doc.body).not.toBeNull()
    expect(doc.head).not.toBeNull()
  })

  test('should create elements', () => {
    const doc = createDocument()
    const div = doc.createElement('div')
    expect(div.nodeName).toBe('DIV')
    expect(div.nodeType).toBe('element')
  })

  test('should set and get attributes', () => {
    const doc = createDocument()
    const div = doc.createElement('div')

    div.setAttribute('id', 'test-id')
    div.setAttribute('class', 'test-class')

    expect(div.getAttribute('id')).toBe('test-id')
    expect(div.getAttribute('class')).toBe('test-class')
  })

  test('should handle textContent', () => {
    const doc = createDocument()
    const div = doc.createElement('div')

    div.textContent = 'Hello World'
    expect(div.textContent).toBe('Hello World')
  })

  test('should parse HTML', () => {
    const html = '<div id="test"><p>Hello</p></div>'
    const nodes = parseHTML(html)

    expect(nodes.length).toBeGreaterThan(0)
    expect(nodes[0].nodeName).toBe('DIV')
  })

  test('should handle innerHTML', () => {
    const doc = createDocument()
    const div = doc.createElement('div')

    div.innerHTML = '<p>Test paragraph</p><span>Test span</span>'
    expect(div.children.length).toBe(2)
    expect(div.children[0].nodeName).toBe('P')
    expect(div.children[1].nodeName).toBe('SPAN')
  })

  test('should appendChild', () => {
    const doc = createDocument()
    const parent = doc.createElement('div')
    const child = doc.createElement('span')

    parent.appendChild(child)
    expect(parent.children.length).toBe(1)
    expect(parent.children[0]).toBe(child)
    expect(child.parentNode).toBe(parent)
  })

  test('should removeChild', () => {
    const doc = createDocument()
    const parent = doc.createElement('div')
    const child = doc.createElement('span')

    parent.appendChild(child)
    parent.removeChild(child)

    expect(parent.children.length).toBe(0)
    expect(child.parentNode).toBeNull()
  })

  test('should querySelector by id', () => {
    const doc = createDocument()
    doc.body!.innerHTML = '<div id="test">Hello</div>'

    const el = doc.querySelector('#test')
    expect(el).not.toBeNull()
    expect(el?.getAttribute('id')).toBe('test')
  })

  test('should querySelector by class', () => {
    const doc = createDocument()
    doc.body!.innerHTML = '<div class="test-class">Hello</div>'

    const el = doc.querySelector('.test-class')
    expect(el).not.toBeNull()
    expect(el?.classList.contains('test-class')).toBe(true)
  })

  test('should querySelector by tag', () => {
    const doc = createDocument()
    doc.body!.innerHTML = '<p>Hello</p>'

    const el = doc.querySelector('p')
    expect(el).not.toBeNull()
    expect(el?.nodeName).toBe('P')
  })

  test('should querySelectorAll', () => {
    const doc = createDocument()
    doc.body!.innerHTML = `
      <div class="item">1</div>
      <div class="item">2</div>
      <div class="item">3</div>
    `

    const els = doc.querySelectorAll('.item')
    expect(els.length).toBe(3)
  })

  test('should handle classList', () => {
    const doc = createDocument()
    const div = doc.createElement('div')

    div.classList.add('class1')
    div.classList.add('class2')
    expect(div.classList.contains('class1')).toBe(true)
    expect(div.classList.contains('class2')).toBe(true)

    div.classList.remove('class1')
    expect(div.classList.contains('class1')).toBe(false)

    div.classList.toggle('class3')
    expect(div.classList.contains('class3')).toBe(true)

    div.classList.toggle('class3')
    expect(div.classList.contains('class3')).toBe(false)
  })

  test('should serialize to HTML', () => {
    const doc = createDocument()
    const div = doc.createElement('div')
    div.setAttribute('id', 'test')
    div.innerHTML = '<p>Hello World</p>'

    const html = div.outerHTML
    expect(html).toContain('id="test"')
    expect(html).toContain('<p>Hello World</p>')
  })
})
