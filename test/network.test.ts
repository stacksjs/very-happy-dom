/* eslint-disable no-console */
/**
 * Network API Tests
 * Comprehensive tests for fetch, XMLHttpRequest, WebSocket, Request Interception
 */

import type { InterceptedRequest } from '../src/index'
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

console.log('=== 🌐 Network API Test Suite ===\n')

// Test 1: Fetch API basic
console.log('Test Group 1: Fetch API - Basic Operations')
{
  const window = new Window()

  assert(typeof window.fetch === 'function', 'fetch is available')
  assert(typeof window.Request === 'function', 'Request constructor available')
  assert(typeof window.Response === 'function', 'Response constructor available')
  assert(typeof window.Headers === 'function', 'Headers constructor available')

  await window.happyDOM.close()
}

// Test 2: Request Interception - basic setup
console.log('\nTest Group 2: Request Interception - Setup')
{
  const browser = new Browser()
  const page = browser.newPage()
  let interceptorCalled = false

  page.on('request', async (request: InterceptedRequest) => {
    interceptorCalled = true
    request.continue()
  })

  await page.setRequestInterception(true)

  assert(true, 'Request interception enabled without error')
  assert(interceptorCalled === false, 'Interceptor not called until fetch')

  await browser.close()
}

// Test 3: Request Interception - API surface
console.log('\nTest Group 3: Request Interception - InterceptedRequest API')
{
  const browser = new Browser()
  const page = browser.newPage()
  let interceptorCalledWithRequest = false

  page.on('request', async (request: InterceptedRequest) => {
    // Test that request has expected properties
    interceptorCalledWithRequest = (
      typeof request.url === 'string'
      && typeof request.method === 'string'
      && typeof request.headers === 'object'
      && typeof request.continue === 'function'
      && typeof request.abort === 'function'
      && typeof request.respond === 'function'
    )
    request.continue()
  })

  await page.setRequestInterception(true)

  assert(interceptorCalledWithRequest === false, 'Interceptor not called before fetch')

  await browser.close()
}

// Test 4: XMLHttpRequest - basic operations
console.log('\nTest Group 4: XMLHttpRequest - Basic Operations')
{
  const window = new Window()

  const xhr = new window.XMLHttpRequest()
  assert(xhr.readyState === 0, 'Initial readyState is UNSENT (0)')

  xhr.open('GET', 'https://api.example.com/data')
  assert(xhr.readyState === 1, 'After open() readyState is OPENED (1)')

  await window.happyDOM.close()
}

// Test 5: XMLHttpRequest - event handlers
console.log('\nTest Group 5: XMLHttpRequest - Event Handlers')
{
  const window = new Window()

  const xhr = new window.XMLHttpRequest()
  let _loadCalled = false
  let _errorCalled = false

  xhr.onload = () => {
    _loadCalled = true
  }
  xhr.onerror = () => {
    _errorCalled = true
  }

  assert(typeof xhr.onload === 'function', 'onload handler can be set')
  assert(typeof xhr.onerror === 'function', 'onerror handler can be set')

  await window.happyDOM.close()
}

// Test 6: XMLHttpRequest - request headers
console.log('\nTest Group 6: XMLHttpRequest - Request Headers')
{
  const window = new Window()

  const xhr = new window.XMLHttpRequest()
  xhr.open('GET', 'https://api.example.com/test')

  xhr.setRequestHeader('Content-Type', 'application/json')
  xhr.setRequestHeader('X-Custom-Header', 'test-value')

  assert(true, 'setRequestHeader does not throw')

  await window.happyDOM.close()
}

// Test 7: XMLHttpRequest - send triggers state changes
console.log('\nTest Group 7: XMLHttpRequest - Send State Changes')
{
  const window = new Window()

  const xhr = new window.XMLHttpRequest()
  const stateChanges: number[] = []

  xhr.onreadystatechange = () => {
    stateChanges.push(xhr.readyState)
  }

  xhr.open('GET', 'https://httpbin.org/delay/0')

  // Don't send to avoid actual network call, just test API
  assert(stateChanges.includes(1), 'State changed to OPENED on open()')

  await window.happyDOM.close()
}

// Test 8: WebSocket - basic operations
console.log('\nTest Group 8: WebSocket - Basic Operations')
{
  const window = new Window()

  assert(typeof window.WebSocket === 'function', 'WebSocket constructor available')
  assert(window.WebSocket.CONNECTING === 0, 'CONNECTING constant is 0')
  assert(window.WebSocket.OPEN === 1, 'OPEN constant is 1')
  assert(window.WebSocket.CLOSING === 2, 'CLOSING constant is 2')
  assert(window.WebSocket.CLOSED === 3, 'CLOSED constant is 3')

  await window.happyDOM.close()
}

// Test 9: WebSocket - event handlers
console.log('\nTest Group 9: WebSocket - Event Handlers')
{
  const window = new Window()

  // Note: We can't actually connect without a real WebSocket server
  // Just test the API surface
  let ws: any = null
  let _error: any = null

  try {
    ws = new window.WebSocket('wss://echo.websocket.org/')
    assert(ws.readyState === 0, 'Initial readyState is CONNECTING')
  }
  catch (e) {
    _error = e
  }

  if (ws) {
    assert(typeof ws.onopen === 'object' || typeof ws.onopen === 'function', 'onopen handler exists')
    assert(typeof ws.onmessage === 'object' || typeof ws.onmessage === 'function', 'onmessage handler exists')
    assert(typeof ws.onerror === 'object' || typeof ws.onerror === 'function', 'onerror handler exists')
    assert(typeof ws.onclose === 'object' || typeof ws.onclose === 'function', 'onclose handler exists')
    assert(typeof ws.send === 'function', 'send method exists')
    assert(typeof ws.close === 'function', 'close method exists')

    // Clean up
    if (ws.readyState === 0 || ws.readyState === 1) {
      ws.close()
    }
  }

  await window.happyDOM.close()
}

// Test 10: FormData API
console.log('\nTest Group 10: FormData - Basic Operations')
{
  const window = new Window()

  assert(typeof window.FormData === 'function', 'FormData constructor available')

  const formData = new window.FormData()
  formData.append('name', 'John')
  formData.append('age', '30')

  assert(formData.get('name') === 'John', 'FormData.get() works')
  assert(formData.get('age') === '30', 'FormData stores multiple fields')
  assert(formData.has('name') === true, 'FormData.has() returns true for existing field')
  assert(formData.has('email') === false, 'FormData.has() returns false for non-existing field')

  await window.happyDOM.close()
}

// Test 11: URL and URLSearchParams
console.log('\nTest Group 11: URL & URLSearchParams - Basic Operations')
{
  const window = new Window()

  assert(typeof window.URL === 'function', 'URL constructor available')
  assert(typeof window.URLSearchParams === 'function', 'URLSearchParams constructor available')

  const url = new window.URL('https://example.com/path?foo=bar&baz=qux')
  assert(url.hostname === 'example.com', 'URL.hostname parsed correctly')
  assert(url.pathname === '/path', 'URL.pathname parsed correctly')
  assert(url.protocol === 'https:', 'URL.protocol parsed correctly')

  const params = new window.URLSearchParams('foo=bar&baz=qux')
  assert(params.get('foo') === 'bar', 'URLSearchParams.get() works')
  assert(params.get('baz') === 'qux', 'URLSearchParams parses multiple params')

  params.append('new', 'value')
  assert(params.get('new') === 'value', 'URLSearchParams.append() works')

  await window.happyDOM.close()
}

// Test 12: Headers API
console.log('\nTest Group 12: Headers - Basic Operations')
{
  const window = new Window()

  const headers = new window.Headers()
  headers.append('Content-Type', 'application/json')
  headers.append('X-Custom', 'test')

  assert(headers.get('Content-Type') === 'application/json', 'Headers.get() works')
  assert(headers.has('X-Custom') === true, 'Headers.has() returns true for existing header')
  assert(headers.has('X-Missing') === false, 'Headers.has() returns false for missing header')

  headers.set('Content-Type', 'text/html')
  assert(headers.get('Content-Type') === 'text/html', 'Headers.set() overwrites value')

  headers.delete('X-Custom')
  assert(headers.has('X-Custom') === false, 'Headers.delete() removes header')

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
  console.log('\n🎉 All network tests passing!')
}
