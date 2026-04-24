# Drop-in Compatibility Guide

`very-happy-dom` is designed as a drop-in replacement for both **happy-dom**
and **jsdom** in testing environments. This guide walks through the common
migration paths, the API surface you can rely on, and the known limits.

---

## Quick migration

### From `@happy-dom/global-registrator`

One-line change — the `register`/`unregister` API matches exactly:

```diff
-import { GlobalRegistrator } from '@happy-dom/global-registrator'
+import { GlobalRegistrator } from 'very-happy-dom'

 GlobalRegistrator.register()
```

Or use the even simpler preload subpath:

```toml
# bunfig.toml
[test]
preload = ["very-happy-dom/register"]
```

The preload module auto-calls `GlobalRegistrator.register()`. Override the
default URL with `VERY_HAPPY_DOM_URL` or `HAPPY_DOM_URL` env variables.

### From `jsdom`

Replace the import — the public API matches:

```diff
-import { JSDOM } from 'jsdom'
+import { JSDOM } from 'very-happy-dom'
```

You can also import from the dedicated subpath:

```ts
import { JSDOM, VirtualConsole, CookieJar, ResourceLoader } from 'very-happy-dom/jsdom'
```

### From `happy-dom`

`new Window({ url, width, height, settings, console })` is the same shape:

```diff
-import { Window } from 'happy-dom'
+import { Window } from 'very-happy-dom'

 const window = new Window({ url: 'https://example.com/' })
```

---

## `JSDOM` class

### Constructor

```ts
new JSDOM(html?, options?)
```

| Option                 | Type                                    | Default              | Behavior                                                                 |
| ---------------------- | --------------------------------------- | -------------------- | ------------------------------------------------------------------------ |
| `url`                  | `string`                                | `'about:blank'`      | Sets `window.location.href`.                                             |
| `referrer`             | `string`                                | —                    | Sets `document.referrer`.                                                |
| `contentType`          | `string`                                | `'text/html'`        | Applied to `document.contentType` and used for parsing.                  |
| `includeNodeLocations` | `boolean`                               | `false`              | Accepted for shape compatibility; `nodeLocation()` returns `null`.       |
| `storageQuota`         | `number`                                | —                    | Accepted, no enforcement.                                                |
| `runScripts`           | `'dangerously' \| 'outside-only'`       | —                    | See [runScripts](#script-execution-runscripts).                          |
| `resources`            | `'usable' \| ResourceLoader`            | —                    | Accepted; subclass `ResourceLoader` for interception.                    |
| `virtualConsole`       | `VirtualConsole`                        | new one              | Captures `window.console` calls + uncaught errors (`jsdomError`).        |
| `cookieJar`            | `CookieJar`                             | new one              | Shared cookie storage accessible via `dom.cookieJar`.                    |
| `pretendToBeVisual`    | `boolean`                               | `false`              | Accepted; `requestAnimationFrame` always works.                          |
| `beforeParse`          | `(window: Window) => void`              | —                    | Runs before the HTML is applied.                                         |

### Instance API

| Member                | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `.window`             | The `Window` instance (happy-dom compatible).                                |
| `.virtualConsole`     | The `VirtualConsole` bound to this dom.                                     |
| `.cookieJar`          | The `CookieJar` bound to this dom.                                          |
| `.serialize()`        | Returns the document's HTML (`<!DOCTYPE html>` + `documentElement.outerHTML`). |
| `.reconfigure({ url })` | Changes `window.location.href` live.                                      |
| `.nodeLocation(node)` | Always returns `null` (node locations not tracked).                         |

### Static factories

```ts
JSDOM.fragment(html)            // returns a DocumentFragment
await JSDOM.fromFile(path, opts) // reads + parses a local file
await JSDOM.fromURL(url, opts)   // fetches + parses
```

### Lifecycle

On construction the document transitions through `readyState`:

1. `'loading'` (sync, during HTML parse)
2. `'interactive'` → `DOMContentLoaded` event (via microtask)
3. `'complete'` → `load` event on window

```ts
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
dom.window.document.addEventListener('DOMContentLoaded', () => {})
dom.window.addEventListener('load', () => {})
```

### Script execution (`runScripts`)

- `'outside-only'` — installs `window.eval` and `window.Function` so code
  evaluated via `window.eval('...')` runs in the Window's realm.
- `'dangerously'` — additionally scans the parsed document for inline
  `<script>` tags (no `src`, with JS MIME) and executes each via
  `new Function('window', 'document', 'with (window) { ...code... }')`. Errors
  are forwarded to `virtualConsole.emit('jsdomError', err)`.

```ts
const dom = new JSDOM(
  '<!DOCTYPE html><body><div id=out></div><script>document.getElementById("out").textContent = "hi"</script></body>',
  { runScripts: 'dangerously' },
)
dom.window.document.getElementById('out').textContent // "hi"
```

### `VirtualConsole`

```ts
const vc = new VirtualConsole()
vc.on('log', (...args) => console.log('captured:', ...args))
vc.on('jsdomError', (err) => console.error('uncaught:', err))
vc.sendTo(console)           // forward everything to the real console
const dom = new JSDOM('', { virtualConsole: vc })
```

Supported methods: `log`, `info`, `warn`, `error`, `debug`, `dir`, `dirxml`,
`trace`, `table`, `group`, `groupCollapsed`, `groupEnd`, `time`, `timeEnd`,
`timeLog`, `count`, `countReset`, `assert`, `clear`, `jsdomError`.
Additional methods: `.off(method, cb)`, `.removeAllListeners(method?)`,
`.listeners(method)`.

### `CookieJar`

Tough-cookie-style API with both callback and promise overloads:

```ts
const jar = new CookieJar()
await jar.setCookie('session=abc; Path=/', 'https://example.com/')
const str = await jar.getCookieString('https://example.com/')
const cookies = await jar.getCookies('https://example.com/')
```

### `ResourceLoader`

```ts
class Custom extends ResourceLoader {
  fetch(url: string, options: FetchOptions) {
    if (url.includes('/api/')) return Promise.resolve(Buffer.from('mock'))
    return super.fetch(url, options)
  }
}

new JSDOM('', { resources: new Custom({ userAgent: 'VeryHappy/1' }) })
```

---

## `Window` + `window.happyDOM`

```ts
const window = new Window({
  url: 'https://example.com/',
  width: 1280,
  height: 720,
  console: myConsole,        // optional
  settings: {
    navigator: { userAgent: 'MyUA/1.0' },
    device: { prefersColorScheme: 'dark' },
  },
})

window.happyDOM.settings           // live browser settings
window.happyDOM.setURL(url)        // swap URL without navigation
window.happyDOM.setViewport({ width, height })
await window.happyDOM.waitUntilComplete() // drain timers
await window.happyDOM.abort()             // cancel all pending
await window.happyDOM.close()             // clear DOM + storage
```

---

## Global registration

### `/register` preload (recommended)

```toml
# bunfig.toml
[test]
preload = ["very-happy-dom/register"]
```

Installs `window`, `document`, `navigator`, `history`, `localStorage`,
`sessionStorage`, `indexedDB`, all event classes, and every Window-bound
global onto `globalThis`. Window-bound keys (navigator, indexedDB,
BroadcastChannel, etc.) **override** Bun's runtime versions when they
collide — which is what test code expects.

### Manual `GlobalRegistrator.register()`

```ts
import { GlobalRegistrator } from 'very-happy-dom'

GlobalRegistrator.register({ url: 'https://test.example/' })
// ... run test ...
GlobalRegistrator.unregister()
```

Calling `register()` twice without unregistering throws.

---

## Drop-in API surface at a glance

### Network

| API                    | Notes                                                                             |
| ---------------------- | --------------------------------------------------------------------------------- |
| `fetch`                | Bun's native fetch. Intercept via `RequestInterceptor` if needed.                 |
| `XMLHttpRequest`       | Full event model (`load`, `error`, `loadstart`, `loadend`, `progress`, `timeout`). |
| `WebSocket`            | Bun's native WebSocket.                                                           |
| `EventSource`          | Real fetch-backed SSE with `event:`, `data:`, `id:`, `retry:` parsing.            |
| `BroadcastChannel`     | Same-realm broadcast between peers with matching names.                           |
| `MessageChannel` / `MessagePort` | Implicit `start()` on `onmessage` assignment.                           |
| `navigator.sendBeacon` | Fires a keepalive POST and returns `true`.                                         |

### Storage

| API                         | Notes                                                            |
| --------------------------- | ---------------------------------------------------------------- |
| `localStorage` / `sessionStorage` | Isolated per Window instance.                               |
| `document.cookie`           | Read/write round-trip through `CookieContainer`.                 |
| `indexedDB`                 | In-memory factory with `open`/`deleteDatabase`/`databases`/`cmp`. |
| `navigator.storage`         | `estimate()`, `persist()`, `persisted()`.                         |

### Forms

```ts
const form = document.querySelector('form')
form.checkValidity()
form.requestSubmit(submitterButton)
new FormData(form)               // populates from form fields
input.setCustomValidity('nope')
input.validity.valueMissing
input.validationMessage
```

### Media + Animation

```ts
const audio = document.createElement('audio')
await audio.play()               // returns Promise
audio.paused                     // false
audio.pause()
audio.volume = 0.5
audio.muted = true
audio.canPlayType('audio/mp3')   // 'maybe'

const anim = div.animate([...], { duration: 300 })
await anim.finished
```

### Observers

```ts
const mo = new MutationObserver((records) => { /* ... */ })
mo.observe(el, { attributes: true, childList: true, subtree: true })

const io = new IntersectionObserver((entries) => {})
io.observe(el)

const ro = new ResizeObserver((entries) => {})
ro.observe(el)

const po = new PerformanceObserver((list) => {})
po.observe({ entryTypes: ['mark', 'measure'] })
PerformanceObserver.supportedEntryTypes // ['mark', 'measure', ...]
```

### CSS

```ts
const sheet = new CSSStyleSheet()
sheet.replaceSync('.foo { color: red }')  // parses rules into sheet.cssRules
document.adoptedStyleSheets = [sheet]

CSS.supports('display', 'grid')            // true
CSS.supports('(display: grid)')            // true
CSS.escape('#id.with.dots')

const cs = getComputedStyle(el)
cs.display                                 // 'block' / 'inline' / ... by tag
cs.fontSize                                // '16px'
cs.getPropertyValue('color')               // 'rgb(0, 0, 0)'
```

### Events (focus model)

```ts
input.focus()   // fires focus + bubbling focusin; updates document.activeElement
input.blur()    // fires blur + bubbling focusout
```

---

## Scoped differences vs. jsdom

- **Script sandboxing:** `runScripts: 'dangerously'` uses `new Function` + `with (window)`. It works for trusted DOM-manipulation snippets but does **not** create an isolated VM realm. Untrusted code should not be executed.
- **Node locations:** `JSDOM.nodeLocation(node)` always returns `null` — source-map tracking is not implemented.
- **Resource fetching:** `ResourceLoader.fetch()` is available but the parser doesn't automatically load `<script src>` or external stylesheets.

## Scoped differences vs. happy-dom

- **`document.parentWindow`** is an alias for `defaultView` (same identity).
- **Timers:** `waitUntilComplete()` drains timers; it does not wait for arbitrary pending promises from fetch body consumption.
- **Layout:** `getBoundingClientRect()` returns the element's inline-style-derived size at position (0, 0) — there is no real layout engine.

---

## Complete example — migrating a Testing Library test

```ts
// Before: jsdom + Vitest environment
// vitest.config.ts → { test: { environment: 'jsdom' } }

// After: Bun + very-happy-dom
// bunfig.toml → [test]
//               preload = ["very-happy-dom/register"]

import { describe, expect, test } from 'bun:test'

describe('Button', () => {
  test('calls onClick', () => {
    document.body.innerHTML = '<button id="go">Go</button>'
    const button = document.getElementById('go')!
    let clicked = false
    button.addEventListener('click', () => { clicked = true })
    button.click()
    expect(clicked).toBe(true)
  })
})
```

No other changes — `document`, `window`, `HTMLButtonElement`, `MouseEvent`
are all on `globalThis` via the preload.

---

## Checklist

Use this when deciding if a given test suite will migrate cleanly:

- [ ] Does it rely on a real JS engine sandbox (e.g., scripts mutating
      `window.__proto__` from untrusted content)? — Out of scope.
- [ ] Does it rely on pixel-accurate layout measurement (`getBoundingClientRect`
      returning measured geometry)? — Best-effort only.
- [ ] Does it depend on node source locations? — Not tracked.
- [ ] Does it depend on Service Workers / Web Workers? — Not implemented.
- [ ] Everything else — should migrate unchanged.

See `test/compat.test.ts`, `test/compat-real-world.test.ts`, and
`test/compat-deep-integration.test.ts` for the full compatibility matrix in
executable form.
