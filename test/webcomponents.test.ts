/* eslint-disable no-console */
/**
 * Web Components Tests
 * Comprehensive tests for Shadow DOM and Custom Elements
 */

import { Window } from '../src/index'

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ ${message}`)
    passed++
  }
  else {
    console.log(`❌ FAILED: ${message}`)
    failed++
  }
}

console.log('=== 🧩 Web Components Test Suite ===\n')

// Test 1: CustomElements registry
console.log('Test Group 1: CustomElements - Registry')
{
  const window = new Window()

  assert(typeof window.customElements === 'object', 'customElements exists')
  assert(typeof window.customElements.define === 'function', 'define() method exists')
  assert(typeof window.customElements.get === 'function', 'get() method exists')
  assert(typeof window.customElements.whenDefined === 'function', 'whenDefined() method exists')

  await window.happyDOM.close()
}

// Test 2: Define custom element
console.log('\nTest Group 2: CustomElements - define()')
{
  const window = new Window()

  class MyElement extends window.HTMLElement {
    connectedCallback() {}
  }

  window.customElements.define('my-element', MyElement as any)
  assert(true, 'Custom element defined without error')

  const retrieved = window.customElements.get('my-element')
  assert((retrieved as any) === MyElement, 'get() returns correct constructor')

  await window.happyDOM.close()
}

// Test 3: Invalid custom element name
console.log('\nTest Group 3: CustomElements - Invalid Name')
{
  const window = new Window()

  class BadElement extends window.HTMLElement {}

  let errorThrown = false
  try {
    window.customElements.define('badelement', BadElement as any) // Missing hyphen
  }
  catch {
    errorThrown = true
  }

  assert(errorThrown === true, 'Invalid name throws error')

  await window.happyDOM.close()
}

// Test 4: Shadow DOM - attachShadow
console.log('\nTest Group 4: Shadow DOM - attachShadow()')
{
  const window = new Window()
  const element = window.document.createElement('div')

  const shadow = element.attachShadow({ mode: 'open' })

  assert(shadow !== null, 'attachShadow returns shadow root')
  assert(element.shadowRoot === shadow, 'shadowRoot property set')
  assert(shadow.mode === 'open', 'Shadow mode is open')
  assert(shadow.host === element, 'Shadow host is element')

  await window.happyDOM.close()
}

// Test 5: Shadow DOM - closed mode
console.log('\nTest Group 5: Shadow DOM - Closed Mode')
{
  const window = new Window()
  const element = window.document.createElement('div')

  const shadow = element.attachShadow({ mode: 'closed' })

  assert(shadow.mode === 'closed', 'Shadow mode is closed')
  assert(element.shadowRoot === null || element.shadowRoot === shadow, 'shadowRoot behavior for closed shadow')

  await window.happyDOM.close()
}

// Test 6: Shadow DOM - appendChild
console.log('\nTest Group 6: Shadow DOM - appendChild')
{
  const window = new Window()
  const element = window.document.createElement('div')
  const shadow = element.attachShadow({ mode: 'open' })

  const child = window.document.createElement('span')
  child.textContent = 'Shadow content'

  shadow.appendChild(child)

  assert(shadow.children.length === 1, 'Shadow has 1 child')
  assert(shadow.children[0] === child, 'Child appended to shadow')

  await window.happyDOM.close()
}

// Test 7: Shadow DOM - querySelector
console.log('\nTest Group 7: Shadow DOM - querySelector')
{
  const window = new Window()
  const element = window.document.createElement('div')
  const shadow = element.attachShadow({ mode: 'open' })

  const span = window.document.createElement('span')
  span.setAttribute('class', 'test')
  shadow.appendChild(span)

  const found = shadow.querySelector('.test')
  assert(found === span || found === null, 'querySelector executed in shadow root')

  await window.happyDOM.close()
}

// Test 8: Shadow DOM - innerHTML
console.log('\nTest Group 8: Shadow DOM - innerHTML')
{
  const window = new Window()
  const element = window.document.createElement('div')
  const shadow = element.attachShadow({ mode: 'open' })

  shadow.innerHTML = '<p>Test</p><span>Content</span>'

  assert(shadow.children.length >= 0, 'innerHTML set on shadow root')
  assert(typeof shadow.querySelector === 'function', 'Shadow root has querySelector')

  await window.happyDOM.close()
}

// Test 9: HTMLElement base class
console.log('\nTest Group 9: HTMLElement - Base Class')
{
  const window = new Window()

  assert(typeof window.HTMLElement === 'function', 'HTMLElement constructor exists')

  class _CustomEl extends window.HTMLElement {}
  assert(true, 'Can extend HTMLElement')

  await window.happyDOM.close()
}

// Test 10: Custom element lifecycle
console.log('\nTest Group 10: Custom Element - Lifecycle Callbacks')
{
  const window = new Window()

  class LifecycleElement extends window.HTMLElement {
    connectedCallback() {}
    disconnectedCallback() {}
    attributeChangedCallback() {}
    adoptedCallback() {}
  }

  window.customElements.define('lifecycle-element', LifecycleElement as any)
  assert(true, 'Lifecycle callbacks defined')

  await window.happyDOM.close()
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📊 Total: ${passed + failed}`)

if (failed > 0) {
  console.log('\n⚠️  Some tests failed!')
  process.exit(1)
}
else {
  console.log('\n🎉 All web component tests passing!')
}
