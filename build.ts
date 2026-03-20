import { dts } from 'bun-plugin-dtsx'

// eslint-disable-next-line ts/no-top-level-await
const buildResult = await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: './dist',
  target: 'bun',
  minify: true,
  format: 'esm',
  plugins: [dts()],
})

if (!buildResult.success)
  throw new Error('Failed to build declaration files for very-happy-dom')

// eslint-disable-next-line ts/no-top-level-await
const cliResult = await Bun.build({
  entrypoints: ['bin/cli.ts'],
  outdir: './dist',
  compile: true,
  target: 'bun',
  minify: true,
  format: 'esm',
  plugins: [dts()],
})

if (!cliResult.success)
  throw new Error('Failed to build declaration files for very-happy-dom')

