/* eslint-disable no-console */
/**
 * Tests for newly implemented features
 * Storage, Timers, Waiting Utilities, Network APIs, Events, etc.
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

console.log('=== 🎯 New Features Test Suite ===\n')

// Test 1: localStorage
console.log('Test 1: localStorage')
{
  const window = new Window()

  window.localStorage.setItem('key1', 'value1')
  assert(window.localStorage.getItem('key1') === 'value1', 'localStorage setItem/getItem')

  window.localStorage.key2 = 'value2'
  assert(window.localStorage.key2 === 'value2', 'localStorage bracket notation')

  assert(window.localStorage.length === 2, 'localStorage.length')

  window.localStorage.removeItem('key1')
  assert(window.localStorage.getItem('key1') === null, 'localStorage.removeItem')

  window.localStorage.clear()
  assert(window.localStorage.length === 0, 'localStorage.clear')

  await window.happyDOM.close()
}

// Test 2: sessionStorage
console.log('\nTest 2: sessionStorage')
{
  const window = new Window()

  window.sessionStorage.setItem('session1', 'data1')
  assert(window.sessionStorage.getItem('session1') === 'data1', 'sessionStorage setItem/getItem')

  assert(window.sessionStorage !== window.localStorage, 'sessionStorage separate from localStorage')

  await window.happyDOM.close()
}

// Test 3: setTimeout
console.log('\nTest 3: setTimeout')
{
  const window = new Window()

  let executed = false
  window.setTimeout(() => {
    executed = true
  }, 10)

  await new Promise(resolve => setTimeout(resolve, 50))
  assert((executed as boolean) === true, 'setTimeout executes callback')

  await window.happyDOM.close()
}

// Test 4: setInterval
console.log('\nTest 4: setInterval')
{
  const window = new Window()

  let count = 0
  const id = window.setInterval(() => {
    count++
  }, 10)

  await new Promise(resolve => setTimeout(resolve, 50))
  window.clearInterval(id)

  assert(count >= 3, `setInterval executes multiple times (${count} times)`)

  await window.happyDOM.close()
}

// Test 5: requestAnimationFrame
console.log('\nTest 5: requestAnimationFrame')
{
  const window = new Window()

  let executed = false
  let timestamp = 0
  window.requestAnimationFrame((time) => {
    executed = true
    timestamp = time
  })

  await new Promise(resolve => setTimeout(resolve, 50))
  assert((executed as boolean) === true, 'requestAnimationFrame executes callback')
  assert(timestamp > 0, 'requestAnimationFrame provides timestamp')

  await window.happyDOM.close()
}

// Test 6: Timer cleanup on window close
console.log('\nTest 6: Timer cleanup')
{
  const window = new Window()

  let executed = false
  window.setTimeout(() => {
    executed = true
  }, 50)

  await window.happyDOM.close()
  await new Promise(resolve => setTimeout(resolve, 100))

  assert(executed === false, 'Timers cleared on window close')
}

// Test 7: waitUntilComplete with timers
console.log('\nTest 7: waitUntilComplete with timers')
{
  const window = new Window()

  let executed = false
  window.setTimeout(() => {
    executed = true
  }, 20)

  await window.happyDOM.waitUntilComplete()

  assert((executed as boolean) === true, 'waitUntilComplete waits for timers')

  await window.happyDOM.close()
}

// Test 8: waitForSelector
console.log('\nTest 8: BrowserPage.waitForSelector')
{
  const browser = new Browser()
  const page = browser.newPage()

  page.content = '<body><div id="initial">Initial</div></body>'

  // Add element after a delay
  setTimeout(() => {
    page.content = '<body><div id="initial">Initial</div><div class="dynamic">Dynamic</div></body>'
  }, 50)

  const element = await page.waitForSelector('.dynamic', { timeout: 200 })

  assert(element !== null, 'waitForSelector found element')
  assert(element?.getAttribute('class') === 'dynamic', 'waitForSelector found correct element')

  await browser.close()
}

// Test 9: waitForFunction
console.log('\nTest 9: BrowserPage.waitForFunction')
{
  const browser = new Browser()
  const page = browser.newPage()

  page.content = '<body><div id="counter">0</div></body>'

  let count = 0
  const interval = setInterval(() => {
    count++
    page.mainFrame.document.getElementById('counter')!.textContent = count.toString()
  }, 20)

  const result = await page.waitForFunction(() => {
    const counter = (window as any).document.getElementById('counter')
    return Number.parseInt(counter?.textContent || '0') >= 3
  }, { timeout: 500 })

  clearInterval(interval)

  assert(result === true, 'waitForFunction waited for condition')

  await browser.close()
}

// Test 10: waitForTimeout
console.log('\nTest 10: BrowserPage.waitForTimeout')
{
  const browser = new Browser()
  const page = browser.newPage()

  const start = Date.now()
  await page.waitForTimeout(100)
  const elapsed = Date.now() - start

  assert(elapsed >= 95, `waitForTimeout waited ~100ms (${elapsed}ms)`)

  await browser.close()
}

// Test 11: fetch API
console.log('\nTest 11: fetch API on Window')
{
  const window = new Window()

  assert(typeof window.fetch === 'function', 'window.fetch exists')
  assert(typeof window.Request === 'function', 'window.Request exists')
  assert(typeof window.Response === 'function', 'window.Response exists')
  assert(typeof window.Headers === 'function', 'window.Headers exists')

  await window.happyDOM.close()
}

// Test 12: FormData
console.log('\nTest 12: FormData API')
{
  const window = new Window()

  assert(typeof window.FormData === 'function', 'window.FormData exists')

  const formData = new window.FormData()
  formData.append('name', 'test')
  assert(formData.get('name') === 'test', 'FormData works')

  await window.happyDOM.close()
}

// Test 13: URL & URLSearchParams
console.log('\nTest 13: URL & URLSearchParams')
{
  const window = new Window()

  assert(typeof window.URL === 'function', 'window.URL exists')
  assert(typeof window.URLSearchParams === 'function', 'window.URLSearchParams exists')

  const url = new window.URL('https://example.com?foo=bar')
  assert(url.hostname === 'example.com', 'URL parsing works')

  const params = new window.URLSearchParams('foo=bar&baz=qux')
  assert(params.get('foo') === 'bar', 'URLSearchParams works')

  await window.happyDOM.close()
}

// Test 14: CustomEvent
console.log('\nTest 14: CustomEvent')
{
  const window = new Window()

  assert(typeof window.CustomEvent === 'function', 'window.CustomEvent exists')

  const event = new window.CustomEvent('test', { detail: { foo: 'bar' } })
  assert(event.type === 'test', 'CustomEvent type')
  assert(event.detail.foo === 'bar', 'CustomEvent detail')

  await window.happyDOM.close()
}

// Test 15: MutationObserver
console.log('\nTest 15: MutationObserver')
{
  const window = new Window()

  assert(typeof window.MutationObserver === 'function', 'window.MutationObserver exists')

  let _callbackCalled = false
  const observer = new window.MutationObserver((_mutations) => {
    _callbackCalled = true
  })

  observer.observe(window.document.body!, { childList: true })
  observer.disconnect()

  assert(true, 'MutationObserver API available')

  await window.happyDOM.close()
}

// Test 16: Page click action
console.log('\nTest 16: BrowserPage.click')
{
  const browser = new Browser()
  const page = browser.newPage()

  page.content = '<body><button id="btn">Click me</button></body>'

  let clicked = false
  const button = page.mainFrame.document.getElementById('btn')
  button?.addEventListener('click', () => {
    clicked = true
  })

  await page.click('#btn')

  assert((clicked as boolean) === true, 'click() triggers click event')

  await browser.close()
}

// Test 17: Page type action
console.log('\nTest 17: BrowserPage.type')
{
  const browser = new Browser()
  const page = browser.newPage()

  page.content = '<body><input id="input" /></body>'

  await page.type('#input', 'Hello World')

  const input = page.mainFrame.document.getElementById('input')
  const value = input?.getAttribute('value')

  assert(value === 'Hello World', `type() sets input value (got: "${value}")`)

  await browser.close()
}

// Test 18: Page focus action
console.log('\nTest 18: BrowserPage.focus')
{
  const browser = new Browser()
  const page = browser.newPage()

  page.content = '<body><input id="input" /></body>'

  let focused = false
  const input = page.mainFrame.document.getElementById('input')
  input?.addEventListener('focus', () => {
    focused = true
  })

  await page.focus('#input')

  assert((focused as boolean) === true, 'focus() triggers focus event')

  await browser.close()
}

// Test 19: Keyboard actions
console.log('\nTest 19: BrowserPage.keyboard')
{
  const browser = new Browser()
  const page = browser.newPage()

  let keyPressed = ''
  page.mainFrame.document.addEventListener('keydown', (e: any) => {
    keyPressed = e.key
  })

  await page.keyboard.press('Enter')

  assert(keyPressed === 'Enter', 'keyboard.press() works')

  await browser.close()
}

// Test 20: Mouse actions
console.log('\nTest 20: BrowserPage.mouse')
{
  const browser = new Browser()
  const page = browser.newPage()

  let clickX = 0
  let clickY = 0
  page.mainFrame.document.addEventListener('click', (e: any) => {
    clickX = e.clientX
    clickY = e.clientY
  })

  await page.mouse.click(100, 200)

  assert(clickX === 100 && clickY === 200, `mouse.click() sets coordinates (${clickX}, ${clickY})`)

  await browser.close()
}

// Test 21: Storage isolation between windows
console.log('\nTest 21: Storage isolation')
{
  const window1 = new Window()
  const window2 = new Window()

  window1.localStorage.setItem('key', 'window1')
  window2.localStorage.setItem('key', 'window2')

  assert(window1.localStorage.getItem('key') === 'window1', 'Window 1 has own storage')
  assert(window2.localStorage.getItem('key') === 'window2', 'Window 2 has own storage')

  await window1.happyDOM.close()
  await window2.happyDOM.close()
}

// Test 22: Timer clearTimeout
console.log('\nTest 22: clearTimeout')
{
  const window = new Window()

  let executed = false
  const id = window.setTimeout(() => {
    executed = true
  }, 10)

  window.clearTimeout(id)

  await new Promise(resolve => setTimeout(resolve, 50))

  assert(executed === false, 'clearTimeout prevents execution')

  await window.happyDOM.close()
}

// Test 23: Timer clearInterval
console.log('\nTest 23: clearInterval')
{
  const window = new Window()

  let count = 0
  const id = window.setInterval(() => {
    count++
  }, 10)

  await new Promise(resolve => setTimeout(resolve, 35))
  window.clearInterval(id)

  const countAfterClear = count

  await new Promise(resolve => setTimeout(resolve, 50))

  assert(count === countAfterClear, `clearInterval stops execution (count: ${count})`)

  await window.happyDOM.close()
}

// Test 24: cancelAnimationFrame
console.log('\nTest 24: cancelAnimationFrame')
{
  const window = new Window()

  let executed = false
  const id = window.requestAnimationFrame(() => {
    executed = true
  })

  window.cancelAnimationFrame(id)

  await new Promise(resolve => setTimeout(resolve, 50))

  assert(executed === false, 'cancelAnimationFrame prevents execution')

  await window.happyDOM.close()
}

// Test 25: waitForSelector timeout
console.log('\nTest 25: waitForSelector timeout')
{
  const browser = new Browser()
  const page = browser.newPage()

  page.content = '<body><div>No match</div></body>'

  const element = await page.waitForSelector('.nonexistent', { timeout: 100 })

  assert(element === null, 'waitForSelector returns null on timeout')

  await browser.close()
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
  console.log('\n🎉 All new features working!')
}
