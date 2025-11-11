/* eslint-disable no-console */
/**
 * Integration Tests
 * End-to-end scenarios combining multiple features
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

console.log('=== 🔗 Integration Test Suite ===\n')

// Test 1: Full browser workflow
console.log('Test Group 1: Browser - Complete Workflow')
{
  const browser = new Browser()
  const page = browser.newPage()

  assert(browser.contexts.length >= 0, 'Browser has contexts')
  assert(page.mainFrame !== null, 'Page has main frame')
  assert(typeof page.goto === 'function', 'Page has goto method')

  await browser.close()
}

// Test 2: DOM manipulation and querying
console.log('\nTest Group 2: DOM - Manipulation and Query')
{
  const window = new Window()

  window.document.body!.innerHTML = '<div id="app"><h1>Title</h1><p class="text">Content</p></div>'

  const app = window.document.getElementById('app')
  assert(app !== null, 'getElementById found app')

  const title = window.document.querySelector('h1')
  assert(title?.textContent === 'Title', 'querySelector found title')

  const text = window.document.querySelector('.text')
  assert(text?.textContent === 'Content', 'querySelector found text')

  const newElement = window.document.createElement('span')
  newElement.textContent = 'New'
  app?.appendChild(newElement)

  assert(app?.children.length === 3, 'appendChild added element')

  await window.happyDOM.close()
}

// Test 3: Events and DOM together
console.log('\nTest Group 3: Events - DOM Integration')
{
  const window = new Window()

  const button = window.document.createElement('button')
  button.textContent = 'Click me'
  window.document.body!.appendChild(button)

  let clicked = false
  button.addEventListener('click', () => {
    clicked = true
  })

  button.dispatchEvent(new window.CustomEvent('click'))

  assert((clicked as boolean) === true, 'Event listener triggered')
  assert(window.document.body!.children.length === 1, 'Button in DOM')

  await window.happyDOM.close()
}

// Test 4: Storage and timers together
console.log('\nTest Group 4: Storage - Timer Integration')
{
  const window = new Window()

  window.localStorage.setItem('test', 'value')

  let timerExecuted = false
  window.setTimeout(() => {
    timerExecuted = true
    const value = window.localStorage.getItem('test')
    assert(value === 'value', 'Timer accessed storage')
  }, 0)

  await window.happyDOM.waitUntilComplete()

  assert((timerExecuted as boolean) === true, 'Timer executed')

  await window.happyDOM.close()
}

// Test 5: XPath and DOM together
console.log('\nTest Group 5: XPath - DOM Integration')
{
  const window = new Window()

  window.document.body!.innerHTML = `
    <ul>
      <li>Item 1</li>
      <li class="active">Item 2</li>
      <li>Item 3</li>
    </ul>
  `

  const result = window.document.evaluate(
    '//li[@class="active"]',
    window.document,
    null,
    9, // FIRST_ORDERED_NODE_TYPE
    null,
  )

  assert(result.singleNodeValue !== null, 'XPath found active item')
  assert(result.singleNodeValue?.textContent?.includes('Item 2') ?? false, 'XPath found correct item')

  await window.happyDOM.close()
}

// Test 6: Shadow DOM and events
console.log('\nTest Group 6: Shadow DOM - Event Integration')
{
  const window = new Window()

  const host = window.document.createElement('div')
  const shadow = host.attachShadow({ mode: 'open' })

  const button = window.document.createElement('button')
  button.textContent = 'Shadow button'
  shadow.appendChild(button)

  let clicked = false
  button.addEventListener('click', () => {
    clicked = true
  })

  button.dispatchEvent(new window.CustomEvent('click'))

  assert((clicked as boolean) === true, 'Shadow DOM event works')
  assert(shadow.querySelector('button') === button, 'Shadow querySelector works')

  await window.happyDOM.close()
}

// Test 7: Multiple windows
console.log('\nTest Group 7: Multiple Windows - Isolation')
{
  const window1 = new Window()
  const window2 = new Window()

  window1.localStorage.setItem('key', 'window1')
  window2.localStorage.setItem('key', 'window2')

  assert(window1.localStorage.getItem('key') === 'window1', 'Window 1 storage isolated')
  assert(window2.localStorage.getItem('key') === 'window2', 'Window 2 storage isolated')

  window1.document.body!.innerHTML = '<div>Window 1</div>'
  window2.document.body!.innerHTML = '<div>Window 2</div>'

  assert(window1.document.body!.innerHTML.includes('Window 1'), 'Window 1 DOM isolated')
  assert(window2.document.body!.innerHTML.includes('Window 2'), 'Window 2 DOM isolated')

  await window1.happyDOM.close()
  await window2.happyDOM.close()
}

// Test 8: Custom elements in real DOM
console.log('\nTest Group 8: Custom Elements - DOM Integration')
{
  const window = new Window()

  class MyComponent extends window.HTMLElement {
    connectedCallback() {
      this.innerHTML = '<p>Custom Component</p>'
    }
  }

  window.customElements.define('my-component', MyComponent as any)

  window.document.body!.innerHTML = '<my-component></my-component>'

  const component = window.document.querySelector('my-component')
  assert(component !== null, 'Custom element in DOM')

  await window.happyDOM.close()
}

// Test 9: Clipboard and DOM together
console.log('\nTest Group 9: Clipboard - DOM Integration')
{
  const window = new Window()

  const input = window.document.createElement('input')
  input.setAttribute('value', 'Copy me')
  window.document.body!.appendChild(input)

  await window.navigator.clipboard.writeText(input.getAttribute('value') || '')
  const copied = await window.navigator.clipboard.readText()

  assert(copied === 'Copy me', 'Clipboard copied input value')

  await window.happyDOM.close()
}

// Test 10: Complete app simulation
console.log('\nTest Group 10: Complete App - Simulation')
{
  const window = new Window()

  // Create app structure
  window.document.body!.innerHTML = `
    <div id="app">
      <h1>Todo App</h1>
      <input id="input" type="text" />
      <button id="add">Add</button>
      <ul id="list"></ul>
    </div>
  `

  // Get elements
  const input = window.document.getElementById('input')
  const button = window.document.getElementById('add')
  const list = window.document.getElementById('list')

  assert(input !== null && button !== null && list !== null, 'All elements found')

  // Add click handler
  button?.addEventListener('click', () => {
    const li = window.document.createElement('li')
    li.textContent = input?.getAttribute('value') || ''
    list?.appendChild(li)
  })

  // Simulate user input
  input?.setAttribute('value', 'Buy milk')
  button?.dispatchEvent(new window.CustomEvent('click'))

  assert((list?.children.length as number) === 1, 'Todo item added')
  assert(list?.children[0]?.textContent === 'Buy milk', 'Todo text correct')

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
  console.log('\n🎉 All integration tests passing!')
}
