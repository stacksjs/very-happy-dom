/* eslint-disable no-console */
/**
 * Test Utilities
 * Common helpers and utilities for testing VeryHappyDOM
 */

import { Browser, Window } from '../src/index'

/**
 * Test statistics tracking
 */
export class TestStats {
  passed = 0
  failed = 0

  get total(): number {
    return this.passed + this.failed
  }

  get hasFailures(): boolean {
    return this.failed > 0
  }

  reset(): void {
    this.passed = 0
    this.failed = 0
  }

  printSummary(): void {
    console.log(`\n${'='.repeat(50)}`)
    console.log(`✅ Passed: ${this.passed}`)
    console.log(`❌ Failed: ${this.failed}`)
    console.log(`📊 Total: ${this.total}`)

    if (this.hasFailures) {
      console.log('\n⚠️  Some tests failed!')
    }
    else {
      console.log('\n🎉 All tests passing!')
    }
  }

  exit(): void {
    if (this.hasFailures) {
      // eslint-disable-next-line node/prefer-global/process
      process.exit(1)
    }
  }
}

/**
 * Assertion helper
 */
export function createAssert(stats: TestStats) {
  return function assert(condition: boolean, message: string): void {
    if (condition) {
      console.log(`✅ ${message}`)
      stats.passed++
    }
    else {
      console.log(`❌ FAILED: ${message}`)
      stats.failed++
    }
  }
}

/**
 * Test window factory
 */
export interface TestWindowOptions {
  url?: string
  width?: number
  height?: number
}

export function createTestWindow(options: TestWindowOptions = {}): Window {
  return new Window({
    url: options.url || 'http://localhost:3000',
    width: options.width || 1920,
    height: options.height || 1080,
  })
}

/**
 * Test browser factory
 */
export function createTestBrowser(): Browser {
  return new Browser()
}

/**
 * Async cleanup utility
 */
export async function cleanup(...cleanupFns: Array<() => Promise<void> | void>): Promise<void> {
  for (const fn of cleanupFns) {
    await fn()
  }
}

/**
 * Window cleanup helper
 */
export async function cleanupWindow(window: Window): Promise<void> {
  await window.happyDOM.close()
}

/**
 * Browser cleanup helper
 */
export async function cleanupBrowser(browser: Browser): Promise<void> {
  await browser.close()
}

/**
 * Test group helper
 */
export function testGroup(name: string, fn: () => void | Promise<void>): void {
  console.log(`\n${name}`)
  fn()
}

/**
 * Timeout helper for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * HTML test fixture helper
 */
export function createHTMLFixture(html: string): (window: Window) => void {
  return (window: Window) => {
    window.document.body!.innerHTML = html
  }
}

/**
 * Assertion helpers for common patterns
 */
export const assertHelpers = {
  /**
   * Assert element exists
   */
  elementExists(assert: ReturnType<typeof createAssert>, element: any, message: string): void {
    assert(element !== null && element !== undefined, message)
  },

  /**
   * Assert element has text
   */
  elementHasText(assert: ReturnType<typeof createAssert>, element: any, expectedText: string, message: string): void {
    assert(element?.textContent === expectedText, message)
  },

  /**
   * Assert element has attribute
   */
  elementHasAttribute(assert: ReturnType<typeof createAssert>, element: any, attr: string, value: string, message: string): void {
    assert(element?.getAttribute(attr) === value, message)
  },

  /**
   * Assert element has class
   */
  elementHasClass(assert: ReturnType<typeof createAssert>, element: any, className: string, message: string): void {
    assert(element?.classList?.contains(className) || element?.className?.includes(className), message)
  },

  /**
   * Assert array length
   */
  arrayLength(assert: ReturnType<typeof createAssert>, arr: any[], expectedLength: number, message: string): void {
    assert(arr.length === expectedLength, message)
  },

  /**
   * Assert type
   */
  typeOf(assert: ReturnType<typeof createAssert>, value: any, expectedType: 'string' | 'number' | 'boolean' | 'object' | 'function' | 'undefined' | 'symbol' | 'bigint', message: string): void {
    // eslint-disable-next-line valid-typeof
    assert(typeof value === expectedType, message)
  },

  /**
   * Assert throws error
   */
  throws(assert: ReturnType<typeof createAssert>, fn: () => void, message: string): void {
    let threw = false
    try {
      fn()
    }
    catch {
      threw = true
    }
    assert(threw, message)
  },

  /**
   * Assert async throws error
   */
  async throwsAsync(assert: ReturnType<typeof createAssert>, fn: () => Promise<void>, message: string): Promise<void> {
    let threw = false
    try {
      await fn()
    }
    catch {
      threw = true
    }
    assert(threw, message)
  },
}

/**
 * Mock data generators
 */
export const mockData = {
  /**
   * Generate random HTML elements
   */
  elements(count: number, tagName: string = 'div'): string {
    return Array.from({ length: count }, (_, i) =>
      `<${tagName} id="item-${i}" class="test-item">Item ${i}</${tagName}>`).join('')
  },

  /**
   * Generate random text
   */
  text(length: number = 100): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  },

  /**
   * Generate JSON data
   */
  json(obj: Record<string, any>): string {
    return JSON.stringify(obj)
  },
}

/**
 * Performance measurement helper
 */
export class PerformanceMeasure {
  private start = 0

  begin(): void {
    this.start = performance.now()
  }

  end(): number {
    return performance.now() - this.start
  }

  measure<T>(fn: () => T): { result: T, duration: number } {
    this.begin()
    const result = fn()
    const duration = this.end()
    return { result, duration }
  }

  async measureAsync<T>(fn: () => Promise<T>): Promise<{ result: T, duration: number }> {
    this.begin()
    const result = await fn()
    const duration = this.end()
    return { result, duration }
  }
}

/**
 * Test suite runner
 */
export class TestSuite {
  private stats = new TestStats()
  private assert = createAssert(this.stats)

  constructor(private name: string) {
    console.log(`=== ${this.name} ===\n`)
  }

  test(name: string, fn: (assert: ReturnType<typeof createAssert>) => void | Promise<void>): void {
    console.log(name)
    fn(this.assert)
  }

  finish(): void {
    this.stats.printSummary()
    this.stats.exit()
  }

  get passed(): number {
    return this.stats.passed
  }

  get failed(): number {
    return this.stats.failed
  }

  get total(): number {
    return this.stats.total
  }
}

/**
 * Simplified test DSL
 */
export function describe(suiteName: string, fn: (suite: TestSuite) => void | Promise<void>): void {
  const suite = new TestSuite(suiteName)
  fn(suite)
  suite.finish()
}
