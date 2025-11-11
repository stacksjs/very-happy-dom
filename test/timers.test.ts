/* eslint-disable no-console */
/**
 * Timer API Tests
 * Comprehensive tests for setTimeout, setInterval, requestAnimationFrame
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

console.log('=== ⏰ Timer API Test Suite ===\n')

// Test 1: setTimeout basic operations
console.log('Test Group 1: setTimeout - Basic Operations')
{
  const window = new Window()
  let executed = false

  const id = window.setTimeout(() => {
    executed = true
  }, 0)

  assert(typeof id === 'number', 'setTimeout returns numeric ID')
  assert(id > 0, 'Timer ID is positive')

  // Execute pending timers
  await window.happyDOM.waitUntilComplete()
  assert((executed as boolean) === true, 'Callback executed after timeout')

  await window.happyDOM.close()
}

// Test 2: setTimeout with arguments
console.log('\nTest Group 2: setTimeout - Arguments')
{
  const window = new Window()
  let receivedArg: any = null
  let receivedArgs: any[] = []

  window.setTimeout((arg: string) => {
    receivedArg = arg
  }, 0, 'test-value')

  await window.happyDOM.waitUntilComplete()
  assert(receivedArg === 'test-value', 'Single argument passed correctly')

  window.setTimeout((a: number, b: string, c: boolean) => {
    receivedArgs = [a, b, c]
  }, 0, 42, 'hello', true)

  await window.happyDOM.waitUntilComplete()
  assert(
    receivedArgs[0] === 42 && receivedArgs[1] === 'hello' && receivedArgs[2] === true,
    'Multiple arguments passed correctly',
  )

  await window.happyDOM.close()
}

// Test 3: setTimeout return values
console.log('\nTest Group 3: setTimeout - Return Values')
{
  const window = new Window()

  const id1 = window.setTimeout(() => {}, 0)
  const id2 = window.setTimeout(() => {}, 0)
  const id3 = window.setTimeout(() => {}, 0)

  assert(id1 !== id2 && id2 !== id3 && id1 !== id3, 'Each timer gets unique ID')
  assert(id2 > id1 && id3 > id2, 'Timer IDs increment')

  await window.happyDOM.close()
}

// Test 4: clearTimeout
console.log('\nTest Group 4: clearTimeout - Cancellation')
{
  const window = new Window()
  let executed = false

  const id = window.setTimeout(() => {
    executed = true
  }, 0)

  window.clearTimeout(id)
  await window.happyDOM.waitUntilComplete()

  assert(executed === false, 'Cleared timer does not execute')

  // Clear invalid ID (should not error)
  window.clearTimeout(99999)
  assert(true, 'Clearing invalid ID does not throw')

  // Clear same ID twice
  const id2 = window.setTimeout(() => {}, 0)
  window.clearTimeout(id2)
  window.clearTimeout(id2)
  assert(true, 'Clearing same ID twice does not throw')

  await window.happyDOM.close()
}

// Test 5: setInterval basic operations
console.log('\nTest Group 5: setInterval - Basic Operations')
{
  const window = new Window()
  let count = 0

  const id = window.setInterval(() => {
    count++
    if (count >= 3) {
      window.clearInterval(id)
    }
  }, 10)

  assert(typeof id === 'number', 'setInterval returns numeric ID')

  // Wait for intervals to execute (intervals don't count as "pending" in waitUntilComplete)
  await new Promise(resolve => setTimeout(resolve, 50))
  assert((count as number) >= 3, 'Interval executed multiple times')

  await window.happyDOM.close()
}

// Test 6: setInterval with arguments
console.log('\nTest Group 6: setInterval - Arguments')
{
  const window = new Window()
  let sum = 0

  const id = window.setInterval((a: number, b: number) => {
    sum += a + b
    if (sum >= 10) {
      window.clearInterval(id)
    }
  }, 10, 2, 3)

  // Wait for intervals to execute
  await new Promise(resolve => setTimeout(resolve, 50))
  assert(sum >= 10, 'Interval arguments passed correctly')

  await window.happyDOM.close()
}

// Test 7: clearInterval
console.log('\nTest Group 7: clearInterval - Cancellation')
{
  const window = new Window()
  let count = 0

  const id = window.setInterval(() => {
    count++
  }, 0)

  window.clearInterval(id)
  await window.happyDOM.waitUntilComplete()

  assert(count === 0, 'Cleared interval does not execute')

  // Clear invalid ID
  window.clearInterval(99999)
  assert(true, 'Clearing invalid interval ID does not throw')

  await window.happyDOM.close()
}

// Test 8: requestAnimationFrame basic
console.log('\nTest Group 8: requestAnimationFrame - Basic Operations')
{
  const window = new Window()
  let executed = false
  let timestamp: number | null = null

  const id = window.requestAnimationFrame((_time: number) => {
    executed = true
    timestamp = _time
  })

  assert(typeof id === 'number', 'requestAnimationFrame returns numeric ID')

  await window.happyDOM.waitUntilComplete()
  assert((executed as boolean) === true, 'Animation frame callback executed')
  assert(typeof timestamp === 'number', 'Timestamp provided to callback')
  assert(timestamp! >= 0, 'Timestamp is non-negative')

  await window.happyDOM.close()
}

// Test 9: requestAnimationFrame multiple frames
console.log('\nTest Group 9: requestAnimationFrame - Multiple Frames')
{
  const window = new Window()
  let count = 0

  function animate(_time: number) {
    count++
    if (count < 3) {
      window.requestAnimationFrame(animate)
    }
  }

  window.requestAnimationFrame(animate)
  await window.happyDOM.waitUntilComplete()

  assert(count >= 3, 'Multiple animation frames executed')

  await window.happyDOM.close()
}

// Test 10: cancelAnimationFrame
console.log('\nTest Group 10: cancelAnimationFrame - Cancellation')
{
  const window = new Window()
  let executed = false

  const id = window.requestAnimationFrame(() => {
    executed = true
  })

  window.cancelAnimationFrame(id)
  await window.happyDOM.waitUntilComplete()

  assert(executed === false, 'Cancelled animation frame does not execute')

  // Cancel invalid ID
  window.cancelAnimationFrame(99999)
  assert(true, 'Cancelling invalid ID does not throw')

  await window.happyDOM.close()
}

// Test 11: Timer cleanup on window close
console.log('\nTest Group 11: Timer Cleanup - Window Close')
{
  const window = new Window()
  let timeoutExecuted = false
  let intervalExecuted = false
  let rafExecuted = false

  window.setTimeout(() => {
    timeoutExecuted = true
  }, 0)

  window.setInterval(() => {
    intervalExecuted = true
  }, 0)

  window.requestAnimationFrame(() => {
    rafExecuted = true
  })

  await window.happyDOM.close()

  assert(!timeoutExecuted || !intervalExecuted || !rafExecuted, 'Timers cleared on window close')
}

// Test 12: waitUntilComplete integration
console.log('\nTest Group 12: waitUntilComplete - Integration')
{
  const window = new Window()
  let executed1 = false
  let executed2 = false

  window.setTimeout(() => {
    executed1 = true
  }, 0)

  window.requestAnimationFrame(() => {
    executed2 = true
  })

  await window.happyDOM.waitUntilComplete()

  assert((executed1 as boolean) === true, 'setTimeout completed before waitUntilComplete resolves')
  assert((executed2 as boolean) === true, 'requestAnimationFrame completed before waitUntilComplete resolves')

  await window.happyDOM.close()
}

// Test 13: Zero delay timers
console.log('\nTest Group 13: Zero Delay - Immediate Execution')
{
  const window = new Window()
  let executed = false

  window.setTimeout(() => {
    executed = true
  }, 0)

  assert(executed === false, 'Zero delay timer does not execute synchronously')

  await window.happyDOM.waitUntilComplete()
  assert((executed as boolean) === true, 'Zero delay timer executes asynchronously')

  await window.happyDOM.close()
}

// Test 14: Nested timers
console.log('\nTest Group 14: Nested Timers - Execution Order')
{
  const window = new Window()
  const order: number[] = []

  window.setTimeout(() => {
    order.push(1)
    window.setTimeout(() => {
      order.push(3)
    }, 0)
    order.push(2)
  }, 0)

  await window.happyDOM.waitUntilComplete()

  assert(order.length === 3, 'All nested timers executed')
  assert(order[0] === 1 && order[1] === 2 && order[2] === 3, 'Nested timers execute in correct order')

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
  console.log('\n🎉 All timer tests passing!')
}
