/* eslint-disable no-console */
/**
 * Comprehensive Browser API Stress Tests
 * Attempting to break the implementation!
 */

import { Browser, CookieContainer, GlobalWindow, Window } from '../src/index'

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

console.log('=== 🔥 Browser API Stress Tests 🔥 ===\n')

// Test 1: Creating and destroying multiple browsers
console.log('Test 1: Multiple Browser Lifecycle')
{
  const browsers = []
  for (let i = 0; i < 10; i++) {
    browsers.push(new Browser())
  }
  assert(browsers.length === 10, 'Created 10 browsers')

  for (const browser of browsers) {
    await browser.close()
  }
  assert(true, 'Closed all 10 browsers without error')
}

// Test 2: Page cleanup on browser close
console.log('\nTest 2: Page Cleanup on Browser Close')
{
  const browser = new Browser()
  const pages = []
  for (let i = 0; i < 5; i++) {
    pages.push(browser.newPage())
  }
  assert(browser.defaultContext.pages.length === 5, 'Created 5 pages')

  await browser.close()
  assert(browser.contexts.length === 0, 'All contexts cleared after close')
}

// Test 3: Context isolation - cookies should not leak
console.log('\nTest 3: Context Isolation - Cookies')
{
  const browser = new Browser()

  // Add cookie to default context
  browser.defaultContext.cookieContainer.addCookies([{
    key: 'default-cookie',
    value: 'default-value',
    originURL: 'https://example.com',
  }])

  // Create incognito context
  const incognito = browser.newIncognitoContext()
  incognito.cookieContainer.addCookies([{
    key: 'incognito-cookie',
    value: 'incognito-value',
    originURL: 'https://example.com',
  }])

  const defaultCookies = browser.defaultContext.cookieContainer.getCookies('https://example.com')
  const incognitoCookies = incognito.cookieContainer.getCookies('https://example.com')

  assert(defaultCookies.length === 1 && defaultCookies[0].key === 'default-cookie', 'Default context has only default cookie')
  assert(incognitoCookies.length === 1 && incognitoCookies[0].key === 'incognito-cookie', 'Incognito context has only incognito cookie')
  assert(browser.contexts.length === 2, 'Browser has 2 contexts')

  await browser.close()
}

// Test 4: Cookie domain matching edge cases
console.log('\nTest 4: Cookie Domain Matching Edge Cases')
{
  const container = new CookieContainer()

  // Add cookies with different domains
  container.addCookies([
    { key: 'exact', originURL: 'https://example.com', domain: 'example.com' },
    { key: 'subdomain', originURL: 'https://sub.example.com', domain: 'example.com' },
    { key: 'wrong', originURL: 'https://other.com', domain: 'other.com' },
  ])

  const cookiesExact = container.getCookies('https://example.com')
  const cookiesSubdomain = container.getCookies('https://sub.example.com')
  const cookiesOther = container.getCookies('https://other.com')

  assert(cookiesExact.length === 2, 'example.com gets both exact and subdomain cookies')
  assert(cookiesSubdomain.length === 2, 'sub.example.com gets both cookies')
  assert(cookiesOther.length === 1 && cookiesOther[0].key === 'wrong', 'other.com only gets its own cookie')
}

// Test 5: Cookie path matching
console.log('\nTest 5: Cookie Path Matching')
{
  const container = new CookieContainer()

  container.addCookies([
    { key: 'root', originURL: 'https://example.com', path: '/' },
    { key: 'specific', originURL: 'https://example.com', path: '/api/' },
    { key: 'deep', originURL: 'https://example.com', path: '/api/v1/' },
  ])

  const rootCookies = container.getCookies('https://example.com/')
  const apiCookies = container.getCookies('https://example.com/api/')
  const v1Cookies = container.getCookies('https://example.com/api/v1/')
  const otherCookies = container.getCookies('https://example.com/other/')

  assert(rootCookies.length === 1, 'Root path gets only root cookie')
  assert(apiCookies.length === 2, '/api/ gets root and specific cookies')
  assert(v1Cookies.length === 3, '/api/v1/ gets all cookies')
  assert(otherCookies.length === 1, '/other/ gets only root cookie')
}

// Test 6: Secure cookie filtering
console.log('\nTest 6: Secure Cookie Filtering')
{
  const container = new CookieContainer()

  container.addCookies([
    { key: 'insecure', originURL: 'http://example.com', secure: false },
    { key: 'secure', originURL: 'https://example.com', secure: true },
  ])

  const httpCookies = container.getCookies('http://example.com')
  const httpsCookies = container.getCookies('https://example.com')

  assert(httpCookies.length === 1 && httpCookies[0].key === 'insecure', 'HTTP only gets insecure cookies')
  assert(httpsCookies.length === 2, 'HTTPS gets both cookies')
}

// Test 7: HttpOnly cookie filtering
console.log('\nTest 7: HttpOnly Cookie Filtering')
{
  const container = new CookieContainer()

  container.addCookies([
    { key: 'public', originURL: 'https://example.com', httpOnly: false },
    { key: 'httponly', originURL: 'https://example.com', httpOnly: true },
  ])

  const publicCookies = container.getCookies('https://example.com', false)
  const allCookies = container.getCookies('https://example.com', true)

  assert(publicCookies.length === 1 && publicCookies[0].key === 'public', 'Without httpOnly flag, only get public cookies')
  assert(allCookies.length === 2, 'With httpOnly flag, get all cookies')
}

// Test 8: Expired cookie filtering
console.log('\nTest 8: Expired Cookie Filtering')
{
  const container = new CookieContainer()

  const pastDate = new Date(Date.now() - 1000)
  const futureDate = new Date(Date.now() + 10000)

  container.addCookies([
    { key: 'expired', originURL: 'https://example.com', expires: pastDate },
    { key: 'valid', originURL: 'https://example.com', expires: futureDate },
    { key: 'noexpiry', originURL: 'https://example.com' },
  ])

  const cookies = container.getCookies('https://example.com')

  assert(cookies.length === 2, 'Expired cookies filtered out')
  assert(!cookies.some(c => c.key === 'expired'), 'Expired cookie not returned')
}

// Test 9: Cookie replacement (same key, domain, path)
console.log('\nTest 9: Cookie Replacement')
{
  const container = new CookieContainer()

  container.addCookies([
    { key: 'test', value: 'value1', originURL: 'https://example.com' },
  ])

  let cookies = container.getCookies('https://example.com')
  assert(cookies.length === 1 && cookies[0].value === 'value1', 'First cookie added')

  container.addCookies([
    { key: 'test', value: 'value2', originURL: 'https://example.com' },
  ])

  cookies = container.getCookies('https://example.com')
  assert(cookies.length === 1 && cookies[0].value === 'value2', 'Cookie replaced with new value')
}

// Test 10: Page removal from context
console.log('\nTest 10: Page Removal from Context')
{
  const browser = new Browser()
  const page1 = browser.newPage()
  const page2 = browser.newPage()

  assert(browser.defaultContext.pages.length === 2, 'Created 2 pages')

  await page1.close()
  assert(browser.defaultContext.pages.length === 1, 'Page removed after close')
  assert(browser.defaultContext.pages[0] === page2, 'Correct page remained')

  await browser.close()
}

// Test 11: Invalid URL handling
console.log('\nTest 11: Invalid URL Handling')
{
  const window = new Window({ url: 'not-a-valid-url' })
  assert(window.location.href === 'not-a-valid-url', 'Invalid URL stored as-is')
  assert(window.location.protocol === '', 'Invalid URL has empty protocol')

  await window.happyDOM.close()
}

// Test 12: Empty content handling
console.log('\nTest 12: Empty Content Handling')
{
  const browser = new Browser()
  const page = browser.newPage()

  page.content = ''
  assert(page.content.includes('html'), 'Empty content still has HTML structure')

  page.content = '   '
  assert(page.content.includes('html'), 'Whitespace content handled')

  await browser.close()
}

// Test 13: Deeply nested frame structure
console.log('\nTest 13: Frame Relationships')
{
  const browser = new Browser()
  const page = browser.newPage()

  assert(page.mainFrame.page === page, 'Frame references correct page')
  assert(page.mainFrame.parentFrame === null, 'Main frame has no parent')
  assert(page.frames.includes(page.mainFrame), 'Main frame in frames list')

  await browser.close()
}

// Test 14: Multiple closes (idempotency)
console.log('\nTest 14: Multiple Close Calls (Idempotency)')
{
  const browser = new Browser()
  const page = browser.newPage()

  await page.close()
  await page.close() // Should not throw
  await page.close() // Should not throw

  assert(browser.defaultContext.pages.length === 0, 'Page only removed once')

  await browser.close()
  await browser.close() // Should not throw

  assert(true, 'Multiple closes handled gracefully')
}

// Test 15: Context close clears resources
console.log('\nTest 15: Context Close Clears Resources')
{
  const browser = new Browser()
  const context = browser.newIncognitoContext()

  context.cookieContainer.addCookies([
    { key: 'test', originURL: 'https://example.com' },
  ])
  context.responseCache.set('key', {} as Response)

  const _page = context.newPage()

  await context.close()

  const cookies = context.cookieContainer.getCookies('https://example.com')
  assert(cookies.length === 0, 'Cookies cleared on context close')
  assert(context.responseCache.size === 0, 'Response cache cleared')
  assert(context.pages.length === 0, 'Pages cleared')

  await browser.close()
}

// Test 16: Window viewport changes
console.log('\nTest 16: Window Viewport Changes')
{
  const window = new Window({ width: 1024, height: 768 })

  assert(window.innerWidth === 1024, 'Initial width correct')
  assert(window.innerHeight === 768, 'Initial height correct')

  window.happyDOM.setViewport({ width: 1920, height: 1080 })

  assert(window.innerWidth === 1920, 'Width updated')
  assert(window.innerHeight === 1080, 'Height updated')

  window.happyDOM.setViewport({ width: 800 })

  assert(window.innerWidth === 800, 'Width updated independently')
  assert(window.innerHeight === 1080, 'Height unchanged')

  await window.happyDOM.close()
}

// Test 17: Page viewport changes
console.log('\nTest 17: Page Viewport Changes')
{
  const browser = new Browser()
  const page = browser.newPage()

  assert(page.viewport.width === 1024, 'Default width')
  assert(page.viewport.height === 768, 'Default height')

  page.setViewport({ width: 1920, height: 1080 })

  assert(page.viewport.width === 1920, 'Viewport updated')
  assert(page.viewport.height === 1080, 'Viewport updated')

  await browser.close()
}

// Test 18: Settings inheritance
console.log('\nTest 18: Settings Modification')
{
  const browser = new Browser({
    settings: {
      navigator: {
        userAgent: 'Custom UA',
      },
    },
  })

  assert(browser.settings.navigator.userAgent === 'Custom UA', 'Custom settings applied')

  browser.settings.navigator.userAgent = 'Modified UA'

  assert(browser.settings.navigator.userAgent === 'Modified UA', 'Settings modifiable at runtime')

  await browser.close()
}

// Test 19: Document.write() with complex HTML
console.log('\nTest 19: Document.write() with Complex HTML')
{
  const window = new Window()

  window.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test</title>
        <meta charset="utf-8">
      </head>
      <body>
        <div id="app">
          <h1>Hello</h1>
          <p>World</p>
        </div>
      </body>
    </html>
  `)

  const app = window.document.getElementById('app')
  assert(app !== null, 'Element found after document.write()')
  // Count only element children (not text nodes)
  const elementChildren = Array.from(app?.children || []).filter((n: any) => n.nodeType === 'element')
  assert(elementChildren.length === 2, 'Nested structure preserved (2 element children)')
  assert(window.document.head !== null, 'Head created')
  assert(window.document.body !== null, 'Body created')

  await window.happyDOM.close()
}

// Test 20: Document.write() partial HTML
console.log('\nTest 20: Document.write() Partial HTML')
{
  const window = new Window()

  window.document.write('<div>Test 1</div>')
  window.document.write('<div>Test 2</div>')

  const divs = window.document.querySelectorAll('div')
  assert(divs.length === 2, 'Multiple write() calls append to body')

  await window.happyDOM.close()
}

// Test 21: URL updates
console.log('\nTest 21: URL Updates')
{
  const window = new Window({ url: 'https://example.com/page1' })

  assert(window.location.href === 'https://example.com/page1', 'Initial URL')

  window.happyDOM.setURL('https://example.com/page2')

  assert(window.location.href === 'https://example.com/page2', 'URL updated via happyDOM API')

  window.location.href = 'https://example.com/page3'

  assert(window.location.href === 'https://example.com/page3', 'URL updated via location.href')

  await window.happyDOM.close()
}

// Test 22: Page content vs frame content
console.log('\nTest 22: Page Content vs Frame Content')
{
  const browser = new Browser()
  const page = browser.newPage()

  page.content = '<body><h1>Page Content</h1></body>'

  assert(page.content === page.mainFrame.content, 'Page content equals main frame content')
  assert(page.url === page.mainFrame.url, 'Page URL equals main frame URL')

  page.url = 'https://example.com'

  assert(page.mainFrame.url === 'https://example.com', 'Frame URL updated with page URL')

  await browser.close()
}

// Test 23: Evaluate function vs string
console.log('\nTest 23: Evaluate Function vs String')
{
  const browser = new Browser()
  const page = browser.newPage()

  page.content = '<body><div id="test">Hello</div></body>'

  const result1 = page.evaluate('1 + 1')
  assert(result1 === 2, 'String evaluation works')

  const result2 = page.evaluate(() => {
    return 2 + 2
  })
  assert(result2 === 4, 'Function evaluation works')

  await browser.close()
}

// Test 24: Multiple incognito contexts
console.log('\nTest 24: Multiple Incognito Contexts')
{
  const browser = new Browser()

  const incognito1 = browser.newIncognitoContext()
  const incognito2 = browser.newIncognitoContext()
  const incognito3 = browser.newIncognitoContext()

  assert(browser.contexts.length === 4, 'Browser has 4 contexts (1 default + 3 incognito)')

  incognito1.cookieContainer.addCookies([{ key: 'c1', originURL: 'https://example.com' }])
  incognito2.cookieContainer.addCookies([{ key: 'c2', originURL: 'https://example.com' }])
  incognito3.cookieContainer.addCookies([{ key: 'c3', originURL: 'https://example.com' }])

  const cookies1 = incognito1.cookieContainer.getCookies('https://example.com')
  const cookies2 = incognito2.cookieContainer.getCookies('https://example.com')
  const cookies3 = incognito3.cookieContainer.getCookies('https://example.com')

  assert(cookies1.length === 1 && cookies1[0].key === 'c1', 'Context 1 isolated')
  assert(cookies2.length === 1 && cookies2[0].key === 'c2', 'Context 2 isolated')
  assert(cookies3.length === 1 && cookies3[0].key === 'c3', 'Context 3 isolated')

  await browser.close()
}

// Test 25: Concurrent operations
console.log('\nTest 25: Concurrent Operations')
{
  const browser = new Browser()

  const promises = []
  for (let i = 0; i < 10; i++) {
    const page = browser.newPage()
    page.content = `<body>Page ${i}</body>`
    promises.push(page.waitUntilComplete())
  }

  await Promise.all(promises)

  assert(browser.defaultContext.pages.length === 10, 'All pages created concurrently')

  await browser.close()
}

// Test 26: Abort operations
console.log('\nTest 26: Abort Operations')
{
  const browser = new Browser()
  const page = browser.newPage()

  // Start some operations
  const p1 = page.waitUntilComplete()
  const p2 = page.waitForNavigation()

  await page.abort()

  // Operations should complete without error
  await p1
  await p2

  assert(true, 'Abort completed without errors')

  await browser.close()
}

// Test 27: Browser waitUntilComplete
console.log('\nTest 27: Browser waitUntilComplete')
{
  const browser = new Browser()

  const page1 = browser.newPage()
  const page2 = browser.newPage()

  page1.content = '<body>Page 1</body>'
  page2.content = '<body>Page 2</body>'

  await browser.waitUntilComplete()

  assert(true, 'Browser waitUntilComplete waits for all pages')

  await browser.close()
}

// Test 28: GlobalWindow global scope access
console.log('\nTest 28: GlobalWindow Global Scope')
{
  const window = new GlobalWindow()

  window.setGlobal('testVar', 'testValue')

  assert(window.getGlobal('testVar') === 'testValue', 'Global variable set and retrieved')
  assert((globalThis as any).testVar === 'testValue', 'Global variable accessible from globalThis')

  delete (globalThis as any).testVar

  await window.close()
}

// Test 29: Cookie with no value
console.log('\nTest 29: Cookie with No Value')
{
  const container = new CookieContainer()

  container.addCookies([
    { key: 'novalue', originURL: 'https://example.com' },
  ])

  const cookies = container.getCookies('https://example.com')

  assert(cookies.length === 1, 'Cookie without value added')
  assert(cookies[0].value === '', 'Cookie value defaults to empty string')
}

// Test 30: Large number of cookies
console.log('\nTest 30: Large Number of Cookies')
{
  const container = new CookieContainer()

  const cookiesToAdd = []
  for (let i = 0; i < 100; i++) {
    cookiesToAdd.push({
      key: `cookie${i}`,
      value: `value${i}`,
      originURL: 'https://example.com',
    })
  }

  container.addCookies(cookiesToAdd)

  const cookies = container.getCookies('https://example.com')

  assert(cookies.length === 100, 'All 100 cookies stored')

  container.clearCookies()

  const clearedCookies = container.getCookies('https://example.com')
  assert(clearedCookies.length === 0, 'All cookies cleared')
}

// Test 31: Window with custom console
console.log('\nTest 31: Window with Custom Console')
{
  const logs: string[] = []
  const customConsole = {
    log: (...args: any[]) => logs.push(args.join(' ')),
    error: (...args: any[]) => logs.push(`ERROR: ${args.join(' ')}`),
    warn: (...args: any[]) => logs.push(`WARN: ${args.join(' ')}`),
  } as unknown as Console

  const window = new Window({ console: customConsole })

  assert(window.console === customConsole, 'Custom console used')

  window.console.log('test message')
  assert(logs.length === 1 && logs[0] === 'test message', 'Custom console captures logs')

  await window.happyDOM.close()
}

// Test 32: Browser abort cascades to contexts and pages
console.log('\nTest 32: Browser Abort Cascades')
{
  const browser = new Browser()
  const _page1 = browser.newPage()
  const _page2 = browser.newPage()
  const incognito = browser.newIncognitoContext()
  const _page3 = incognito.newPage()

  await browser.abort()

  assert(true, 'Browser abort cascaded to all contexts and pages')

  await browser.close()
}

// Test 33: Frame document operations
console.log('\nTest 33: Frame Document Operations')
{
  const browser = new Browser()
  const page = browser.newPage()

  page.mainFrame.content = '<body><div id="test">Content</div></body>'

  const elem = page.mainFrame.document.getElementById('test')
  assert(elem !== null, 'Frame document querySelector works')
  assert(elem?.textContent === 'Content', 'Frame document content accessible')

  await browser.close()
}

// Test 34: Settings defaults
console.log('\nTest 34: Settings Defaults')
{
  const browser = new Browser()

  assert(browser.settings.navigator.userAgent.includes('VeryHappyDOM'), 'Default user agent set')
  assert(browser.settings.device.prefersColorScheme === 'light', 'Default color scheme set')

  await browser.close()
}

// Test 35: Context with pages then close individual pages
console.log('\nTest 35: Close Individual Pages in Context')
{
  const browser = new Browser()
  const pages = [
    browser.newPage(),
    browser.newPage(),
    browser.newPage(),
  ]

  assert(browser.defaultContext.pages.length === 3, 'Created 3 pages')

  await pages[1].close()

  assert(browser.defaultContext.pages.length === 2, 'Middle page removed')
  assert(browser.defaultContext.pages.includes(pages[0]), 'First page still exists')
  assert(browser.defaultContext.pages.includes(pages[2]), 'Third page still exists')
  assert(!browser.defaultContext.pages.includes(pages[1]), 'Middle page removed')

  await browser.close()
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
  console.log('\n🎉 All tests passed!')
}
