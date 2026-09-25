# API Reference

## Core classes

| Class | Description |
| --- | --- |
| `Window` | Window/global object carrying all browser APIs |
| `VirtualDocument` | The document — `querySelector`, `createElement`, lifecycle |
| `VirtualElement` | Elements, with the full manipulation API |
| `Browser` | Browser instance for multi-page scenarios |
| `BrowserContext` | Isolated context with its own storage and cookies |
| `BrowserPage` | A single page, with navigation and request interception |
| `JSDOM` | jsdom-compatible entry point |
| `GlobalRegistrator` | Installs and removes browser globals |

```typescript
import {
  Browser,
  GlobalRegistrator,
  JSDOM,
  VirtualDocument,
  VirtualElement,
  Window,
} from 'very-happy-dom'
```

## DOM

- `VirtualDocument`, `VirtualElement`, `VirtualTextNode`, `VirtualCommentNode`, `VirtualDocumentFragment`
- Attributes, `classList` (iterable, `toggle(token, force)`, `replace`), `style`, `dataset`
- `innerHTML`, `outerHTML` (getter and setter), `insertAdjacentHTML`
- `document.readyState` lifecycle (`loading` → `interactive` → `complete`) plus `DOMContentLoaded` and `load`
- `document.cookie` read/write, `document.title` live getter/setter, `document.parentWindow` alias
- All standard `HTML*Element` subclasses, plus `SVG*Element`

## Selectors

- `querySelector` / `querySelectorAll`, `matches`, `closest`
- `getElementById`, `getElementsByClassName`, `getElementsByTagName`, `getElementsByTagNameNS`
- Full CSS selectors — combinators, attribute selectors (quoted and unquoted), `:not`, `:is`, `:where`, `:has`, `:nth-child`
- XPath — `document.evaluate`, `XPathEvaluator`, `XPathResult`, `XPathResultType`

```typescript
document.querySelectorAll('input[type="checkbox"]:not([disabled])')
document.querySelectorAll('section:has(> h2)')
element.closest('[data-root]')
```

## Events

- `addEventListener` / `removeEventListener` with `{ once, passive, capture, signal }`
- Bubbling, capturing, `stopPropagation`, `stopImmediatePropagation`
- Focus model — `focus`/`blur` plus bubbling `focusin`/`focusout`, with `document.activeElement` tracking

Event classes: `Event`, `CustomEvent`, `MouseEvent`, `KeyboardEvent`,
`PointerEvent`, `TouchEvent`, `WheelEvent`, `InputEvent`, `FocusEvent`,
`SubmitEvent`, `DragEvent`, `ClipboardEvent`, `AnimationEvent`,
`TransitionEvent`, `CompositionEvent`, `ProgressEvent`, `MessageEvent`,
`CloseEvent`, `StorageEvent`, `PopStateEvent`, `HashChangeEvent`, `ErrorEvent`,
`MediaQueryListEvent`.

## Network

- `fetch()`, `Request`, `Response`, `Headers`
- `FormData`, including `new FormData(form)` populated from a form element
- `XMLHttpRequest` with full event handling
- `WebSocket`, backed by Bun's native implementation
- `EventSource` (Server-Sent Events) — real `fetch` plus stream parsing
- `BroadcastChannel`, `MessageChannel`, `MessagePort`
- `navigator.sendBeacon()`
- Request interception via `RequestInterceptor` and `page.setRequestInterception()`

### Request interception

Interception is attached per page, Puppeteer-style:

```typescript
import type { InterceptedRequest } from 'very-happy-dom'
import { Browser } from 'very-happy-dom'

const browser = new Browser()
const page = browser.newPage()

page.on('request', (request: InterceptedRequest) => {
  request.respond({ status: 200, body: '{"ok":true}' })
})

await page.setRequestInterception(true)
```

An `InterceptedRequest` carries `url`, `method`, `headers`, `postData` and
`resourceType`, and is finished with exactly one of:

| Method | Effect |
| --- | --- |
| `continue(overrides?)` | Let it through, optionally rewriting `url`, `method`, `headers` or `postData` |
| `respond({ status, headers?, body })` | Fulfil it without hitting the network |
| `abort(errorCode?)` | Fail it |

## Storage

- `localStorage`, `sessionStorage` — isolated per `Window`
- `document.cookie`, backed by `CookieContainer`
- `indexedDB` — in-memory `IDBFactory`, `IDBDatabase`, `IDBObjectStore`, `IDBTransaction`
- `navigator.storage` with `estimate()`, `persist()`, `persisted()`

## Timers

- `setTimeout` / `clearTimeout`, `setInterval` / `clearInterval`
- `requestAnimationFrame` / `cancelAnimationFrame`
- `requestIdleCallback` / `cancelIdleCallback`
- `queueMicrotask`

Drain them with `await window.happyDOM.waitUntilComplete()`.

## Observers

- `MutationObserver` — `childList`, `attributes`, `characterData`, `subtree`, `oldValue`, filters
- `IntersectionObserver`, `ResizeObserver`
- `PerformanceObserver`, with `supportedEntryTypes`

## Canvas and screenshots

- `HTMLCanvasElement.getContext('2d')`, `toDataURL()`, `toBlob(callback)`
- `CanvasRenderingContext2D` with the full drawing surface
- Pure-JS rendering pipeline — `ScreenshotCapture`, `captureHtml`, `captureUrl`, `compareImages`, WebP/PNG encoders
- Optional `Bun.WebView`-backed real-browser screenshots via `useWebView: true`

Only the `2d` context exists; `getContext('webgl')` returns `null`.

## Web Components and CSS

- `customElements.define` / `.get` / `.whenDefined`, with `connected`, `disconnected`, `adopted` and `attributeChanged` callbacks
- Shadow DOM (open and closed), event retargeting, slots
- `CSSStyleSheet` with `replaceSync()` parsing declarations into `cssRules`
- `document.adoptedStyleSheets`
- `CSS.supports()`, `CSS.escape()`
- `getComputedStyle()` with per-tag `display` defaults and common computed fallbacks

## Forms

- Constraint validation — `checkValidity`, `reportValidity`, `setCustomValidity`, `validity`, `validationMessage`, `willValidate`
- `form.submit()`, `form.requestSubmit(submitter?)`, `form.reset()`
- `new FormData(form)` populates from disabled, checkbox, radio, select and file fields

## Media

- `HTMLMediaElement.play()` returning a Promise, plus `pause()`, `load()`, `canPlayType()`
- `currentTime`, `duration`, `paused`, `ended`, `volume`, `muted`, `playbackRate`, `readyState`, `networkState`
- Dispatches `play`, `playing`, `pause`, `timeupdate`, `volumechange`, `ratechange`, `loadstart`, `loadedmetadata`
- `HTMLImageElement.decode()`, `Element.animate()`

## jsdom-compatible surface

- `JSDOM` with `.window`, `.serialize()`, `.reconfigure()`, `.nodeLocation()`, and static `fragment` / `fromURL` / `fromFile`
- `VirtualConsole` with `on` / `off` / `emit` / `sendTo`, and `jsdomError` for uncaught exceptions
- `CookieJar` — tough-cookie-style callback and promise APIs
- `ResourceLoader` — subclassable fetch interceptor
- `runScripts: 'outside-only' | 'dangerously'` for opt-in inline-script execution

Available from the main entry or from `very-happy-dom/jsdom`. See
[Drop-in Compatibility](/drop-in-compat) for the differences that remain.

## happy-dom-compatible surface

- `Window` accepting `url`, `width`, `height`, `console` and `settings`
- `window.happyDOM` with `close`, `abort`, `waitUntilComplete`, `setURL`, `setViewport`
- `GlobalRegistrator.register()` / `.unregister()`
- The `very-happy-dom/register` subpath for one-line preload

## Other APIs

- Performance API and `PerformanceObserver`
- `navigator.permissions.query()`, `navigator.sendBeacon()`
- Clipboard API and `ClipboardItem`
- Geolocation API, Notification API
- History API — `pushState`, `replaceState`, `back`, `forward`, `go`, `state`
- Location API — `href`, `protocol`, `host`, `hostname`, `port`, `pathname`, `search`, `hash`, `origin`, with assignment setters
- File API — `File`, `FileReader`, `FileList`, `Blob`
- `URL`, `URLSearchParams`, `AbortController`, `AbortSignal`
- `TextEncoder`, `TextDecoder`, `ReadableStream`, `WritableStream`, `TransformStream`
- `DOMParser`, `XMLSerializer`, `Range`, `Selection`, `NodeIterator`, `TreeWalker`
- `DOMRect`, `DOMMatrix`, `DOMPoint`, `Screen`, `MediaQueryList`

## Not implemented

Worth knowing before you migrate:

- WebGL — `getContext('webgl')` and `getContext('webgl2')` return `null`
- `Worker`, `SharedWorker`, and `navigator.serviceWorker`
- `caches` / the Cache Storage API
- `ElementInternals` and `attachInternals()`, so form-associated custom elements are unavailable
- `OffscreenCanvas`, `ImageData`, `Path2D`
- `visualViewport`
- `CompressionStream` / `DecompressionStream`
- CSS Typed OM `computedStyleMap()`
- Real layout — see [Drop-in Compatibility](/drop-in-compat)
