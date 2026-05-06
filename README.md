<p align="center"><img src=".github/art/cover.jpg" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly][commitizen-src]][commitizen-href]
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# very-happy-dom

A blazingly fast, lightweight virtual DOM implementation powered by Bun. Drop-in replacement for happy-dom and jsdom in testing environments.

## Features

- **Comprehensive DOM** - Full DOM manipulation, CSS selectors, XPath, events with bubbling/capturing
- **Network APIs** - Fetch, XMLHttpRequest, WebSocket, Server-Sent Events, BroadcastChannel, MessageChannel, request interception
- **Browser APIs** - Storage, Timers, Canvas 2D, Observers (Mutation/Intersection/Resize/Performance), Clipboard, History, Cookies, File API, IndexedDB, Web Storage
- **Web Components** - Custom Elements and Shadow DOM
- **Framework Agnostic** - Works with Bun, Vitest, or any testing framework
- **jsdom-compatible** - Real `JSDOM` class with `.serialize()`, `.reconfigure()`, `.fromURL()`, `.fromFile()`, `.fragment()`, `VirtualConsole`, `CookieJar`, `ResourceLoader`
- **happy-dom-compatible** - Drop-in for `GlobalRegistrator`, `window.happyDOM` API, virtual consoles
- **Screenshot** - Pure-JS PNG/JPEG/WebP rendering + optional `Bun.WebView` real-browser screenshots

## Installation

```bash
bun add -d very-happy-dom
```

Or with npm/pnpm:

```bash
npm install --save-dev very-happy-dom
pnpm add -D very-happy-dom
```

## Quick Start

```typescript
import { Window } from 'very-happy-dom'

const window = new Window()
const document = window.document

document.body.innerHTML = '<h1>Hello World</h1>'
const heading = document.querySelector('h1')
console.log(heading?.textContent) // "Hello World"
```

### Testing with Bun

The simplest way — create a `Window` per test:

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

### Global DOM Environment

For Testing Library, React, and other frameworks that expect browser globals (`document`, `window`, etc.), either use the one-line preload subpath or call `GlobalRegistrator` manually.

**Easiest — the `/register` subpath:**

```toml
# bunfig.toml
[test]
preload = ["very-happy-dom/register"]
```

You can override the URL with `VERY_HAPPY_DOM_URL` or `HAPPY_DOM_URL` env vars.

**Manual — drop-in for `@happy-dom/global-registrator`:**

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

That's it. All browser globals are now available in your tests:

```typescript
import { test, expect } from 'bun:test'
import { screen, render } from '@testing-library/react'
import { MyComponent } from './MyComponent'

test('renders correctly', () => {
  render(<MyComponent />)
  expect(screen.getByTestId('my-component')).toBeInTheDocument()
})
```

### Migrating from happy-dom

One-line change — the `GlobalRegistrator` API is the same:

```diff
-import { GlobalRegistrator } from '@happy-dom/global-registrator'
+import { GlobalRegistrator } from 'very-happy-dom'

GlobalRegistrator.register()
```

## Advanced Usage

### Browser Context

```typescript
import { Browser } from 'very-happy-dom'

const browser = new Browser()
const context = browser.createContext()
const page = context.newPage()

page.goto('https://example.com')
```

### Request Interception

```typescript
import { Window } from 'very-happy-dom'

const window = new Window()

window.interceptor.addInterceptor({
  onRequest: (request) => {
    if (request.url.includes('/api/')) {
      return new Response(JSON.stringify({ mocked: true }))
    }
    return request
  }
})
```

### Custom Window Configuration

```typescript
import { Window } from 'very-happy-dom'

const window = new Window({
  url: 'https://example.com',
  width: 1920,
  height: 1080,
  settings: {
    navigator: {
      userAgent: 'MyCustomUserAgent/1.0'
    },
    device: {
      prefersColorScheme: 'dark'
    }
  }
})
```

### Event Handling

```typescript
const window = new Window()
const document = window.document

const button = document.createElement('button')
let clicked = false

button.addEventListener('click', () => {
  clicked = true
})

button.click()
console.log(clicked) // true
```

### Storage APIs

```typescript
const window = new Window()

// localStorage
window.localStorage.setItem('key', 'value')
console.log(window.localStorage.getItem('key')) // "value"

// sessionStorage
window.sessionStorage.setItem('session', 'data')
```

### Observers

```typescript
const window = new Window()
const document = window.document

// MutationObserver
const observer = new window.MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    console.log('DOM changed:', mutation.type)
  })
})

observer.observe(document.body, {
  childList: true,
  attributes: true,
  subtree: true
})

// IntersectionObserver
const io = new window.IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    console.log('Visibility changed:', entry.isIntersecting)
  })
})

// ResizeObserver
const ro = new window.ResizeObserver((entries) => {
  entries.forEach((entry) => {
    console.log('Size changed:', entry.contentRect)
  })
})
```

### Canvas API

```typescript
const window = new Window()
const document = window.document

const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')

ctx.fillStyle = 'red'
ctx.fillRect(0, 0, 100, 100)
ctx.strokeStyle = 'blue'
ctx.strokeRect(10, 10, 80, 80)

// Export canvas data
const dataUrl = canvas.toDataURL()
const blob = await canvas.toBlob()
```

## Performance

### vs happy-dom vs jsdom

| Operation | very-happy-dom | happy-dom | jsdom | Faster&nbsp;by |
|---|---|---|---|---|
| Window&nbsp;Creation | **4.08&nbsp;µs** | 92.83&nbsp;µs | 1.22&nbsp;ms | 22.7x |
| createElement | **463.02&nbsp;ns** | 2.62&nbsp;µs | 4.67&nbsp;µs | 5.7x |
| createElement&nbsp;+&nbsp;setAttribute | **748.35&nbsp;ns** | 15.41&nbsp;µs | 6.62&nbsp;µs | 8.8x |
| innerHTML&nbsp;(medium) | **41.61&nbsp;µs** | 47.48&nbsp;µs | 168.98&nbsp;µs | 1.1x |
| innerHTML&nbsp;(large,&nbsp;200&nbsp;nodes) | **1.92&nbsp;ms** | 3.72&nbsp;ms | 6.27&nbsp;ms | 1.9x |
| querySelector&nbsp;by&nbsp;ID | **81.03&nbsp;ns** | n/a | 2.76&nbsp;µs | 34.1x |
| querySelector&nbsp;by&nbsp;class | **242.20&nbsp;ns** | n/a | 3.52&nbsp;µs | 14.5x |
| querySelectorAll&nbsp;(200&nbsp;matches) | **66.44&nbsp;µs** | n/a | 66.55&nbsp;µs | ~1x |
| querySelectorAll&nbsp;+&nbsp;iteration | **76.44&nbsp;µs** | n/a | 170.37&nbsp;µs | 2.2x |
| appendChild&nbsp;(single) | **1.70&nbsp;µs** | 4.58&nbsp;µs | 6.14&nbsp;µs | 2.7x |
| appendChild&nbsp;(1000&nbsp;children) | **852.90&nbsp;µs** | 1.54&nbsp;ms | 4.45&nbsp;ms | 1.8x |
| setAttribute | **124.66&nbsp;ns** | 2.64&nbsp;µs | 1.43&nbsp;µs | 11.5x |
| getAttribute | **2.18&nbsp;ns** | 28.85&nbsp;ns | 194.98&nbsp;ns | 13.2x |
| classList.add | **3.97&nbsp;µs** | 6.88&nbsp;µs | 4.87&nbsp;µs | 1.2x |
| addEventListener&nbsp;+&nbsp;dispatch | **2.67&nbsp;µs** | 5.43&nbsp;µs | 3.65&nbsp;µs | 1.4x |
| textContent&nbsp;set | **470.48&nbsp;ns** | 1.72&nbsp;µs | 4.67&nbsp;µs | 3.7x |
| cloneNode&nbsp;(deep) | **6.16&nbsp;µs** | 21.59&nbsp;µs | 15.55&nbsp;µs | 2.5x |
| style.setProperty | **490.62&nbsp;ns** | 4.20&nbsp;µs | 4.64&nbsp;µs | 8.6x |
| Build&nbsp;data&nbsp;table&nbsp;(50x5) | **519.30&nbsp;µs** | 754.42&nbsp;µs | 2.89&nbsp;ms | 1.5x |
| Update&nbsp;list&nbsp;items&nbsp;(100) | **454.98&nbsp;µs** | n/a | 2.41&nbsp;ms | 5.3x |

> **Note:** "Faster by" compares very-happy-dom to the next-fastest result. Benchmarks run on Apple M3 Pro with Bun 1.3.11. Run them yourself:

```bash
bun run bench
```

## Migration

### From happy-dom

One-line change — the API is compatible:

```typescript
// Before
import { Window } from 'happy-dom'

// After
import { Window } from 'very-happy-dom'
```

### From jsdom

very-happy-dom ships a jsdom-compatible `JSDOM` class — the exact idiom works unchanged:

```typescript
// Before (jsdom)
import { JSDOM } from 'jsdom'

// After (very-happy-dom) — one-line change
import { JSDOM } from 'very-happy-dom'
// or: import { JSDOM } from 'very-happy-dom/jsdom'

const dom = new JSDOM('<!DOCTYPE html><html><body><h1>Hi</h1></body></html>', {
  url: 'https://example.com/',
  runScripts: 'dangerously',
})
const { window } = dom
const { document } = window

dom.serialize()                       // full HTML string
dom.reconfigure({ url: '...' })       // change URL mid-test
JSDOM.fragment('<p>x</p>')            // DocumentFragment
await JSDOM.fromFile('./page.html')   // parse a local file
await JSDOM.fromURL('https://x.test') // fetch + parse
```

Full surface: `JSDOM`, `VirtualConsole`, `CookieJar`, `ResourceLoader` — each with the same method names and overloads as jsdom.

See the [drop-in compatibility guide][drop-in-compat-href] for the complete migration reference.

## API Reference

### Core Classes

- **Window** - Main window/global object with all browser APIs
- **Document** - DOM document with querySelector, createElement, etc.
- **Element** - DOM elements with full manipulation API
- **Browser** - Browser instance for advanced scenarios
- **BrowserContext** - Isolated browser contexts
- **BrowserPage** - Individual pages with navigation

### Supported APIs

<details>
<summary>Click to expand full API list</summary>

#### DOM

- Document, Element, TextNode, CommentNode, DocumentFragment
- Attributes, ClassList (iterable, `toggle(x, force)`, `replace`), Style, dataset
- `innerHTML`, `outerHTML` (getter + setter), `insertAdjacentHTML`
- `document.readyState` lifecycle (loading → interactive → complete) + `DOMContentLoaded` + `load`
- `document.cookie` read/write, `document.title` live getter/setter, `document.parentWindow` alias

#### Selectors

- `querySelector` / `querySelectorAll`, `matches`, `closest`
- `getElementById` / `getElementsByClassName` / `getElementsByTagName` / `getElementsByTagNameNS`
- Full CSS selectors — combinators, attribute selectors (quoted + unquoted), `:not`, `:is`, `:where`, `:has`, `:nth-child`, etc.
- XPath (`document.evaluate`, `XPathEvaluator`, `XPathResult`)

#### Events

- `addEventListener` / `removeEventListener` with `{ once, passive, capture, signal }`
- Bubbling, capturing, `stopPropagation`, `stopImmediatePropagation`
- Full event classes: `Event`, `CustomEvent`, `MouseEvent`, `KeyboardEvent`, `PointerEvent`, `TouchEvent`, `WheelEvent`, `InputEvent`, `FocusEvent`, `SubmitEvent`, `DragEvent`, `ClipboardEvent`, `AnimationEvent`, `TransitionEvent`, `CompositionEvent`, `ProgressEvent`, `MessageEvent`, `CloseEvent`, `StorageEvent`, `PopStateEvent`, `HashChangeEvent`, `ErrorEvent`, `MediaQueryListEvent`
- Focus model: `focus`/`blur` + bubbling `focusin`/`focusout`, `document.activeElement` tracking

#### Network

- `fetch()`, `Request`, `Response`, `Headers`, `FormData` (with `new FormData(form)` populating from a form element)
- `XMLHttpRequest` with full event handling
- `WebSocket` (backed by Bun's native)
- `EventSource` (Server-Sent Events) — real `fetch` + stream parsing
- `BroadcastChannel`, `MessageChannel`, `MessagePort`
- `navigator.sendBeacon()`
- Request Interception via `RequestInterceptor`

#### Storage

- `localStorage`, `sessionStorage` (isolated per instance)
- `document.cookie` → `CookieContainer`
- `indexedDB` — in-memory `IDBFactory`/`IDBDatabase`/`IDBObjectStore`/`IDBTransaction`
- `navigator.storage` with `estimate()`/`persist()`/`persisted()`

#### Timers

- `setTimeout` / `clearTimeout`, `setInterval` / `clearInterval`
- `requestAnimationFrame` / `cancelAnimationFrame`
- `requestIdleCallback` / `cancelIdleCallback`
- `queueMicrotask`

#### Observers

- `MutationObserver` (childList, attributes, characterData, subtree, oldValue, filters)
- `IntersectionObserver`, `ResizeObserver`
- `PerformanceObserver` with `supportedEntryTypes`

#### Canvas + Screenshots

- `HTMLCanvasElement.getContext('2d')`, `toDataURL`/`toBlob`
- `CanvasRenderingContext2D` with full drawing surface
- Pure-JS rendering pipeline: `ScreenshotCapture`, `captureHtml`, `captureUrl`, `compareImages`, WebP/PNG encoders
- Optional `Bun.WebView`-backed real-browser screenshots (`useWebView: true`)

#### Web Components + CSS

- `customElements.define/.get/.whenDefined`, lifecycle callbacks (`connected`/`disconnected`/`adopted`/`attributeChanged`)
- Shadow DOM (open + closed), event retargeting, slot support
- `CSSStyleSheet` with `replaceSync()` parsing declarations into `cssRules`
- `document.adoptedStyleSheets`
- `CSS.supports()`, `CSS.escape()`
- `getComputedStyle()` with per-tag `display` defaults + common computed fallbacks

#### Forms

- Constraint validation: `checkValidity`, `reportValidity`, `setCustomValidity`, `validity`, `validationMessage`, `willValidate`
- `form.submit()`, `form.requestSubmit(submitter?)`, `form.reset()`
- `new FormData(form)` populates from disabled/checkbox/radio/select/file fields

#### Media

- `HTMLMediaElement.play()` → Promise, `pause()`, `load()`, `canPlayType()`
- `currentTime`, `duration`, `paused`, `ended`, `volume`, `muted`, `playbackRate`, `readyState`, `networkState`
- Dispatches `play`, `playing`, `pause`, `timeupdate`, `volumechange`, `ratechange`, `loadstart`, `loadedmetadata`
- `HTMLImageElement.decode()`, `Element.animate()`

#### jsdom-compatible surface

- `JSDOM` class with `.window`, `.serialize()`, `.reconfigure()`, `.nodeLocation()`, static `fragment`/`fromURL`/`fromFile`
- `VirtualConsole` with `on/off/emit/sendTo`, `jsdomError` for uncaught exceptions
- `CookieJar` (tough-cookie-style callback + promise API)
- `ResourceLoader` (subclassable fetch interceptor)
- `runScripts: 'outside-only' | 'dangerously'` — opt-in inline-script execution

#### happy-dom-compatible surface

- `Window` with `url`, `width`, `height`, `console`, `settings` options
- `window.happyDOM` with `close/abort/waitUntilComplete/setURL/setViewport`
- `GlobalRegistrator.register/unregister`
- `/register` subpath for one-line preload

#### Other

- Performance API + `PerformanceObserver`
- `navigator.permissions.query()`, `navigator.sendBeacon()`
- Clipboard API + `ClipboardItem`
- Geolocation API, Notification API
- History API (`pushState`/`replaceState`/`back`/`forward`/`go`/`state`)
- Location API (full `href`/`protocol`/`host`/`hostname`/`port`/`pathname`/`search`/`hash`/`origin` + assignment setters)
- File API (`File`, `FileReader`, `FileList`, `Blob`)
- `URL`, `URLSearchParams`, `AbortController`, `AbortSignal`
- `TextEncoder`, `TextDecoder`, `ReadableStream`, `WritableStream`, `TransformStream`
- `DOMParser`, `XMLSerializer`, `Range`, `Selection`, `NodeIterator`, `TreeWalker`

</details>

## Testing

```bash
bun test                  # Run all tests
bun test --coverage      # Run with coverage
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING][contributing-href] for details.

## Changelog

Please see our [releases][releases-href] page for more information on what has changed recently.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub][discussions-href]

For casual chit-chat with others using this package:

[Join the Stacks Discord Server][discord-href]

## Postcardware

Very Happy DOM is free and open-source, but we'd love to receive a postcard from you! Send one to:

<!-- eslint-disable-next-line markdown/no-emphasis-as-heading -->
**Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎**

We showcase postcards from around the world on our website!

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains][jetbrains-href]
- [The Solana Foundation][solana-href]

## License

The MIT License (MIT). Please see [LICENSE][license-href] for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/very-happy-dom?style=flat-square
[npm-version-href]: https://npmjs.com/package/very-happy-dom
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/very-happy-dom/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/very-happy-dom/actions?query=workflow%3Aci
[commitizen-src]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
[commitizen-href]: http://commitizen.github.io/cz-cli/
[contributing-href]: .github/CONTRIBUTING.md
[releases-href]: https://github.com/stacksjs/very-happy-dom/releases
[discussions-href]: https://github.com/stacksjs/very-happy-dom/discussions
[discord-href]: https://discord.gg/stacksjs
[jetbrains-href]: https://www.jetbrains.com/
[solana-href]: https://solana.com/
[license-href]: LICENSE.md
[drop-in-compat-href]: ./docs/drop-in-compat.md

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/very-happy-dom/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/very-happy-dom -->
