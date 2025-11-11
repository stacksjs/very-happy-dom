/* eslint-disable no-console */
/**
 * Selector Engine Tests
 * Comprehensive tests for CSS selector matching
 */

import { cleanupWindow, createAssert, createTestWindow, TestStats } from './test-utils'

const stats = new TestStats()
const assert = createAssert(stats)

console.log('=== 🎯 Selector Engine Test Suite ===\n')

// Test 1: Basic tag selectors
console.log('Test Group 1: Tag Selectors')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div>Div 1</div>
    <div>Div 2</div>
    <span>Span 1</span>
    <p>Paragraph</p>
  `

  const divs = window.document.querySelectorAll('div')
  assert(divs.length === 2, 'querySelectorAll finds all divs')

  const span = window.document.querySelector('span')
  assert(span !== null && span.textContent === 'Span 1', 'querySelector finds first span')

  const p = window.document.querySelector('p')
  assert(p !== null && p.textContent === 'Paragraph', 'querySelector finds paragraph')

  await cleanupWindow(window)
}

// Test 2: ID selectors
console.log('\nTest Group 2: ID Selectors')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div id="main">Main</div>
    <div id="sidebar">Sidebar</div>
    <span id="header-title">Title</span>
  `

  const main = window.document.querySelector('#main')
  assert(main !== null && main.textContent === 'Main', '#main selector works')

  const sidebar = window.document.querySelector('#sidebar')
  assert(sidebar !== null && sidebar.textContent === 'Sidebar', '#sidebar selector works')

  const title = window.document.querySelector('#header-title')
  assert(title !== null && title.textContent === 'Title', '#header-title selector works')

  await cleanupWindow(window)
}

// Test 3: Class selectors
console.log('\nTest Group 3: Class Selectors')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div class="container">Container 1</div>
    <div class="container">Container 2</div>
    <span class="highlight">Highlight</span>
    <p class="text-primary">Primary text</p>
  `

  const containers = window.document.querySelectorAll('.container')
  assert(containers.length === 2, '.container finds 2 elements')

  const highlight = window.document.querySelector('.highlight')
  assert(highlight !== null && highlight.textContent === 'Highlight', '.highlight selector works')

  const primary = window.document.querySelector('.text-primary')
  assert(primary !== null, '.text-primary selector works')

  await cleanupWindow(window)
}

// Test 4: Multiple class selectors
console.log('\nTest Group 4: Multiple Class Selectors')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div class="btn">Button</div>
    <div class="btn primary">Primary Button</div>
    <div class="btn primary active">Active Primary</div>
    <div class="primary">Just Primary</div>
  `

  const btnPrimary = window.document.querySelectorAll('.btn.primary')
  assert(btnPrimary.length === 2, '.btn.primary finds 2 elements')

  const btnPrimaryActive = window.document.querySelectorAll('.btn.primary.active')
  assert(btnPrimaryActive.length === 1, '.btn.primary.active finds 1 element')
  assert(btnPrimaryActive[0].textContent === 'Active Primary', 'Correct element found')

  await cleanupWindow(window)
}

// Test 5: Universal selector
console.log('\nTest Group 5: Universal Selector')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div>Div</div>
    <span>Span</span>
    <p>Paragraph</p>
  `

  const all = window.document.querySelectorAll('*')
  assert(all.length >= 3, '* selector finds all elements')

  await cleanupWindow(window)
}

// Test 6: Attribute selectors - existence
console.log('\nTest Group 6: Attribute Selectors - Existence')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <input type="text" />
    <input type="email" />
    <div data-id="123">With data-id</div>
    <div>Without data-id</div>
  `

  const withType = window.document.querySelectorAll('[type]')
  assert(withType.length === 2, '[type] finds elements with type attribute')

  const withDataId = window.document.querySelectorAll('[data-id]')
  assert(withDataId.length === 1, '[data-id] finds elements with data-id')

  await cleanupWindow(window)
}

// Test 7: Attribute selectors - exact match
console.log('\nTest Group 7: Attribute Selectors - Exact Match')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <input type="text" />
    <input type="email" />
    <input type="password" />
  `

  const textInputs = window.document.querySelectorAll('[type="text"]')
  assert(textInputs.length === 1, '[type="text"] finds exact match')

  const emailInputs = window.document.querySelectorAll('[type="email"]')
  assert(emailInputs.length === 1, '[type="email"] finds exact match')

  await cleanupWindow(window)
}

// Test 8: Attribute selectors - starts with
console.log('\nTest Group 8: Attribute Selectors - Starts With')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div class="btn-primary">Primary</div>
    <div class="btn-secondary">Secondary</div>
    <div class="button">Button</div>
  `

  const btnElements = window.document.querySelectorAll('[class^="btn"]')
  assert(btnElements.length === 2, '[class^="btn"] finds elements starting with btn')

  await cleanupWindow(window)
}

// Test 9: Attribute selectors - ends with
console.log('\nTest Group 9: Attribute Selectors - Ends With')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <a href="file.pdf">PDF</a>
    <a href="image.jpg">Image</a>
    <a href="document.pdf">Document</a>
  `

  const pdfLinks = window.document.querySelectorAll('[href$=".pdf"]')
  assert(pdfLinks.length === 2, '[href$=".pdf"] finds links ending with .pdf')

  await cleanupWindow(window)
}

// Test 10: Attribute selectors - contains
console.log('\nTest Group 10: Attribute Selectors - Contains')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div class="user-profile-card">Profile</div>
    <div class="admin-profile-view">Admin</div>
    <div class="settings">Settings</div>
  `

  const profileElements = window.document.querySelectorAll('[class*="profile"]')
  assert(profileElements.length === 2, '[class*="profile"] finds elements containing profile')

  await cleanupWindow(window)
}

// Test 11: Attribute selectors - word match
console.log('\nTest Group 11: Attribute Selectors - Word Match')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div class="btn primary active">Active Primary</div>
    <div class="btn primary">Primary</div>
    <div class="btn-primary">Hyphenated</div>
  `

  const primaryWord = window.document.querySelectorAll('[class~="primary"]')
  assert(primaryWord.length === 2, '[class~="primary"] finds elements with "primary" as word')

  await cleanupWindow(window)
}

// Test 12: Descendant combinator
console.log('\nTest Group 12: Descendant Combinator')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div class="parent">
      <span>Direct child</span>
      <div>
        <span>Nested child</span>
      </div>
    </div>
    <span>Outside</span>
  `

  const descendantSpans = window.document.querySelectorAll('.parent span')
  assert(descendantSpans.length === 2, 'Descendant combinator finds all nested spans')

  await cleanupWindow(window)
}

// Test 13: Child combinator
console.log('\nTest Group 13: Child Combinator')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div class="parent">
      <span>Direct child</span>
      <div>
        <span>Nested child</span>
      </div>
    </div>
  `

  const directChildren = window.document.querySelectorAll('.parent > span')
  assert(directChildren.length === 1, 'Child combinator finds only direct children')
  assert(directChildren[0].textContent === 'Direct child', 'Correct direct child found')

  await cleanupWindow(window)
}

// Test 14: Adjacent sibling combinator
console.log('\nTest Group 14: Adjacent Sibling Combinator')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div>
      <h1>Title</h1>
      <p>First paragraph</p>
      <p>Second paragraph</p>
      <span>Span</span>
    </div>
  `

  const adjacentP = window.document.querySelectorAll('h1 + p')
  assert(adjacentP.length === 1, 'Adjacent sibling finds immediate next sibling')
  assert(adjacentP[0].textContent === 'First paragraph', 'Correct adjacent sibling')

  const adjacentSpan = window.document.querySelectorAll('p + span')
  assert(adjacentSpan.length === 1, 'p + span finds span after p')

  await cleanupWindow(window)
}

// Test 15: General sibling combinator
console.log('\nTest Group 15: General Sibling Combinator')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div>
      <h1>Title</h1>
      <p>Paragraph 1</p>
      <span>Span</span>
      <p>Paragraph 2</p>
      <p>Paragraph 3</p>
    </div>
  `

  const siblingPs = window.document.querySelectorAll('h1 ~ p')
  assert(siblingPs.length === 3, 'General sibling finds all following siblings')

  await cleanupWindow(window)
}

// Test 16: :first-child pseudo-class
console.log('\nTest Group 16: :first-child Pseudo-class')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <ul>
      <li>First</li>
      <li>Second</li>
      <li>Third</li>
    </ul>
  `

  const firstChild = window.document.querySelector('li:first-child')
  assert(firstChild !== null && firstChild.textContent === 'First', ':first-child works')

  await cleanupWindow(window)
}

// Test 17: :last-child pseudo-class
console.log('\nTest Group 17: :last-child Pseudo-class')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <ul>
      <li>First</li>
      <li>Second</li>
      <li>Third</li>
    </ul>
  `

  const lastChild = window.document.querySelector('li:last-child')
  assert(lastChild !== null && lastChild.textContent === 'Third', ':last-child works')

  await cleanupWindow(window)
}

// Test 18: :nth-child pseudo-class
console.log('\nTest Group 18: :nth-child Pseudo-class')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <ul>
      <li>Item 1</li>
      <li>Item 2</li>
      <li>Item 3</li>
      <li>Item 4</li>
      <li>Item 5</li>
    </ul>
  `

  const secondChild = window.document.querySelector('li:nth-child(2)')
  assert(secondChild !== null && secondChild.textContent === 'Item 2', ':nth-child(2) works')

  const oddChildren = window.document.querySelectorAll('li:nth-child(odd)')
  assert(oddChildren.length === 3, ':nth-child(odd) finds 3 items')

  const evenChildren = window.document.querySelectorAll('li:nth-child(even)')
  assert(evenChildren.length === 2, ':nth-child(even) finds 2 items')

  await cleanupWindow(window)
}

// Test 19: :not pseudo-class
console.log('\nTest Group 19: :not Pseudo-class')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div class="item active">Active</div>
    <div class="item">Normal 1</div>
    <div class="item">Normal 2</div>
    <div class="item disabled">Disabled</div>
  `

  const notActive = window.document.querySelectorAll('.item:not(.active)')
  assert(notActive.length === 3, ':not(.active) finds 3 items')

  const notDisabled = window.document.querySelectorAll('.item:not(.disabled)')
  assert(notDisabled.length === 3, ':not(.disabled) finds 3 items')

  await cleanupWindow(window)
}

// Test 20: :disabled and :enabled pseudo-classes
console.log('\nTest Group 20: :disabled and :enabled Pseudo-classes')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <input type="text" />
    <input type="text" disabled />
    <button>Enabled</button>
    <button disabled>Disabled</button>
  `

  const disabled = window.document.querySelectorAll(':disabled')
  assert(disabled.length === 2, ':disabled finds 2 elements')

  const enabled = window.document.querySelectorAll('input:enabled')
  assert(enabled.length === 1, ':enabled finds 1 input')

  await cleanupWindow(window)
}

// Test 21: :checked pseudo-class
console.log('\nTest Group 21: :checked Pseudo-class')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <input type="checkbox" />
    <input type="checkbox" checked />
    <input type="radio" />
    <input type="radio" checked />
  `

  const checked = window.document.querySelectorAll(':checked')
  assert(checked.length === 2, ':checked finds 2 elements')

  await cleanupWindow(window)
}

// Test 22: :empty pseudo-class
console.log('\nTest Group 22: :empty Pseudo-class')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div></div>
    <div>Not empty</div>
    <span></span>
    <p>Content</p>
  `

  // Query from body to exclude the empty head element
  const empty = window.document.body!.querySelectorAll(':empty')
  assert(empty.length === 2, ':empty finds 2 empty elements')

  await cleanupWindow(window)
}

// Test 23: Complex selector combinations
console.log('\nTest Group 23: Complex Selector Combinations')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div class="container">
      <div class="item active" data-id="1">Item 1</div>
      <div class="item" data-id="2">Item 2</div>
      <div class="item active" data-id="3">Item 3</div>
    </div>
  `

  const complex = window.document.querySelectorAll('.container .item.active[data-id]')
  assert(complex.length === 2, 'Complex selector with class + class + attribute works')

  const complex2 = window.document.querySelector('.container > .item:not(.active)')
  assert(complex2 !== null && complex2.textContent === 'Item 2', 'Complex with child combinator + :not() works')

  await cleanupWindow(window)
}

// Test 24: Tag + ID + class combination
console.log('\nTest Group 24: Tag + ID + Class Combination')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div id="main" class="container">Main Container</div>
    <span id="main" class="container">Span with same ID/class</span>
    <div id="other" class="container">Other Container</div>
  `

  const specific = window.document.querySelector('div#main.container')
  assert(specific !== null && specific.textContent === 'Main Container', 'div#main.container works')

  await cleanupWindow(window)
}

// Test 25: Multiple selectors (comma-separated)
console.log('\nTest Group 25: Multiple Selectors')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <h1>Heading</h1>
    <h2>Subheading</h2>
    <p>Paragraph</p>
    <div>Div</div>
  `

  const headings = window.document.querySelectorAll('h1, h2, p')
  assert(headings.length === 3, 'Multiple selectors with comma work')

  await cleanupWindow(window)
}

// Test 26: Nested combinators
console.log('\nTest Group 26: Nested Combinators')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div class="outer">
      <div class="middle">
        <div class="inner">
          <span>Target</span>
        </div>
      </div>
    </div>
  `

  const nested = window.document.querySelector('.outer .middle .inner span')
  assert(nested !== null && nested.textContent === 'Target', 'Multiple descendant combinators work')

  const childNested = window.document.querySelector('.outer > .middle > .inner > span')
  assert(childNested !== null && childNested.textContent === 'Target', 'Multiple child combinators work')

  await cleanupWindow(window)
}

// Test 27: Selector with pseudo-class and combinator
console.log('\nTest Group 27: Pseudo-class with Combinators')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <ul class="menu">
      <li>First</li>
      <li class="active">Second</li>
      <li>Third</li>
    </ul>
  `

  const firstInMenu = window.document.querySelector('.menu > li:first-child')
  assert(firstInMenu !== null && firstInMenu.textContent === 'First', '.menu > li:first-child works')

  const notActive = window.document.querySelectorAll('.menu > li:not(.active)')
  assert(notActive.length === 2, '.menu > li:not(.active) finds 2 items')

  await cleanupWindow(window)
}

// Test 28: Attribute + pseudo-class combination
console.log('\nTest Group 28: Attribute + Pseudo-class Combination')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <input type="text" disabled />
    <input type="email" />
    <input type="password" disabled />
  `

  const disabledInputs = window.document.querySelectorAll('input[type]:disabled')
  assert(disabledInputs.length === 2, 'input[type]:disabled finds 2 elements')

  const enabledText = window.document.querySelectorAll('input[type="email"]:enabled')
  assert(enabledText.length === 1, 'input[type="email"]:enabled finds 1 element')

  await cleanupWindow(window)
}

// Test 29: Case insensitivity
console.log('\nTest Group 29: Case Insensitivity')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <DIV class="test">Uppercase tag</DIV>
    <Span CLASS="highlight">Mixed case</Span>
  `

  const divs = window.document.querySelectorAll('div')
  assert(divs.length === 1, 'Lowercase tag selector matches uppercase tag')

  const spans = window.document.querySelectorAll('SPAN')
  assert(spans.length === 1, 'Uppercase tag selector matches mixed case tag')

  const classed = window.document.querySelectorAll('.test')
  assert(classed.length === 1, 'Class selector works regardless of attribute case')

  await cleanupWindow(window)
}

// Test 30: Empty results
console.log('\nTest Group 30: Empty Results')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `<div>Content</div>`

  const notFound = window.document.querySelector('.nonexistent')
  assert(notFound === null, 'querySelector returns null for non-matching selector')

  const notFoundAll = window.document.querySelectorAll('.nonexistent')
  assert(notFoundAll.length === 0, 'querySelectorAll returns empty array for non-matching')

  await cleanupWindow(window)
}

// Test 31: Sibling combinator edge cases
console.log('\nTest Group 31: Sibling Combinator Edge Cases')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div>
      <p>P1</p>
      <div>Div between</div>
      <p>P2</p>
      <p>P3</p>
    </div>
  `

  const pAfterP = window.document.querySelectorAll('p + p')
  assert(pAfterP.length === 1, 'p + p finds only P3 (adjacent to P2)')

  const pSiblingP = window.document.querySelectorAll('p ~ p')
  assert(pSiblingP.length === 2, 'p ~ p finds P2 and P3')

  await cleanupWindow(window)
}

// Test 32: Complex :not() scenarios
console.log('\nTest Group 32: Complex :not() Scenarios')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div class="item active featured">Item 1</div>
    <div class="item active">Item 2</div>
    <div class="item featured">Item 3</div>
    <div class="item">Item 4</div>
  `

  const notActiveNotFeatured = window.document.querySelectorAll('.item:not(.active):not(.featured)')
  assert(notActiveNotFeatured.length === 1, ':not().not() combination works')
  assert(notActiveNotFeatured[0].textContent === 'Item 4', 'Correct item selected')

  await cleanupWindow(window)
}

// Test 33: matches() method
console.log('\nTest Group 33: matches() Method')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div class="container active" id="main">
      <span>Content</span>
    </div>
  `

  const div = window.document.querySelector('div')!
  assert(div.matches('.container'), 'matches() returns true for matching class')
  assert(div.matches('#main'), 'matches() returns true for matching ID')
  assert(div.matches('div.container.active'), 'matches() works with complex selector')
  assert(!div.matches('.nonexistent'), 'matches() returns false for non-matching')

  await cleanupWindow(window)
}

// Test 34: closest() method
console.log('\nTest Group 34: closest() Method')
{
  const window = createTestWindow()
  window.document.body!.innerHTML = `
    <div class="grandparent">
      <div class="parent">
        <span class="child">Target</span>
      </div>
    </div>
  `

  const span = window.document.querySelector('.child')!
  assert(span.closest('.child') === span, 'closest() returns self if matches')
  assert(span.closest('.parent')?.textContent?.includes('Target') ?? false, 'closest() finds parent')
  assert(span.closest('.grandparent') !== null, 'closest() finds grandparent')
  assert(span.closest('.nonexistent') === null, 'closest() returns null if not found')

  await cleanupWindow(window)
}

// Test 35: Performance with many elements
console.log('\nTest Group 35: Performance with Many Elements')
{
  const window = createTestWindow()

  // Create 100 elements
  let html = '<div class="container">'
  for (let i = 0; i < 100; i++) {
    html += `<div class="item ${i % 2 === 0 ? 'even' : 'odd'}" data-index="${i}">Item ${i}</div>`
  }
  html += '</div>'
  window.document.body!.innerHTML = html

  const startTime = performance.now()
  const evens = window.document.querySelectorAll('.item.even')
  const queryTime = performance.now() - startTime

  assert(evens.length === 50, 'Query finds all 50 even items')
  assert(queryTime < 10, 'Query completes in < 10ms')

  // Complex query performance
  const startComplex = performance.now()
  const complex = window.document.querySelectorAll('.container > .item[data-index]:not(.odd)')
  const complexTime = performance.now() - startComplex

  assert(complex.length === 50, 'Complex query finds correct items')
  assert(complexTime < 20, 'Complex query completes in < 20ms')

  await cleanupWindow(window)
}

stats.printSummary()
stats.exit()
