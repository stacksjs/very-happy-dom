/* eslint-disable no-console */
/**
 * Storage API Tests
 * Comprehensive tests for localStorage and sessionStorage
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

console.log('=== 💾 Storage API Test Suite ===\n')

// Test 1: localStorage basic operations
console.log('Test Group 1: localStorage - Basic Operations')
{
  const window = new Window()

  // setItem/getItem
  window.localStorage.setItem('key1', 'value1')
  assert(window.localStorage.getItem('key1') === 'value1', 'setItem/getItem works')

  // Overwrite existing
  window.localStorage.setItem('key1', 'newvalue')
  assert(window.localStorage.getItem('key1') === 'newvalue', 'Overwrite existing key')

  // Non-existent key
  assert(window.localStorage.getItem('nonexistent') === null, 'Non-existent key returns null')

  // Empty string value
  window.localStorage.setItem('empty', '')
  assert(window.localStorage.getItem('empty') === '', 'Empty string value stored')

  // Numeric value (stored as string)
  window.localStorage.setItem('number', '123')
  assert(window.localStorage.getItem('number') === '123', 'Numeric value stored as string')

  await window.happyDOM.close()
}

// Test 2: localStorage bracket notation
console.log('\nTest Group 2: localStorage - Bracket Notation')
{
  const window = new Window()

  window.localStorage.bracket1 = 'value1'
  assert(window.localStorage.bracket1 === 'value1', 'Bracket notation write/read')

  window.localStorage.bracket2 = 123
  assert(window.localStorage.bracket2 === '123', 'Bracket notation auto-converts to string')

  // Mixed access methods (avoid 'key' name which is a method)
  window.localStorage.setItem('mixed1', 'method')
  assert(window.localStorage.mixed1 === 'method', 'setItem accessible via bracket')

  window.localStorage.mixed2 = 'bracket'
  assert(window.localStorage.getItem('mixed2') === 'bracket', 'Bracket accessible via getItem')

  await window.happyDOM.close()
}

// Test 3: localStorage length and key()
console.log('\nTest Group 3: localStorage - Length and Key Access')
{
  const window = new Window()

  assert(window.localStorage.length === 0, 'Initial length is 0')

  window.localStorage.setItem('a', '1')
  window.localStorage.setItem('b', '2')
  window.localStorage.setItem('c', '3')

  assert(window.localStorage.length === 3, 'Length reflects item count')

  const key0 = window.localStorage.key(0)
  const key1 = window.localStorage.key(1)
  const key2 = window.localStorage.key(2)

  assert(key0 !== null && key1 !== null && key2 !== null, 'key() returns keys')
  assert(['a', 'b', 'c'].includes(key0!), 'key(0) is valid')
  assert(['a', 'b', 'c'].includes(key1!), 'key(1) is valid')
  assert(['a', 'b', 'c'].includes(key2!), 'key(2) is valid')

  assert(window.localStorage.key(3) === null, 'key() out of bounds returns null')
  assert(window.localStorage.key(-1) === null, 'key() negative index returns null')

  await window.happyDOM.close()
}

// Test 4: localStorage removeItem
console.log('\nTest Group 4: localStorage - Remove Operations')
{
  const window = new Window()

  window.localStorage.setItem('remove1', 'value')
  window.localStorage.setItem('remove2', 'value')
  window.localStorage.setItem('keep', 'value')

  assert(window.localStorage.length === 3, 'Initial count is 3')

  window.localStorage.removeItem('remove1')
  assert(window.localStorage.getItem('remove1') === null, 'Removed item returns null')
  assert(window.localStorage.length === 2, 'Length decreased by 1')

  // Remove non-existent (should not error)
  window.localStorage.removeItem('nonexistent')
  assert(window.localStorage.length === 2, 'Remove non-existent does not change length')

  // Remove same key twice
  window.localStorage.removeItem('remove2')
  window.localStorage.removeItem('remove2')
  assert(window.localStorage.length === 1, 'Remove same key twice works')
  assert(window.localStorage.getItem('keep') === 'value', 'Other items unaffected')

  await window.happyDOM.close()
}

// Test 5: localStorage clear()
console.log('\nTest Group 5: localStorage - Clear Operations')
{
  const window = new Window()

  window.localStorage.setItem('clear1', 'v1')
  window.localStorage.setItem('clear2', 'v2')
  window.localStorage.setItem('clear3', 'v3')

  assert(window.localStorage.length === 3, 'Has 3 items before clear')

  window.localStorage.clear()

  assert(window.localStorage.length === 0, 'Length is 0 after clear')
  assert(window.localStorage.getItem('clear1') === null, 'Item 1 cleared')
  assert(window.localStorage.getItem('clear2') === null, 'Item 2 cleared')
  assert(window.localStorage.getItem('clear3') === null, 'Item 3 cleared')

  // Clear on empty storage
  window.localStorage.clear()
  assert(window.localStorage.length === 0, 'Clear on empty storage works')

  await window.happyDOM.close()
}

// Test 6: sessionStorage basic operations
console.log('\nTest Group 6: sessionStorage - Basic Operations')
{
  const window = new Window()

  window.sessionStorage.setItem('session1', 'data1')
  assert(window.sessionStorage.getItem('session1') === 'data1', 'sessionStorage setItem/getItem')

  window.sessionStorage.session2 = 'data2'
  assert(window.sessionStorage.session2 === 'data2', 'sessionStorage bracket notation')

  assert(window.sessionStorage.length === 2, 'sessionStorage length')

  window.sessionStorage.removeItem('session1')
  assert(window.sessionStorage.getItem('session1') === null, 'sessionStorage removeItem')

  window.sessionStorage.clear()
  assert(window.sessionStorage.length === 0, 'sessionStorage clear')

  await window.happyDOM.close()
}

// Test 7: localStorage/sessionStorage isolation
console.log('\nTest Group 7: Storage - Isolation Between Types')
{
  const window = new Window()

  window.localStorage.setItem('shared', 'local')
  window.sessionStorage.setItem('shared', 'session')

  assert(window.localStorage.getItem('shared') === 'local', 'localStorage has own value')
  assert(window.sessionStorage.getItem('shared') === 'session', 'sessionStorage has own value')

  assert(window.localStorage !== window.sessionStorage, 'Storage instances are different')

  window.localStorage.clear()
  assert(window.sessionStorage.length === 1, 'Clearing localStorage does not affect sessionStorage')

  await window.happyDOM.close()
}

// Test 8: Storage isolation between windows
console.log('\nTest Group 8: Storage - Isolation Between Windows')
{
  const window1 = new Window()
  const window2 = new Window()

  window1.localStorage.setItem('isolated', 'window1')
  window2.localStorage.setItem('isolated', 'window2')

  assert(window1.localStorage.getItem('isolated') === 'window1', 'Window 1 localStorage isolated')
  assert(window2.localStorage.getItem('isolated') === 'window2', 'Window 2 localStorage isolated')

  window1.sessionStorage.setItem('session', 'w1')
  window2.sessionStorage.setItem('session', 'w2')

  assert(window1.sessionStorage.getItem('session') === 'w1', 'Window 1 sessionStorage isolated')
  assert(window2.sessionStorage.getItem('session') === 'w2', 'Window 2 sessionStorage isolated')

  await window1.happyDOM.close()
  await window2.happyDOM.close()
}

// Test 9: Storage with special characters
console.log('\nTest Group 9: Storage - Special Characters')
{
  const window = new Window()

  // Unicode
  window.localStorage.setItem('unicode', '你好世界 🌍')
  assert(window.localStorage.getItem('unicode') === '你好世界 🌍', 'Unicode characters stored')

  // Special chars in key
  window.localStorage.setItem('key-with-dash', 'value')
  window.localStorage.setItem('key_with_underscore', 'value')
  window.localStorage.setItem('key.with.dot', 'value')
  assert(window.localStorage.getItem('key-with-dash') === 'value', 'Dash in key')
  assert(window.localStorage.getItem('key_with_underscore') === 'value', 'Underscore in key')
  assert(window.localStorage.getItem('key.with.dot') === 'value', 'Dot in key')

  // JSON strings
  const obj = { foo: 'bar', num: 123 }
  window.localStorage.setItem('json', JSON.stringify(obj))
  const retrieved = JSON.parse(window.localStorage.getItem('json')!)
  assert(retrieved.foo === 'bar' && retrieved.num === 123, 'JSON serialization works')

  await window.happyDOM.close()
}

// Test 10: Storage edge cases
console.log('\nTest Group 10: Storage - Edge Cases')
{
  const window = new Window()

  // Very long value
  const longValue = 'x'.repeat(10000)
  window.localStorage.setItem('long', longValue)
  assert(window.localStorage.getItem('long')?.length === 10000, 'Long value stored')

  // Empty key
  window.localStorage.setItem('', 'empty-key-value')
  assert(window.localStorage.getItem('') === 'empty-key-value', 'Empty string key works')

  // Null/undefined converted to string
  window.localStorage.setItem('null-test', 'null' as any)
  assert(window.localStorage.getItem('null-test') === 'null', 'Null converted to string')

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
  console.log('\n🎉 All storage tests passing!')
}
