import type { BrowserPage } from './BrowserPage'
import { VirtualEvent } from '../events/VirtualEvent'
import { VirtualDocument } from '../nodes/VirtualDocument'

/**
 * BrowserFrame represents a browser frame
 * Compatible with Happy DOM's BrowserFrame API
 */
export class BrowserFrame {
  public window: Window & { document: VirtualDocument }
  public document: VirtualDocument

  private _page: BrowserPage
  private _parentFrame: BrowserFrame | null = null
  private _childFrames: BrowserFrame[] = []
  private _url: string
  private _content: string = ''

  constructor(page: BrowserPage, parentFrame: BrowserFrame | null = null) {
    this._page = page
    this._parentFrame = parentFrame
    this._url = 'about:blank'

    // Create document for this frame
    this.document = new VirtualDocument()

    // Create a window-like object for this frame
    this.window = {
      document: this.document,
      location: {
        href: this._url,
        toString: () => this._url,
      },
      Event: VirtualEvent,
    } as any
  }

  /**
   * Child frames
   */
  get childFrames(): BrowserFrame[] {
    return this._childFrames
  }

  /**
   * Parent frame
   */
  get parentFrame(): BrowserFrame | null {
    return this._parentFrame
  }

  /**
   * Owner page
   */
  get page(): BrowserPage {
    return this._page
  }

  /**
   * Get or set the document content HTML
   */
  get content(): string {
    return this.document.documentElement?.outerHTML || ''
  }

  set content(html: string) {
    this._content = html
    this.document.documentElement!.innerHTML = html
  }

  /**
   * Get or set the URL without navigating
   */
  get url(): string {
    return this._url
  }

  set url(url: string) {
    this._url = url
    this.window.location = { href: url, toString: () => url } as any
  }

  /**
   * Waits for all ongoing operations to complete
   */
  async waitUntilComplete(): Promise<void> {
    // For now, this is a no-op
    // In a full implementation, this would wait for resources, scripts, etc.
  }

  /**
   * Waits for navigation to complete after a link click or redirect
   */
  async waitForNavigation(): Promise<void> {
    // For now, this is a no-op
    // In a full implementation, this would wait for the new page to load
  }

  /**
   * Aborts all ongoing operations
   */
  async abort(): Promise<void> {
    // For now, this is a no-op
  }

  /**
   * Evaluates code in the frame's context
   */
  evaluate(code: string | ((...args: any[]) => any)): any {
    if (typeof code === 'function') {
      // Create a wrapper that provides window as a variable in the function scope
      const _window = this.window
      const document = this.document
      // Use Function constructor to create a function with window in scope
      // eslint-disable-next-line no-new-func
      const wrappedFn = new Function('window', 'document', `return (${code.toString()})()`).bind(null, _window, document)
      return wrappedFn()
    }
    else {
      // Simple eval in context - in a real implementation this would use VM
      // eslint-disable-next-line no-eval
      return eval(code)
    }
  }

  /**
   * Navigates the frame to a URL
   */
  async goto(url: string): Promise<Response | null> {
    this.url = url
    // In a real implementation, this would fetch the URL and load content
    // For now, just update the URL
    return null
  }

  /**
   * Navigates back in history
   */
  async goBack(): Promise<Response | null> {
    // For now, this is a no-op
    return null
  }

  /**
   * Navigates forward in history
   */
  async goForward(): Promise<Response | null> {
    // For now, this is a no-op
    return null
  }

  /**
   * Navigates by a number of steps in history
   */
  async goSteps(_steps: number): Promise<Response | null> {
    // For now, this is a no-op
    return null
  }

  /**
   * Reloads the frame
   */
  async reload(): Promise<Response | null> {
    // For now, this is a no-op
    return null
  }
}
