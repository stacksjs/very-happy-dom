import { dts } from 'bun-plugin-dtsx'

// Every entrypoint here must have a matching subpath in package.json's
// `exports`, and vice versa — `./register`, `./jsdom` and `./matchers` are part
// of the documented surface, so they need real JS in dist, not just types.
// `splitting` keeps the shared DOM implementation in one chunk so the
// entrypoints share a single module instance (class identity matters for
// `instanceof` across `very-happy-dom` and `very-happy-dom/jsdom`, and the
// matchers reach into the same `Locator` the caller's page produced).
// eslint-disable-next-line ts/no-top-level-await
const buildResult = await Bun.build({
  // `src/screenshot/webview.ts` is listed because nothing imports it
  // statically — `BrowserPage.screenshot` reaches it through `await import()` —
  // so it was absent from the declaration graph and no `webview.d.ts` was
  // emitted. `capture.d.ts` imports three types from it and is re-exported by
  // the entry point, so every consumer's typecheck failed on a module that was
  // never written. It needs no subpath of its own: `./*` already serves it.
  entrypoints: [
    'src/index.ts',
    'src/register.ts',
    'src/jsdom/index.ts',
    'src/matchers.ts',
    'src/screenshot/webview.ts',
  ],
  root: './src',
  outdir: './dist',
  target: 'bun',
  minify: true,
  format: 'esm',
  splitting: true,
  plugins: [dts()],
})

if (!buildResult.success)
  throw new Error('Failed to build very-happy-dom')
