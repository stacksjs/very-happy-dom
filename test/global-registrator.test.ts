import { afterEach, describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '../src/window/GlobalRegistrator'

// =============================================================================
// GlobalRegistrator: when Window methods/accessors are copied to globalThis
// they must remain bound to the Window instance, so calling them as free
// functions doesn't lose `this`.
// =============================================================================

describe('GlobalRegistrator', () => {
  afterEach(() => {
    GlobalRegistrator.unregister()
  })

  test('registers document and window globals', () => {
    GlobalRegistrator.register()
    expect(typeof (globalThis as any).document).toBe('object')
    expect(typeof (globalThis as any).window).toBe('object')
    expect((globalThis as any).document).toBe((globalThis as any).window.document)
  })

  test('globalThis.getComputedStyle works as a free function', () => {
    GlobalRegistrator.register()
    const d = (globalThis as any).document.createElement('div')
    ;(globalThis as any).document.body.appendChild(d)
    d.style.color = 'red'
    // If `this` isn't bound, getComputedStyle internally accesses
    // `this.document` and explodes.
    const cs = (globalThis as any).getComputedStyle(d)
    expect(cs.getPropertyValue('color')).toBe('red')
  })

  test('globalThis.document.createElement works via inline style', () => {
    GlobalRegistrator.register()
    const d = (globalThis as any).document.createElement('div')
    d.style.width = '400px'
    d.style.height = '300px'
    expect(d.clientWidth).toBe(400)
    expect(d.clientHeight).toBe(300)
  })

  test('unregister removes globals', () => {
    GlobalRegistrator.register()
    expect((globalThis as any).document).toBeTruthy()
    GlobalRegistrator.unregister()
    expect((globalThis as any).document).toBeUndefined()
  })

  test('re-register after unregister works', () => {
    GlobalRegistrator.register()
    GlobalRegistrator.unregister()
    expect(() => GlobalRegistrator.register()).not.toThrow()
  })

  test('double-register throws', () => {
    GlobalRegistrator.register()
    expect(() => GlobalRegistrator.register()).toThrow()
  })
})
