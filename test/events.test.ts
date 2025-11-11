/* eslint-disable no-console */
/**
 * Event API Tests
 * Comprehensive tests for CustomEvent, Event emitters, page events
 */

import { Browser, Window } from '../src/index'

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

console.log('=== 🎯 Event API Test Suite ===\n')

// Test 1: CustomEvent basic
console.log('Test Group 1: CustomEvent - Basic API')
{
  const window = new Window()

  assert(typeof window.CustomEvent === 'function', 'CustomEvent constructor exists')

  const event = new window.CustomEvent('test')
  assert(event.type === 'test', 'Event type set correctly')

  await window.happyDOM.close()
}

// Test 2: CustomEvent with detail
console.log('\nTest Group 2: CustomEvent - With Detail')
{
  const window = new Window()

  const event = new window.CustomEvent('custom', {
    detail: { foo: 'bar', count: 42 },
  })

  assert(event.type === 'custom', 'Event type is custom')
  assert(event.detail.foo === 'bar', 'Detail.foo is correct')
  assert(event.detail.count === 42, 'Detail.count is correct')

  await window.happyDOM.close()
}

// Test 3: CustomEvent bubbles and cancelable
console.log('\nTest Group 3: CustomEvent - Bubbles & Cancelable')
{
  const window = new Window()

  const event1 = new window.CustomEvent('test', { bubbles: true })
  assert(event1.bubbles === true, 'Bubbles option works')

  const event2 = new window.CustomEvent('test', { cancelable: true })
  assert(event2.cancelable === true, 'Cancelable option works')

  await window.happyDOM.close()
}

// Test 4: Element addEventListener
console.log('\nTest Group 4: Element - addEventListener')
{
  const window = new Window()
  const element = window.document.createElement('div')
  let eventFired = false

  element.addEventListener('click', () => {
    eventFired = true
  })

  const event = new window.CustomEvent('click')
  element.dispatchEvent(event)

  assert((eventFired as boolean) === true, 'Event listener executed')

  await window.happyDOM.close()
}

// Test 5: Element removeEventListener
console.log('\nTest Group 5: Element - removeEventListener')
{
  const window = new Window()
  const element = window.document.createElement('div')
  let count = 0

  const handler = () => {
    count++
  }
  element.addEventListener('test', handler)
  element.dispatchEvent(new window.CustomEvent('test'))

  const countAfterFirst = count

  element.removeEventListener('test', handler)
  element.dispatchEvent(new window.CustomEvent('test'))

  assert(countAfterFirst === 1, 'Handler executed before removal')
  assert(count === 1, 'Handler not executed after removal')

  await window.happyDOM.close()
}

// Test 6: Document addEventListener
console.log('\nTest Group 6: Document - addEventListener')
{
  const window = new Window()
  let eventFired = false

  window.document.addEventListener('custom', () => {
    eventFired = true
  })

  window.document.dispatchEvent(new window.CustomEvent('custom'))
  assert((eventFired as boolean) === true, 'Document event listener works')

  await window.happyDOM.close()
}

// Test 7: BrowserPage events - setup
console.log('\nTest Group 7: BrowserPage - Event Emitter Setup')
{
  const browser = new Browser()
  const page = browser.newPage()

  assert(typeof page.on === 'function', 'page.on() exists')
  assert(typeof page.off === 'function', 'page.off() exists')

  await browser.close()
}

// Test 8: BrowserPage - console event
console.log('\nTest Group 8: BrowserPage - Console Event')
{
  const browser = new Browser()
  const page = browser.newPage()
  const messages: string[] = []

  page.on('console', (msg: any) => {
    messages.push(msg.text())
  })

  assert(messages.length === 0, 'No console events before logging')

  await browser.close()
}

// Test 9: BrowserPage - error event
console.log('\nTest Group 9: BrowserPage - Error Event')
{
  const browser = new Browser()
  const page = browser.newPage()
  let errorCaught = false

  page.on('error', () => {
    errorCaught = true
  })

  assert(errorCaught === false, 'No error event before error')

  await browser.close()
}

// Test 10: Multiple event listeners
console.log('\nTest Group 10: Element - Multiple Event Listeners')
{
  const window = new Window()
  const element = window.document.createElement('div')
  let count1 = 0
  let count2 = 0

  element.addEventListener('test', () => {
    count1++
  })
  element.addEventListener('test', () => {
    count2++
  })

  element.dispatchEvent(new window.CustomEvent('test'))

  assert(count1 === 1, 'First listener executed')
  assert(count2 === 1, 'Second listener executed')

  await window.happyDOM.close()
}

// Test 11: Event once option
console.log('\nTest Group 11: Element - Event Listener Once')
{
  const window = new Window()
  const element = window.document.createElement('div')
  let count = 0

  element.addEventListener('test', () => {
    count++
  }, { once: true })

  element.dispatchEvent(new window.CustomEvent('test'))
  element.dispatchEvent(new window.CustomEvent('test'))

  assert(count === 1, 'Once listener executed only once')

  await window.happyDOM.close()
}

// Test 12: Event capture option
console.log('\nTest Group 12: Element - Event Capture')
{
  const window = new Window()
  const element = window.document.createElement('div')

  element.addEventListener('test', () => {}, { capture: true })
  assert(true, 'Capture option does not throw')

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
  console.log('\n🎉 All event tests passing!')
}
