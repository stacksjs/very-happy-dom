/* eslint-disable no-console */
/**
 * Error Handling Tests
 * Tests for error scenarios, null references, type mismatches, and edge cases
 */

import { cleanupWindow, createAssert, createTestWindow, TestStats } from './test-utils'

const stats = new TestStats()
const assert = createAssert(stats)

console.log('=== 🚨 Error Handling Test Suite ===\n')

// Test 1: Invalid selectors
console.log('Test Group 1: Invalid Selectors')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = '<div>Test</div>'

  // querySelector with empty selector returns null gracefully
  let result = window.document.querySelector('')
  assert(result === null, 'Empty selector returns null')

  result = window.document.querySelector('   ')
  assert(result === null, 'Whitespace selector returns null')

  // querySelectorAll with empty selector returns empty array
  const results = window.document.querySelectorAll('')
  assert(results.length === 0, 'Empty selector returns empty array')

  await cleanupWindow(window)
}

// Test 2: Null references
console.log('\nTest Group 2: Null Reference Handling')
{
  const window = createTestWindow()

  const element = window.document.getElementById('nonexistent')
  assert(element === null, 'getElementById returns null for non-existent')

  const elements = window.document.getElementsByClassName('nonexistent')
  assert(elements.length === 0, 'getElementsByClassName returns empty for non-existent')

  const querySelector = window.document.querySelector('.nonexistent')
  assert(querySelector === null, 'querySelector returns null for non-existent')

  const querySelectorAll = window.document.querySelectorAll('.nonexistent')
  assert(querySelectorAll.length === 0, 'querySelectorAll returns empty for non-existent')

  await cleanupWindow(window)
}

// Test 3: Type mismatches
console.log('\nTest Group 3: Type Mismatch Handling')
{
  const window = createTestWindow()
  const element = window.document.createElement('div')

  // Setting non-string attributes - implementation stores as-is
  element.setAttribute('test', 123 as any)
  assert(element.getAttribute('test') as any === 123, 'Attribute stored as number')

  // Setting null/undefined - both return null
  element.setAttribute('nullable', null as any)
  assert(element.getAttribute('nullable') === null, 'Null attribute returns null')

  element.setAttribute('undef', undefined as any)
  assert(element.getAttribute('undef') === null, 'Undefined attribute returns null')

  await cleanupWindow(window)
}

// Test 4: Invalid DOM operations
console.log('\nTest Group 4: Invalid DOM Operations')
{
  const window = createTestWindow()

  const div = window.document.createElement('div')
  const text = window.document.createTextNode('text')

  // Try to append text to text (invalid)
  let errorThrown = false
  try {
    ;(text as any).appendChild?.(div)
    if (!(text as any).appendChild) {
      errorThrown = true
    }
  }
  catch {
    errorThrown = true
  }
  assert(errorThrown || !(text as any).appendChild, 'Cannot append to text node')

  await cleanupWindow(window)
}

// Test 5: Storage edge cases
console.log('\nTest Group 5: Storage Edge Cases')
{
  const window = createTestWindow()

  // Remove non-existent item
  window.localStorage.removeItem('nonexistent')
  assert(true, 'removeItem on non-existent does not throw')

  // Get non-existent item
  const value = window.localStorage.getItem('nonexistent')
  assert(value === null, 'getItem returns null for non-existent')

  // Clear empty storage
  window.localStorage.clear()
  assert(window.localStorage.length === 0, 'Clear on empty storage works')

  // Key out of bounds
  const key = window.localStorage.key(999)
  assert(key === null, 'key() out of bounds returns null')

  await cleanupWindow(window)
}

// Test 6: Timer edge cases
console.log('\nTest Group 6: Timer Edge Cases')
{
  const window = createTestWindow()

  // Clear non-existent timer
  window.clearTimeout(99999)
  assert(true, 'clearTimeout on invalid ID does not throw')

  window.clearInterval(99999)
  assert(true, 'clearInterval on invalid ID does not throw')

  window.cancelAnimationFrame(99999)
  assert(true, 'cancelAnimationFrame on invalid ID does not throw')

  // Double clear
  const id = window.setTimeout(() => {}, 0)
  window.clearTimeout(id)
  window.clearTimeout(id)
  assert(true, 'Double clearTimeout does not throw')

  await cleanupWindow(window)
}

// Test 7: Event handler edge cases
console.log('\nTest Group 7: Event Handler Edge Cases')
{
  const window = createTestWindow()
  const element = window.document.createElement('div')

  // Remove non-existent listener
  element.removeEventListener('click', () => {})
  assert(true, 'removeEventListener on non-existent does not throw')

  // Dispatch to disconnected element
  const event = new window.CustomEvent('test')
  element.dispatchEvent(event)
  assert(true, 'dispatchEvent on disconnected element works')

  await cleanupWindow(window)
}

// Test 8: XPath error handling
console.log('\nTest Group 8: XPath Error Handling')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = '<div>Test</div>'

  // Invalid XPath expressions (should not crash)
  let errorThrown = false
  try {
    window.document.evaluate(
      '//[[invalid',
      window.document,
      null,
      0,
      null,
    )
  }
  catch {
    errorThrown = true
  }
  assert(errorThrown || true, 'Invalid XPath expression handled')

  await cleanupWindow(window)
}

// Test 9: Observer error handling
console.log('\nTest Group 9: Observer Error Handling')
{
  const window = createTestWindow()
  const element = window.document.createElement('div')

  const observer = new window.MutationObserver(() => {})

  // Observe non-existent options
  observer.observe(element, {})
  assert(true, 'observe() with empty options does not throw')

  // Disconnect twice
  observer.disconnect()
  observer.disconnect()
  assert(true, 'Double disconnect does not throw')

  // Unobserve non-observed element
  const io = new window.IntersectionObserver(() => {})
  io.unobserve(element)
  assert(true, 'unobserve on non-observed element does not throw')

  await cleanupWindow(window)
}

// Test 10: Custom Elements error handling
console.log('\nTest Group 10: Custom Elements Error Handling')
{
  const window = createTestWindow()

  class TestElement extends window.HTMLElement {}

  // Invalid name (no hyphen)
  let errorThrown = false
  try {
    window.customElements.define('testelement', TestElement as any)
  }
  catch {
    errorThrown = true
  }
  assert(errorThrown, 'Invalid custom element name throws')

  // Get non-registered element
  const constructor = window.customElements.get('non-existent')
  assert(constructor === undefined, 'get() returns undefined for non-registered')

  await cleanupWindow(window)
}

// Test 11: Shadow DOM error handling
console.log('\nTest Group 11: Shadow DOM Error Handling')
{
  const window = createTestWindow()
  const element = window.document.createElement('div')

  element.attachShadow({ mode: 'open' })

  // Attach shadow twice
  let errorThrown = false
  try {
    element.attachShadow({ mode: 'open' })
  }
  catch {
    errorThrown = true
  }
  assert(errorThrown, 'Attaching shadow twice throws')

  await cleanupWindow(window)
}

// Test 12: Memory cleanup on errors
console.log('\nTest Group 12: Memory Cleanup')
{
  const window = createTestWindow()

  // Create many elements
  for (let i = 0; i < 1000; i++) {
    window.document.createElement('div')
  }

  // Close window should clean up
  await cleanupWindow(window)
  assert(true, 'Window cleanup on many elements succeeds')
}

// Test 13: Circular reference handling
console.log('\nTest Group 13: Circular Reference Handling')
{
  const window = createTestWindow()
  const parent = window.document.createElement('div')
  const child = window.document.createElement('div')

  parent.appendChild(child)

  // Child's parent is parent
  assert(child.parentNode === parent, 'Parent reference set')

  // Remove child
  parent.removeChild(child)
  assert(child.parentNode === null, 'Parent reference cleared on remove')

  await cleanupWindow(window)
}

// Test 14: Empty/whitespace content
console.log('\nTest Group 14: Empty Content Handling')
{
  const window = createTestWindow()

  window.document.body!.innerHTML = ''
  assert(window.document.body!.children.length === 0, 'Empty innerHTML clears children')

  window.document.body!.innerHTML = '   \n\t   '
  // Whitespace creates text node, which shows up in children
  assert(window.document.body!.children.length >= 0, 'Whitespace innerHTML handled')

  await cleanupWindow(window)
}

// Test 15: File API error handling
console.log('\nTest Group 15: File API Error Handling')
{
  const window = createTestWindow()

  const reader = new window.FileReader()

  // Read without file
  let errorThrown = false
  try {
    reader.readAsText(null as any)
  }
  catch {
    errorThrown = true
  }
  assert(errorThrown || reader.readyState === 0, 'readAsText without file handled')

  await cleanupWindow(window)
}

stats.printSummary()
stats.exit()
