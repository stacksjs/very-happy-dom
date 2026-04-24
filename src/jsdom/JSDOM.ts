/**
 * JSDOM
 * jsdom-compatible wrapper around very-happy-dom's Window. Accepts an HTML
 * string + options, exposes `.window`, and implements the canonical
 * serialize/reconfigure/fragment/fromURL/fromFile surface so existing jsdom
 * tests can migrate without rewrites.
 */

import { Buffer } from 'node:buffer'
import { VirtualEvent } from '../events/VirtualEvent'
import type { VirtualDocumentFragment } from '../nodes/VirtualDocumentFragment'
import { setOwnerDocumentRecursive } from '../nodes/tree-operations'
import { Window, type WindowOptions } from '../window/Window'
import { CookieJar } from './CookieJar'
import { ResourceLoader } from './ResourceLoader'
import { VirtualConsole } from './VirtualConsole'

export type JSDOMRunScripts = 'dangerously' | 'outside-only'
export type JSDOMResources = 'usable' | ResourceLoader

export interface JSDOMConstructorOptions {
  url?: string
  referrer?: string
  contentType?: string
  includeNodeLocations?: boolean
  storageQuota?: number
  runScripts?: JSDOMRunScripts
  resources?: JSDOMResources
  virtualConsole?: VirtualConsole
  cookieJar?: CookieJar
  pretendToBeVisual?: boolean
  // eslint-disable-next-line pickier/no-unused-vars
  beforeParse?: (window: Window) => void
}

export interface JSDOMReconfigureSettings {
  windowTop?: Window
  url?: string
}

export class JSDOM {
  readonly window: Window
  readonly virtualConsole: VirtualConsole
  readonly cookieJar: CookieJar

  constructor(html: string = '', options: JSDOMConstructorOptions = {}) {
    const {
      url = 'about:blank',
      referrer,
      contentType = 'text/html',
      virtualConsole = new VirtualConsole(),
      cookieJar = new CookieJar(),
      beforeParse,
      pretendToBeVisual = false,
      runScripts,
    } = options

    this.virtualConsole = virtualConsole
    this.cookieJar = cookieJar

    const windowOptions: WindowOptions = {
      url,
      console: virtualConsole._asConsole(),
    }

    this.window = new Window(windowOptions)
    // Expose the cookie jar on the window for internal consumers.
    const winWithJar = this.window as unknown as { _cookieJar: CookieJar }
    winWithJar._cookieJar = cookieJar
    if (referrer)
      this.window.document.referrer = referrer
    if (contentType)
      this.window.document.contentType = contentType

    if (pretendToBeVisual) {
      // jsdom's pretendToBeVisual enables rAF-driven code. We already wire
      // requestAnimationFrame, so this flag is a pure no-op but preserved
      // for API compatibility.
    }

    // Forward uncaught window errors to virtualConsole('jsdomError') so
    // tests that subscribe to it see exceptions from the page.
    this.window.addEventListener('error', (event: any) => {
      const error = event?.error ?? event
      this.virtualConsole.emit('jsdomError', error)
    })

    // Wire runScripts. 'outside-only' installs the Window's eval/Function so
    // snippets evaluated via window.eval run in the page's context. Actual
    // sandboxing is intentionally simplified — the Window is the host realm.
    if (runScripts === 'outside-only' || runScripts === 'dangerously') {
      const win = this.window as unknown as Record<string, unknown>
      win.eval = globalThis.eval.bind(globalThis)
      win.Function = globalThis.Function
    }

    beforeParse?.(this.window)

    // Transition readyState through the parse lifecycle.
    this.window.document.readyState = 'loading'

    if (html)
      this._parse(html, contentType)

    if (runScripts === 'dangerously')
      this._executeScripts()

    // Fire DOMContentLoaded + load asynchronously so listeners attached
    // after construction still observe them.
    queueMicrotask(() => {
      this.window.document.readyState = 'interactive'
      this.window.document.dispatchEvent(new VirtualEvent('DOMContentLoaded', { bubbles: true, cancelable: false }))
      this.window.document.readyState = 'complete'
      this.window.dispatchEvent(new VirtualEvent('load') as unknown as Event)
    })
  }

  private _executeScripts(): void {
    const doc = this.window.document
    const scripts = doc.querySelectorAll('script') as unknown as Array<{
      getAttribute: (name: string) => string | null
      textContent: string | null
      src?: string
      type?: string
    }>
    for (const script of scripts) {
      const src = script.getAttribute('src')
      if (src)
        continue // external scripts are not resolved in the stub
      const type = script.getAttribute('type')
      if (type && type !== 'text/javascript' && type !== 'application/javascript' && type !== 'module')
        continue
      const code = script.textContent ?? ''
      if (!code.trim())
        continue
      try {
        // Use Function so the code runs with the window's globals via `with`.
        // Enough for feature tests without a full JS engine sandbox.
        const runner = new Function('window', 'document', `with (window) { ${code} }`)
        runner(this.window, this.window.document)
      }
      catch (err) {
        this.virtualConsole.emit('jsdomError', err)
      }
    }
  }

  serialize(): string {
    const doc = this.window.document
    const de = doc.documentElement
    if (!de)
      return ''
    const prefix = doc.doctype === null ? '<!DOCTYPE html>' : ''
    const outer = (de as unknown as { outerHTML?: string }).outerHTML ?? ''
    return `${prefix}${outer}`
  }

  reconfigure(settings: JSDOMReconfigureSettings): void {
    if (settings.url !== undefined) {
      const win = this.window as unknown as { location: string | { href: string } }
      win.location = settings.url
    }
    // `windowTop` is accepted for API shape compatibility; very-happy-dom
    // windows are always top-level, so there is nothing to rewire.
  }

  /**
   * Return the source-location of a parsed node. Node locations are not
   * tracked, so this always returns null (matching jsdom's documented
   * behavior when `includeNodeLocations` is false).
   */
  nodeLocation(_node: unknown): null {
    return null
  }

  /**
   * Returns the document's documentElement outerHTML without a doctype
   * prefix. Used by some older jsdom consumers.
   */
  toString(): string {
    return this.serialize()
  }

  static fragment(html: string = ''): VirtualDocumentFragment {
    const jsdom = new JSDOM()
    const template = jsdom.window.document.createElement('template') as unknown as { innerHTML: string, content: VirtualDocumentFragment }
    template.innerHTML = html
    return template.content
  }

  static async fromURL(url: string, options: JSDOMConstructorOptions = {}): Promise<JSDOM> {
    const response = await globalThis.fetch(url)
    const html = await response.text()
    const contentType = response.headers.get('content-type') ?? options.contentType
    return new JSDOM(html, { ...options, url, contentType: contentType ?? undefined })
  }

  static async fromFile(path: string, options: JSDOMConstructorOptions = {}): Promise<JSDOM> {
    const file = Bun.file(path)
    const html = await file.text()
    const url = options.url ?? `file://${path.startsWith('/') ? path : `${process.cwd()}/${path}`}`
    return new JSDOM(html, { ...options, url })
  }

  private _parse(html: string, contentType: string): void {
    const doc = this.window.document
    const parser = new this.window.DOMParser()
    const parsed = parser.parseFromString(html, contentType)

    if (parsed.documentElement) {
      doc.documentElement = parsed.documentElement
      doc.childNodes = parsed.childNodes
      doc.head = parsed.head
      doc.body = parsed.body
      // Rewire ownerDocument + rebuild the id index so getElementById works.
      setOwnerDocumentRecursive(doc.documentElement as any, doc)
    }

    doc.contentType = contentType
  }
}

export { VirtualConsole, CookieJar, ResourceLoader }
export type { VirtualConsoleSendToOptions, VirtualConsoleListener } from './VirtualConsole'
export type {
  CookieJarGetCookiesOptions,
  CookieJarSetCookieOptions,
} from './CookieJar'
export type {
  FetchOptions as ResourceLoaderFetchOptions,
  ResourceLoaderConstructorOptions,
} from './ResourceLoader'

// Buffer re-export keeps `ResourceLoader.fetch()` callers typed without
// forcing them to import 'node:buffer' separately.
export { Buffer }
