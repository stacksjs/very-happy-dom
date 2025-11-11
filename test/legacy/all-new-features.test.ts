import { describe, expect, test } from 'bun:test'
import { createDocument } from '../../src'

describe('DOM Manipulation Methods', () => {
  test('insertBefore should insert node before reference', () => {
    const doc = createDocument()
    const parent = doc.createElement('div')
    const child1 = doc.createElement('span')
    const child2 = doc.createElement('span')
    const child3 = doc.createElement('span')

    child1.setAttribute('id', 'first')
    child2.setAttribute('id', 'second')
    child3.setAttribute('id', 'third')

    parent.appendChild(child1)
    parent.appendChild(child3)
    parent.insertBefore(child2, child3)

    expect(parent.children.length).toBe(3)
    expect(parent.children[0]).toBe(child1)
    expect(parent.children[1]).toBe(child2)
    expect(parent.children[2]).toBe(child3)
  })

  test('replaceChild should replace old node with new', () => {
    const doc = createDocument()
    const parent = doc.createElement('div')
    const oldChild = doc.createElement('span')
    const newChild = doc.createElement('p')

    oldChild.textContent = 'Old'
    newChild.textContent = 'New'

    parent.appendChild(oldChild)
    parent.replaceChild(newChild, oldChild)

    expect(parent.children.length).toBe(1)
    expect(parent.children[0]).toBe(newChild)
    expect(parent.children[0].textContent).toBe('New')
  })

  test('cloneNode shallow should clone without children', () => {
    const doc = createDocument()
    const original = doc.createElement('div')
    original.setAttribute('class', 'test')
    original.appendChild(doc.createElement('span'))

    const clone = original.cloneNode(false)

    expect(clone.getAttribute('class')).toBe('test')
    expect(clone.children.length).toBe(0)
  })

  test('cloneNode deep should clone with children', () => {
    const doc = createDocument()
    const original = doc.createElement('div')
    original.setAttribute('class', 'test')
    const child = doc.createElement('span')
    child.textContent = 'Child'
    original.appendChild(child)

    const clone = original.cloneNode(true)

    expect(clone.getAttribute('class')).toBe('test')
    expect(clone.children.length).toBe(1)
    expect(clone.children[0].textContent).toBe('Child')
  })

  test('closest should find nearest ancestor', () => {
    const doc = createDocument()
    doc.body!.innerHTML = `
      <div class="container">
        <div class="wrapper">
          <span id="target">Text</span>
        </div>
      </div>
    `

    const target = doc.querySelector('#target')!
    const wrapper = target.closest('.wrapper')
    const container = target.closest('.container')

    expect(wrapper).not.toBeNull()
    expect(wrapper?.classList.contains('wrapper')).toBe(true)
    expect(container).not.toBeNull()
    expect(container?.classList.contains('container')).toBe(true)
  })

  test('nextElementSibling should return next sibling', () => {
    const doc = createDocument()
    doc.body!.innerHTML = `
      <div id="first">First</div>
      <div id="second">Second</div>
      <div id="third">Third</div>
    `

    const first = doc.querySelector('#first')!
    const next = first.nextElementSibling

    expect(next).not.toBeNull()
    expect(next?.getAttribute('id')).toBe('second')
  })

  test('previousElementSibling should return previous sibling', () => {
    const doc = createDocument()
    doc.body!.innerHTML = `
      <div id="first">First</div>
      <div id="second">Second</div>
      <div id="third">Third</div>
    `

    const third = doc.querySelector('#third')!
    const prev = third.previousElementSibling

    expect(prev).not.toBeNull()
    expect(prev?.getAttribute('id')).toBe('second')
  })
})

describe('Form Validation', () => {
  test('required field validation', () => {
    const doc = createDocument()
    const input = doc.createElement('input')
    input.setAttribute('required', '')

    const validity = input.validity
    expect(validity.valid).toBe(false)
    expect(validity.valueMissing).toBe(true)

    input.setAttribute('value', 'text')
    expect(input.validity.valid).toBe(true)
  })

  test('pattern validation', () => {
    const doc = createDocument()
    const input = doc.createElement('input')
    input.setAttribute('pattern', '[0-9]{3}')
    input.setAttribute('value', 'abc')

    expect(input.validity.patternMismatch).toBe(true)
    expect(input.validity.valid).toBe(false)

    input.setAttribute('value', '123')
    expect(input.validity.valid).toBe(true)
  })

  test('minlength and maxlength validation', () => {
    const doc = createDocument()
    const input = doc.createElement('input')
    input.setAttribute('minlength', '3')
    input.setAttribute('maxlength', '10')

    input.setAttribute('value', 'ab')
    expect(input.validity.tooShort).toBe(true)

    input.setAttribute('value', 'abcdefghijk')
    expect(input.validity.tooLong).toBe(true)

    input.setAttribute('value', 'valid')
    expect(input.validity.valid).toBe(true)
  })

  test('number min and max validation', () => {
    const doc = createDocument()
    const input = doc.createElement('input')
    input.setAttribute('type', 'number')
    input.setAttribute('min', '10')
    input.setAttribute('max', '100')

    input.setAttribute('value', '5')
    expect(input.validity.rangeUnderflow).toBe(true)

    input.setAttribute('value', '200')
    expect(input.validity.rangeOverflow).toBe(true)

    input.setAttribute('value', '50')
    expect(input.validity.valid).toBe(true)
  })

  test('email validation', () => {
    const doc = createDocument()
    const input = doc.createElement('input')
    input.setAttribute('type', 'email')

    input.setAttribute('value', 'invalid')
    expect(input.validity.typeMismatch).toBe(true)

    input.setAttribute('value', 'test@example.com')
    expect(input.validity.valid).toBe(true)
  })

  test('custom validity', () => {
    const doc = createDocument()
    const input = doc.createElement('input')

    input.setCustomValidity('Custom error message')
    expect(input.validity.customError).toBe(true)
    expect(input.validity.valid).toBe(false)
    expect(input.validationMessage).toBe('Custom error message')

    input.setCustomValidity('')
    expect(input.validity.valid).toBe(true)
  })

  test('checkValidity returns boolean', () => {
    const doc = createDocument()
    const input = doc.createElement('input')
    input.setAttribute('required', '')

    expect(input.checkValidity()).toBe(false)

    input.setAttribute('value', 'text')
    expect(input.checkValidity()).toBe(true)
  })

  test('reportValidity dispatches invalid event', () => {
    const doc = createDocument()
    const input = doc.createElement('input')
    input.setAttribute('required', '')

    let eventFired = false
    input.addEventListener('invalid', () => {
      eventFired = true
    })

    const valid = input.reportValidity()
    expect(valid).toBe(false)
    expect(eventFired).toBe(true)
  })
})

describe('History API', () => {
  test('pushState should add history entry', () => {
    const doc = createDocument()
    doc.location.href = 'https://example.com/'

    expect(doc.history.length).toBe(0)

    doc.history.pushState({ page: 1 }, 'Page 1', '/page1')
    expect(doc.history.length).toBe(1)
    expect(doc.history.state).toEqual({ page: 1 })
    expect(doc.location.pathname).toBe('/page1')
  })

  test('replaceState should replace current entry', () => {
    const doc = createDocument()
    doc.location.href = 'https://example.com/'

    doc.history.pushState({ page: 1 }, 'Page 1', '/page1')
    doc.history.replaceState({ page: 2 }, 'Page 2', '/page2')

    expect(doc.history.length).toBe(1)
    expect(doc.history.state).toEqual({ page: 2 })
    expect(doc.location.pathname).toBe('/page2')
  })

  test('back should navigate to previous entry', () => {
    const doc = createDocument()
    doc.location.href = 'https://example.com/'

    doc.history.pushState({ page: 1 }, 'Page 1', 'https://example.com/page1')
    doc.history.pushState({ page: 2 }, 'Page 2', 'https://example.com/page2')

    expect(doc.location.pathname).toBe('/page2')

    doc.history.back()
    expect(doc.location.pathname).toBe('/page1')
    expect(doc.history.state).toEqual({ page: 1 })
  })

  test('forward should navigate to next entry', () => {
    const doc = createDocument()
    doc.location.href = 'https://example.com/'

    doc.history.pushState({ page: 1 }, 'Page 1', 'https://example.com/page1')
    doc.history.pushState({ page: 2 }, 'Page 2', 'https://example.com/page2')
    doc.history.back()

    expect(doc.location.pathname).toBe('/page1')

    doc.history.forward()
    expect(doc.location.pathname).toBe('/page2')
    expect(doc.history.state).toEqual({ page: 2 })
  })

  test('go should navigate by delta', () => {
    const doc = createDocument()
    doc.location.href = 'https://example.com/'

    doc.history.pushState({ page: 1 }, 'Page 1', 'https://example.com/page1')
    doc.history.pushState({ page: 2 }, 'Page 2', 'https://example.com/page2')
    doc.history.pushState({ page: 3 }, 'Page 3', 'https://example.com/page3')

    doc.history.go(-2)
    expect(doc.location.pathname).toBe('/page1')

    doc.history.go(1)
    expect(doc.location.pathname).toBe('/page2')
  })
})

describe('Computed Styles', () => {
  test('should return inline styles', () => {
    const doc = createDocument()
    const div = doc.createElement('div')
    div.style.display = 'flex'
    div.style.color = 'red'

    const computed = doc.getComputedStyle(div)
    expect(computed.display).toBe('flex')
    expect(computed.color).toBe('red')
  })

  test('should return default display values', () => {
    const doc = createDocument()
    const div = doc.createElement('div')
    const script = doc.createElement('script')

    const divComputed = doc.getComputedStyle(div)
    const scriptComputed = doc.getComputedStyle(script)

    expect(divComputed.display).toBe('block')
    expect(scriptComputed.display).toBe('none')
  })

  test('should support getPropertyValue', () => {
    const doc = createDocument()
    const div = doc.createElement('div')
    div.style.color = 'blue'

    const computed = doc.getComputedStyle(div)
    expect(computed.getPropertyValue('color')).toBe('blue')
  })
})

describe('Style Property', () => {
  test('should set and get style properties', () => {
    const doc = createDocument()
    const div = doc.createElement('div')

    div.style.color = 'red'
    div.style.display = 'flex'

    expect(div.style.color).toBe('red')
    expect(div.style.display).toBe('flex')
  })

  test('should update style attribute', () => {
    const doc = createDocument()
    const div = doc.createElement('div')

    div.style.color = 'red'
    const styleAttr = div.getAttribute('style')

    expect(styleAttr).toContain('color')
    expect(styleAttr).toContain('red')
  })

  test('should support setProperty', () => {
    const doc = createDocument()
    const div = doc.createElement('div')

    div.style.setProperty('color', 'blue')
    expect(div.style.color).toBe('blue')
  })

  test('should support removeProperty', () => {
    const doc = createDocument()
    const div = doc.createElement('div')

    div.style.color = 'red'
    div.style.removeProperty('color')

    expect(div.style.color).toBeUndefined()
  })
})
