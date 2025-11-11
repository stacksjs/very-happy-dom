/* eslint-disable no-console */
/**
 * Browser API Tests
 * Comprehensive tests for Performance, Geolocation, Notifications, Clipboard, File API
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

console.log('=== 🌐 Browser API Test Suite ===\n')

// Test 1: Performance API
console.log('Test Group 1: Performance - Basic API')
{
  const window = new Window()

  assert(typeof window.performance === 'object', 'performance object exists')
  assert(typeof window.performance.now === 'function', 'performance.now() exists')
  assert(typeof window.performance.mark === 'function', 'performance.mark() exists')
  assert(typeof window.performance.measure === 'function', 'performance.measure() exists')

  await window.happyDOM.close()
}

// Test 2: Performance.now()
console.log('\nTest Group 2: Performance - now()')
{
  const window = new Window()

  const start = window.performance.now()
  assert(typeof start === 'number', 'now() returns number')
  assert(start >= 0, 'now() returns non-negative')

  const end = window.performance.now()
  assert(end >= start, 'now() increases over time')

  await window.happyDOM.close()
}

// Test 3: Performance marks
console.log('\nTest Group 3: Performance - Marks')
{
  const window = new Window()

  window.performance.mark('start')
  assert(true, 'mark() does not throw')

  window.performance.mark('end')
  window.performance.measure('duration', 'start', 'end')
  assert(true, 'measure() does not throw')

  await window.happyDOM.close()
}

// Test 4: Navigator API
console.log('\nTest Group 4: Navigator - Basic API')
{
  const window = new Window()

  assert(typeof window.navigator === 'object', 'navigator exists')
  assert(typeof window.navigator.clipboard === 'object', 'navigator.clipboard exists')
  assert(typeof window.navigator.geolocation === 'object', 'navigator.geolocation exists')

  await window.happyDOM.close()
}

// Test 5: Clipboard API
console.log('\nTest Group 5: Clipboard - writeText/readText')
{
  const window = new Window()

  assert(typeof window.navigator.clipboard.writeText === 'function', 'writeText() exists')
  assert(typeof window.navigator.clipboard.readText === 'function', 'readText() exists')

  await window.navigator.clipboard.writeText('test text')
  const text = await window.navigator.clipboard.readText()

  assert(text === 'test text', 'Clipboard stores and retrieves text')

  await window.happyDOM.close()
}

// Test 6: Geolocation API
console.log('\nTest Group 6: Geolocation - Basic API')
{
  const window = new Window()

  assert(typeof window.navigator.geolocation.getCurrentPosition === 'function', 'getCurrentPosition() exists')
  assert(typeof window.navigator.geolocation.watchPosition === 'function', 'watchPosition() exists')
  assert(typeof window.navigator.geolocation.clearWatch === 'function', 'clearWatch() exists')

  await window.happyDOM.close()
}

// Test 7: Notification API
console.log('\nTest Group 7: Notification - Basic API')
{
  const window = new Window()

  assert(typeof window.Notification === 'function', 'Notification constructor exists')
  assert(typeof window.Notification.requestPermission === 'function', 'requestPermission() exists')

  await window.happyDOM.close()
}

// Test 8: File API
console.log('\nTest Group 8: File - Basic API')
{
  const window = new Window()

  assert(typeof window.File === 'function', 'File constructor exists')
  assert(typeof window.FileReader === 'function', 'FileReader constructor exists')
  assert(typeof window.FileList === 'function', 'FileList constructor exists')

  await window.happyDOM.close()
}

// Test 9: File - create and read
console.log('\nTest Group 9: File - Create and Properties')
{
  const window = new Window()

  const file = new window.File(['test content'], 'test.txt', { type: 'text/plain' })

  assert(file.name === 'test.txt', 'File name set correctly')
  assert(typeof file.type === 'string', 'File type property exists')
  assert(typeof file.lastModified === 'number', 'File lastModified exists')
  assert(typeof file.size === 'number', 'File size exists')

  await window.happyDOM.close()
}

// Test 10: FileReader - readAsText
console.log('\nTest Group 10: FileReader - readAsText')
{
  const window = new Window()

  const file = new window.File(['Hello World'], 'test.txt')
  const reader = new window.FileReader()

  let textRead = ''
  reader.onload = () => {
    textRead = reader.result as string
  }

  reader.readAsText(file)

  // Wait for async read
  await new Promise(resolve => setTimeout(resolve, 10))

  assert(textRead === 'Hello World', 'FileReader read text correctly')
  assert(reader.readyState === 2, 'ReadyState is DONE (2)')

  await window.happyDOM.close()
}

// Test 11: FileReader - readAsDataURL
console.log('\nTest Group 11: FileReader - readAsDataURL')
{
  const window = new Window()

  const file = new window.File(['data'], 'test.txt')
  const reader = new window.FileReader()

  let dataURL = ''
  reader.onload = () => {
    dataURL = reader.result as string
  }

  reader.readAsDataURL(file)

  await new Promise(resolve => setTimeout(resolve, 10))

  assert(dataURL.startsWith('data:'), 'DataURL starts with data:')

  await window.happyDOM.close()
}

// Test 12: DataTransfer API
console.log('\nTest Group 12: DataTransfer - Basic API')
{
  const window = new Window()

  assert(typeof window.DataTransfer === 'function', 'DataTransfer constructor exists')

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
  console.log('\n🎉 All browser API tests passing!')
}
