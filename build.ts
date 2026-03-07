import { dts } from 'bun-plugin-dtsx'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

// eslint-disable-next-line ts/no-top-level-await
const buildResult = await Bun.build({
  entrypoints: ['src/index.ts'],
  outdir: './dist',
  splitting: true,
  target: 'bun',
  minify: true,
  format: 'esm',
  plugins: [dts()],
})

if (!buildResult.success) {
  throw new Error('Failed to build declaration files for very-happy-dom')
}

const transpiler = new Bun.Transpiler({
  loader: 'ts',
  target: 'bun',
})

for await (const filePath of new Bun.Glob('src/**/*.ts').scan('.')) {
  const source = await Bun.file(filePath).text()
  const compiled = transpiler.transformSync(source)
  const outputPath = filePath.replace(/^src\//, 'dist/').replace(/\.ts$/, '.js')

  await mkdir(dirname(outputPath), { recursive: true })
  await Bun.write(outputPath, compiled)
}
