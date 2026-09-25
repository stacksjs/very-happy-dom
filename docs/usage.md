# Usage

There are two ways to use `very-happy-dom`: create a `Window` per test, or
register browser globals once and let your framework find them.

## A window per test

The most explicit approach — nothing is global, so tests cannot leak state into
each other.

```typescript
import { describe, expect, test } from 'bun:test'
import { Window } from 'very-happy-dom'

describe('MyComponent', () => {
  test('renders correctly', () => {
    const window = new Window()
    const document = window.document

    document.body.innerHTML = '<div class="container">Test</div>'
    const element = document.querySelector('.container')

    expect(element?.textContent).toBe('Test')
  })
})
```

## Global DOM environment

Testing Library, React and most component testing tools expect `document` and
`window` to exist as globals. Either preload the `/register` subpath or call
`GlobalRegistrator` yourself.

### The `/register` subpath

```toml
# bunfig.toml
[test]
preload = ["very-happy-dom/register"]
```

The module registers on import and is a no-op if globals already exist. Override
the URL with `VERY_HAPPY_DOM_URL` or `HAPPY_DOM_URL`.

### Manual registration

This is the drop-in for `@happy-dom/global-registrator`:

```typescript
// happy-dom.ts (preload script)
import { GlobalRegistrator } from 'very-happy-dom'

GlobalRegistrator.register()
```

```toml
# bunfig.toml
[test]
preload = ["./happy-dom.ts"]
```

`register()` takes the same options as the `Window` constructor, so you can set
a URL or viewport for the whole suite:

```typescript
GlobalRegistrator.register({
  url: 'https://example.com/',
  width: 1280,
  height: 720,
})
```

Call `GlobalRegistrator.unregister()` to remove the globals again. Registering
twice without unregistering throws.

With globals in place, tests look exactly as they would in a browser:

```tsx
import { expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { MyComponent } from './MyComponent'

test('renders correctly', () => {
  render(<MyComponent />)
  expect(screen.getByTestId('my-component')).toBeInTheDocument()
})
```

## Selecting and traversing

The selector engine supports the full CSS surface — combinators, attribute
selectors, and the functional pseudo-classes:

```typescript
document.querySelector('#main')
document.querySelectorAll('ul > li:nth-child(odd)')
document.querySelectorAll('input[type="checkbox"]:not([disabled])')
document.querySelectorAll('section:has(> h2)')

element.matches('.active')
element.closest('[data-root]')
```

XPath works too. The result-type constants live on the exported
`XPathResultType` enum — they are not installed as globals:

```typescript
import { XPathResultType } from 'very-happy-dom'

const result = document.evaluate(
  '//div[@class="item"]',
  document,
  null,
  XPathResultType.ORDERED_NODE_SNAPSHOT_TYPE,
  null,
)

console.log(result.snapshotLength)
console.log(result.snapshotItem(0)?.textContent)
```

## Events

Listeners support `once`, `passive`, `capture` and `signal`, with real bubbling
and capturing:

```typescript
const button = document.createElement('button')
let clicked = false

button.addEventListener('click', () => {
  clicked = true
}, { once: true })

button.click()
console.log(clicked) // true
```

```typescript
const controller = new AbortController()
element.addEventListener('scroll', onScroll, { signal: controller.signal })
controller.abort() // listener removed
```

## Storage

`localStorage` and `sessionStorage` are isolated per `Window`, so no clearing
between tests is required when you construct one per test.

```typescript
const window = new Window()

window.localStorage.setItem('key', 'value')
console.log(window.localStorage.getItem('key')) // "value"

window.sessionStorage.setItem('session', 'data')
```

## Observers

```typescript
const observer = new window.MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    console.log('DOM changed:', mutation.type)
  })
})

observer.observe(document.body, {
  childList: true,
  attributes: true,
  subtree: true,
})

const io = new window.IntersectionObserver((entries) => {
  entries.forEach(entry => console.log('Visibility:', entry.isIntersecting))
})

const ro = new window.ResizeObserver((entries) => {
  entries.forEach(entry => console.log('Size:', entry.contentRect))
})
```

## Canvas

```typescript
const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')

ctx.fillStyle = 'red'
ctx.fillRect(0, 0, 100, 100)
ctx.strokeStyle = 'blue'
ctx.strokeRect(10, 10, 80, 80)

const dataUrl = canvas.toDataURL()
```

`toBlob` is callback-based, as in the browser. There is also a non-standard
`toBlobAsync()` convenience wrapper:

```typescript
canvas.toBlob((blob) => {
  console.log(blob?.type) // "image/png"
})

const blob = await canvas.toBlobAsync()
```

Only the `2d` context is implemented — `getContext('webgl')` returns `null`.

## Request interception

Interception is Puppeteer-shaped: attach a `request` handler to a page, then
enable it. Each request can be continued, mocked, or aborted.

```typescript
import type { InterceptedRequest } from 'very-happy-dom'
import { Browser } from 'very-happy-dom'

const browser = new Browser()
const page = browser.newPage()

page.on('request', (request: InterceptedRequest) => {
  if (request.url.includes('/api/')) {
    request.respond({
      status: 200,
      body: JSON.stringify({ mocked: true }),
    })
    return
  }

  request.continue()
})

await page.setRequestInterception(true)

const response = await fetch('https://example.com/api/thing')
console.log(await response.text()) // {"mocked":true}

await browser.close()
```

An `InterceptedRequest` exposes `url`, `method`, `headers`, `postData` and
`resourceType`, plus three terminal actions — `continue(overrides?)`,
`respond({ status, headers?, body })` and `abort(errorCode?)`.

## Browser contexts

For scenarios that need more than a single window — isolated contexts, several
pages, navigation:

```typescript
import { Browser } from 'very-happy-dom'

const browser = new Browser()
const page = browser.newPage()

page.goto('https://example.com')

// Or an isolated context with its own storage and cookies
const context = browser.newIncognitoContext()
const isolatedPage = context.newPage()

console.log(browser.contexts.length)

await browser.close()
```

## Waiting for pending work

`window.happyDOM` exposes the lifecycle helpers:

```typescript
await window.happyDOM.waitUntilComplete() // drain timers
window.happyDOM.setURL('https://example.com/next')
window.happyDOM.setViewport({ width: 375, height: 812 })
await window.happyDOM.abort() // cancel pending tasks
await window.happyDOM.close() // tear the window down
```

## Next steps

- [Configuration](/config) — every `Window` option
- [API Reference](/api) — the full supported surface
- [Drop-in Compatibility](/drop-in-compat) — migrating an existing suite
