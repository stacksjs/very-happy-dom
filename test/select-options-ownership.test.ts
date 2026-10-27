import type { VirtualElement } from '../src/nodes/VirtualElement'
import { expect, test } from 'bun:test'
import { Window } from '../src/window/Window'

test('select options do not occupy the generic HTMLElement API', () => {
  const window = new Window()
  expect('options' in window.HTMLElement.prototype).toBe(false)
  const div: VirtualElement = window.document.createElement('div')
  const custom: VirtualElement = window.document.createElement('options-probe')
  expect('options' in div).toBe(false)
  expect(div.options).toBeUndefined()
  expect('options' in custom).toBe(false)
  Object.defineProperty(custom, 'options', { configurable: true, value: { density: 'compact' } })
  const options: unknown = Reflect.get(custom, 'options')
  expect(options).toEqual({ density: 'compact' })
})

test.each(['select', 'datalist'])('%s retains its options lookup after changes and cloning', (tag) => {
  const window = new Window()
  const element: VirtualElement = window.document.createElement(tag)
  element.innerHTML = '<option value="a">Alpha</option><option value="b">Beta</option>'
  expect(element.options.map(option => option.getAttribute('value'))).toEqual(['a', 'b'])
  const added = window.document.createElement('option')
  added.setAttribute('value', 'c')
  element.appendChild(added)
  expect(element.options.map(option => option.getAttribute('value'))).toEqual(['a', 'b', 'c'])
  expect(element.cloneNode(true).options.map(option => option.getAttribute('value'))).toEqual(['a', 'b', 'c'])
  expect(Reflect.set(element, 'options', [])).toBe(false)
  if (tag === 'select') {
    expect(element.value).toBe('a')
    element.value = 'b'
    expect(element.value).toBe('b')
  }
})

test('the select and datalist constructors expose their own options interface', () => {
  const window = new Window()
  expect('options' in window.HTMLSelectElement.prototype).toBe(true)
  expect('options' in window.HTMLDataListElement.prototype).toBe(true)
  const select: VirtualElement = new window.HTMLSelectElement()
  const datalist: VirtualElement = new window.HTMLDataListElement()
  select.innerHTML = '<option>Selected</option>'
  datalist.innerHTML = '<option>Suggested</option>'
  expect(select.options.map(option => option.textContent)).toEqual(['Selected'])
  expect(datalist.options.map(option => option.textContent)).toEqual(['Suggested'])
})
