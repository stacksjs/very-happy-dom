import { describe, expect, test } from 'bun:test'
import { existsSync } from 'node:fs'
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
    if (!existsSync(DIST))
      return
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
    if (!existsSync(DIST))
      return
    const { Window } = await import(DIST)
    const w = new Window()
    expect(typeof w.document).toBe('object')
  })
})
