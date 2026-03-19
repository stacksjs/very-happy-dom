import { describe, expect, test } from 'bun:test'
import { CanvasRenderingContext2D } from '../src'

// =============================================================================
// Canvas: lineDash state
// =============================================================================
describe('Canvas: lineDash state', () => {
  test('setLineDash stores and getLineDash retrieves', () => {
    const ctx = new CanvasRenderingContext2D()
    ctx.setLineDash([5, 15])
    expect(ctx.getLineDash()).toEqual([5, 15])
  })

  test('getLineDash returns empty array by default', () => {
    const ctx = new CanvasRenderingContext2D()
    expect(ctx.getLineDash()).toEqual([])
  })

  test('setLineDash makes a copy', () => {
    const ctx = new CanvasRenderingContext2D()
    const pattern = [5, 10, 15]
    ctx.setLineDash(pattern)
    pattern.push(20)
    expect(ctx.getLineDash()).toEqual([5, 10, 15])
  })

  test('getLineDash returns a copy', () => {
    const ctx = new CanvasRenderingContext2D()
    ctx.setLineDash([5, 10])
    const dash = ctx.getLineDash()
    dash.push(99)
    expect(ctx.getLineDash()).toEqual([5, 10])
  })
})
