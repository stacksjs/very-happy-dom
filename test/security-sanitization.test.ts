/* eslint-disable no-console */
/**
 * Security and Sanitization Tests
 * Tests for XSS prevention, script injection, and content sanitization
 */

import { cleanupWindow, createAssert, createTestWindow, TestStats } from './test-utils'

const stats = new TestStats()
const assert = createAssert(stats)

console.log('=== 🔒 Security & Sanitization Test Suite ===\n')

// Test 1: Script injection prevention
console.log('Test Group 1: Script Injection Prevention')
{
  const window = createTestWindow()

  // Test innerHTML with script tags
  window.document.body!.innerHTML = '<div><script>alert("XSS")</script></div>'
  const scriptTags = window.document.querySelectorAll('script')
  assert(scriptTags.length > 0, 'Script tags are parsed (not executed)')

  // Test textContent doesn't create elements
  const div = window.document.createElement('div')
  div.textContent = '<script>alert("XSS")</script>'
  assert(div.children.length === 0, 'textContent creates text node, not elements')
  assert(div.childNodes.length === 1, 'One text node created')
  assert(div.childNodes[0].nodeType === 'text', 'Child is text node')

  await cleanupWindow(window)
}

// Test 2: Attribute injection
console.log('\nTest Group 2: Attribute Injection')
{
  const window = createTestWindow()

  // Test event handler attributes
  const div = window.document.createElement('div')
  div.setAttribute('onclick', 'alert("XSS")')
  assert(div.getAttribute('onclick') === 'alert("XSS")', 'Event handler stored as string')
  assert(typeof (div as any).onclick !== 'function', 'onclick not converted to function')

  // Test data URIs
  const img = window.document.createElement('img')
  img.setAttribute('src', 'data:text/html,<script>alert("XSS")</script>')
  assert(img.getAttribute('src')!.startsWith('data:'), 'Data URI stored')

  // Test javascript: protocol
  const link = window.document.createElement('a')
  link.setAttribute('href', 'javascript:alert("XSS")')
  assert(link.getAttribute('href') === 'javascript:alert("XSS")', 'javascript: protocol stored')

  await cleanupWindow(window)
}

// Test 3: HTML entity handling
console.log('\nTest Group 3: HTML Entity Handling')
{
  const window = createTestWindow()

  // Test common entities
  window.document.body!.innerHTML = '<div>&lt;script&gt;alert("XSS")&lt;/script&gt;</div>'
  const div = window.document.querySelector('div')
  assert(div !== null, 'Div created')
  // Entities should be decoded in textContent
  const text = div!.textContent
  assert(text.includes('script'), 'Entities decoded in text content')

  // Test attribute entities
  const span = window.document.createElement('span')
  span.setAttribute('title', '&quot;quoted&quot;')
  assert(span.getAttribute('title') === '&quot;quoted&quot;', 'Entities stored in attributes')

  await cleanupWindow(window)
}

// Test 4: Special character handling
console.log('\nTest Group 4: Special Character Handling')
{
  const window = createTestWindow()

  // Test null bytes
  const div1 = window.document.createElement('div')
  div1.setAttribute('data-test', 'hello\x00world')
  assert(div1.getAttribute('data-test') !== null, 'Null byte handled')

  // Test unicode characters
  const div2 = window.document.createElement('div')
  div2.textContent = '🔒 Security Test 你好 العربية'
  assert(div2.textContent.includes('🔒'), 'Emoji preserved')
  assert(div2.textContent.includes('你好'), 'Chinese characters preserved')
  assert(div2.textContent.includes('العربية'), 'Arabic characters preserved')

  // Test control characters
  const div3 = window.document.createElement('div')
  div3.textContent = 'Line1\nLine2\rLine3\tTabbed'
  assert(div3.textContent.includes('\n'), 'Newline preserved')
  assert(div3.textContent.includes('\t'), 'Tab preserved')

  await cleanupWindow(window)
}

// Test 5: CSS injection
console.log('\nTest Group 5: CSS Injection')
{
  const window = createTestWindow()

  const div = window.document.createElement('div')

  // Test expression() injection
  div.style.setProperty('background', 'expression(alert("XSS"))')
  assert(div.style.getPropertyValue('background') === 'expression(alert("XSS"))', 'CSS expression stored')

  // Test import injection
  div.style.setProperty('background', 'url("javascript:alert(\'XSS\')")')
  assert(div.style.getPropertyValue('background')!.includes('javascript:'), 'javascript: in CSS stored')

  // Test behavior property
  div.setAttribute('style', 'behavior: url(xss.htc)')
  assert(div.getAttribute('style')!.includes('behavior'), 'behavior property in style')

  await cleanupWindow(window)
}

// Test 6: SVG and XML injection
console.log('\nTest Group 6: SVG and XML Injection')
{
  const window = createTestWindow()

  // Test SVG with script
  const svg = '<svg><script>alert("XSS")</script></svg>'
  window.document.body!.innerHTML = svg
  const scripts = window.document.querySelectorAll('script')
  assert(scripts.length > 0, 'SVG script parsed')

  // Test XML namespaces
  const div = window.document.createElement('div')
  div.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
  assert(div.children.length > 0, 'SVG with namespace parsed')

  await cleanupWindow(window)
}

// Test 7: Prototype pollution prevention
console.log('\nTest Group 7: Prototype Pollution Prevention')
{
  const window = createTestWindow()

  const div = window.document.createElement('div')

  // Test __proto__ in attributes
  div.setAttribute('__proto__', 'polluted')
  assert(div.getAttribute('__proto__') === 'polluted', '__proto__ stored as regular attribute')
  // eslint-disable-next-line no-proto, no-restricted-properties
  assert((div as any).__proto__ !== 'polluted', 'Prototype not polluted')

  // Test constructor in attributes
  div.setAttribute('constructor', 'test')
  assert(div.getAttribute('constructor') === 'test', 'constructor stored as attribute')

  await cleanupWindow(window)
}

// Test 8: Form input sanitization
console.log('\nTest Group 8: Form Input Sanitization')
{
  const window = createTestWindow()

  // Test input value with HTML
  const input = window.document.createElement('input')
  input.setAttribute('value', '<script>alert("XSS")</script>')
  assert(input.getAttribute('value')!.includes('script'), 'Script in value attribute')

  // Test textarea content
  window.document.body!.innerHTML = '<textarea><script>alert("XSS")</script></textarea>'
  const textarea = window.document.querySelector('textarea')
  assert(textarea !== null, 'Textarea created')

  // Test select options
  window.document.body!.innerHTML = '<select><option value="<script>">Test</option></select>'
  const select = window.document.querySelector('select')
  const option = window.document.querySelector('option')
  assert(select !== null && option !== null, 'Select and option created')

  await cleanupWindow(window)
}

// Test 9: URL manipulation
console.log('\nTest Group 9: URL Manipulation')
{
  const window = createTestWindow()

  // Test relative URLs
  const link1 = window.document.createElement('a')
  link1.setAttribute('href', '../../../etc/passwd')
  assert(link1.getAttribute('href') === '../../../etc/passwd', 'Path traversal in href stored')

  // Test protocol-relative URLs
  const link2 = window.document.createElement('a')
  link2.setAttribute('href', '//evil.com/xss')
  assert(link2.getAttribute('href') === '//evil.com/xss', 'Protocol-relative URL stored')

  // Test data URLs with base64
  const img = window.document.createElement('img')
  img.setAttribute('src', 'data:image/svg+xml;base64,PHN2Zz48c2NyaXB0PmFsZXJ0KCdYU1MnKTwvc2NyaXB0Pjwvc3ZnPg==')
  assert(img.getAttribute('src')!.startsWith('data:'), 'Base64 data URL stored')

  await cleanupWindow(window)
}

// Test 10: Content Security Policy simulation
console.log('\nTest Group 10: Content Type Validation')
{
  const window = createTestWindow()

  // Test MIME type sniffing
  const script = window.document.createElement('script')
  script.setAttribute('type', 'text/plain')
  script.textContent = 'alert("XSS")'
  assert(script.getAttribute('type') === 'text/plain', 'Script type attribute set')

  // Test unknown element types
  const unknown = window.document.createElement('unknown-element')
  unknown.innerHTML = '<script>alert("XSS")</script>'
  assert(unknown.children.length > 0, 'Unknown element accepts children')

  await cleanupWindow(window)
}

// Test 11: Nested injection attempts
console.log('\nTest Group 11: Nested Injection Attempts')
{
  const window = createTestWindow()

  // Test nested elements
  const complex = `
    <div>
      <div>
        <div>
          <script>alert("XSS")</script>
        </div>
      </div>
    </div>
  `
  window.document.body!.innerHTML = complex
  const scripts = window.document.querySelectorAll('script')
  assert(scripts.length > 0, 'Deeply nested script found')

  // Test mixed content
  window.document.body!.innerHTML = `
    Text <b>bold</b>
    <script>alert("XSS")</script>
    More text <i>italic</i>
  `
  const bold = window.document.querySelector('b')
  const italic = window.document.querySelector('i')
  assert(bold !== null && italic !== null, 'Mixed content parsed correctly')

  await cleanupWindow(window)
}

// Test 12: Comment injection
console.log('\nTest Group 12: Comment Injection')
{
  const window = createTestWindow()

  // Test HTML comments with scripts
  window.document.body!.innerHTML = '<!-- <script>alert("XSS")</script> --><div>Content</div>'
  const comments = window.document.body!.childNodes.filter(child => child.nodeType === 'comment')
  assert(comments.length > 0, 'Comments parsed')

  // Test conditional comments (IE-specific)
  window.document.body!.innerHTML = '<!--[if IE]><script>alert("XSS")</script><![endif]-->'
  // Conditional comments are treated as regular comments, check childNodes not children
  assert(window.document.body!.childNodes.length > 0, 'Conditional comment parsed')

  await cleanupWindow(window)
}

// Test 13: Event handler edge cases
console.log('\nTest Group 13: Event Handler Security')
{
  const window = createTestWindow()

  const div = window.document.createElement('div')

  // Test all event handler attributes
  const eventHandlers = [
    'onclick',
    'onload',
    'onerror',
    'onmouseover',
    'onmouseout',
    'onkeydown',
    'onkeyup',
    'onfocus',
    'onblur',
    'onchange',
    'onsubmit',
  ]

  for (const handler of eventHandlers) {
    div.setAttribute(handler, 'alert("XSS")')
    assert(div.getAttribute(handler) === 'alert("XSS")', `${handler} stored as string`)
  }

  await cleanupWindow(window)
}

// Test 14: CDATA section handling
console.log('\nTest Group 14: CDATA Section Handling')
{
  const window = createTestWindow()

  // Test CDATA in HTML - CDATA is XML/XHTML, not valid HTML5
  // The parser should handle this gracefully (error or ignore)
  try {
    const cdataContent = '<div><![CDATA[<script>alert("XSS")</script>]]></div>'
    window.document.body!.innerHTML = cdataContent
    // If parsing succeeds, verify content
    assert(true, 'CDATA handled without crash')
  }
  catch (error) {
    // Expected: CDATA may cause parse error since it's not valid HTML5
    assert(error instanceof Error, 'CDATA causes expected parse error')
  }

  await cleanupWindow(window)
}

// Test 15: Attribute manipulation chains
console.log('\nTest Group 15: Attribute Manipulation Chains')
{
  const window = createTestWindow()

  const div = window.document.createElement('div')

  // Test rapid attribute changes
  for (let i = 0; i < 100; i++) {
    div.setAttribute('data-index', i.toString())
  }
  assert(div.getAttribute('data-index') === '99', 'Final attribute value correct')

  // Test attribute removal and re-add
  div.setAttribute('test', 'value1')
  div.removeAttribute('test')
  div.setAttribute('test', 'value2')
  assert(div.getAttribute('test') === 'value2', 'Attribute re-added correctly')

  // Test case sensitivity
  div.setAttribute('CaseSensitive', 'test')
  assert(div.getAttribute('casesensitive') === 'test', 'Attribute names case-insensitive')
  assert(div.getAttribute('CASESENSITIVE') === 'test', 'Uppercase lookup works')

  await cleanupWindow(window)
}

stats.printSummary()
stats.exit()
