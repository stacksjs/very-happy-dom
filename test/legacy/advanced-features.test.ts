/* eslint-disable no-console */
/**
 * Tests for advanced features
 * Event Emitters, XPath, Observers, XMLHttpRequest, Screenshot/PDF
 */

import { Buffer } from 'node:buffer'
import { Browser, Window, XPathResultType } from '../../src/index'

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

console.log('=== 🚀 Advanced Features Test Suite ===\n')

// Test 1: Page Event Emitters
console.log('Test 1: BrowserPage Event Emitters')
{
  const browser = new Browser()
  const page = browser.newPage()

  let consoleEmitted = false
  let errorEmitted = false

  page.on('console', (event) => {
    consoleEmitted = true
    assert(event.type === 'log', 'Console event type is log')
  })

  page.on('error', (_error) => {
    errorEmitted = true
  })

  page._emitConsole('log', 'Hello from console')
  page._emitError(new Error('Test error'))

  assert((consoleEmitted as boolean) === true, 'Console event emitted')
  assert((errorEmitted as boolean) === true, 'Error event emitted')

  await browser.close()
}

// Test 2: virtualConsolePrinter
console.log('\nTest 2: virtualConsolePrinter')
{
  const browser = new Browser()
  const page = browser.newPage()

  let printerCalled = false
  let capturedType = ''
  let capturedArgs: any[] = []

  page.virtualConsolePrinter = (type, ...args) => {
    printerCalled = true
    capturedType = type
    capturedArgs = args
  }

  page._emitConsole('warn', 'Warning message', 123)

  assert((printerCalled as boolean) === true, 'virtualConsolePrinter called')
  assert(capturedType === 'warn', 'Captured correct type')
  assert(capturedArgs[0] === 'Warning message', 'Captured correct message')
  assert(capturedArgs[1] === 123, 'Captured correct number')

  await browser.close()
}

// Test 3: XPath - Simple element selection
console.log('\nTest 3: XPath - Simple element selection')
{
  const window = new Window()
  window.document.write('<html><body><div id="test"><span>Hello</span><span>World</span></div></body></html>')

  const result = window.document.evaluate('//span', window.document, null, XPathResultType.ORDERED_NODE_SNAPSHOT_TYPE, null)

  assert(result.snapshotLength === 2, `XPath found 2 spans (got ${result.snapshotLength})`)

  const firstSpan = result.snapshotItem(0)
  assert(firstSpan !== null, 'First span found')
  assert((firstSpan as any)?.tagName === 'SPAN', 'First item is SPAN')

  await window.happyDOM.close()
}

// Test 4: XPath - Attribute selector
console.log('\nTest 4: XPath - Attribute selector')
{
  const window = new Window()
  window.document.write('<html><body><div class="foo">Foo</div><div class="bar">Bar</div><div class="foo">Baz</div></body></html>')

  const result = window.document.evaluate('//div[@class="foo"]', window.document, null, XPathResultType.ORDERED_NODE_SNAPSHOT_TYPE, null)

  assert(result.snapshotLength === 2, `XPath found 2 divs with class="foo" (got ${result.snapshotLength})`)

  await window.happyDOM.close()
}

// Test 5: XPath - Iterator
console.log('\nTest 5: XPath - Iterator')
{
  const window = new Window()
  window.document.write('<html><body><p>1</p><p>2</p><p>3</p></body></html>')

  const result = window.document.evaluate('//p', window.document, null, XPathResultType.ORDERED_NODE_ITERATOR_TYPE, null)

  let count = 0
  let node = result.iterateNext()
  while (node) {
    count++
    node = result.iterateNext()
  }

  assert(count === 3, `XPath iterator found 3 paragraphs (got ${count})`)

  await window.happyDOM.close()
}

// Test 6: IntersectionObserver
console.log('\nTest 6: IntersectionObserver')
{
  const window = new Window()
  window.document.write('<html><body><div id="target">Target</div></body></html>')

  assert(typeof window.IntersectionObserver === 'function', 'IntersectionObserver exists')

  let observerCalled = false
  const observer = new window.IntersectionObserver((_entries) => {
    observerCalled = true
    assert(_entries.length === 1, 'Received 1 entry')
    assert(_entries[0].isIntersecting === true, 'Element is intersecting')
  })

  const target = window.document.getElementById('target')
  observer.observe(target as any)

  await new Promise(resolve => setTimeout(resolve, 10))

  assert((observerCalled as boolean) === true, 'IntersectionObserver callback called')

  observer.disconnect()
  await window.happyDOM.close()
}

// Test 7: ResizeObserver
console.log('\nTest 7: ResizeObserver')
{
  const window = new Window()
  window.document.write('<html><body><div id="resizable">Resize me</div></body></html>')

  assert(typeof window.ResizeObserver === 'function', 'ResizeObserver exists')

  let observerCalled = false
  const observer = new window.ResizeObserver((entries) => {
    observerCalled = true
    assert(entries.length === 1, 'Received 1 entry')
    assert(entries[0].contentRect !== null, 'Has contentRect')
    assert(entries[0].borderBoxSize.length > 0, 'Has borderBoxSize')
  })

  const target = window.document.getElementById('resizable')
  observer.observe(target as any)

  await new Promise(resolve => setTimeout(resolve, 10))

  assert((observerCalled as boolean) === true, 'ResizeObserver callback called')

  observer.disconnect()
  await window.happyDOM.close()
}

// Test 8: XMLHttpRequest - Basic request
console.log('\nTest 8: XMLHttpRequest - Basic request')
{
  const window = new Window()

  assert(typeof window.XMLHttpRequest === 'function', 'XMLHttpRequest exists')

  const xhr = new window.XMLHttpRequest()

  assert(xhr.readyState === window.XMLHttpRequest.UNSENT, 'Initial state is UNSENT')

  xhr.open('GET', 'https://httpbin.org/get')

  assert(xhr.readyState === window.XMLHttpRequest.OPENED, 'State is OPENED after open()')

  await window.happyDOM.close()
}

// Test 9: XMLHttpRequest - State transitions
console.log('\nTest 9: XMLHttpRequest - State transitions')
{
  const window = new Window()
  const xhr = new window.XMLHttpRequest()

  const states: number[] = []
  xhr.onreadystatechange = () => {
    states.push(xhr.readyState)
  }

  xhr.open('GET', 'https://httpbin.org/get')

  assert(states.includes(window.XMLHttpRequest.OPENED), 'OPENED state captured')

  await window.happyDOM.close()
}

// Test 10: Screenshot generation
console.log('\nTest 10: Screenshot generation')
{
  const browser = new Browser()
  const page = browser.newPage()

  page.content = '<html><body><h1>Screenshot Test</h1></body></html>'

  const screenshot = await page.screenshot({ encoding: 'base64', type: 'png' })

  assert(typeof screenshot === 'string', 'Screenshot returns string in base64 mode')
  assert(screenshot.length > 0, 'Screenshot has content')

  const binaryScreenshot = await page.screenshot({ encoding: 'binary' })

  assert(Buffer.isBuffer(binaryScreenshot), 'Screenshot returns Buffer in binary mode')

  await browser.close()
}

// Test 11: PDF generation
console.log('\nTest 11: PDF generation')
{
  const browser = new Browser()
  const page = browser.newPage()

  page.content = '<html><body><h1>PDF Test</h1></body></html>'

  const pdf = await page.pdf({ format: 'A4', landscape: false })

  assert(Buffer.isBuffer(pdf), 'PDF returns Buffer')
  assert(pdf.length > 0, 'PDF has content')

  const pdfString = pdf.toString()
  assert(pdfString.startsWith('%PDF'), 'PDF has correct header')

  await browser.close()
}

// Test 12: XPath createExpression
console.log('\nTest 12: XPath createExpression')
{
  const window = new Window()
  window.document.write('<html><body><article><p>Para 1</p><p>Para 2</p></article></body></html>')

  const expression = window.document.createExpression('//p', null)
  const result = expression.evaluate(window.document, XPathResultType.ORDERED_NODE_SNAPSHOT_TYPE)

  assert(result.snapshotLength === 2, `createExpression found 2 paragraphs (got ${result.snapshotLength})`)

  await window.happyDOM.close()
}

// Test 13: IntersectionObserver - Multiple targets
console.log('\nTest 13: IntersectionObserver - Multiple targets')
{
  const window = new Window()
  window.document.write('<html><body><div id="t1">Target 1</div><div id="t2">Target 2</div></body></html>')

  let callCount = 0
  const observer = new window.IntersectionObserver((_entries) => {
    callCount++
  })

  const t1 = window.document.getElementById('t1')
  const t2 = window.document.getElementById('t2')

  observer.observe(t1 as any)
  observer.observe(t2 as any)

  await new Promise(resolve => setTimeout(resolve, 20))

  assert(callCount === 2, `Observer called for each target (got ${callCount} calls)`)

  observer.disconnect()
  await window.happyDOM.close()
}

// Test 14: Event emitter - off()
console.log('\nTest 14: Event emitter - off()')
{
  const browser = new Browser()
  const page = browser.newPage()

  let count = 0
  const handler = () => {
    count++
  }

  page.on('console', handler)
  page._emitConsole('log', 'First')

  page.off('console', handler)
  page._emitConsole('log', 'Second')

  assert(count === 1, 'Handler only called once before off()')

  await browser.close()
}

// Test 15: XPath - descendant axis
console.log('\nTest 15: XPath - descendant axis')
{
  const window = new Window()
  window.document.write('<html><body><div><ul><li>A</li><li>B</li></ul></div></body></html>')

  const result = window.document.evaluate('//ul/li', window.document, null, XPathResultType.ORDERED_NODE_SNAPSHOT_TYPE, null)

  assert(result.snapshotLength === 2, `XPath found 2 li elements (got ${result.snapshotLength})`)

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
  console.log('\n🎉 All advanced features working!')
}
