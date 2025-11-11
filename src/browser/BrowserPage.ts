import type { RequestInterceptionHandler } from '../network/RequestInterceptor'
import type { BrowserContext } from './BrowserContext'
import { Buffer } from 'node:buffer'
import { RequestInterceptor } from '../network/RequestInterceptor'
import { BrowserFrame } from './BrowserFrame'

export interface IBrowserPageViewport {
  width: number
  height: number
}

export type PageEventType = 'console' | 'request' | 'response' | 'error' | 'load' | 'domcontentloaded'
export type PageEventHandler = (event: any) => void

/**
 * BrowserPage represents a browser page (tab or popup window)
 * Compatible with Happy DOM's BrowserPage API
 */
export class BrowserPage {
  public mainFrame: BrowserFrame
  public console: Console
  public virtualConsolePrinter: ((type: string, ...args: any[]) => void) | null = null

  private _context: BrowserContext
  private _viewport: IBrowserPageViewport
  private _frames: BrowserFrame[] = []
  private _eventListeners = new Map<PageEventType, Set<PageEventHandler>>()
  private _requestInterceptor = new RequestInterceptor()

  constructor(context: BrowserContext) {
    this._context = context
    this._viewport = { width: 1024, height: 768 }
    this.console = globalThis.console

    // Create main frame
    this.mainFrame = new BrowserFrame(this)
    this._frames.push(this.mainFrame)
  }

  /**
   * Owner context
   */
  get context(): BrowserContext {
    return this._context
  }

  /**
   * Viewport settings
   */
  get viewport(): IBrowserPageViewport {
    return this._viewport
  }

  /**
   * All frames associated with the page
   */
  get frames(): BrowserFrame[] {
    return this._frames
  }

  /**
   * Page content HTML
   */
  get content(): string {
    return this.mainFrame.content
  }

  set content(html: string) {
    this.mainFrame.content = html
  }

  /**
   * Page URL
   */
  get url(): string {
    return this.mainFrame.url
  }

  set url(url: string) {
    this.mainFrame.url = url
  }

  /**
   * Closes the page
   */
  async close(): Promise<void> {
    await this.abort()
    // Remove from context
    this._context._removePage(this)
  }

  /**
   * Waits for all ongoing operations to complete
   */
  async waitUntilComplete(): Promise<void> {
    await Promise.all(this._frames.map(frame => frame.waitUntilComplete()))
  }

  /**
   * Waits for navigation to complete
   */
  async waitForNavigation(): Promise<void> {
    await this.mainFrame.waitForNavigation()
  }

  /**
   * Aborts all ongoing operations
   */
  async abort(): Promise<void> {
    await Promise.all(this._frames.map(frame => frame.abort()))
  }

  /**
   * Evaluates code in the page's context
   */
  evaluate(code: string | ((...args: any[]) => any)): any {
    return this.mainFrame.evaluate(code)
  }

  /**
   * Sets the viewport
   */
  setViewport(viewport: IBrowserPageViewport): void {
    this._viewport = { ...viewport }
  }

  /**
   * Navigates the main frame to a URL
   */
  async goto(url: string): Promise<Response | null> {
    return await this.mainFrame.goto(url)
  }

  /**
   * Navigates back in the main frame's history
   */
  async goBack(): Promise<Response | null> {
    return await this.mainFrame.goBack()
  }

  /**
   * Navigates forward in the main frame's history
   */
  async goForward(): Promise<Response | null> {
    return await this.mainFrame.goForward()
  }

  /**
   * Navigates by steps in the main frame's history
   */
  async goSteps(steps: number): Promise<Response | null> {
    return await this.mainFrame.goSteps(steps)
  }

  /**
   * Reloads the page
   */
  async reload(): Promise<Response | null> {
    return await this.mainFrame.reload()
  }

  /**
   * Waits for a selector to appear in the DOM
   */
  async waitForSelector(
    selector: string,
    options: { timeout?: number, visible?: boolean } = {},
  ): Promise<any | null> {
    const { timeout = 30000, visible = false } = options
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const element = this.mainFrame.document.querySelector(selector)

      if (element) {
        if (!visible || (element as any).isVisible?.()) {
          return element
        }
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    return null
  }

  /**
   * Waits for a function to return a truthy value
   */
  async waitForFunction(
    fn: ((...args: any[]) => any) | string,
    options: { timeout?: number, polling?: number | 'raf' } = {},
  ): Promise<any> {
    const { timeout = 30000, polling = 100 } = options
    const startTime = Date.now()
    const pollInterval = polling === 'raf' ? 16 : polling

    while (Date.now() - startTime < timeout) {
      const result = this.evaluate(fn)

      if (result) {
        return result
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    throw new Error(`waitForFunction timed out after ${timeout}ms`)
  }

  /**
   * Waits for a specified amount of time
   */
  async waitForTimeout(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Clicks an element matching the selector
   */
  async click(selector: string, options: { delay?: number, button?: 'left' | 'right' | 'middle' } = {}): Promise<void> {
    const element = this.mainFrame.document.querySelector(selector)
    if (!element) {
      throw new Error(`Element not found: ${selector}`)
    }

    if (options.delay) {
      await this.waitForTimeout(options.delay)
    }

    // Dispatch click event
    ;(element as any).click?.()
  }

  /**
   * Types text into an element
   */
  async type(selector: string, text: string, options: { delay?: number } = {}): Promise<void> {
    const element = this.mainFrame.document.querySelector(selector)
    if (!element) {
      throw new Error(`Element not found: ${selector}`)
    }

    const delay = options.delay || 0

    // Set value for input elements
    if ((element as any).tagName === 'INPUT' || (element as any).tagName === 'TEXTAREA') {
      let currentValue = (element as any).getAttribute?.('value') || ''

      for (const char of text) {
        currentValue += char
        ;(element as any).setAttribute?.('value', currentValue)

        if (delay > 0) {
          await this.waitForTimeout(delay)
        }
      }
    }
    else {
      // For other elements, append to textContent
      ;(element as any).textContent = ((element as any).textContent || '') + text
    }
  }

  /**
   * Focuses an element
   */
  async focus(selector: string): Promise<void> {
    const element = this.mainFrame.document.querySelector(selector)
    if (!element) {
      throw new Error(`Element not found: ${selector}`)
    }

    // Dispatch focus event
    const event = new (this.mainFrame.window as any).Event('focus', { bubbles: true })
    ;(element as any).dispatchEvent?.(event)
  }

  /**
   * Hovers over an element
   */
  async hover(selector: string): Promise<void> {
    const element = this.mainFrame.document.querySelector(selector)
    if (!element) {
      throw new Error(`Element not found: ${selector}`)
    }

    // Dispatch mouseenter event
    const event = new (this.mainFrame.window as any).Event('mouseenter', { bubbles: true })
    ;(element as any).dispatchEvent?.(event)
  }

  /**
   * Keyboard actions
   */
  get keyboard(): {
    press: (key: string, options?: { delay?: number }) => Promise<void>
    type: (text: string, options?: { delay?: number }) => Promise<void>
  } {
    return {
      press: async (key: string, options: { delay?: number } = {}): Promise<void> => {
        const { delay = 0 } = options

        const keydownEvent = new (this.mainFrame.window as any).Event('keydown', { bubbles: true })
        ;(keydownEvent as any).key = key
        this.mainFrame.document.dispatchEvent?.(keydownEvent)

        if (delay > 0) {
          await this.waitForTimeout(delay)
        }

        const keyupEvent = new (this.mainFrame.window as any).Event('keyup', { bubbles: true })
        ;(keyupEvent as any).key = key
        this.mainFrame.document.dispatchEvent?.(keyupEvent)
      },

      type: async (text: string, options: { delay?: number } = {}): Promise<void> => {
        for (const char of text) {
          await this.keyboard.press(char, options)
        }
      },
    }
  }

  /**
   * Mouse actions
   */
  get mouse(): {
    click: (x: number, y: number, options?: { button?: 'left' | 'right' | 'middle', delay?: number }) => Promise<void>
    move: (x: number, y: number) => Promise<void>
  } {
    return {
      click: async (x: number, y: number, options: { button?: 'left' | 'right' | 'middle', delay?: number } = {}): Promise<void> => {
        const { delay = 0 } = options

        const clickEvent = new (this.mainFrame.window as any).Event('click', { bubbles: true })
        ;(clickEvent as any).clientX = x
        ;(clickEvent as any).clientY = y
        this.mainFrame.document.dispatchEvent?.(clickEvent)

        if (delay > 0) {
          await this.waitForTimeout(delay)
        }
      },

      move: async (x: number, y: number): Promise<void> => {
        const moveEvent = new (this.mainFrame.window as any).Event('mousemove', { bubbles: true })
        ;(moveEvent as any).clientX = x
        ;(moveEvent as any).clientY = y
        this.mainFrame.document.dispatchEvent?.(moveEvent)
      },
    }
  }

  /**
   * Event emitter methods
   */
  on(event: PageEventType, handler: PageEventHandler): void {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, new Set())
    }
    this._eventListeners.get(event)!.add(handler)
  }

  off(event: PageEventType, handler: PageEventHandler): void {
    const handlers = this._eventListeners.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  emit(event: PageEventType, data: any): void {
    const handlers = this._eventListeners.get(event)
    if (handlers) {
      for (const handler of handlers) {
        handler(data)
      }
    }

    // Also call virtualConsolePrinter if it's a console event
    if (event === 'console' && this.virtualConsolePrinter) {
      this.virtualConsolePrinter(data.type, ...data.args)
    }
  }

  /**
   * Internal method to emit console events
   * @internal
   */
  _emitConsole(type: string, ...args: any[]): void {
    this.emit('console', { type, args })
  }

  /**
   * Internal method to emit request events
   * @internal
   */
  _emitRequest(request: any): void {
    this.emit('request', request)
  }

  /**
   * Internal method to emit response events
   * @internal
   */
  _emitResponse(response: any): void {
    this.emit('response', response)
  }

  /**
   * Internal method to emit error events
   * @internal
   */
  _emitError(error: Error): void {
    this.emit('error', error)
  }

  /**
   * Drag and drop simulation
   */
  async dragAndDrop(
    source: string,
    target: string,
    options: { delay?: number } = {},
  ): Promise<void> {
    const sourceElement = this.mainFrame.document.querySelector(source)
    const targetElement = this.mainFrame.document.querySelector(target)

    if (!sourceElement || !targetElement) {
      throw new Error('Source or target element not found')
    }

    // Dispatch drag events
    const dragStartEvent = new (this.mainFrame.window as any).Event('dragstart', { bubbles: true })
    ;(sourceElement as any).dispatchEvent?.(dragStartEvent)

    if (options.delay) {
      await this.waitForTimeout(options.delay)
    }

    const dropEvent = new (this.mainFrame.window as any).Event('drop', { bubbles: true })
    ;(targetElement as any).dispatchEvent?.(dropEvent)

    const dragEndEvent = new (this.mainFrame.window as any).Event('dragend', { bubbles: true })
    ;(sourceElement as any).dispatchEvent?.(dragEndEvent)
  }

  /**
   * Enable or disable request interception
   */
  async setRequestInterception(enabled: boolean): Promise<void> {
    if (enabled) {
      this._requestInterceptor.enable()

      // Add default handler to emit events
      const handler: RequestInterceptionHandler = (request) => {
        this._emitRequest(request)
      }
      this._requestInterceptor.addHandler(handler)
    }
    else {
      this._requestInterceptor.disable()
      this._requestInterceptor.clear()
    }
  }

  /**
   * Takes a screenshot of the page
   * Note: In virtual DOM, this generates a simple SVG representation
   */
  async screenshot(options: {
    type?: 'png' | 'jpeg' | 'webp'
    quality?: number
    fullPage?: boolean
    clip?: { x: number, y: number, width: number, height: number }
    omitBackground?: boolean
    encoding?: 'base64' | 'binary'
  } = {}): Promise<string | Buffer> {
    const {
      type: _type = 'png',
      quality: _quality = 100,
      fullPage: _fullPage = false,
      encoding = 'binary',
    } = options

    // Generate a simple SVG representation of the DOM
    const html = this.content
    const svg = this._generateSVG(html)

    // In a real implementation, this would render the DOM and capture pixels
    // For now, we return the SVG as the screenshot
    if (encoding === 'base64') {
      return Buffer.from(svg).toString('base64')
    }

    return Buffer.from(svg)
  }

  /**
   * Generates a PDF of the page
   * Note: In virtual DOM, this generates a simple PDF-like representation
   */
  async pdf(options: {
    path?: string
    scale?: number
    displayHeaderFooter?: boolean
    headerTemplate?: string
    footerTemplate?: string
    printBackground?: boolean
    landscape?: boolean
    pageRanges?: string
    format?: 'Letter' | 'Legal' | 'Tabloid' | 'Ledger' | 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6'
    width?: string | number
    height?: string | number
    margin?: {
      top?: string | number
      right?: string | number
      bottom?: string | number
      left?: string | number
    }
    preferCSSPageSize?: boolean
  } = {}): Promise<Buffer> {
    const {
      scale: _scale = 1,
      displayHeaderFooter: _displayHeaderFooter = false,
      printBackground: _printBackground = false,
      landscape: _landscape = false,
      format: _format = 'A4',
    } = options

    // Generate a simple PDF representation
    const html = this.content
    const pdf = this._generatePDF(html)

    return Buffer.from(pdf)
  }

  private _generateSVG(html: string): string {
    const width = this._viewport.width
    const height = this._viewport.height

    // Simple SVG representation
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="white"/>
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml">
      <pre style="font-family: monospace; font-size: 12px; padding: 10px;">${this._escapeXML(html.substring(0, 500))}</pre>
    </div>
  </foreignObject>
</svg>`
  }

  private _generatePDF(html: string): string {
    const _title = this.mainFrame.document.title || 'Document'

    // Simple PDF-like text representation
    return `%PDF-1.4
% VeryHappyDOM Generated PDF
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Count 1
/Kids [3 0 R]
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length ${html.length}
>>
stream
${html}
endstream
endobj

xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${284 + html.length}
%%EOF`
  }

  private _escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}
