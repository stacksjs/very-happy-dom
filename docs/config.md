# Configuration

`very-happy-dom` is configured per `Window` — there is no config file. The same
options are accepted by `new Window(...)` and by `GlobalRegistrator.register(...)`.

## `WindowOptions`

```typescript
interface WindowOptions {
  url?: string
  width?: number
  height?: number
  console?: Console
  settings?: {
    navigator?: {
      userAgent?: string
    }
    device?: {
      prefersColorScheme?: 'light' | 'dark'
    }
  }
}
```

| Option | Default | Description |
| --- | --- | --- |
| `url` | `about:blank` | Document URL. Drives `location`, relative URL resolution and cookie scope. |
| `width` | `1024` | Viewport width, reported by `innerWidth` and width media queries. |
| `height` | `768` | Viewport height, reported by `innerHeight`. |
| `console` | global `console` | Console instance the window logs through. |
| `settings.navigator.userAgent` | `Mozilla/5.0 (X11; Linux x64) AppleWebKit/537.36 (KHTML, like Gecko) VeryHappyDOM/1.0.0` | Value of `navigator.userAgent`. |
| `settings.device.prefersColorScheme` | `light` | Resolves `(prefers-color-scheme: …)` media queries. |

## A fully configured window

```typescript
import { Window } from 'very-happy-dom'

const window = new Window({
  url: 'https://example.com/dashboard?tab=1',
  width: 1920,
  height: 1080,
  settings: {
    navigator: {
      userAgent: 'MyCustomUserAgent/1.0',
    },
    device: {
      prefersColorScheme: 'dark',
    },
  },
})

window.location.pathname // "/dashboard"
window.location.search // "?tab=1"
window.innerWidth // 1920
window.navigator.userAgent // "MyCustomUserAgent/1.0"
window.matchMedia('(prefers-color-scheme: dark)').matches // true
```

## URL

Setting `url` makes relative requests, `document.cookie` and the History API
behave as they would on that origin. It is also what `document.baseURI`
resolves against.

```typescript
const window = new Window({ url: 'https://example.com/a/b' })
window.location.href // "https://example.com/a/b"
window.location.origin // "https://example.com"
```

Change it later through the `happyDOM` API:

```typescript
window.happyDOM.setURL('https://example.com/next')
```

## Viewport

`width` and `height` feed `innerWidth`/`innerHeight` and the width/height media
queries:

```typescript
const window = new Window({ width: 1024 })
window.matchMedia('(min-width: 768px)').matches // true
window.matchMedia('(min-width: 1200px)').matches // false
```

They can be changed after construction:

```typescript
window.happyDOM.setViewport({ width: 375, height: 812 })
```

Note that this is viewport *reporting* only. There is no layout engine, so
element geometry comes from inline styles rather than from real layout — see
[Drop-in Compatibility](/drop-in-compat).

## Capturing console output

Pass your own `console` to keep test output quiet or to assert on it:

```typescript
const lines: string[] = []

const window = new Window({
  console: {
    ...console,
    log: (...args: unknown[]) => lines.push(args.join(' ')),
  } as Console,
})
```

For the jsdom-style equivalent, `VirtualConsole` offers `on`/`off`/`emit`/`sendTo`:

```typescript
import { JSDOM, VirtualConsole } from 'very-happy-dom'

const virtualConsole = new VirtualConsole()
virtualConsole.on('error', message => console.error('page error:', message))

const dom = new JSDOM('<p>hi</p>', { virtualConsole })
```

## Global registration

`GlobalRegistrator.register()` takes the same `WindowOptions`, applied to the
window it installs onto `globalThis`:

```typescript
import { GlobalRegistrator } from 'very-happy-dom'

GlobalRegistrator.register({
  url: 'https://example.com/',
  width: 1280,
  height: 720,
})

// later
GlobalRegistrator.unregister()
```

Calling `register()` twice without `unregister()` throws.

### Environment variables

The `very-happy-dom/register` preload reads its URL from the environment, since
there is nowhere to pass options:

| Variable | Description |
| --- | --- |
| `VERY_HAPPY_DOM_URL` | URL for the registered window. Checked first. |
| `HAPPY_DOM_URL` | happy-dom-compatible fallback. |

If neither is set the URL defaults to `http://localhost/`.

```toml
# bunfig.toml
[test]
preload = ["very-happy-dom/register"]
```

```bash
VERY_HAPPY_DOM_URL=https://example.com/ bun test
```

## Runtime control: `window.happyDOM`

Every window exposes the happy-dom-compatible `DetachedWindowAPI`:

| Method | Description |
| --- | --- |
| `waitUntilComplete()` | Resolves once pending timers have drained. |
| `abort()` | Cancels pending tasks. |
| `close()` | Tears the window down. |
| `setURL(url)` | Changes the document URL. |
| `setViewport({ width?, height? })` | Resizes the viewport. |

```typescript
await window.happyDOM.waitUntilComplete()
await window.happyDOM.close()
```

`waitUntilComplete()` drains timers; it does not wait on arbitrary pending
promises.

## Reading settings back

Resolved settings are readable on the window, which is useful for asserting what
a test environment actually has:

```typescript
window.settings.navigator.userAgent
window.settings.device.prefersColorScheme
```
