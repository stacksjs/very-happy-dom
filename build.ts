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
  entrypoints: ['src/index.ts', 'src/register.ts', 'src/jsdom/index.ts', 'src/matchers.ts'],
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
