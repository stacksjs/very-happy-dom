import { describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'

// =============================================================================
// Regression guard for a latent import cycle:
//
//   VirtualElement -> parsers/html-parser -> VirtualSVGElement -> VirtualElement
//
// `VirtualElement` imports the parser for `innerHTML`, and `VirtualSVGElement`
// extends `VirtualElement`. While the parser imported those classes at module
// scope, whichever of the three initialised first decided whether the graph
// resolved — so the package imported fine through its usual entry order and
// threw `Cannot access 'VirtualElement' before initialization` as soon as
// anything pulled a node module in earlier. Adding one static import to
// `apis/Canvas.ts` was enough to break `import 'very-happy-dom'` outright.
//
// The parser now resolves those two constructors lazily. These tests pin that
// down by importing each module *first* in a fresh process: module caching means
// the order cannot be exercised from inside a single test run.
// =============================================================================

const SRC = resolve(import.meta.dir, '../src')

// Every module that sits on or next to the cycle, plus the public entry points.
const ENTRY_MODULES = [
  'parsers/html-parser',
  'nodes/VirtualElement',
  'nodes/VirtualSVGElement',
  'nodes/VirtualNode',
  'nodes/VirtualDocument',
  'nodes/HTMLElementClasses',
  'nodes/SVGElementClasses',
  'nodes/VirtualTemplateElement',
  'apis/Canvas',
  'webcomponents/ShadowRoot',
  'traversal',
  'window/Window',
  'window/GlobalRegistrator',
  // The browser layer reaches into the window graph — `BrowserFrame`
  // constructs a real `Window`, and `VirtualDocument` imports
  // `browser/CookieContainer` back the other way.
  'browser/Browser',
  'browser/BrowserContext',
  'browser/BrowserPage',
  'browser/BrowserFrame',
  'browser/CookieContainer',
  'index',
  'register',
  'jsdom/index',
]

async function importInFreshProcess(modulePath: string): Promise<{ exitCode: number, stderr: string }> {
  const proc = Bun.spawn({
    cmd: [process.execPath, '-e', `await import(${JSON.stringify(resolve(SRC, modulePath))})`],
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const [stderr, exitCode] = await Promise.all([
    new Response(proc.stderr).text(),
    proc.exited,
  ])

  return { exitCode, stderr }
}

describe('module graph has no initialisation-order cycle', () => {
  for (const modulePath of ENTRY_MODULES) {
    test(`${modulePath} can be imported first`, async () => {
      const { exitCode, stderr } = await importInFreshProcess(modulePath)

      // Surface the actual error rather than just a non-zero exit code.
      expect(stderr).not.toContain('before initialization')
      expect({ modulePath, exitCode, stderr }).toEqual({ modulePath, exitCode: 0, stderr: '' })
    })
  }
})

describe('html-parser does not import element classes at module scope', () => {
  // The lazy resolution is load-bearing, not a style choice, so guard the
  // source itself — a future refactor that "tidies" it back into a static
  // import would reintroduce the cycle.
  test('the parser has no static import of VirtualElement or VirtualSVGElement', async () => {
    const source = await Bun.file(resolve(SRC, 'parsers/html-parser.ts')).text()

    const staticValueImports = source
      .split('\n')
      .filter(line => /^\s*import\s/.test(line) && !/^\s*import\s+type\s/.test(line))
      .join('\n')

    expect(staticValueImports).not.toContain('VirtualElement')
    expect(staticValueImports).not.toContain('VirtualSVGElement')
  })

  test('the parser still builds real elements without an ownerDocument', async () => {
    const { parseHTML } = await import('../src/parsers/html-parser')

    // No ownerDocument: this is the path that needs the lazily-resolved classes.
    const nodes = parseHTML('<div id="a"><span>hi</span></div>') as any[]

    expect(nodes).toHaveLength(1)
    expect(nodes[0].tagName).toBe('DIV')
    expect(nodes[0].getAttribute('id')).toBe('a')
    expect(nodes[0].querySelector('span').textContent).toBe('hi')
    // A plain object stand-in would not carry the element API.
    expect(typeof nodes[0].style).toBe('object')
    expect(typeof nodes[0].classList).toBe('object')
  })

  test('the SVG branch of that path yields namespaced elements', async () => {
    const { parseHTML } = await import('../src/parsers/html-parser')

    const nodes = parseHTML('<svg><circle r="5"/></svg>') as any[]

    expect(nodes[0].namespaceURI).toBe('http://www.w3.org/2000/svg')
    expect(nodes[0].childNodes[0].namespaceURI).toBe('http://www.w3.org/2000/svg')
  })
})
