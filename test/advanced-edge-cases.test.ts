/* eslint-disable no-console */
/**
 * Advanced Edge Cases Tests
 * Additional tests for complex scenarios and edge cases
 */

import { cleanupWindow, createAssert, createTestBrowser, createTestWindow, TestStats } from './test-utils'

const stats = new TestStats()
const assert = createAssert(stats)

console.log('=== 🔬 Advanced Edge Cases Test Suite ===\n')

// Test 1: Deeply nested selectors
console.log('Test Group 1: Complex Selector Combinations')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div class="container">
      <div class="item active">Item 1</div>
      <div class="item">Item 2</div>
      <div class="item disabled">Item 3</div>
    </div>
  `

  // Combining multiple pseudo-classes
  const result1 = window.document.querySelector('.item:not(.active):not(.disabled)')
  assert(result1 !== null, 'Complex :not() combinations work')
  assert((result1?.textContent?.includes('Item 2')) as boolean, 'Correct element selected')

  // :first-child with class
  const result2 = window.document.querySelector('.item:first-child')
  assert((result2?.textContent?.includes('Item 1')) as boolean, ':first-child with class works')

  await cleanupWindow(window)
}

// Test 2: Self-closing tags in various contexts
console.log('\nTest Group 2: Self-Closing Tags Edge Cases')
{
  const window = createTestWindow()

  const img = window.document.createElement('img')
  img.setAttribute('src', 'test.jpg')
  img.setAttribute('alt', 'Test Image')

  const html = img.outerHTML
  assert(html.includes('/>'), 'Self-closing tag uses />')
  assert(!html.includes('</img>'), 'No closing tag for img')
  assert(html.includes('src="test.jpg"'), 'Attributes preserved')
  assert(html.includes('alt="Test Image"'), 'Multiple attributes work')

  // Test br tag
  const br = window.document.createElement('br')
  assert(br.outerHTML === '<br/>', 'BR tag is self-closing')

  // Test input tag
  const input = window.document.createElement('input')
  input.setAttribute('type', 'text')
  assert(input.outerHTML.includes('/>'), 'Input is self-closing')

  await cleanupWindow(window)
}

// Test 3: Style object edge cases
console.log('\nTest Group 3: Style Object Advanced Operations')
{
  const window = createTestWindow()
  const div = window.document.createElement('div')

  // Set multiple styles
  div.style.color = 'red'
  div.style.backgroundColor = 'blue'
  div.style.fontSize = '16px'

  assert(div.style.color === 'red', 'Color style set')
  assert(div.style.backgroundColor === 'blue', 'Background color set')
  assert(div.style.fontSize === '16px', 'Font size set')

  // Remove one style
  div.style.removeProperty('color')
  assert(div.style.color === undefined, 'Removed property returns undefined')
  assert(div.style.backgroundColor === 'blue', 'Other styles preserved')

  // Check style attribute
  const styleAttr = div.getAttribute('style')
  assert(styleAttr !== null, 'Style attribute exists')
  assert(styleAttr!.includes('background-color'), 'Contains background-color')
  assert(!styleAttr!.match(/(^|\s)color:/), 'Removed color property not in attribute')

  await cleanupWindow(window)
}

// Test 4: Computed styles with inheritance
console.log('\nTest Group 4: Computed Styles Advanced')
{
  const window = createTestWindow()

  // Test default display values
  const div = window.document.createElement('div')
  const span = window.document.createElement('span')
  const script = window.document.createElement('script')
  const table = window.document.createElement('table')

  const divStyle = window.document.getComputedStyle(div)
  const spanStyle = window.document.getComputedStyle(span)
  const scriptStyle = window.document.getComputedStyle(script)
  const tableStyle = window.document.getComputedStyle(table)

  assert(divStyle.display === 'block', 'Div default display is block')
  assert(spanStyle.display === 'inline', 'Span default display is inline')
  assert(scriptStyle.display === 'none', 'Script default display is none')
  assert(tableStyle.display === 'table', 'Table default display is table')

  // Test inline styles override defaults
  div.style.display = 'flex'
  const divStyleAfter = window.document.getComputedStyle(div)
  assert(divStyleAfter.display === 'flex', 'Inline styles override defaults')

  await cleanupWindow(window)
}

// Test 5: Pseudo-class combinations
console.log('\nTest Group 5: Advanced Pseudo-Class Scenarios')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <ul>
      <li class="active">First</li>
      <li>Second</li>
      <li>Third</li>
      <li class="disabled">Fourth</li>
    </ul>
  `

  // :nth-child with odd/even
  const odds = window.document.querySelectorAll('li:nth-child(odd)')
  assert(odds.length === 2, 'Odd children found (1st and 3rd)')

  const evens = window.document.querySelectorAll('li:nth-child(even)')
  assert(evens.length === 2, 'Even children found (2nd and 4th)')

  // :last-child with :not()
  const lastNotDisabled = window.document.querySelector('li:last-child:not(.disabled)')
  assert(lastNotDisabled === null, 'Last child is disabled, so query returns null')

  // :first-child with :not()
  const firstNotActive = window.document.querySelector('li:first-child:not(.active)')
  assert(firstNotActive === null, 'First child is active, so query returns null')

  await cleanupWindow(window)
}

// Test 6: Complex DOM manipulation
console.log('\nTest Group 6: Complex DOM Manipulation')
{
  const window = createTestWindow()
  const parent = window.document.createElement('div')

  // Create and append multiple children
  for (let i = 0; i < 10; i++) {
    const child = window.document.createElement('span')
    child.textContent = `Item ${i}`
    child.setAttribute('data-index', i.toString())
    parent.appendChild(child)
  }

  assert(parent.children.length === 10, '10 children appended')

  // Remove every other child
  const childrenToRemove = []
  for (let i = 0; i < parent.children.length; i++) {
    if (i % 2 === 0) {
      childrenToRemove.push(parent.children[i])
    }
  }

  for (const child of childrenToRemove) {
    parent.removeChild(child)
  }

  assert(parent.children.length === 5, '5 children remain after removal')

  // Verify remaining children are odd indices
  const firstRemaining = parent.children[0] as any
  assert(firstRemaining.getAttribute('data-index') === '1', 'First remaining is index 1')

  await cleanupWindow(window)
}

// Test 7: Browser context edge cases
console.log('\nTest Group 7: Browser Context Operations')
{
  const browser = createTestBrowser()
  const page1 = browser.newPage()
  const page2 = browser.newPage()

  // Set different content in each page
  const doc1 = page1.mainFrame.window.document as any
  const doc2 = page2.mainFrame.window.document as any
  doc1.body!.innerHTML = '<h1>Page 1</h1>'
  doc2.body!.innerHTML = '<h1>Page 2</h1>'

  const h1Page1 = doc1.querySelector('h1')
  const h1Page2 = doc2.querySelector('h1')

  assert(h1Page1?.textContent === 'Page 1', 'Page 1 has correct content')
  assert(h1Page2?.textContent === 'Page 2', 'Page 2 has correct content')

  // Verify isolation
  assert(h1Page1 !== h1Page2, 'Pages are isolated')

  await browser.close()
}

// Test 8: Event propagation with multiple listeners
console.log('\nTest Group 8: Event Propagation Edge Cases')
{
  const window = createTestWindow()
  const parent = window.document.createElement('div')
  const child = window.document.createElement('button')
  parent.appendChild(child)

  let parentCaptureCount = 0
  let parentBubbleCount = 0
  let childCount = 0

  // Add capture phase listener to parent
  parent.addEventListener('click', () => {
    parentCaptureCount++
  }, { capture: true })

  // Add target phase listener to child
  child.addEventListener('click', () => {
    childCount++
  })

  // Add bubble phase listener to parent
  parent.addEventListener('click', () => {
    parentBubbleCount++
  }, { capture: false })

  // Dispatch event
  child.click()

  assert(childCount === 1, 'Child listener called once')
  assert(parentCaptureCount === 1, 'Parent capture listener called')
  assert(parentBubbleCount === 1, 'Parent bubble listener called')

  await cleanupWindow(window)
}

// Test 9: Memory-intensive operations
console.log('\nTest Group 9: Performance and Memory')
{
  const window = createTestWindow()

  // Create large DOM tree
  const container = window.document.createElement('div')
  for (let i = 0; i < 100; i++) {
    const item = window.document.createElement('div')
    item.setAttribute('class', i % 2 === 0 ? 'even' : 'odd')
    item.textContent = `Item ${i}`
    container.appendChild(item)
  }

  assert(container.children.length === 100, '100 elements created')

  // Query all even items
  const startTime = performance.now()
  const evens = container.querySelectorAll('.even')
  const queryTime = performance.now() - startTime

  assert(evens.length === 50, '50 even items found')
  assert(queryTime < 10, 'Query completes in < 10ms')

  await cleanupWindow(window)
}

// Test 10: XPath with complex expressions
console.log('\nTest Group 10: Advanced XPath Expressions')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div class="container">
      <p class="intro">Introduction</p>
      <p class="content">Content 1</p>
      <p class="content">Content 2</p>
      <p class="footer">Footer</p>
    </div>
  `

  // XPath with predicate
  const result1 = window.document.evaluate(
    '//p[@class="content"]',
    window.document,
    null,
    7, // ORDERED_NODE_SNAPSHOT_TYPE
    null,
  )

  assert(result1.snapshotLength === 2, 'XPath finds 2 content paragraphs')

  // XPath with multiple predicates
  const result2 = window.document.evaluate(
    '//p[@class]',
    window.document,
    null,
    7,
    null,
  )

  assert(result2.snapshotLength === 4, 'XPath finds all paragraphs with class attribute')

  // XPath descendant axis
  const result3 = window.document.evaluate(
    '//div//p',
    window.document,
    null,
    7,
    null,
  )

  assert(result3.snapshotLength === 4, 'XPath descendant axis works')

  await cleanupWindow(window)
}

stats.printSummary()
stats.exit()
