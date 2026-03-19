import { describe, expect, test } from 'bun:test'
import { VirtualDocument, VirtualElement } from '../src'
import { VirtualTextNode } from '../src/nodes/VirtualTextNode'

// =============================================================================
// Element: className and classList
// =============================================================================
describe('Element: className and classList', () => {
  test('className getter/setter', () => {
    const el = new VirtualElement('div')
    expect(el.className).toBe('')
    el.className = 'foo bar'
    expect(el.className).toBe('foo bar')
    expect(el.getAttribute('class')).toBe('foo bar')
  })

  test('classList DOMTokenList interface', () => {
    const el = new VirtualElement('div')
    el.setAttribute('class', 'a b c')
    const cl = el.classList
    expect(cl.length).toBe(3)
    expect(cl.item(0)).toBe('a')
    expect(cl.item(1)).toBe('b')
    expect(cl.item(3)).toBeNull()
    expect(cl.value).toBe('a b c')
    expect(cl.toString()).toBe('a b c')
  })

  test('classList forEach', () => {
    const el = new VirtualElement('div')
    el.setAttribute('class', 'x y')
    const items: string[] = []
    el.classList.forEach((value: string) => items.push(value))
    expect(items).toEqual(['x', 'y'])
  })

  test('classList Symbol.iterator', () => {
    const el = new VirtualElement('div')
    el.setAttribute('class', 'a b c')
    const items = [...el.classList]
    expect(items).toEqual(['a', 'b', 'c'])
  })
})

// =============================================================================
// Element: slot property
// =============================================================================
describe('Element: slot property', () => {
  test('slot getter/setter', () => {
    const el = new VirtualElement('div')
    expect(el.slot).toBe('')
    el.slot = 'my-slot'
    expect(el.slot).toBe('my-slot')
    expect(el.getAttribute('slot')).toBe('my-slot')
  })
})

// =============================================================================
// Element: style proxy (cssText, length, item)
// =============================================================================
describe('Element: style proxy (cssText, length, item)', () => {
  test('cssText getter returns all styles', () => {
    const el = new VirtualElement('div')
    el.style.setProperty('color', 'red')
    el.style.setProperty('font-size', '14px')
    const text = el.style.cssText
    expect(text).toContain('color: red')
    expect(text).toContain('font-size: 14px')
  })

  test('cssText setter replaces all styles', () => {
    const el = new VirtualElement('div')
    el.style.setProperty('color', 'red')
    el.style.cssText = 'background: blue; margin: 10px'
    expect(el.style.getPropertyValue('background')).toBe('blue')
    expect(el.style.getPropertyValue('margin')).toBe('10px')
    expect(el.style.getPropertyValue('color')).toBe('')
  })

  test('cssText setter with empty string clears styles', () => {
    const el = new VirtualElement('div')
    el.style.setProperty('color', 'red')
    el.style.cssText = ''
    expect(el.style.length).toBe(0)
  })

  test('cssText reflects in attribute', () => {
    const el = new VirtualElement('div')
    el.style.cssText = 'display: flex'
    expect(el.getAttribute('style')).toContain('display: flex')
  })

  test('style.length returns number of properties', () => {
    const el = new VirtualElement('div')
    expect(el.style.length).toBe(0)
    el.style.setProperty('color', 'red')
    expect(el.style.length).toBe(1)
    el.style.setProperty('margin', '10px')
    expect(el.style.length).toBe(2)
  })

  test('style.item returns property name at index', () => {
    const el = new VirtualElement('div')
    el.style.setProperty('color', 'red')
    el.style.setProperty('margin', '10px')
    const first = el.style.item(0)
    const second = el.style.item(1)
    expect([first, second]).toContain('color')
    expect([first, second]).toContain('margin')
  })

  test('style.item returns empty string for out-of-range', () => {
    const el = new VirtualElement('div')
    expect(el.style.item(0)).toBe('')
    expect(el.style.item(99)).toBe('')
  })

  test('style.length decreases when property removed', () => {
    const el = new VirtualElement('div')
    el.style.setProperty('color', 'red')
    el.style.setProperty('margin', '10px')
    expect(el.style.length).toBe(2)
    el.style.removeProperty('color')
    expect(el.style.length).toBe(1)
  })
})

// =============================================================================
// Element: reflected boolean properties (hidden, required, readOnly, etc.)
// =============================================================================
describe('Element: reflected boolean properties (hidden, required, readOnly, etc.)', () => {
  test('hidden defaults to false', () => {
    const el = new VirtualElement('div')
    expect(el.hidden).toBe(false)
  })

  test('hidden setter adds attribute', () => {
    const el = new VirtualElement('div')
    el.hidden = true
    expect(el.hidden).toBe(true)
    expect(el.hasAttribute('hidden')).toBe(true)
  })

  test('hidden setter removes attribute', () => {
    const el = new VirtualElement('div')
    el.hidden = true
    el.hidden = false
    expect(el.hidden).toBe(false)
    expect(el.hasAttribute('hidden')).toBe(false)
  })

  test('hidden reflects attribute set directly', () => {
    const el = new VirtualElement('div')
    el.setAttribute('hidden', '')
    expect(el.hidden).toBe(true)
  })

  test('required defaults to false', () => {
    const el = new VirtualElement('input')
    expect(el.required).toBe(false)
  })

  test('required setter adds attribute', () => {
    const el = new VirtualElement('input')
    el.required = true
    expect(el.required).toBe(true)
    expect(el.hasAttribute('required')).toBe(true)
  })

  test('required setter removes attribute', () => {
    const el = new VirtualElement('input')
    el.required = true
    el.required = false
    expect(el.required).toBe(false)
    expect(el.hasAttribute('required')).toBe(false)
  })

  test('required reflects attribute set directly', () => {
    const el = new VirtualElement('input')
    el.setAttribute('required', '')
    expect(el.required).toBe(true)
  })

  test('readOnly defaults to false', () => {
    const el = new VirtualElement('input')
    expect(el.readOnly).toBe(false)
  })

  test('readOnly getter/setter reflects attribute', () => {
    const el = new VirtualElement('input')
    el.readOnly = true
    expect(el.readOnly).toBe(true)
    expect(el.hasAttribute('readonly')).toBe(true)
    el.readOnly = false
    expect(el.readOnly).toBe(false)
  })
})

// =============================================================================
// Element: reflected string properties (title, lang, dir, placeholder, src, href, rel, target, download, role)
// =============================================================================
describe('Element: reflected string properties (title, lang, dir, placeholder, src, href, rel, target, download, role)', () => {
  test('title defaults to empty string', () => {
    const el = new VirtualElement('div')
    expect(el.title).toBe('')
  })

  test('title getter/setter reflects attribute', () => {
    const el = new VirtualElement('div')
    el.title = 'Hello'
    expect(el.title).toBe('Hello')
    expect(el.getAttribute('title')).toBe('Hello')
  })

  test('title reads from attribute', () => {
    const el = new VirtualElement('div')
    el.setAttribute('title', 'tooltip')
    expect(el.title).toBe('tooltip')
  })

  test('lang defaults to empty string', () => {
    const el = new VirtualElement('div')
    expect(el.lang).toBe('')
  })

  test('lang getter/setter reflects attribute', () => {
    const el = new VirtualElement('div')
    el.lang = 'en-US'
    expect(el.lang).toBe('en-US')
    expect(el.getAttribute('lang')).toBe('en-US')
  })

  test('dir defaults to empty string', () => {
    const el = new VirtualElement('div')
    expect(el.dir).toBe('')
  })

  test('dir getter/setter', () => {
    const el = new VirtualElement('div')
    el.dir = 'rtl'
    expect(el.dir).toBe('rtl')
    expect(el.getAttribute('dir')).toBe('rtl')
  })

  test('placeholder defaults to empty string', () => {
    const el = new VirtualElement('input')
    expect(el.placeholder).toBe('')
  })

  test('placeholder getter/setter', () => {
    const el = new VirtualElement('input')
    el.placeholder = 'Enter email'
    expect(el.placeholder).toBe('Enter email')
    expect(el.getAttribute('placeholder')).toBe('Enter email')
  })

  test('img.src getter/setter', () => {
    const img = new VirtualElement('img')
    img.src = '/image.png'
    expect(img.src).toBe('/image.png')
    expect(img.getAttribute('src')).toBe('/image.png')
  })

  test('script.src getter/setter', () => {
    const script = new VirtualElement('script')
    script.src = '/app.js'
    expect(script.src).toBe('/app.js')
  })

  test('a.href getter/setter', () => {
    const a = new VirtualElement('a')
    a.href = 'https://example.com'
    expect(a.href).toBe('https://example.com')
    expect(a.getAttribute('href')).toBe('https://example.com')
  })

  test('link.rel getter/setter', () => {
    const link = new VirtualElement('link')
    link.rel = 'stylesheet'
    expect(link.rel).toBe('stylesheet')
    expect(link.getAttribute('rel')).toBe('stylesheet')
  })

  test('defaults to empty string', () => {
    const el = new VirtualElement('img')
    expect(el.src).toBe('')
    expect(el.href).toBe('')
    expect(el.rel).toBe('')
  })

  test('form.target getter/setter', () => {
    const doc = new VirtualDocument()
    const form = doc.createElement('form')
    form.target = '_blank'
    expect(form.target).toBe('_blank')
    expect(form.getAttribute('target')).toBe('_blank')
  })

  test('anchor.target getter/setter', () => {
    const a = new VirtualElement('a')
    a.target = '_self'
    expect(a.target).toBe('_self')
  })

  test('target defaults to empty string', () => {
    const el = new VirtualElement('a')
    expect(el.target).toBe('')
  })

  test('download defaults to empty string', () => {
    const el = new VirtualElement('a')
    expect(el.download).toBe('')
  })

  test('download getter/setter', () => {
    const el = new VirtualElement('a')
    el.download = 'file.pdf'
    expect(el.download).toBe('file.pdf')
    expect(el.getAttribute('download')).toBe('file.pdf')
  })

  test('role defaults to empty string', () => {
    const el = new VirtualElement('div')
    expect(el.role).toBe('')
  })

  test('role getter/setter', () => {
    const el = new VirtualElement('div')
    el.role = 'button'
    expect(el.role).toBe('button')
    expect(el.getAttribute('role')).toBe('button')
  })

  test('role reflects attribute', () => {
    const el = new VirtualElement('nav')
    el.setAttribute('role', 'navigation')
    expect(el.role).toBe('navigation')
  })
})

// =============================================================================
// Element: reflected number properties (minLength, maxLength, rows, cols, size)
// =============================================================================
describe('Element: reflected number properties (minLength, maxLength, rows, cols, size)', () => {
  test('maxLength defaults to -1', () => {
    const el = new VirtualElement('input')
    expect(el.maxLength).toBe(-1)
  })

  test('maxLength getter/setter', () => {
    const el = new VirtualElement('input')
    el.maxLength = 100
    expect(el.maxLength).toBe(100)
    expect(el.getAttribute('maxlength')).toBe('100')
  })

  test('minLength getter/setter', () => {
    const el = new VirtualElement('input')
    el.minLength = 5
    expect(el.minLength).toBe(5)
    expect(el.getAttribute('minlength')).toBe('5')
  })

  test('minLength reflects attribute', () => {
    const el = new VirtualElement('input')
    el.setAttribute('minlength', '3')
    expect(el.minLength).toBe(3)
  })

  test('rows defaults to 2', () => {
    const el = new VirtualElement('textarea')
    expect(el.rows).toBe(2)
  })

  test('rows getter/setter', () => {
    const el = new VirtualElement('textarea')
    el.rows = 10
    expect(el.rows).toBe(10)
    expect(el.getAttribute('rows')).toBe('10')
  })

  test('cols defaults to 20', () => {
    const el = new VirtualElement('textarea')
    expect(el.cols).toBe(20)
  })

  test('cols getter/setter', () => {
    const el = new VirtualElement('textarea')
    el.cols = 80
    expect(el.cols).toBe(80)
    expect(el.getAttribute('cols')).toBe('80')
  })

  test('size defaults to 20', () => {
    const el = new VirtualElement('input')
    expect(el.size).toBe(20)
  })

  test('size getter/setter', () => {
    const el = new VirtualElement('input')
    el.size = 30
    expect(el.size).toBe(30)
    expect(el.getAttribute('size')).toBe('30')
  })
})

// =============================================================================
// Element: contentEditable and isContentEditable
// =============================================================================
describe('Element: contentEditable and isContentEditable', () => {
  test('contentEditable defaults to inherit', () => {
    const el = new VirtualElement('div')
    expect(el.contentEditable).toBe('inherit')
  })

  test('contentEditable = true', () => {
    const el = new VirtualElement('div')
    el.contentEditable = 'true'
    expect(el.contentEditable).toBe('true')
    expect(el.getAttribute('contenteditable')).toBe('true')
  })

  test('contentEditable = false', () => {
    const el = new VirtualElement('div')
    el.contentEditable = 'false'
    expect(el.contentEditable).toBe('false')
  })

  test('contentEditable = inherit removes attribute', () => {
    const el = new VirtualElement('div')
    el.contentEditable = 'true'
    el.contentEditable = 'inherit'
    expect(el.hasAttribute('contenteditable')).toBe(false)
  })

  test('isContentEditable returns true when set', () => {
    const el = new VirtualElement('div')
    el.contentEditable = 'true'
    expect(el.isContentEditable).toBe(true)
  })

  test('isContentEditable returns false when explicitly false', () => {
    const el = new VirtualElement('div')
    el.contentEditable = 'false'
    expect(el.isContentEditable).toBe(false)
  })

  test('isContentEditable inherits from parent', () => {
    const parent = new VirtualElement('div')
    parent.contentEditable = 'true'
    const child = new VirtualElement('span')
    parent.appendChild(child)
    expect(child.isContentEditable).toBe(true)
  })

  test('isContentEditable returns false when no parent sets it', () => {
    const el = new VirtualElement('div')
    expect(el.isContentEditable).toBe(false)
  })
})

// =============================================================================
// Element: innerText and outerText
// =============================================================================
describe('Element: innerText and outerText', () => {
  test('innerText getter returns text content', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    div.innerHTML = 'Hello World'
    expect(div.innerText).toBe('Hello World')
  })

  test('innerText skips display:none elements', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const span = doc.createElement('span')
    span.style.display = 'none'
    span.textContent = 'hidden'
    div.appendChild(span)
    const visible = doc.createElement('span')
    visible.textContent = 'visible'
    div.appendChild(visible)
    expect(div.innerText).toBe('visible')
  })

  test('innerText skips script and style elements', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const script = doc.createElement('script')
    script.textContent = 'var x = 1;'
    div.appendChild(script)
    const text = doc.createTextNode('hello')
    div.appendChild(text)
    expect(div.innerText).toBe('hello')
  })

  test('innerText adds newlines for block elements', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const p1 = doc.createElement('p')
    p1.textContent = 'first'
    div.appendChild(p1)
    const p2 = doc.createElement('p')
    p2.textContent = 'second'
    div.appendChild(p2)
    expect(div.innerText).toContain('first')
    expect(div.innerText).toContain('second')
    expect(div.innerText).toContain('\n')
  })

  test('innerText handles BR elements', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const text1 = doc.createTextNode('line1')
    div.appendChild(text1)
    const br = doc.createElement('br')
    div.appendChild(br)
    const text2 = doc.createTextNode('line2')
    div.appendChild(text2)
    expect(div.innerText).toBe('line1\nline2')
  })

  test('outerText getter returns same as innerText', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    div.textContent = 'hello world'
    doc.body!.appendChild(div)
    expect(div.outerText).toBe(div.innerText)
  })

  test('outerText setter replaces element with text node', () => {
    const doc = new VirtualDocument()
    const parent = doc.createElement('div')
    const child = doc.createElement('span')
    child.textContent = 'old'
    parent.appendChild(child)
    doc.body!.appendChild(parent)

    child.outerText = 'new text'
    expect(parent.childNodes.length).toBe(1)
    expect(parent.textContent).toBe('new text')
    expect(parent.childNodes[0].nodeType).toBe(3) // TEXT_NODE
  })

  test('outerText setter throws on detached element', () => {
    const el = new VirtualElement('div')
    expect(() => { el.outerText = 'text' }).toThrow()
  })
})

// =============================================================================
// Element: attribute methods (toggleAttribute, getAttributeNames, hasAttributes)
// =============================================================================
describe('Element: attribute methods (toggleAttribute, getAttributeNames, hasAttributes)', () => {
  test('toggleAttribute adds attribute when missing', () => {
    const el = new VirtualElement('div')
    const result = el.toggleAttribute('hidden')
    expect(result).toBe(true)
    expect(el.hasAttribute('hidden')).toBe(true)
  })

  test('toggleAttribute removes attribute when present', () => {
    const el = new VirtualElement('div')
    el.setAttribute('hidden', '')
    const result = el.toggleAttribute('hidden')
    expect(result).toBe(false)
    expect(el.hasAttribute('hidden')).toBe(false)
  })

  test('toggleAttribute with force=true always adds', () => {
    const el = new VirtualElement('div')
    el.toggleAttribute('disabled', true)
    expect(el.hasAttribute('disabled')).toBe(true)
    el.toggleAttribute('disabled', true)
    expect(el.hasAttribute('disabled')).toBe(true)
  })

  test('toggleAttribute with force=false always removes', () => {
    const el = new VirtualElement('div')
    el.setAttribute('disabled', '')
    el.toggleAttribute('disabled', false)
    expect(el.hasAttribute('disabled')).toBe(false)
    el.toggleAttribute('disabled', false)
    expect(el.hasAttribute('disabled')).toBe(false)
  })

  test('toggleAttribute normalizes name to lowercase', () => {
    const el = new VirtualElement('div')
    el.toggleAttribute('HIDDEN')
    expect(el.hasAttribute('hidden')).toBe(true)
  })

  test('getAttributeNames returns empty array for element with no attributes', () => {
    const el = new VirtualElement('div')
    expect(el.getAttributeNames()).toEqual([])
  })

  test('getAttributeNames returns all attribute names', () => {
    const el = new VirtualElement('div')
    el.setAttribute('id', 'test')
    el.setAttribute('class', 'foo')
    el.setAttribute('data-value', '42')
    const names = el.getAttributeNames()
    expect(names).toContain('id')
    expect(names).toContain('class')
    expect(names).toContain('data-value')
    expect(names.length).toBe(3)
  })

  test('getAttributeNames returns names in insertion order', () => {
    const el = new VirtualElement('div')
    el.setAttribute('b', '2')
    el.setAttribute('a', '1')
    el.setAttribute('c', '3')
    expect(el.getAttributeNames()).toEqual(['b', 'a', 'c'])
  })

  test('hasAttributes returns false for element with no attributes', () => {
    const el = new VirtualElement('div')
    expect(el.hasAttributes()).toBe(false)
  })

  test('hasAttributes returns true when attributes exist', () => {
    const el = new VirtualElement('div')
    el.setAttribute('id', 'test')
    expect(el.hasAttributes()).toBe(true)
  })

  test('hasAttributes returns false after all attributes removed', () => {
    const el = new VirtualElement('div')
    el.setAttribute('id', 'test')
    el.removeAttribute('id')
    expect(el.hasAttributes()).toBe(false)
  })

  test('hasAttributes with multiple attributes', () => {
    const el = new VirtualElement('div')
    el.setAttribute('class', 'foo')
    el.setAttribute('data-x', '1')
    expect(el.hasAttributes()).toBe(true)
  })
})

// =============================================================================
// Element: attribute node interface (getAttributeNode, setAttributeNode, removeAttributeNode)
// =============================================================================
describe('Element: attribute node interface (getAttributeNode, setAttributeNode, removeAttributeNode)', () => {
  test('getAttributeNode returns null for missing attribute', () => {
    const el = new VirtualElement('div')
    expect(el.getAttributeNode('id')).toBeNull()
  })

  test('getAttributeNode returns Attr object', () => {
    const el = new VirtualElement('div')
    el.setAttribute('id', 'test')
    const attr = el.getAttributeNode('id')
    expect(attr).not.toBeNull()
    expect(attr!.name).toBe('id')
    expect(attr!.value).toBe('test')
    expect(attr!.specified).toBe(true)
    expect(attr!.ownerElement).toBe(el)
  })

  test('setAttributeNode sets attribute and returns old', () => {
    const el = new VirtualElement('div')
    el.setAttribute('class', 'old')
    const old = el.setAttributeNode({ name: 'class', value: 'new' })
    expect(old).not.toBeNull()
    expect(old!.value).toBe('old')
    expect(el.getAttribute('class')).toBe('new')
  })

  test('setAttributeNode returns null for new attribute', () => {
    const el = new VirtualElement('div')
    const old = el.setAttributeNode({ name: 'data-x', value: '1' })
    expect(old).toBeNull()
    expect(el.getAttribute('data-x')).toBe('1')
  })

  test('removeAttributeNode removes and returns attr', () => {
    const el = new VirtualElement('div')
    el.setAttribute('id', 'test')
    const removed = el.removeAttributeNode({ name: 'id' })
    expect(removed.name).toBe('id')
    expect(removed.value).toBe('test')
    expect(el.hasAttribute('id')).toBe(false)
  })

  test('removeAttributeNode throws for missing attribute', () => {
    const el = new VirtualElement('div')
    expect(() => el.removeAttributeNode({ name: 'nonexistent' })).toThrow()
  })
})

// =============================================================================
// Element: replaceChildren
// =============================================================================
describe('Element: replaceChildren', () => {
  test('replaceChildren with no args clears all children', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    div.innerHTML = '<p>1</p><p>2</p><p>3</p>'
    expect(div.childNodes.length).toBe(3)
    div.replaceChildren()
    expect(div.childNodes.length).toBe(0)
  })

  test('replaceChildren with elements replaces content', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    div.innerHTML = '<p>old</p>'
    const span = doc.createElement('span')
    span.textContent = 'new'
    div.replaceChildren(span)
    expect(div.childNodes.length).toBe(1)
    expect((div.childNodes[0] as VirtualElement).tagName).toBe('SPAN')
  })

  test('replaceChildren with strings creates text nodes', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    div.replaceChildren('hello', ' ', 'world')
    expect(div.textContent).toBe('hello world')
    expect(div.childNodes.length).toBe(3)
  })

  test('replaceChildren with mixed nodes and strings', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const em = doc.createElement('em')
    em.textContent = 'bold'
    div.replaceChildren('text ', em, ' end')
    expect(div.childNodes.length).toBe(3)
    expect(div.textContent).toBe('text bold end')
  })
})

// =============================================================================
// Element: dataset proxy
// =============================================================================
describe('Element: dataset proxy', () => {
  test('dataset reads data-* attributes as camelCase', () => {
    const el = new VirtualElement('div')
    el.setAttribute('data-user-id', '42')
    expect(el.dataset.userId).toBe('42')
  })

  test('dataset writes data-* attributes', () => {
    const el = new VirtualElement('div')
    el.dataset.userName = 'Alice'
    expect(el.getAttribute('data-user-name')).toBe('Alice')
  })

  test('dataset deletes data-* attributes', () => {
    const el = new VirtualElement('div')
    el.setAttribute('data-temp', 'val')
    expect(el.dataset.temp).toBe('val')
    delete el.dataset.temp
    expect(el.hasAttribute('data-temp')).toBe(false)
  })

  test('dataset has operator works', () => {
    const el = new VirtualElement('div')
    el.setAttribute('data-name', 'test')
    expect('name' in el.dataset).toBe(true)
    expect('missing' in el.dataset).toBe(false)
  })

  test('dataset enumeration with Object.keys', () => {
    const el = new VirtualElement('div')
    el.setAttribute('data-a', '1')
    el.setAttribute('data-b', '2')
    el.setAttribute('class', 'foo') // not a data- attribute
    const keys = Object.keys(el.dataset)
    expect(keys).toContain('a')
    expect(keys).toContain('b')
    expect(keys).not.toContain('class')
    expect(keys.length).toBe(2)
  })

  test('dataset camelCase conversion for multi-word', () => {
    const el = new VirtualElement('div')
    el.dataset.myLongAttributeName = 'value'
    expect(el.getAttribute('data-my-long-attribute-name')).toBe('value')
    expect(el.dataset.myLongAttributeName).toBe('value')
  })
})

// =============================================================================
// Element: firstElementChild, lastElementChild, childElementCount
// =============================================================================
describe('Element: firstElementChild, lastElementChild, childElementCount', () => {
  test('firstElementChild returns first element child', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const text = doc.createTextNode('text')
    const span = doc.createElement('span')
    const p = doc.createElement('p')
    div.appendChild(text)
    div.appendChild(span)
    div.appendChild(p)
    expect((div.firstElementChild as VirtualElement).tagName).toBe('SPAN')
  })

  test('firstElementChild returns null when no element children', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    div.appendChild(doc.createTextNode('text'))
    expect(div.firstElementChild).toBeNull()
  })

  test('lastElementChild returns last element child', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    const span = doc.createElement('span')
    const p = doc.createElement('p')
    const text = doc.createTextNode('text')
    div.appendChild(span)
    div.appendChild(p)
    div.appendChild(text)
    expect((div.lastElementChild as VirtualElement).tagName).toBe('P')
  })

  test('lastElementChild returns null when no element children', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    expect(div.lastElementChild).toBeNull()
  })

  test('childElementCount counts only element children', () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    div.appendChild(doc.createTextNode('text'))
    div.appendChild(doc.createElement('span'))
    div.appendChild(doc.createComment('comment'))
    div.appendChild(doc.createElement('p'))
    expect(div.childElementCount).toBe(2)
  })

  test('childElementCount is 0 for empty element', () => {
    const el = new VirtualElement('div')
    expect(el.childElementCount).toBe(0)
  })

  test('these properties work on VirtualDocument too', () => {
    const doc = new VirtualDocument()
    // Document has <html> as only element child
    expect(doc.firstElementChild).toBe(doc.documentElement)
    expect(doc.lastElementChild).toBe(doc.documentElement)
    expect(doc.childElementCount).toBe(1)
  })
})

// =============================================================================
// Element: webkitMatchesSelector and closest
// =============================================================================
describe('Element: webkitMatchesSelector and closest', () => {
  test('webkitMatchesSelector is alias for matches', () => {
    const el = new VirtualElement('div')
    el.setAttribute('class', 'test')
    expect(el.webkitMatchesSelector('.test')).toBe(true)
    expect(el.webkitMatchesSelector('.other')).toBe(false)
  })

  test('webkitMatchesSelector works same as matches for tags', () => {
    const el = new VirtualElement('span')
    expect(el.webkitMatchesSelector('span')).toBe(true)
    expect(el.webkitMatchesSelector('div')).toBe(false)
  })

  test('detached element matches itself with simple selector', () => {
    const el = new VirtualElement('div')
    el.setAttribute('class', 'test')
    expect(el.closest('.test')).toBe(el)
  })

  test('detached element closest returns null when no match', () => {
    const el = new VirtualElement('div')
    expect(el.closest('.nonexistent')).toBeNull()
  })
})
