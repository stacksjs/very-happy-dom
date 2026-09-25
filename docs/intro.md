<p align="center"><img src="https://github.com/stacksjs/very-happy-dom/blob/main/.github/art/cover.jpg?raw=true" alt="Social Card of this repo"></p>

# Introduction

`very-happy-dom` is a blazingly fast, lightweight virtual DOM implementation
powered by Bun. It is built to be a drop-in replacement for **happy-dom** and
**jsdom** in testing environments — so you can keep your existing test suite
and change an import.

Most operations complete in microseconds: creating a `Window` takes around
4 µs, and `querySelector` by ID around 81 ns. See [Performance](/performance)
for the full comparison.

## Why another DOM

Test suites spend a surprising amount of time constructing and tearing down
DOM environments. `jsdom` is thorough but heavy — a single `JSDOM` instance
costs well over a millisecond. `happy-dom` is considerably lighter, but still
carries per-instance overhead that adds up across thousands of tests.

`very-happy-dom` targets Bun specifically, which lets it lean on the runtime's
native `fetch`, `WebSocket`, streams and URL implementations instead of
reimplementing them. What remains is a focused DOM, selector engine and event
system.

The trade-off is deliberate: this is a DOM for **testing**, not a browser.
There is no layout engine and no script sandbox. The
[drop-in compatibility guide](/drop-in-compat) documents exactly where the
behaviour differs from jsdom and happy-dom.

## Features

- **Comprehensive DOM** — Full DOM manipulation, CSS selectors, XPath, events with bubbling/capturing
- **Network APIs** — Fetch, XMLHttpRequest, WebSocket, Server-Sent Events, BroadcastChannel, MessageChannel, request interception
- **Browser APIs** — Storage, Timers, Canvas 2D, Observers (Mutation/Intersection/Resize/Performance), Clipboard, History, Cookies, File API, IndexedDB, Web Storage
- **Web Components** — Custom Elements and Shadow DOM
- **Framework Agnostic** — Works with Bun, Vitest, or any testing framework
- **jsdom-compatible** — Real `JSDOM` class with `.serialize()`, `.reconfigure()`, `.fromURL()`, `.fromFile()`, `.fragment()`, plus `VirtualConsole`, `CookieJar`, `ResourceLoader`
- **happy-dom-compatible** — Drop-in for `GlobalRegistrator`, the `window.happyDOM` API, virtual consoles
- **Screenshot** — Pure-JS PNG/JPEG/WebP rendering, plus optional `Bun.WebView` real-browser screenshots

## A quick taste

```typescript
import { Window } from 'very-happy-dom'

const window = new Window()
const document = window.document

document.body.innerHTML = '<h1>Hello World</h1>'
const heading = document.querySelector('h1')
console.log(heading?.textContent) // "Hello World"
```

## Where to next

- [Installation](/install) — add it to your project
- [Usage](/usage) — per-test windows, global registration, and the advanced APIs
- [Drop-in Compatibility](/drop-in-compat) — migrating from happy-dom or jsdom
- [API Reference](/api) — the full supported surface
- [Configuration](/config) — `Window` options and settings

## Community

For help, discussion about best practices, or any other conversation that
would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/very-happy-dom/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://stacksjs.com/discord)

## Contributing

Please see [CONTRIBUTING](https://github.com/stacksjs/very-happy-dom/blob/main/.github/CONTRIBUTING.md) for details.

## License

The MIT License (MIT). Please see [LICENSE](https://github.com/stacksjs/very-happy-dom/tree/main/LICENSE.md) for more information.
