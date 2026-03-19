import { describe, expect, test } from 'bun:test'
import {
  VirtualDocument,
  VirtualElement,
} from '../src'

// =============================================================================
// Form: action, method, enctype properties
// =============================================================================
describe('Form: action, method, enctype properties', () => {
  test('form action getter/setter', () => {
    const doc = new VirtualDocument()
    const form = doc.createElement('form')
    expect(form.action).toBe('')
    form.action = '/submit'
    expect(form.action).toBe('/submit')
    expect(form.getAttribute('action')).toBe('/submit')
  })

  test('form method getter/setter defaults to get', () => {
    const doc = new VirtualDocument()
    const form = doc.createElement('form')
    expect(form.method).toBe('get')
    form.method = 'post'
    expect(form.method).toBe('post')
    expect(form.getAttribute('method')).toBe('post')
  })

  test('form method normalizes to lowercase', () => {
    const doc = new VirtualDocument()
    const form = doc.createElement('form')
    form.setAttribute('method', 'POST')
    expect(form.method).toBe('post')
  })

  test('form enctype getter/setter defaults to url-encoded', () => {
    const doc = new VirtualDocument()
    const form = doc.createElement('form')
    expect(form.enctype).toBe('application/x-www-form-urlencoded')
    form.enctype = 'multipart/form-data'
    expect(form.enctype).toBe('multipart/form-data')
  })

  test('encoding is alias for enctype', () => {
    const doc = new VirtualDocument()
    const form = doc.createElement('form')
    form.encoding = 'text/plain'
    expect(form.enctype).toBe('text/plain')
    expect(form.encoding).toBe('text/plain')
  })

  test('non-form elements return empty for form properties', () => {
    const el = new VirtualElement('div')
    expect(el.action).toBe('')
    expect(el.method).toBe('')
    expect(el.enctype).toBe('')
  })
})

// =============================================================================
// Form: checkValidity and reportValidity
// =============================================================================
describe('Form: checkValidity and reportValidity', () => {
  test('checkValidity returns true for valid input', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    input.setAttribute('type', 'text')
    doc.body!.appendChild(input)
    expect(input.checkValidity()).toBe(true)
  })

  test('checkValidity returns false for required empty input', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    input.setAttribute('type', 'text')
    input.setAttribute('required', '')
    doc.body!.appendChild(input)
    expect(input.checkValidity()).toBe(false)
  })

  test('checkValidity on form checks all elements', () => {
    const doc = new VirtualDocument()
    const form = doc.createElement('form')
    const valid = doc.createElement('input')
    valid.setAttribute('type', 'text')
    const invalid = doc.createElement('input')
    invalid.setAttribute('type', 'text')
    invalid.setAttribute('required', '')
    form.appendChild(valid)
    form.appendChild(invalid)
    doc.body!.appendChild(form)
    expect(form.checkValidity()).toBe(false)
  })

  test('reportValidity dispatches invalid event on invalid', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    input.setAttribute('required', '')
    doc.body!.appendChild(input)

    let invalidFired = false
    input.addEventListener('invalid', () => { invalidFired = true })
    input.reportValidity()
    expect(invalidFired).toBe(true)
  })

  test('reportValidity returns true for valid input', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    doc.body!.appendChild(input)
    expect(input.reportValidity()).toBe(true)
  })

  test('setCustomValidity makes element invalid', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    doc.body!.appendChild(input)
    input.setCustomValidity('Custom error')
    expect(input.checkValidity()).toBe(false)
    expect(input.validationMessage).toBe('Custom error')
  })

  test('setCustomValidity empty string resets validity', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    doc.body!.appendChild(input)
    input.setCustomValidity('error')
    expect(input.checkValidity()).toBe(false)
    input.setCustomValidity('')
    expect(input.checkValidity()).toBe(true)
  })

  test('willValidate returns false for hidden inputs', () => {
    const doc = new VirtualDocument()
    const input = doc.createElement('input')
    input.setAttribute('type', 'hidden')
    doc.body!.appendChild(input)
    expect(input.willValidate).toBe(false)
  })
})
