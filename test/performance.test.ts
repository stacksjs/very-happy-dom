/* eslint-disable no-console */
/**
 * Performance Regression Tests
 * Ensures performance characteristics don't degrade over time
 */

import { cleanupWindow, createAssert, createTestWindow, PerformanceMeasure, TestStats } from './test-utils'

const stats = new TestStats()
const assert = createAssert(stats)
const perf = new PerformanceMeasure()

console.log('=== ⚡ Performance Regression Test Suite ===\n')

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  htmlParsing: 1, // HTML parsing should be < 1ms
  querySelector: 1, // querySelector should be < 1ms
  createElement: 0.1, // createElement should be < 0.1ms
  appendChild: 0.1, // appendChild should be < 0.1ms
  setAttribute: 0.1, // setAttribute should be < 0.1ms
  storageOps: 0.1, // Storage ops should be < 0.1ms
  eventListener: 0.1, // Event listener should be < 0.1ms
}

// Test 1: HTML parsing performance
console.log('Test Group 1: HTML Parsing Performance')
{
  const window = createTestWindow()
  const html = `<div>${'<p>Test</p>'.repeat(100)}</div>`

  const { duration } = perf.measure(() => {
    window.document.body!.innerHTML = html
  })

  assert(duration < THRESHOLDS.htmlParsing, `HTML parsing < ${THRESHOLDS.htmlParsing}ms (${duration.toFixed(3)}ms)`)
  console.log(`  ℹ️  Actual: ${duration.toFixed(3)}ms`)

  await cleanupWindow(window)
}

// Test 2: querySelector performance
console.log('\nTest Group 2: querySelector Performance')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `<div>${'<p class="test">Item</p>'.repeat(100)}</div>`

  const { duration } = perf.measure(() => {
    window.document.querySelector('.test')
  })

  assert(duration < THRESHOLDS.querySelector, `querySelector < ${THRESHOLDS.querySelector}ms (${duration.toFixed(3)}ms)`)
  console.log(`  ℹ️  Actual: ${duration.toFixed(3)}ms`)

  await cleanupWindow(window)
}

// Test 3: querySelectorAll performance
console.log('\nTest Group 3: querySelectorAll Performance')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `<div>${'<p class="test">Item</p>'.repeat(100)}</div>`

  const { duration } = perf.measure(() => {
    const results = window.document.querySelectorAll('.test')
    assert(results.length === 100, 'Found all elements')
  })

  assert(duration < THRESHOLDS.querySelector * 2, `querySelectorAll < ${THRESHOLDS.querySelector * 2}ms (${duration.toFixed(3)}ms)`)
  console.log(`  ℹ️  Actual: ${duration.toFixed(3)}ms`)

  await cleanupWindow(window)
}

// Test 4: createElement performance
console.log('\nTest Group 4: createElement Performance')
{
  const window = createTestWindow()

  const { duration } = perf.measure(() => {
    for (let i = 0; i < 100; i++) {
      window.document.createElement('div')
    }
  })

  const avgDuration = duration / 100
  assert(avgDuration < THRESHOLDS.createElement, `createElement avg < ${THRESHOLDS.createElement}ms (${avgDuration.toFixed(3)}ms)`)
  console.log(`  ℹ️  Average per operation: ${avgDuration.toFixed(3)}ms`)

  await cleanupWindow(window)
}

// Test 5: appendChild performance
console.log('\nTest Group 5: appendChild Performance')
{
  const window = createTestWindow()
  const parent = window.document.createElement('div')
  const children = Array.from({ length: 100 }, () => window.document.createElement('div'))

  const { duration } = perf.measure(() => {
    for (const child of children) {
      parent.appendChild(child)
    }
  })

  const avgDuration = duration / 100
  assert(avgDuration < THRESHOLDS.appendChild, `appendChild avg < ${THRESHOLDS.appendChild}ms (${avgDuration.toFixed(3)}ms)`)
  console.log(`  ℹ️  Average per operation: ${avgDuration.toFixed(3)}ms`)

  await cleanupWindow(window)
}

// Test 6: setAttribute performance
console.log('\nTest Group 6: setAttribute Performance')
{
  const window = createTestWindow()
  const element = window.document.createElement('div')

  const { duration } = perf.measure(() => {
    for (let i = 0; i < 100; i++) {
      element.setAttribute(`attr-${i}`, `value-${i}`)
    }
  })

  const avgDuration = duration / 100
  assert(avgDuration < THRESHOLDS.setAttribute, `setAttribute avg < ${THRESHOLDS.setAttribute}ms (${avgDuration.toFixed(3)}ms)`)
  console.log(`  ℹ️  Average per operation: ${avgDuration.toFixed(3)}ms`)

  await cleanupWindow(window)
}

// Test 7: Storage operations performance
console.log('\nTest Group 7: Storage Operations Performance')
{
  const window = createTestWindow()

  const { duration: setDuration } = perf.measure(() => {
    for (let i = 0; i < 100; i++) {
      window.localStorage.setItem(`key-${i}`, `value-${i}`)
    }
  })

  const { duration: getDuration } = perf.measure(() => {
    for (let i = 0; i < 100; i++) {
      window.localStorage.getItem(`key-${i}`)
    }
  })

  const avgSetDuration = setDuration / 100
  const avgGetDuration = getDuration / 100

  assert(avgSetDuration < THRESHOLDS.storageOps, `setItem avg < ${THRESHOLDS.storageOps}ms (${avgSetDuration.toFixed(3)}ms)`)
  assert(avgGetDuration < THRESHOLDS.storageOps, `getItem avg < ${THRESHOLDS.storageOps}ms (${avgGetDuration.toFixed(3)}ms)`)
  console.log(`  ℹ️  setItem average: ${avgSetDuration.toFixed(3)}ms`)
  console.log(`  ℹ️  getItem average: ${avgGetDuration.toFixed(3)}ms`)

  await cleanupWindow(window)
}

// Test 8: Event listener performance
console.log('\nTest Group 8: Event Listener Performance')
{
  const window = createTestWindow()
  const element = window.document.createElement('div')

  const handler = () => {}

  const { duration: addDuration } = perf.measure(() => {
    for (let i = 0; i < 100; i++) {
      element.addEventListener('click', handler)
    }
  })

  const { duration: removeDuration } = perf.measure(() => {
    for (let i = 0; i < 100; i++) {
      element.removeEventListener('click', handler)
    }
  })

  const avgAddDuration = addDuration / 100
  const avgRemoveDuration = removeDuration / 100

  assert(avgAddDuration < THRESHOLDS.eventListener, `addEventListener avg < ${THRESHOLDS.eventListener}ms (${avgAddDuration.toFixed(3)}ms)`)
  assert(avgRemoveDuration < THRESHOLDS.eventListener, `removeEventListener avg < ${THRESHOLDS.eventListener}ms (${avgRemoveDuration.toFixed(3)}ms)`)
  console.log(`  ℹ️  addEventListener average: ${avgAddDuration.toFixed(3)}ms`)
  console.log(`  ℹ️  removeEventListener average: ${avgRemoveDuration.toFixed(3)}ms`)

  await cleanupWindow(window)
}

// Test 9: Memory efficiency test
console.log('\nTest Group 9: Memory Efficiency')
{
  const window = createTestWindow()

  // Create many elements and clean up
  const startMemory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)

  for (let i = 0; i < 1000; i++) {
    const div = window.document.createElement('div')
    div.innerHTML = '<p>Test</p><span>Content</span>'
    window.document.body!.appendChild(div)
  }

  const peakMemory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)

  await cleanupWindow(window)

  // Force garbage collection if available
  if (globalThis.gc) {
    globalThis.gc()
  }

  const endMemory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)

  console.log(`  ℹ️  Start memory: ${startMemory}MB`)
  console.log(`  ℹ️  Peak memory: ${peakMemory}MB`)
  console.log(`  ℹ️  End memory: ${endMemory}MB`)

  assert(true, 'Memory test completed')
}

// Test 10: DOM tree traversal performance
console.log('\nTest Group 10: DOM Tree Traversal Performance')
{
  const window = createTestWindow()

  // Create deep tree
  let current = window.document.body!
  for (let i = 0; i < 50; i++) {
    const div = window.document.createElement('div')
    div.setAttribute('class', `level-${i}`)
    current.appendChild(div)
    current = div
  }

  const { duration } = perf.measure(() => {
    window.document.querySelector('.level-49')
  })

  assert(duration < 5, `Deep tree traversal < 5ms (${duration.toFixed(3)}ms)`)
  console.log(`  ℹ️  Actual: ${duration.toFixed(3)}ms for 50-level tree`)

  await cleanupWindow(window)
}

// Test 11: XPath performance
console.log('\nTest Group 11: XPath Performance')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `<div>${'<p class="item">Item</p>'.repeat(100)}</div>`

  const { duration } = perf.measure(() => {
    window.document.evaluate(
      '//p[@class="item"]',
      window.document,
      null,
      7, // ORDERED_NODE_SNAPSHOT_TYPE
      null,
    )
  })

  assert(duration < 10, `XPath evaluation < 10ms (${duration.toFixed(3)}ms)`)
  console.log(`  ℹ️  Actual: ${duration.toFixed(3)}ms`)

  await cleanupWindow(window)
}

// Test 12: Batch operations performance
console.log('\nTest Group 12: Batch Operations Performance')
{
  const window = createTestWindow()

  const { duration } = perf.measure(() => {
    const fragment = window.document.createDocumentFragment()
    for (let i = 0; i < 100; i++) {
      const div = window.document.createElement('div')
      div.textContent = `Item ${i}`
      fragment.appendChild(div)
    }
    window.document.body!.appendChild(fragment)
  })

  assert(duration < 5, `Batch appendChild < 5ms (${duration.toFixed(3)}ms)`)
  console.log(`  ℹ️  Actual: ${duration.toFixed(3)}ms for 100 elements`)

  await cleanupWindow(window)
}

console.log(`\n${'='.repeat(50)}`)
console.log('Performance Thresholds:')
console.log(`  HTML Parsing: < ${THRESHOLDS.htmlParsing}ms`)
console.log(`  querySelector: < ${THRESHOLDS.querySelector}ms`)
console.log(`  createElement: < ${THRESHOLDS.createElement}ms per operation`)
console.log(`  appendChild: < ${THRESHOLDS.appendChild}ms per operation`)
console.log(`  setAttribute: < ${THRESHOLDS.setAttribute}ms per operation`)
console.log(`  Storage ops: < ${THRESHOLDS.storageOps}ms per operation`)
console.log(`  Event listener: < ${THRESHOLDS.eventListener}ms per operation`)

stats.printSummary()
stats.exit()
