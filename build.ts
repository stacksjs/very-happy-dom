import { dts } from 'bun-plugin-dtsx'

// Every entrypoint here must have a matching subpath in package.json's
// `exports`, and vice versa — `./register` and `./jsdom` are part of the
// documented drop-in surface, so they need real JS in dist, not just types.
// `splitting` keeps the shared DOM implementation in one chunk so the three
// entrypoints share a single module instance (class identity matters for
// `instanceof` across `very-happy-dom` and `very-happy-dom/jsdom`).
// eslint-disable-next-line ts/no-top-level-await
const buildResult = await Bun.build({
  entrypoints: ['src/index.ts', 'src/register.ts', 'src/jsdom/index.ts'],
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
