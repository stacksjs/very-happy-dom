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
- **Network APIs** - Fetch, XMLHttpRequest, WebSocket, and request interception
- **Browser APIs** - Storage, Timers, Canvas 2D, Observers, Clipboard, History, Cookies, File API
- **Web Components** - Custom Elements and Shadow DOM
- **Framework Agnostic** - Works with Bun, Vitest, or any testing framework
- **Easy Migration** - API-compatible with happy-dom; one-line switch from jsdom

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

| Operation | very-happy-dom | happy-dom | jsdom |
|---|---|---|---|
| Window&nbsp;Creation | **4.08&nbsp;µs** | 92.83&nbsp;µs | 1.22&nbsp;ms |
| createElement | **463.02&nbsp;ns** | 2.62&nbsp;µs | 4.67&nbsp;µs |
| createElement&nbsp;+&nbsp;setAttribute | **748.35&nbsp;ns** | 15.41&nbsp;µs | 6.62&nbsp;µs |
| innerHTML&nbsp;(medium) | **41.61&nbsp;µs** | 47.48&nbsp;µs | 168.98&nbsp;µs |
| innerHTML&nbsp;(large,&nbsp;200&nbsp;nodes) | **1.92&nbsp;ms** | 3.72&nbsp;ms | 6.27&nbsp;ms |
| querySelector&nbsp;by&nbsp;ID | **81.03&nbsp;ns** | n/a | 2.76&nbsp;µs |
| querySelector&nbsp;by&nbsp;class | **242.20&nbsp;ns** | n/a | 3.52&nbsp;µs |
| querySelectorAll&nbsp;(200&nbsp;matches) | **66.44&nbsp;µs** | n/a | 66.55&nbsp;µs |
| querySelectorAll&nbsp;+&nbsp;iteration | **76.44&nbsp;µs** | n/a | 170.37&nbsp;µs |
| appendChild&nbsp;(single) | **1.70&nbsp;µs** | 4.58&nbsp;µs | 6.14&nbsp;µs |
| appendChild&nbsp;(1000&nbsp;children) | **852.90&nbsp;µs** | 1.54&nbsp;ms | 4.45&nbsp;ms |
| setAttribute | **124.66&nbsp;ns** | 2.64&nbsp;µs | 1.43&nbsp;µs |
| getAttribute | **2.18&nbsp;ns** | 28.85&nbsp;ns | 194.98&nbsp;ns |
| classList.add | **3.97&nbsp;µs** | 6.88&nbsp;µs | 4.87&nbsp;µs |
| addEventListener&nbsp;+&nbsp;dispatch | **2.67&nbsp;µs** | 5.43&nbsp;µs | 3.65&nbsp;µs |
| textContent&nbsp;set | **470.48&nbsp;ns** | 1.72&nbsp;µs | 4.67&nbsp;µs |
| cloneNode&nbsp;(deep) | **6.16&nbsp;µs** | 21.59&nbsp;µs | 15.55&nbsp;µs |
| style.setProperty | **490.62&nbsp;ns** | 4.20&nbsp;µs | 4.64&nbsp;µs |
| Build&nbsp;data&nbsp;table&nbsp;(50x5) | **519.30&nbsp;µs** | 754.42&nbsp;µs | 2.89&nbsp;ms |
| Update&nbsp;list&nbsp;items&nbsp;(100) | **454.98&nbsp;µs** | n/a | 2.41&nbsp;ms |

> **Note:** happy-dom's querySelector is incompatible with Bun (marked n/a). Benchmarks run on Apple M3 Pro with Bun 1.3.11. Run them yourself:

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

```typescript
// Before (jsdom)
import { JSDOM } from 'jsdom'
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
const { window } = dom
const { document } = window

// After (very-happy-dom)
import { Window } from 'very-happy-dom'
const window = new Window()
const document = window.document
```

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
- Attributes, ClassList, Style

#### Selectors

- querySelector / querySelectorAll
- getElementById / getElementsByClassName / getElementsByTagName
- CSS Selectors (all combinators)
- XPath

#### Events

- addEventListener / removeEventListener
- Event bubbling and capturing
- CustomEvent
- Event.preventDefault / stopPropagation

#### Network

- fetch(), Request / Response / Headers, FormData
- XMLHttpRequest
- WebSocket
- Request Interception

#### Storage

- localStorage, sessionStorage

#### Timers

- setTimeout / clearTimeout
- setInterval / clearInterval
- requestAnimationFrame / cancelAnimationFrame

#### Observers

- MutationObserver, IntersectionObserver, ResizeObserver

#### Canvas

- Canvas element, 2D rendering context
- Basic drawing operations, toDataURL / toBlob

#### Web Components

- Custom Elements, Shadow DOM

#### Other

- Performance API, Console API, Clipboard API, Navigator API
- Geolocation API, Notification API, History API, Location API
- Cookie API, File API, FileReader API

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

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/very-happy-dom/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/very-happy-dom -->
