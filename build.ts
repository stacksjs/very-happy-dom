import { dts } from 'bun-plugin-dtsx'

await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: './dist',
  splitting: true,
  target: 'bun',
  minify: true,
  format: 'esm',
  plugins: [dts()],
})
