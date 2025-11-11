/* eslint-disable no-console */
/**
 * Attribute and Property Handling Tests
 * Comprehensive tests for HTML attributes and DOM properties
 */

import { cleanupWindow, createAssert, createTestWindow, TestStats } from './test-utils'

const stats = new TestStats()
const assert = createAssert(stats)

console.log('=== 🏷️ Attribute & Property Test Suite ===\n')

// Test 1: Basic attribute operations
console.log('Test Group 1: Basic Attribute Operations')
{
  const window = createTestWindow()
  const div = window.document.createElement('div')

  // Set attribute
  div.setAttribute('id', 'test-id')
  assert(div.getAttribute('id') === 'test-id', 'setAttribute and getAttribute work')

  // Has attribute
  assert(div.hasAttribute('id'), 'hasAttribute returns true for set attribute')
  assert(!div.hasAttribute('class'), 'hasAttribute returns false for unset attribute')

  // Remove attribute
  div.removeAttribute('id')
  assert(!div.hasAttribute('id'), 'removeAttribute works')
  assert(div.getAttribute('id') === null, 'getAttribute returns null after removal')

  await cleanupWindow(window)
}

// Test 2: Attribute case sensitivity
console.log('\nTest Group 2: Attribute Case Sensitivity')
{
  const window = createTestWindow()
  const div = window.document.createElement('div')

  // HTML attributes are case-insensitive
  div.setAttribute('DataTest', 'value')
  assert(div.getAttribute('datatest') === 'value', 'getAttribute is case-insensitive')
  assert(div.getAttribute('DATATEST') === 'value', 'getAttribute works with uppercase')
  assert(div.hasAttribute('DaTaTeSt'), 'hasAttribute is case-insensitive')

  // Verify attribute is normalized to lowercase
  div.removeAttribute('DATATEST')
  assert(!div.hasAttribute('datatest'), 'removeAttribute is case-insensitive')

  await cleanupWindow(window)
}

// Test 3: Boolean attributes
console.log('\nTest Group 3: Boolean Attributes')
{
  const window = createTestWindow()
  const input = window.document.createElement('input')
  const select = window.document.createElement('select')

  // disabled attribute
  input.setAttribute('disabled', '')
  assert(input.hasAttribute('disabled'), 'Empty string sets boolean attribute')

  input.setAttribute('disabled', 'disabled')
  assert(input.hasAttribute('disabled'), 'Value "disabled" works')

  input.setAttribute('disabled', 'true')
  assert(input.hasAttribute('disabled'), 'Any value sets boolean attribute')

  // checked attribute
  input.setAttribute('type', 'checkbox')
  input.setAttribute('checked', '')
  assert(input.hasAttribute('checked'), 'checked attribute set')

  // readonly attribute
  input.setAttribute('readonly', '')
  assert(input.hasAttribute('readonly'), 'readonly attribute set')

  // required attribute
  input.setAttribute('required', '')
  assert(input.hasAttribute('required'), 'required attribute set')

  // autofocus attribute
  input.setAttribute('autofocus', '')
  assert(input.hasAttribute('autofocus'), 'autofocus attribute set')

  // multiple attribute
  select.setAttribute('multiple', '')
  assert(select.hasAttribute('multiple'), 'multiple attribute set')

  await cleanupWindow(window)
}

// Test 4: Data attributes
console.log('\nTest Group 4: Data Attributes')
{
  const window = createTestWindow()
  const div = window.document.createElement('div')

  // Set data attributes
  div.setAttribute('data-user-id', '123')
  div.setAttribute('data-role', 'admin')
  div.setAttribute('data-is-active', 'true')
  div.setAttribute('data-count', '42')

  assert(div.getAttribute('data-user-id') === '123', 'data-user-id attribute set')
  assert(div.getAttribute('data-role') === 'admin', 'data-role attribute set')
  assert(div.getAttribute('data-is-active') === 'true', 'data-is-active attribute set')
  assert(div.getAttribute('data-count') === '42', 'data-count attribute set')

  // data-* attributes with special characters
  div.setAttribute('data-complex-name', 'value-with-dashes')
  assert(div.getAttribute('data-complex-name') === 'value-with-dashes', 'Complex data attribute name works')

  await cleanupWindow(window)
}

// Test 5: ARIA attributes
console.log('\nTest Group 5: ARIA Attributes')
{
  const window = createTestWindow()
  const button = window.document.createElement('button')

  // Common ARIA attributes
  button.setAttribute('aria-label', 'Close dialog')
  button.setAttribute('aria-hidden', 'false')
  button.setAttribute('aria-disabled', 'true')
  button.setAttribute('aria-expanded', 'false')
  button.setAttribute('aria-haspopup', 'true')
  button.setAttribute('aria-controls', 'menu-1')
  button.setAttribute('aria-describedby', 'help-text')
  button.setAttribute('aria-labelledby', 'title')

  assert(button.getAttribute('aria-label') === 'Close dialog', 'aria-label set')
  assert(button.getAttribute('aria-hidden') === 'false', 'aria-hidden set')
  assert(button.getAttribute('aria-disabled') === 'true', 'aria-disabled set')
  assert(button.getAttribute('aria-expanded') === 'false', 'aria-expanded set')
  assert(button.getAttribute('aria-haspopup') === 'true', 'aria-haspopup set')
  assert(button.getAttribute('aria-controls') === 'menu-1', 'aria-controls set')
  assert(button.getAttribute('aria-describedby') === 'help-text', 'aria-describedby set')
  assert(button.getAttribute('aria-labelledby') === 'title', 'aria-labelledby set')

  await cleanupWindow(window)
}

// Test 6: Attribute value types
console.log('\nTest Group 6: Attribute Value Types')
{
  const window = createTestWindow()
  const div = window.document.createElement('div')

  // Attributes are always strings
  div.setAttribute('data-number', '123')
  assert(div.getAttribute('data-number') === '123', 'Number stored as string')
  assert(typeof div.getAttribute('data-number') === 'string', 'getAttribute returns string')

  div.setAttribute('data-boolean', 'true')
  assert(div.getAttribute('data-boolean') === 'true', 'Boolean stored as string')

  div.setAttribute('data-object', '[object Object]')
  assert(div.getAttribute('data-object') === '[object Object]', 'Object toString stored')

  // Empty string is valid
  div.setAttribute('data-empty', '')
  assert(div.getAttribute('data-empty') === '', 'Empty string attribute value')
  assert(div.hasAttribute('data-empty'), 'Empty string attribute exists')

  await cleanupWindow(window)
}

// Test 7: Multiple attributes
console.log('\nTest Group 7: Multiple Attributes')
{
  const window = createTestWindow()
  const input = window.document.createElement('input')

  // Set many attributes
  input.setAttribute('type', 'text')
  input.setAttribute('id', 'username')
  input.setAttribute('name', 'username')
  input.setAttribute('class', 'form-control')
  input.setAttribute('placeholder', 'Enter username')
  input.setAttribute('maxlength', '50')
  input.setAttribute('required', '')
  input.setAttribute('autocomplete', 'username')

  // Verify all attributes exist
  assert(input.getAttribute('type') === 'text', 'type attribute set')
  assert(input.getAttribute('id') === 'username', 'id attribute set')
  assert(input.getAttribute('name') === 'username', 'name attribute set')
  assert(input.getAttribute('class') === 'form-control', 'class attribute set')
  assert(input.getAttribute('placeholder') === 'Enter username', 'placeholder attribute set')
  assert(input.getAttribute('maxlength') === '50', 'maxlength attribute set')
  assert(input.hasAttribute('required'), 'required attribute exists')
  assert(input.getAttribute('autocomplete') === 'username', 'autocomplete attribute set')

  await cleanupWindow(window)
}

// Test 8: Attribute special characters
console.log('\nTest Group 8: Attribute Special Characters')
{
  const window = createTestWindow()
  const div = window.document.createElement('div')

  // Quotes in attribute values
  div.setAttribute('title', 'He said "Hello"')
  assert(div.getAttribute('title') === 'He said "Hello"', 'Double quotes in value')

  div.setAttribute('data-text', 'It\'s working')
  assert(div.getAttribute('data-text') === 'It\'s working', 'Single quote in value')

  // Special HTML characters
  div.setAttribute('data-html', '<script>alert("XSS")</script>')
  assert(div.getAttribute('data-html')!.includes('<script>'), 'HTML tags in attribute')

  // Unicode characters
  div.setAttribute('data-emoji', '🚀 Rocket')
  assert(div.getAttribute('data-emoji') === '🚀 Rocket', 'Emoji in attribute')

  div.setAttribute('data-chinese', '你好世界')
  assert(div.getAttribute('data-chinese') === '你好世界', 'Chinese characters in attribute')

  // Newlines and tabs
  div.setAttribute('data-multiline', 'Line1\nLine2\tTabbed')
  assert(div.getAttribute('data-multiline')!.includes('\n'), 'Newline in attribute')
  assert(div.getAttribute('data-multiline')!.includes('\t'), 'Tab in attribute')

  await cleanupWindow(window)
}

// Test 9: Class attribute operations
console.log('\nTest Group 9: Class Attribute Operations')
{
  const window = createTestWindow()
  const div = window.document.createElement('div')

  // Single class
  div.setAttribute('class', 'active')
  assert(div.getAttribute('class') === 'active', 'Single class set')

  // Multiple classes
  div.setAttribute('class', 'btn btn-primary active')
  assert(div.getAttribute('class') === 'btn btn-primary active', 'Multiple classes set')

  // Empty class
  div.setAttribute('class', '')
  assert(div.getAttribute('class') === '', 'Empty class attribute')

  // Remove class attribute
  div.setAttribute('class', 'test')
  div.removeAttribute('class')
  assert(!div.hasAttribute('class'), 'Class attribute removed')

  await cleanupWindow(window)
}

// Test 10: ID attribute operations
console.log('\nTest Group 10: ID Attribute Operations')
{
  const window = createTestWindow()
  const div = window.document.createElement('div')

  // Set ID
  div.setAttribute('id', 'unique-id')
  assert(div.getAttribute('id') === 'unique-id', 'ID attribute set')

  // IDs can contain various characters
  div.setAttribute('id', 'my-element_123')
  assert(div.getAttribute('id') === 'my-element_123', 'ID with hyphens and underscores')

  // Change ID
  div.setAttribute('id', 'new-id')
  assert(div.getAttribute('id') === 'new-id', 'ID attribute changed')

  // Remove ID
  div.removeAttribute('id')
  assert(!div.hasAttribute('id'), 'ID attribute removed')

  await cleanupWindow(window)
}

// Test 11: Style attribute
console.log('\nTest Group 11: Style Attribute')
{
  const window = createTestWindow()
  const div = window.document.createElement('div')

  // Set style attribute directly
  div.setAttribute('style', 'color: red; background: blue;')
  const styleAttr = div.getAttribute('style')
  assert(styleAttr !== null, 'Style attribute set')
  assert(styleAttr!.includes('color'), 'Style contains color')
  assert(styleAttr!.includes('background'), 'Style contains background')

  // Modify style via style property
  div.style.fontSize = '16px'
  const updatedStyle = div.getAttribute('style')
  assert(updatedStyle!.includes('font-size'), 'Style attribute updated from style property')

  await cleanupWindow(window)
}

// Test 12: Link and script attributes
console.log('\nTest Group 12: Link and Script Attributes')
{
  const window = createTestWindow()
  const link = window.document.createElement('link')
  const script = window.document.createElement('script')

  // Link attributes
  link.setAttribute('rel', 'stylesheet')
  link.setAttribute('href', '/styles/main.css')
  link.setAttribute('type', 'text/css')
  assert(link.getAttribute('rel') === 'stylesheet', 'link rel attribute')
  assert(link.getAttribute('href') === '/styles/main.css', 'link href attribute')
  assert(link.getAttribute('type') === 'text/css', 'link type attribute')

  // Script attributes
  script.setAttribute('src', '/scripts/app.js')
  script.setAttribute('type', 'text/javascript')
  script.setAttribute('async', '')
  script.setAttribute('defer', '')
  assert(script.getAttribute('src') === '/scripts/app.js', 'script src attribute')
  assert(script.getAttribute('type') === 'text/javascript', 'script type attribute')
  assert(script.hasAttribute('async'), 'script async attribute')
  assert(script.hasAttribute('defer'), 'script defer attribute')

  await cleanupWindow(window)
}

// Test 13: Form element attributes
console.log('\nTest Group 13: Form Element Attributes')
{
  const window = createTestWindow()
  const form = window.document.createElement('form')
  const input = window.document.createElement('input')

  // Form attributes
  form.setAttribute('action', '/submit')
  form.setAttribute('method', 'POST')
  form.setAttribute('enctype', 'multipart/form-data')
  form.setAttribute('target', '_blank')
  assert(form.getAttribute('action') === '/submit', 'form action attribute')
  assert(form.getAttribute('method') === 'POST', 'form method attribute')
  assert(form.getAttribute('enctype') === 'multipart/form-data', 'form enctype attribute')
  assert(form.getAttribute('target') === '_blank', 'form target attribute')

  // Input attributes
  input.setAttribute('type', 'email')
  input.setAttribute('name', 'email')
  input.setAttribute('value', 'test@example.com')
  input.setAttribute('placeholder', 'Enter email')
  input.setAttribute('pattern', '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$')
  assert(input.getAttribute('type') === 'email', 'input type attribute')
  assert(input.getAttribute('name') === 'email', 'input name attribute')
  assert(input.getAttribute('value') === 'test@example.com', 'input value attribute')
  assert(input.getAttribute('placeholder') === 'Enter email', 'input placeholder attribute')
  assert(input.getAttribute('pattern')!.includes('@'), 'input pattern attribute')

  await cleanupWindow(window)
}

// Test 14: Image and media attributes
console.log('\nTest Group 14: Image and Media Attributes')
{
  const window = createTestWindow()
  const img = window.document.createElement('img')
  const video = window.document.createElement('video')

  // Image attributes
  img.setAttribute('src', '/images/photo.jpg')
  img.setAttribute('alt', 'A beautiful photo')
  img.setAttribute('width', '800')
  img.setAttribute('height', '600')
  img.setAttribute('loading', 'lazy')
  assert(img.getAttribute('src') === '/images/photo.jpg', 'img src attribute')
  assert(img.getAttribute('alt') === 'A beautiful photo', 'img alt attribute')
  assert(img.getAttribute('width') === '800', 'img width attribute')
  assert(img.getAttribute('height') === '600', 'img height attribute')
  assert(img.getAttribute('loading') === 'lazy', 'img loading attribute')

  // Video attributes
  video.setAttribute('src', '/videos/demo.mp4')
  video.setAttribute('controls', '')
  video.setAttribute('autoplay', '')
  video.setAttribute('loop', '')
  video.setAttribute('muted', '')
  assert(video.getAttribute('src') === '/videos/demo.mp4', 'video src attribute')
  assert(video.hasAttribute('controls'), 'video controls attribute')
  assert(video.hasAttribute('autoplay'), 'video autoplay attribute')
  assert(video.hasAttribute('loop'), 'video loop attribute')
  assert(video.hasAttribute('muted'), 'video muted attribute')

  await cleanupWindow(window)
}

// Test 15: Table attributes
console.log('\nTest Group 15: Table Attributes')
{
  const window = createTestWindow()
  const table = window.document.createElement('table')
  const td = window.document.createElement('td')

  // Table attributes
  table.setAttribute('border', '1')
  table.setAttribute('cellpadding', '5')
  table.setAttribute('cellspacing', '0')
  assert(table.getAttribute('border') === '1', 'table border attribute')
  assert(table.getAttribute('cellpadding') === '5', 'table cellpadding attribute')
  assert(table.getAttribute('cellspacing') === '0', 'table cellspacing attribute')

  // Table cell attributes
  td.setAttribute('colspan', '2')
  td.setAttribute('rowspan', '3')
  td.setAttribute('align', 'center')
  td.setAttribute('valign', 'top')
  assert(td.getAttribute('colspan') === '2', 'td colspan attribute')
  assert(td.getAttribute('rowspan') === '3', 'td rowspan attribute')
  assert(td.getAttribute('align') === 'center', 'td align attribute')
  assert(td.getAttribute('valign') === 'top', 'td valign attribute')

  await cleanupWindow(window)
}

// Test 16: Custom element attributes
console.log('\nTest Group 16: Custom Element Attributes')
{
  const window = createTestWindow()
  const custom = window.document.createElement('my-component')

  // Custom elements can have any attributes
  custom.setAttribute('custom-prop', 'value')
  custom.setAttribute('x-data', '{ count: 0 }')
  custom.setAttribute('@click', 'handleClick')
  custom.setAttribute(':bind', 'someValue')

  assert(custom.getAttribute('custom-prop') === 'value', 'Custom attribute on custom element')
  assert(custom.getAttribute('x-data') === '{ count: 0 }', 'x-data attribute')
  assert(custom.getAttribute('@click') === 'handleClick', '@click attribute')
  assert(custom.getAttribute(':bind') === 'someValue', ':bind attribute')

  await cleanupWindow(window)
}

// Test 17: Attribute removal patterns
console.log('\nTest Group 17: Attribute Removal Patterns')
{
  const window = createTestWindow()
  const div = window.document.createElement('div')

  // Set multiple attributes
  div.setAttribute('a', '1')
  div.setAttribute('b', '2')
  div.setAttribute('c', '3')
  div.setAttribute('d', '4')

  // Remove in various orders
  div.removeAttribute('b')
  assert(div.hasAttribute('a'), 'First attribute still exists')
  assert(!div.hasAttribute('b'), 'Second attribute removed')
  assert(div.hasAttribute('c'), 'Third attribute still exists')
  assert(div.hasAttribute('d'), 'Fourth attribute still exists')

  div.removeAttribute('d')
  assert(div.hasAttribute('a'), 'First attribute still exists after removing last')
  assert(!div.hasAttribute('d'), 'Last attribute removed')

  // Remove all remaining
  div.removeAttribute('a')
  div.removeAttribute('c')
  assert(!div.hasAttribute('a'), 'All attributes removed')
  assert(!div.hasAttribute('c'), 'All attributes removed')

  // Removing non-existent attribute is safe
  div.removeAttribute('nonexistent')
  assert(true, 'Removing non-existent attribute does not error')

  await cleanupWindow(window)
}

// Test 18: Attribute overwriting
console.log('\nTest Group 18: Attribute Overwriting')
{
  const window = createTestWindow()
  const div = window.document.createElement('div')

  // Set and overwrite
  div.setAttribute('data-value', 'initial')
  assert(div.getAttribute('data-value') === 'initial', 'Initial value set')

  div.setAttribute('data-value', 'updated')
  assert(div.getAttribute('data-value') === 'updated', 'Value overwritten')

  div.setAttribute('data-value', '')
  assert(div.getAttribute('data-value') === '', 'Value overwritten with empty string')

  div.setAttribute('data-value', 'final')
  assert(div.getAttribute('data-value') === 'final', 'Value overwritten again')

  await cleanupWindow(window)
}

// Test 19: Enumerated attributes
console.log('\nTest Group 19: Enumerated Attributes')
{
  const window = createTestWindow()
  const div = window.document.createElement('div')
  const input = window.document.createElement('input')

  // contenteditable (true, false, inherit)
  div.setAttribute('contenteditable', 'true')
  assert(div.getAttribute('contenteditable') === 'true', 'contenteditable="true"')

  div.setAttribute('contenteditable', 'false')
  assert(div.getAttribute('contenteditable') === 'false', 'contenteditable="false"')

  // draggable (true, false, auto)
  div.setAttribute('draggable', 'true')
  assert(div.getAttribute('draggable') === 'true', 'draggable="true"')

  // spellcheck (true, false)
  input.setAttribute('spellcheck', 'false')
  assert(input.getAttribute('spellcheck') === 'false', 'spellcheck="false"')

  // autocapitalize (off, none, on, sentences, words, characters)
  input.setAttribute('autocapitalize', 'words')
  assert(input.getAttribute('autocapitalize') === 'words', 'autocapitalize="words"')

  await cleanupWindow(window)
}

// Test 20: Numeric attributes
console.log('\nTest Group 20: Numeric Attributes')
{
  const window = createTestWindow()
  const input = window.document.createElement('input')
  const textarea = window.document.createElement('textarea')

  // Attributes that accept numbers
  input.setAttribute('maxlength', '100')
  input.setAttribute('minlength', '5')
  input.setAttribute('size', '20')
  input.setAttribute('min', '0')
  input.setAttribute('max', '100')
  input.setAttribute('step', '5')

  assert(input.getAttribute('maxlength') === '100', 'maxlength numeric attribute')
  assert(input.getAttribute('minlength') === '5', 'minlength numeric attribute')
  assert(input.getAttribute('size') === '20', 'size numeric attribute')
  assert(input.getAttribute('min') === '0', 'min numeric attribute')
  assert(input.getAttribute('max') === '100', 'max numeric attribute')
  assert(input.getAttribute('step') === '5', 'step numeric attribute')

  // Textarea attributes
  textarea.setAttribute('rows', '10')
  textarea.setAttribute('cols', '50')
  textarea.setAttribute('maxlength', '500')

  assert(textarea.getAttribute('rows') === '10', 'textarea rows attribute')
  assert(textarea.getAttribute('cols') === '50', 'textarea cols attribute')
  assert(textarea.getAttribute('maxlength') === '500', 'textarea maxlength attribute')

  await cleanupWindow(window)
}

// Test 21: tabIndex property
console.log('\nTest Group 21: tabIndex Property')
{
  const window = createTestWindow()

  // Test naturally focusable elements default to tabIndex 0
  const button = window.document.createElement('button')
  assert(button.tabIndex === 0, 'button has default tabIndex of 0')

  const input = window.document.createElement('input')
  assert(input.tabIndex === 0, 'input has default tabIndex of 0')

  const textarea = window.document.createElement('textarea')
  assert(textarea.tabIndex === 0, 'textarea has default tabIndex of 0')

  const select = window.document.createElement('select')
  assert(select.tabIndex === 0, 'select has default tabIndex of 0')

  const anchor = window.document.createElement('a')
  assert(anchor.tabIndex === 0, 'anchor has default tabIndex of 0')

  // Test non-focusable elements default to tabIndex -1
  const div = window.document.createElement('div')
  assert(div.tabIndex === -1, 'div has default tabIndex of -1')

  const span = window.document.createElement('span')
  assert(span.tabIndex === -1, 'span has default tabIndex of -1')

  const p = window.document.createElement('p')
  assert(p.tabIndex === -1, 'p has default tabIndex of -1')

  // Test setting tabIndex via property
  button.tabIndex = 1
  assert(button.tabIndex === 1, 'tabIndex property setter works')
  assert(button.getAttribute('tabindex') === '1', 'tabIndex reflects to tabindex attribute')

  // Test setting negative tabIndex
  input.tabIndex = -1
  assert(input.tabIndex === -1, 'negative tabIndex can be set')
  assert(input.getAttribute('tabindex') === '-1', 'negative tabIndex reflects to attribute')

  // Test setting tabIndex via attribute
  textarea.setAttribute('tabindex', '5')
  assert(textarea.tabIndex === 5, 'tabindex attribute reflects to tabIndex property')

  // Test making non-focusable element focusable
  div.tabIndex = 0
  assert(div.tabIndex === 0, 'non-focusable element can be made focusable')
  assert(div.getAttribute('tabindex') === '0', 'tabIndex 0 reflects to attribute')

  // Test removing tabindex attribute
  button.removeAttribute('tabindex')
  assert(button.tabIndex === 0, 'button returns to default tabIndex after attribute removal')

  div.removeAttribute('tabindex')
  assert(div.tabIndex === -1, 'div returns to default tabIndex after attribute removal')

  // Test tabIndex with string numbers in attribute
  select.setAttribute('tabindex', '99')
  assert(select.tabIndex === 99, 'string number in attribute converts to number')

  // Test tabIndex with invalid values
  span.setAttribute('tabindex', 'invalid')
  assert(Number.isNaN(span.tabIndex), 'invalid tabindex returns NaN')

  await cleanupWindow(window)
}

// Test 22: disabled property
console.log('\nTest Group 22: disabled Property')
{
  const window = createTestWindow()

  // Test form elements disabled property
  const button = window.document.createElement('button')
  assert(button.disabled === false, 'button is not disabled by default')

  const input = window.document.createElement('input')
  assert(input.disabled === false, 'input is not disabled by default')

  const textarea = window.document.createElement('textarea')
  assert(textarea.disabled === false, 'textarea is not disabled by default')

  const select = window.document.createElement('select')
  assert(select.disabled === false, 'select is not disabled by default')

  // Test setting disabled via property
  button.disabled = true
  assert(button.disabled === true, 'disabled property setter works')
  assert(button.hasAttribute('disabled'), 'disabled property reflects to disabled attribute')

  // Test disabling input
  input.disabled = true
  assert(input.disabled === true, 'input can be disabled')
  assert(input.getAttribute('disabled') === '', 'disabled attribute is empty string')

  // Test enabling input
  input.disabled = false
  assert(input.disabled === false, 'input can be enabled')
  assert(!input.hasAttribute('disabled'), 'disabled attribute is removed when false')

  // Test setting disabled via attribute
  textarea.setAttribute('disabled', '')
  assert(textarea.disabled === true, 'disabled attribute reflects to disabled property')

  textarea.setAttribute('disabled', 'disabled')
  assert(textarea.disabled === true, 'disabled="disabled" also works')

  // Test removing disabled attribute
  textarea.removeAttribute('disabled')
  assert(textarea.disabled === false, 'removing disabled attribute sets property to false')

  // Test disabled on fieldset
  const fieldset = window.document.createElement('fieldset')
  assert(fieldset.disabled === false, 'fieldset is not disabled by default')

  fieldset.disabled = true
  assert(fieldset.disabled === true, 'fieldset can be disabled')
  assert(fieldset.hasAttribute('disabled'), 'fieldset disabled reflects to attribute')

  // Test disabled on optgroup
  const optgroup = window.document.createElement('optgroup')
  assert(optgroup.disabled === false, 'optgroup is not disabled by default')

  optgroup.disabled = true
  assert(optgroup.disabled === true, 'optgroup can be disabled')

  // Test disabled on option
  const option = window.document.createElement('option')
  assert(option.disabled === false, 'option is not disabled by default')

  option.disabled = true
  assert(option.disabled === true, 'option can be disabled')

  // Test disabled on non-form elements (should still work as attribute)
  const div = window.document.createElement('div')
  div.disabled = true
  assert(div.disabled === true, 'disabled property works on non-form elements')
  assert(div.hasAttribute('disabled'), 'disabled attribute set on non-form elements')

  await cleanupWindow(window)
}

// Test 23: tabIndex and disabled interaction
console.log('\nTest Group 23: tabIndex and disabled Interaction')
{
  const window = createTestWindow()

  // Test that disabled elements can still have tabIndex
  const button = window.document.createElement('button')
  button.disabled = true
  button.tabIndex = 5

  assert(button.disabled === true, 'button is disabled')
  assert(button.tabIndex === 5, 'disabled button still has tabIndex')
  assert(button.getAttribute('tabindex') === '5', 'tabindex attribute is set')
  assert(button.hasAttribute('disabled'), 'disabled attribute is set')

  // Test changing tabIndex on disabled element
  const input = window.document.createElement('input')
  input.tabIndex = 3
  input.disabled = true

  assert(input.tabIndex === 3, 'tabIndex persists when element is disabled')
  assert(input.disabled === true, 'disabled property is set')

  // Re-enabling should preserve tabIndex
  input.disabled = false
  assert(input.tabIndex === 3, 'tabIndex preserved when re-enabled')
  assert(!input.hasAttribute('disabled'), 'disabled attribute removed')

  await cleanupWindow(window)
}

// Test 24: Edge cases for tabIndex and disabled
console.log('\nTest Group 24: Edge Cases for tabIndex and disabled')
{
  const window = createTestWindow()

  // Test very large tabIndex values
  const button = window.document.createElement('button')
  button.tabIndex = 32767
  assert(button.tabIndex === 32767, 'large positive tabIndex works')

  button.tabIndex = -32768
  assert(button.tabIndex === -32768, 'large negative tabIndex works')

  // Test zero tabIndex
  button.tabIndex = 0
  assert(button.tabIndex === 0, 'zero tabIndex works')
  assert(button.getAttribute('tabindex') === '0', 'zero reflects to attribute')

  // Test disabled attribute with different values
  const input = window.document.createElement('input')
  input.setAttribute('disabled', 'true')
  assert(input.disabled === true, 'disabled="true" is truthy')

  input.setAttribute('disabled', 'false')
  assert(input.disabled === true, 'disabled="false" is still truthy (attribute exists)')

  input.setAttribute('disabled', '')
  assert(input.disabled === true, 'disabled="" is truthy')

  // Test multiple attribute changes
  const textarea = window.document.createElement('textarea')
  textarea.tabIndex = 1
  textarea.disabled = true
  textarea.tabIndex = 2
  textarea.disabled = false
  textarea.tabIndex = 3

  assert(textarea.tabIndex === 3, 'final tabIndex is 3')
  assert(textarea.disabled === false, 'final disabled is false')
  assert(textarea.getAttribute('tabindex') === '3', 'attribute reflects final state')
  assert(!textarea.hasAttribute('disabled'), 'disabled attribute removed')

  await cleanupWindow(window)
}

stats.printSummary()
stats.exit()
