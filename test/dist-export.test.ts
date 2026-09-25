import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// =============================================================================
// Regression guard: `dist/index.js` must be importable standalone (not only
// through the `bun` exports condition that points at `./src`). Non-Bun
// consumers see `./dist/index.js` and rely on every re-exported binding —
// especially abstract classes like `VirtualNodeBase` — being present at the
// top level of the bundle.
//
// If this test fails, inspect `dist/index.js` and make sure the tree-shake
// didn't drop any re-exported binding.
// =============================================================================

const DIST = resolve(import.meta.dir, '../dist/index.js')

describe('dist/index.js standalone import', () => {
  test('dist/index.js exists (run `bun run build` first)', () => {
    expect(existsSync(DIST)).toBe(true)
  })

  test('imports succeed without syntax errors', async () => {
    expect(existsSync(DIST)).toBe(true)
    // Dynamic import so failures produce a thrown rejection we can assert on.
    const mod = await import(DIST)

    // Core classes
    expect(typeof mod.Window).toBe('function')
    expect(typeof mod.VirtualNodeBase).toBe('function')
    expect(typeof mod.VirtualElement).toBe('function')
    expect(typeof mod.VirtualDocument).toBe('function')
    expect(typeof mod.VirtualTextNode).toBe('function')
    expect(typeof mod.VirtualEventTarget).toBe('function')
    expect(typeof mod.VirtualEvent).toBe('function')
    expect(typeof mod.GlobalRegistrator).toBe('function')
  })

  test('instantiating Window from dist works', async () => {
    expect(existsSync(DIST)).toBe(true)
    const { Window } = await import(DIST)
    const w = new Window()
    expect(typeof w.document).toBe('object')
  })
})

// =============================================================================
// Regression guard: every subpath in package.json `exports` must resolve to a
// real file in dist. `./register` and `./jsdom` are the documented drop-in
// entry points, but for several releases `build.ts` only bundled
// `src/index.ts`, so both shipped with `.d.ts` files and no JS — importing
// `very-happy-dom/register` failed with "Cannot find module" for consumers.
// =============================================================================

const ROOT = resolve(import.meta.dir, '..')

interface ExportMap { [subpath: string]: string | Record<string, string> }

function declaredExportFiles(): Array<{ subpath: string, condition: string, file: string }> {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as { exports: ExportMap }
  const out: Array<{ subpath: string, condition: string, file: string }> = []

  for (const [subpath, target] of Object.entries(pkg.exports)) {
    // `./*` is a passthrough wildcard — there is no single file to check.
    if (subpath.includes('*'))
      continue

    if (typeof target === 'string') {
      out.push({ subpath, condition: 'default', file: target })
      continue
    }

    for (const [condition, file] of Object.entries(target)) {
      if (!file.includes('*'))
        out.push({ subpath, condition, file })
    }
  }

  return out
}

describe('package.json exports resolve into dist', () => {
  test('every declared export subpath exists on disk', () => {
    const missing = declaredExportFiles()
      .filter(({ file }) => !existsSync(resolve(ROOT, file)))
      .map(({ subpath, condition, file }) => `${subpath} (${condition}) -> ${file}`)

    expect(missing).toEqual([])
  })

  test('the documented subpaths are declared at all', () => {
    const subpaths = new Set(declaredExportFiles().map(e => e.subpath))
    expect(subpaths.has('./register')).toBe(true)
    expect(subpaths.has('./jsdom')).toBe(true)
  })
})

describe('dist/jsdom/index.js standalone import', () => {
  const JSDOM_DIST = resolve(ROOT, 'dist/jsdom/index.js')

  test('exposes the jsdom-compatible surface', async () => {
    expect(existsSync(JSDOM_DIST)).toBe(true)
    const mod = await import(JSDOM_DIST)

    expect(typeof mod.JSDOM).toBe('function')
    expect(typeof mod.VirtualConsole).toBe('function')
    expect(typeof mod.CookieJar).toBe('function')
    expect(typeof mod.ResourceLoader).toBe('function')
  })

  test('parses a document through the subpath entry', async () => {
    const { JSDOM } = await import(JSDOM_DIST)
    const dom = new JSDOM('<!DOCTYPE html><html><body><h1>Hi</h1></body></html>')
    expect(dom.window.document.querySelector('h1')?.textContent).toBe('Hi')
  })

  // `splitting` in build.ts keeps the DOM implementation in one shared chunk.
  // Without it each entrypoint bundles its own copy, so `JSDOM` from
  // `very-happy-dom` and from `very-happy-dom/jsdom` are different classes and
  // `instanceof` across the two entry points silently fails.
  test('shares class identity with the main entry', async () => {
    const main = await import(DIST)
    const sub = await import(JSDOM_DIST)

    expect(sub.JSDOM).toBe(main.JSDOM)

    const dom = new sub.JSDOM('<div id="a">x</div>')
    const el = dom.window.document.querySelector('#a')
    expect(el instanceof main.VirtualElement).toBe(true)
  })
})

describe('dist/register.js', () => {
  // Run in a subprocess: the module installs globals on import, which would
  // leak into the rest of this test file.
  test('installs window/document globals when imported', async () => {
    const REGISTER_DIST = resolve(ROOT, 'dist/register.js')
    expect(existsSync(REGISTER_DIST)).toBe(true)

    const proc = Bun.spawn({
      cmd: [
        process.execPath,
        '-e',
        `await import(${JSON.stringify(REGISTER_DIST)});`
        + `document.body.innerHTML = '<h1>hi</h1>';`
        + `console.log(JSON.stringify({`
        + `doc: typeof globalThis.document,`
        + `win: typeof globalThis.window,`
        + `text: document.querySelector('h1')?.textContent,`
        + `}))`,
      ],
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])

    expect({ exitCode, stderr }).toEqual({ exitCode: 0, stderr: '' })
    expect(JSON.parse(stdout.trim())).toEqual({
      doc: 'object',
      win: 'object',
      text: 'hi',
    })
  })
})
