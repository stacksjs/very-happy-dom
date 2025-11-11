<p align="center"><img src=".github/art/cover.jpg" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# very-happy-dom

A blazingly fast, lightweight virtual DOM implementation powered by Bun. Perfect for testing web applications without the overhead of a real browser.

## Why very-happy-dom?

**very-happy-dom** is designed to be a faster, leaner alternative to `happy-dom` and `jsdom` for testing environments. Built from the ground up with Bun's performance in mind, it provides a comprehensive browser-like environment for your tests.

### Performance

Built for speed with Bun, very-happy-dom delivers exceptional performance:

### Features

- 🚀 **Blazingly Fast** - Optimized for Bun's runtime
- 🪶 **Lightweight** - Minimal dependencies, small bundle size
- 🧪 **Test-Ready** - Drop-in replacement for happy-dom/jsdom
- 🔋 **Batteries Included** - Comprehensive browser API support
- 🎯 **Framework Agnostic** - Works with any testing framework
- 🔌 **Easy Migration** - Compatible with happy-dom's API

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

### Basic Usage

```typescript
import { Window } from 'very-happy-dom'

// Create a virtual browser environment
const window = new Window()
const document = window.document

// Use it like a real browser
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

### Testing React Components

```typescript
import { describe, expect, test } from 'bun:test'
import { Window } from 'very-happy-dom'

describe('React Component', () => {
  test('counter increments', () => {
    const window = new Window()
    global.window = window as any
    global.document = window.document as any

    // Your React component test here
    const button = document.querySelector('button')
    button?.click()

    expect(document.querySelector('.count')?.textContent).toBe('1')
  })
})
```

### Testing Vue Components

```typescript
import { describe, expect, test } from 'bun:test'
import { Window } from 'very-happy-dom'

describe('Vue Component', () => {
  test('updates on data change', () => {
    const window = new Window()
    global.window = window as any
    global.document = window.document as any

    // Your Vue component test here
  })
})
```

## Advanced Features

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

// Intercept and mock network requests
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

## API Reference

### Core Classes

- **Window** - Main window/global object with all browser APIs
- **Document** - DOM document with querySelector, createElement, etc.
- **Element** - DOM elements with full manipulation API
- **Browser** - Browser instance for advanced scenarios
- **BrowserContext** - Isolated browser contexts
- **BrowserPage** - Individual pages with navigation

### DOM APIs

- Complete DOM manipulation (createElement, appendChild, removeChild, etc.)
- CSS selectors (querySelector, querySelectorAll)
- Event system (addEventListener, removeEventListener, dispatchEvent)
- Attributes and properties (getAttribute, setAttribute, classList, etc.)
- XPath support (evaluate)

### Browser APIs

- **Fetch API** - fetch(), Request, Response, Headers, FormData
- **Storage API** - localStorage, sessionStorage
- **Timer APIs** - setTimeout, setInterval, requestAnimationFrame
- **Observer APIs** - MutationObserver, IntersectionObserver, ResizeObserver
- **WebSocket** - Full WebSocket implementation
- **Canvas API** - Basic 2D rendering context
- **File API** - File, FileReader, FileList
- **Clipboard API** - Clipboard and Navigator
- **Performance API** - Performance marks and measures
- **Console API** - Full console implementation

### Web Components

- Custom Elements (customElements.define)
- Shadow DOM (attachShadow)

## Migration Guide

### From happy-dom

very-happy-dom is designed to be API-compatible with happy-dom:

```typescript
// Before (happy-dom)
import { Window } from 'happy-dom'

// After (very-happy-dom)
import { Window } from 'very-happy-dom'

// The rest of your code stays the same!
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

### Key Differences

- **Faster** - Built for Bun's performance
- **Lighter** - Smaller bundle size, fewer dependencies
- **Modern** - Uses modern JavaScript features
- **Simpler** - Cleaner API surface

## Supported APIs

<details>
<summary>Click to expand full API list</summary>

### DOM
- ✅ Document
- ✅ Element
- ✅ TextNode
- ✅ CommentNode
- ✅ DocumentFragment
- ✅ Attributes
- ✅ ClassList
- ✅ Style

### Selectors
- ✅ querySelector / querySelectorAll
- ✅ getElementById / getElementsByClassName / getElementsByTagName
- ✅ CSS Selectors (all combinators)
- ✅ XPath

### Events
- ✅ addEventListener / removeEventListener
- ✅ Event bubbling and capturing
- ✅ CustomEvent
- ✅ Event.preventDefault / stopPropagation

### Network
- ✅ fetch()
- ✅ XMLHttpRequest
- ✅ WebSocket
- ✅ Request / Response / Headers
- ✅ FormData
- ✅ Request Interception

### Storage
- ✅ localStorage
- ✅ sessionStorage

### Timers
- ✅ setTimeout / clearTimeout
- ✅ setInterval / clearInterval
- ✅ requestAnimationFrame / cancelAnimationFrame

### Observers
- ✅ MutationObserver
- ✅ IntersectionObserver
- ✅ ResizeObserver

### Canvas
- ✅ Canvas element
- ✅ 2D rendering context
- ✅ Basic drawing operations
- ✅ toDataURL / toBlob

### Web Components
- ✅ Custom Elements
- ✅ Shadow DOM

### Other APIs
- ✅ Performance API
- ✅ Console API
- ✅ Clipboard API
- ✅ Navigator API
- ✅ Geolocation API
- ✅ Notification API
- ✅ History API
- ✅ Location API
- ✅ Cookie API
- ✅ File API
- ✅ FileReader API

</details>

## Testing

```bash
bun test                  # Run all tests
bun test --coverage      # Run with coverage
```

## Benchmarking

Run the full benchmark suite to see performance metrics:

```bash
bun run bench            # Run performance benchmarks
```

The benchmarks test various operations including DOM creation, manipulation, querying, events, Canvas API, and storage operations.

## Contributing

We welcome contributions! Please see [CONTRIBUTING](.github/CONTRIBUTING.md) for details.

## Changelog

Please see our [releases](https://github.com/stacksjs/very-happy-dom/releases) page for more information on what has changed recently.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/very-happy-dom/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

Very Happy DOM is free and open-source, but we'd love to receive a postcard from you! Send one to:

**Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎**

We showcase postcards from around the world on our website!

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## License

The MIT License (MIT). Please see [LICENSE](LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/very-happy-dom?style=flat-square
[npm-version-href]: https://npmjs.com/package/very-happy-dom
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/very-happy-dom/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/very-happy-dom/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/very-happy-dom/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/very-happy-dom -->
