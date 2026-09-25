# Installation

`very-happy-dom` is a library you install as a dev dependency — it has no CLI
and ships no binaries.

## Requirements

Bun is required. The package targets the Bun runtime and relies on it for
`fetch`, `WebSocket`, streams and other primitives.

```bash
bun --version
```

## Package managers

::: code-group

```sh [bun]
bun add --dev very-happy-dom
# bun add -d very-happy-dom
```

```sh [npm]
npm install --save-dev very-happy-dom
# npm i -D very-happy-dom
```

```sh [pnpm]
pnpm add --save-dev very-happy-dom
# pnpm add -D very-happy-dom
```

```sh [yarn]
yarn add --dev very-happy-dom
```

:::

## Entry points

The package exposes three entry points:

| Import | What it gives you |
| --- | --- |
| `very-happy-dom` | Everything — `Window`, `Browser`, `JSDOM`, `GlobalRegistrator`, the DOM classes |
| `very-happy-dom/register` | Side-effect preload that installs browser globals |
| `very-happy-dom/jsdom` | The jsdom-compatible surface on its own |

```typescript
import { GlobalRegistrator, JSDOM, Window } from 'very-happy-dom'
import { CookieJar, ResourceLoader, VirtualConsole } from 'very-happy-dom/jsdom'
```

Classes are shared across entry points, so `instanceof` works no matter which
one an object came from.

## Setting up your tests

Most projects want browser globals (`document`, `window`, …) available in every
test. The shortest way is the `/register` preload:

```toml
# bunfig.toml
[test]
preload = ["very-happy-dom/register"]
```

Override the default URL with the `VERY_HAPPY_DOM_URL` or `HAPPY_DOM_URL`
environment variables.

If you would rather not register globals, create a `Window` per test instead —
see [Usage](/usage).

## Verifying the install

```typescript
// check.ts
import { Window } from 'very-happy-dom'

const window = new Window()
window.document.body.innerHTML = '<h1>It works</h1>'
console.log(window.document.querySelector('h1')?.textContent)
```

```bash
bun run check.ts
```

You should see `It works`.

## Migrating an existing suite

Already using happy-dom or jsdom? Both are one-line changes — see the
[drop-in compatibility guide](/drop-in-compat).
