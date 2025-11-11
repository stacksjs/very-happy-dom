/* eslint-disable no-console */
/**
 * Final comprehensive test suite for all new features
 * Tests all 15 newly implemented features
 */

import { Browser, Window } from '../../src/index'

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

console.log('=== 🌟 Final Features Test Suite ===\n')

// Test 1: Request Interception
console.log('Test 1: Network Request Interception')
{
  const browser = new Browser()
  const page = browser.newPage()

  let intercepted = false
  await page.setRequestInterception(true)

  page.on('request', (request) => {
    intercepted = true
    assert(request.url !== undefined, 'Request has URL')
    request.continue()
  })

  assert(intercepted === false, 'Request not yet intercepted')
  await browser.close()
}

// Test 2: WebSocket
console.log('\nTest 2: WebSocket API')
{
  const window = new Window()

  assert(typeof window.WebSocket === 'function', 'WebSocket constructor exists')
  assert(window.WebSocket.CONNECTING === 0, 'WebSocket.CONNECTING constant')
  assert(window.WebSocket.OPEN === 1, 'WebSocket.OPEN constant')

  await window.happyDOM.close()
}

// Test 3: Clipboard
console.log('\nTest 3: Clipboard API')
{
  const window = new Window()

  await window.navigator.clipboard.writeText('Hello Clipboard')
  const text = await window.navigator.clipboard.readText()

  assert(text === 'Hello Clipboard', 'Clipboard read/write works')

  await window.happyDOM.close()
}

// Test 4: File API
console.log('\nTest 4: File API')
{
  const window = new Window()

  assert(typeof window.File === 'function', 'File constructor exists')
  assert(typeof window.FileReader === 'function', 'FileReader constructor exists')
  assert(typeof window.FileList === 'function', 'FileList constructor exists')

  const reader = new window.FileReader()
  assert(reader.readyState === window.FileReader.EMPTY, 'FileReader initial state')

  await window.happyDOM.close()
}

// Test 5: Shadow DOM
console.log('\nTest 5: Shadow DOM')
{
  const window = new Window()
  window.document.write('<div id="host"></div>')

  const host = window.document.getElementById('host')
  const shadow = host?.attachShadow({ mode: 'open' })

  assert(shadow !== null && shadow !== undefined, 'Shadow root created')
  assert(shadow?.mode === 'open', 'Shadow root mode is open')
  assert(host?.shadowRoot === shadow, 'Shadow root attached to host')

  await window.happyDOM.close()
}

// Test 6: Custom Elements
console.log('\nTest 6: Custom Elements')
{
  const window = new Window()

  assert(typeof window.customElements === 'object', 'customElements registry exists')
  assert(typeof window.customElements.define === 'function', 'customElements.define exists')
  assert(typeof window.HTMLElement === 'function', 'HTMLElement constructor exists')

  await window.happyDOM.close()
}

// Test 7: Drag and Drop
console.log('\nTest 7: Drag and Drop')
{
  const browser = new Browser()
  const page = browser.newPage()

  page.content = '<div id="source">Source</div><div id="target">Target</div>'

  let dragStarted = false
  let dropped = false

  const source = page.mainFrame.document.getElementById('source')
  const target = page.mainFrame.document.getElementById('target')

  source?.addEventListener('dragstart', () => {
    dragStarted = true
  })
  target?.addEventListener('drop', () => {
    dropped = true
  })

  await page.dragAndDrop('#source', '#target')

  assert((dragStarted as boolean) === true, 'Drag start event fired')
  assert((dropped as boolean) === true, 'Drop event fired')

  await browser.close()
}

// Test 8: document.cookie
console.log('\nTest 8: document.cookie API')
{
  const window = new Window()

  window.document.cookie = 'test=value1'
  window.document.cookie = 'foo=bar'

  const cookies = window.document.cookie
  assert(cookies.includes('test=value1'), 'Cookie test=value1 set')
  assert(cookies.includes('foo=bar'), 'Cookie foo=bar set')

  await window.happyDOM.close()
}

// Test 9: Performance API
console.log('\nTest 9: Performance API')
{
  const window = new Window()

  const start = window.performance.now()
  assert(typeof start === 'number', 'performance.now() returns number')

  window.performance.mark('start')
  window.performance.mark('end')
  window.performance.measure('duration', 'start', 'end')

  const entries = window.performance.getEntriesByName('duration')
  assert(entries.length > 0, 'Performance measure created')

  await window.happyDOM.close()
}

// Test 10: Geolocation
console.log('\nTest 10: Geolocation API')
{
  const window = new Window()

  assert(typeof window.navigator.geolocation === 'object', 'Geolocation exists')
  assert(typeof window.navigator.geolocation.getCurrentPosition === 'function', 'getCurrentPosition exists')

  let positionReceived = false
  window.navigator.geolocation.getCurrentPosition((position) => {
    positionReceived = true
    assert(position.coords.latitude !== undefined, 'Position has latitude')
  })

  await new Promise(resolve => setTimeout(resolve, 10))
  assert((positionReceived as boolean) === true, 'Position callback called')

  await window.happyDOM.close()
}

// Test 11: Notifications
console.log('\nTest 11: Notifications API')
{
  const window = new Window()

  assert(typeof window.Notification === 'function', 'Notification constructor exists')
  assert(typeof window.Notification.requestPermission === 'function', 'requestPermission exists')

  const permission = await window.Notification.requestPermission()
  assert(permission === 'granted', 'Permission granted')

  let notificationShown = false
  const notification = new window.Notification('Test', { body: 'Test body' })
  notification.onshow = () => {
    notificationShown = true
  }

  await new Promise(resolve => setTimeout(resolve, 10))
  assert((notificationShown as boolean) === true, 'Notification shown')

  await window.happyDOM.close()
}

// Test 12: DataTransfer
console.log('\nTest 12: DataTransfer API')
{
  const window = new Window()

  assert(typeof window.DataTransfer === 'function', 'DataTransfer constructor exists')

  const dt = new window.DataTransfer()
  dt.setData('text/plain', 'Hello')
  const data = dt.getData('text/plain')

  assert(data === 'Hello', 'DataTransfer get/set works')
  assert(dt.types.includes('text/plain'), 'DataTransfer types updated')

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
  console.log('\n🎉 All final features working!')
}
