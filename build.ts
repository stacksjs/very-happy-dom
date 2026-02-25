import { dts } from 'bun-plugin-dtsx'

// eslint-disable-next-line ts/no-top-level-await
await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: './dist',
  splitting: true,
  target: 'bun',
  minify: true,
  format: 'esm',
  plugins: [dts()],
})
