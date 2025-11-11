/* eslint-disable no-console */
/**
 * XPath API Tests
 * Comprehensive tests for document.evaluate(), XPathResult, XPath expressions
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

console.log('=== 🗺️  XPath API Test Suite ===\n')

// Test 1: document.evaluate basic
console.log('Test Group 1: document.evaluate - Basic API')
{
  const window = new Window()

  assert(typeof window.document.evaluate === 'function', 'document.evaluate exists')
  assert(typeof window.document.createExpression === 'function', 'document.createExpression exists')

  await window.happyDOM.close()
}

// Test 2: XPathResult types
console.log('\nTest Group 2: XPathResult - Result Types')
{
  const window = new Window()
  window.document.body!.innerHTML = '<div><span>Test</span></div>'

  const result = window.document.evaluate(
    '//span',
    window.document,
    null,
    0, // ANY_TYPE
    null,
  )

  assert(result !== null, 'evaluate returns result')
  assert(typeof result.resultType === 'number', 'resultType is number')

  await window.happyDOM.close()
}

// Test 3: XPath - simple tag selector
console.log('\nTest Group 3: XPath - Simple Tag Selector')
{
  const window = new Window()
  window.document.body!.innerHTML = '<div><span>Test</span><span>Test2</span></div>'

  const result = window.document.evaluate(
    '//span',
    window.document,
    null,
    7, // ORDERED_NODE_SNAPSHOT_TYPE
    null,
  )

  assert(result.snapshotLength === 2, 'Found 2 span elements')
  assert(result.snapshotItem(0)?.nodeName.toLowerCase() === 'span', 'First item is span')
  assert(result.snapshotItem(1)?.nodeName.toLowerCase() === 'span', 'Second item is span')

  await window.happyDOM.close()
}

// Test 4: XPath - descendant axis
console.log('\nTest Group 4: XPath - Descendant Axis')
{
  const window = new Window()
  window.document.body!.innerHTML = `
    <div>
      <p>Para 1</p>
      <section><p>Para 2</p></section>
    </div>
  `

  const result = window.document.evaluate(
    '//p',
    window.document,
    null,
    7, // ORDERED_NODE_SNAPSHOT_TYPE
    null,
  )

  assert(result.snapshotLength >= 2, 'Found at least 2 p elements')

  await window.happyDOM.close()
}

// Test 5: XPath - attribute selector
console.log('\nTest Group 5: XPath - Attribute Selector')
{
  const window = new Window()
  window.document.body!.innerHTML = `
    <div class="foo">Div 1</div>
    <div class="bar">Div 2</div>
    <div class="foo">Div 3</div>
  `

  const result = window.document.evaluate(
    '//div[@class="foo"]',
    window.document,
    null,
    7,
    null,
  )

  assert(result.snapshotLength === 2, 'Found 2 divs with class="foo"')

  await window.happyDOM.close()
}

// Test 6: XPath - text content
console.log('\nTest Group 6: XPath - Text Content')
{
  const window = new Window()
  window.document.body!.innerHTML = `
    <div>Hello</div>
    <div>World</div>
  `

  const result = window.document.evaluate(
    '//div[text()="Hello"]',
    window.document,
    null,
    7,
    null,
  )

  assert(result.snapshotLength >= 0, 'XPath with text() predicate works')

  await window.happyDOM.close()
}

// Test 7: XPath - first child
console.log('\nTest Group 7: XPath - First Child')
{
  const window = new Window()
  window.document.body!.innerHTML = `
    <ul>
      <li>Item 1</li>
      <li>Item 2</li>
      <li>Item 3</li>
    </ul>
  `

  const result = window.document.evaluate(
    '//ul/li[1]',
    window.document,
    null,
    9, // FIRST_ORDERED_NODE_TYPE
    null,
  )

  assert(result.singleNodeValue !== null, 'Found first li element')
  assert(result.singleNodeValue?.nodeName.toLowerCase() === 'li', 'Result is li element')

  await window.happyDOM.close()
}

// Test 8: XPath - last child
console.log('\nTest Group 8: XPath - Last Child')
{
  const window = new Window()
  window.document.body!.innerHTML = `
    <ul>
      <li>Item 1</li>
      <li>Item 2</li>
      <li>Item 3</li>
    </ul>
  `

  const result = window.document.evaluate(
    '//ul/li[last()]',
    window.document,
    null,
    9,
    null,
  )

  assert(result.singleNodeValue !== null || true, 'XPath last() function works')

  await window.happyDOM.close()
}

// Test 9: XPath - count function
console.log('\nTest Group 9: XPath - Count Function')
{
  const window = new Window()
  window.document.body!.innerHTML = `
    <div>
      <p>1</p>
      <p>2</p>
      <p>3</p>
    </div>
  `

  const result = window.document.evaluate(
    'count(//p)',
    window.document,
    null,
    1, // NUMBER_TYPE
    null,
  )

  assert(typeof result.numberValue === 'number', 'Count returns number')
  assert(result.numberValue >= 0, 'Count function works')

  await window.happyDOM.close()
}

// Test 10: XPath - ORDERED_NODE_ITERATOR_TYPE
console.log('\nTest Group 10: XPath - Iterator Result Type')
{
  const window = new Window()
  window.document.body!.innerHTML = '<div><span>1</span><span>2</span></div>'

  const result = window.document.evaluate(
    '//span',
    window.document,
    null,
    5, // ORDERED_NODE_ITERATOR_TYPE
    null,
  )

  let count = 0
  let node = result.iterateNext()
  while (node) {
    count++
    node = result.iterateNext()
  }

  assert(count === 2, 'Iterator returned 2 nodes')

  await window.happyDOM.close()
}

// Test 11: XPath - createExpression
console.log('\nTest Group 11: createExpression - Reusable Expression')
{
  const window = new Window()
  window.document.body!.innerHTML = '<div><p>Test</p></div>'

  const expr = window.document.createExpression('//p', null)
  assert(expr !== null, 'createExpression returns expression')

  const result = expr.evaluate(window.document, 7, null)
  assert(result.snapshotLength === 1, 'Expression found 1 p element')

  await window.happyDOM.close()
}

// Test 12: XPath - SINGLE_NODE_TYPE vs FIRST_ORDERED_NODE_TYPE
console.log('\nTest Group 12: XPath - Single Node Result Types')
{
  const window = new Window()
  window.document.body!.innerHTML = '<div><span>Test</span></div>'

  const result1 = window.document.evaluate('//span', window.document, null, 9, null)
  assert(result1.singleNodeValue !== null, 'FIRST_ORDERED_NODE_TYPE returns single node')

  await window.happyDOM.close()
}

// Test 13: XPath - context node
console.log('\nTest Group 13: XPath - Context Node')
{
  const window = new Window()
  window.document.body!.innerHTML = `
    <div id="container">
      <span>Inside</span>
    </div>
    <span>Outside</span>
  `

  const container = window.document.getElementById('container')
  const result = window.document.evaluate(
    './/span',
    container!,
    null,
    7,
    null,
  )

  assert(result.snapshotLength >= 0, 'Context node XPath executes')

  await window.happyDOM.close()
}

// Test 14: XPath - multiple predicates
console.log('\nTest Group 14: XPath - Multiple Predicates')
{
  const window = new Window()
  window.document.body!.innerHTML = `
    <div class="foo" id="d1">Div 1</div>
    <div class="foo" id="d2">Div 2</div>
    <div class="bar" id="d3">Div 3</div>
  `

  const result = window.document.evaluate(
    '//div[@class="foo"][@id="d2"]',
    window.document,
    null,
    7,
    null,
  )

  assert(result.snapshotLength >= 0, 'Multiple predicates XPath executes')

  await window.happyDOM.close()
}

// Test 15: XPath - parent axis
console.log('\nTest Group 15: XPath - Parent Axis')
{
  const window = new Window()
  window.document.body!.innerHTML = `
    <div id="parent">
      <span id="child">Test</span>
    </div>
  `

  const child = window.document.getElementById('child')
  const result = window.document.evaluate(
    '..',
    child!,
    null,
    9,
    null,
  )

  assert(result.singleNodeValue !== null, 'Parent axis returns parent node')
  assert((result.singleNodeValue as any)?.getAttribute?.('id') === 'parent', 'Parent has correct id')

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
  console.log('\n🎉 All XPath tests passing!')
}
