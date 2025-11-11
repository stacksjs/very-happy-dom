/* eslint-disable no-console */
/**
 * Observer API Tests
 * Comprehensive tests for MutationObserver, IntersectionObserver, ResizeObserver
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

console.log('=== 👁️  Observer API Test Suite ===\n')

// Test 1: MutationObserver - basic setup
console.log('Test Group 1: MutationObserver - Basic Setup')
{
  const window = new Window()
  let callbackExecuted = false

  const observer = new window.MutationObserver((_mutations) => {
    callbackExecuted = true
  })

  assert(typeof observer === 'object', 'MutationObserver instance created')
  assert(typeof observer.observe === 'function', 'observe method exists')
  assert(typeof observer.disconnect === 'function', 'disconnect method exists')
  assert(typeof observer.takeRecords === 'function', 'takeRecords method exists')
  assert(callbackExecuted === false, 'Callback not executed before observation')

  await window.happyDOM.close()
}

// Test 2: MutationObserver - observe and disconnect
console.log('\nTest Group 2: MutationObserver - Observe & Disconnect')
{
  const window = new Window()
  const element = window.document.createElement('div')
  let _mutationCount = 0

  const observer = new window.MutationObserver((mutations) => {
    _mutationCount = mutations.length
  })

  observer.observe(element, { childList: true, attributes: true })
  assert(true, 'observe() does not throw')

  observer.disconnect()
  assert(true, 'disconnect() does not throw')

  await window.happyDOM.close()
}

// Test 3: MutationObserver - observe with childList option
console.log('\nTest Group 3: MutationObserver - Observe with childList')
{
  const window = new Window()
  const parent = window.document.createElement('div')

  const observer = new window.MutationObserver(() => {})
  observer.observe(parent, { childList: true })
  assert(true, 'observe() accepts childList option')

  const child = window.document.createElement('span')
  parent.appendChild(child)
  assert(parent.children.length === 1, 'Child appended successfully')

  observer.disconnect()
  await window.happyDOM.close()
}

// Test 4: MutationObserver - observe with attributes option
console.log('\nTest Group 4: MutationObserver - Observe with attributes')
{
  const window = new Window()
  const element = window.document.createElement('div')

  const observer = new window.MutationObserver(() => {})
  observer.observe(element, { attributes: true })
  assert(true, 'observe() accepts attributes option')

  element.setAttribute('data-test', 'value')
  assert(element.getAttribute('data-test') === 'value', 'Attribute set successfully')

  observer.disconnect()
  await window.happyDOM.close()
}

// Test 5: MutationObserver - takeRecords
console.log('\nTest Group 5: MutationObserver - takeRecords()')
{
  const window = new Window()
  const element = window.document.createElement('div')

  const observer = new window.MutationObserver(() => {})
  observer.observe(element, { attributes: true })

  const records = observer.takeRecords()
  assert(Array.isArray(records), 'takeRecords returns array')

  observer.disconnect()
  await window.happyDOM.close()
}

// Test 6: MutationObserver - multiple observers on same element
console.log('\nTest Group 6: MutationObserver - Multiple Observers')
{
  const window = new Window()
  const element = window.document.createElement('div')

  const observer1 = new window.MutationObserver(() => {})
  const observer2 = new window.MutationObserver(() => {})

  observer1.observe(element, { attributes: true })
  observer2.observe(element, { attributes: true })
  assert(true, 'Multiple observers can observe same element')

  observer1.disconnect()
  observer2.disconnect()
  await window.happyDOM.close()
}

// Test 7: IntersectionObserver - basic setup
console.log('\nTest Group 7: IntersectionObserver - Basic Setup')
{
  const window = new Window()
  let callbackExecuted = false

  const observer = new window.IntersectionObserver((_entries) => {
    callbackExecuted = true
  })

  assert(typeof observer === 'object', 'IntersectionObserver instance created')
  assert(typeof observer.observe === 'function', 'observe method exists')
  assert(typeof observer.disconnect === 'function', 'disconnect method exists')
  assert(typeof observer.unobserve === 'function', 'unobserve method exists')
  assert(typeof observer.takeRecords === 'function', 'takeRecords method exists')
  assert(callbackExecuted === false, 'Callback not executed before observation')

  await window.happyDOM.close()
}

// Test 8: IntersectionObserver - observe element
console.log('\nTest Group 8: IntersectionObserver - Observe Element')
{
  const window = new Window()
  const element = window.document.createElement('div')
  let entriesReceived: any[] = []

  const observer = new window.IntersectionObserver((entries) => {
    entriesReceived = entries
  })

  observer.observe(element)
  assert(true, 'observe() does not throw')

  // Wait for intersection callback
  await new Promise(resolve => setTimeout(resolve, 10))

  assert(entriesReceived.length > 0, 'Intersection entries received')
  if (entriesReceived.length > 0) {
    assert(entriesReceived[0].target === element, 'Entry target is observed element')
    assert(typeof entriesReceived[0].isIntersecting === 'boolean', 'isIntersecting is boolean')
    assert(typeof entriesReceived[0].intersectionRatio === 'number', 'intersectionRatio is number')
  }

  observer.disconnect()
  await window.happyDOM.close()
}

// Test 9: IntersectionObserver - unobserve
console.log('\nTest Group 9: IntersectionObserver - Unobserve')
{
  const window = new Window()
  const element = window.document.createElement('div')
  let callbackCount = 0

  const observer = new window.IntersectionObserver(() => {
    callbackCount++
  })

  observer.observe(element)
  await new Promise(resolve => setTimeout(resolve, 10))

  const countAfterObserve = callbackCount

  observer.unobserve(element)
  assert(true, 'unobserve() does not throw')

  await new Promise(resolve => setTimeout(resolve, 10))

  assert(callbackCount === countAfterObserve, 'No additional callbacks after unobserve')

  observer.disconnect()
  await window.happyDOM.close()
}

// Test 10: IntersectionObserver - with options
console.log('\nTest Group 10: IntersectionObserver - With Options')
{
  const window = new Window()

  const observer = new window.IntersectionObserver(
    () => {},
    {
      root: null,
      rootMargin: '10px',
      threshold: [0, 0.5, 1.0],
    },
  )

  assert(typeof observer === 'object', 'Observer created with options')
  assert(observer.rootMargin === '10px', 'rootMargin option stored')
  assert(Array.isArray(observer.thresholds), 'thresholds is array')
  assert(observer.thresholds.length === 3, 'thresholds has 3 values')

  observer.disconnect()
  await window.happyDOM.close()
}

// Test 11: ResizeObserver - basic setup
console.log('\nTest Group 11: ResizeObserver - Basic Setup')
{
  const window = new Window()
  let callbackExecuted = false

  const observer = new window.ResizeObserver((_entries) => {
    callbackExecuted = true
  })

  assert(typeof observer === 'object', 'ResizeObserver instance created')
  assert(typeof observer.observe === 'function', 'observe method exists')
  assert(typeof observer.disconnect === 'function', 'disconnect method exists')
  assert(typeof observer.unobserve === 'function', 'unobserve method exists')
  assert(callbackExecuted === false, 'Callback not executed before observation')

  await window.happyDOM.close()
}

// Test 12: ResizeObserver - observe element
console.log('\nTest Group 12: ResizeObserver - Observe Element')
{
  const window = new Window()
  const element = window.document.createElement('div')
  let entriesReceived: any[] = []

  const observer = new window.ResizeObserver((entries) => {
    entriesReceived = entries
  })

  observer.observe(element)
  assert(true, 'observe() does not throw')

  // Wait for resize callback
  await new Promise(resolve => setTimeout(resolve, 10))

  assert(entriesReceived.length > 0, 'Resize entries received')
  if (entriesReceived.length > 0) {
    assert(entriesReceived[0].target === element, 'Entry target is observed element')
    assert(typeof entriesReceived[0].contentRect === 'object', 'contentRect exists')
    assert(Array.isArray(entriesReceived[0].borderBoxSize), 'borderBoxSize is array')
    assert(Array.isArray(entriesReceived[0].contentBoxSize), 'contentBoxSize is array')
  }

  observer.disconnect()
  await window.happyDOM.close()
}

// Test 13: ResizeObserver - unobserve
console.log('\nTest Group 13: ResizeObserver - Unobserve')
{
  const window = new Window()
  const element = window.document.createElement('div')
  let callbackCount = 0

  const observer = new window.ResizeObserver(() => {
    callbackCount++
  })

  observer.observe(element)
  await new Promise(resolve => setTimeout(resolve, 10))

  const countAfterObserve = callbackCount

  observer.unobserve(element)
  assert(true, 'unobserve() does not throw')

  // Try to trigger another resize (won't happen since unobserved)
  await new Promise(resolve => setTimeout(resolve, 10))

  assert(callbackCount === countAfterObserve, 'No additional callbacks after unobserve')

  observer.disconnect()
  await window.happyDOM.close()
}

// Test 14: ResizeObserver - multiple elements
console.log('\nTest Group 14: ResizeObserver - Multiple Elements')
{
  const window = new Window()
  const element1 = window.document.createElement('div')
  const element2 = window.document.createElement('div')
  let entriesReceived: any[] = []

  const observer = new window.ResizeObserver((entries) => {
    entriesReceived = entries
  })

  observer.observe(element1)
  observer.observe(element2)

  await new Promise(resolve => setTimeout(resolve, 10))

  assert(entriesReceived.length >= 1, 'At least one resize entry received')

  observer.disconnect()
  await window.happyDOM.close()
}

// Test 15: Observer cleanup on disconnect
console.log('\nTest Group 15: Observer Cleanup - Disconnect')
{
  const window = new Window()
  const element = window.document.createElement('div')

  const mutObs = new window.MutationObserver(() => {})
  const intObs = new window.IntersectionObserver(() => {})
  const resObs = new window.ResizeObserver(() => {})

  mutObs.observe(element, { attributes: true })
  intObs.observe(element)
  resObs.observe(element)

  mutObs.disconnect()
  intObs.disconnect()
  resObs.disconnect()

  assert(true, 'All observers disconnected without error')

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
  console.log('\n🎉 All observer tests passing!')
}
