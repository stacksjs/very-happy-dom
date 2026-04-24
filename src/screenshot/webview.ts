/**
 * WebView Screenshot Capture
 * Thin wrapper around Bun.WebView.screenshot (https://bun.com/reference/bun/WebView/screenshot)
 * that produces real browser-rendered screenshots instead of the pure-JS pipeline.
 *
 * WebKit backend is macOS-only; the Chrome backend works cross-platform when
 * Chrome/Chromium is installed. Availability is detected at runtime so this module
 * stays importable on Bun versions that do not yet expose Bun.WebView.
 */

import { Buffer } from 'node:buffer'

/**
 * Image format accepted by Bun.WebView.screenshot.
 */
export type WebViewImageFormat = 'png' | 'jpeg' | 'webp'

/**
 * Encoding variants. `'binary'` is an alias for `'buffer'` to stay consistent
 * with the project's existing ScreenshotOptions shape.
 */
export type WebViewEncoding = 'buffer' | 'binary' | 'base64' | 'blob' | 'shmem'

/**
 * Font face to preload via an injected @font-face rule.
 */
export interface WebViewFont {
  family: string
  url: string
  weight?: string
  style?: string
}

/**
 * Console hook forwarded to Bun.WebView's `console` constructor option.
 * The exact event shape is defined by Bun; passed through unchanged.
 */
// eslint-disable-next-line pickier/no-unused-vars
export type WebViewConsoleHook = true | ((event: unknown) => void)

/**
 * WebView-backed screenshot options
 */
export interface WebViewScreenshotOptions {
  /** Viewport width (1-16384) */
  width?: number
  /** Viewport height (1-16384) */
  height?: number
  /** Output format (default: 'png') */
  format?: WebViewImageFormat
  /** Quality 0-100 for lossy formats (default: 90) */
  quality?: number
  /** Output encoding (default: 'buffer') */
  encoding?: WebViewEncoding
  /** Optional filesystem path to write the screenshot to */
  path?: string
  /** Browser engine (default: 'webkit' on macOS, else 'chrome') */
  backend?: 'webkit' | 'chrome'
  /** Only `true` is currently implemented by Bun */
  headless?: boolean
  /** Storage mode */
  dataStore?: 'ephemeral' | { directory: string }
  /** Delay in ms between page load and capture — gives async content time to render */
  waitFor?: number
  /** Maximum total ms for navigate + screenshot; rejects if exceeded */
  timeout?: number
  /** Inline CSS injected into the document head (HTML captures only) */
  css?: string
  /** Base URL used to resolve relative asset paths (HTML captures only) */
  baseUrl?: string
  /** Fonts preloaded via @font-face (HTML captures only) */
  fonts?: WebViewFont[]
  /** Capture page console calls; forwarded to Bun.WebView's `console` option */
  console?: WebViewConsoleHook
}

/**
 * Construction-time options for WebViewCapture. These configure the underlying
 * WebView lifecycle — most apply only in `reuse` mode.
 */
export interface WebViewCaptureConstructorOptions {
  /**
   * Keep one WebView alive across captures instead of creating and disposing
   * per call. Large speedup for test suites that take many screenshots.
   */
  reuse?: boolean
  /** Default viewport width for the reused instance */
  width?: number
  /** Default viewport height for the reused instance */
  height?: number
  backend?: 'webkit' | 'chrome'
  headless?: boolean
  dataStore?: 'ephemeral' | { directory: string }
  /** Default console hook applied to the reused instance */
  console?: WebViewConsoleHook
}

/**
 * Minimal structural typing for Bun.WebView so we do not depend on Bun's
 * ambient types — this file must compile on Bun versions predating WebView.
 */
interface BunWebViewInstance {
  navigate: (url: string) => Promise<void>
  screenshot: (options: {
    encoding: 'buffer' | 'base64' | 'blob' | 'shmem'
    format: WebViewImageFormat
    quality: number
  }) => Promise<Buffer | string | Blob | { name: string, size: number }>
  close?: () => void
  [Symbol.dispose]?: () => void
}

interface BunWebViewConstructorOptions {
  url?: string
  width?: number
  height?: number
  backend?: 'webkit' | 'chrome'
  headless?: boolean
  dataStore?: 'ephemeral' | { directory: string }
  console?: unknown
}

interface BunWebViewConstructor {
  new (options: BunWebViewConstructorOptions): BunWebViewInstance
}

function getWebViewConstructor(): BunWebViewConstructor | null {
  const bun = (globalThis as { Bun?: { WebView?: unknown } }).Bun
  const WebView = bun?.WebView
  return typeof WebView === 'function' ? (WebView as BunWebViewConstructor) : null
}

/**
 * Returns true if the current runtime exposes Bun.WebView.
 *
 * Note: this only checks the constructor is present. Headless runners (e.g.
 * Ubuntu CI without WebKit/Chromium installed) have the constructor but
 * cannot actually render — use `canRenderWithWebView` for that.
 */
export function isWebViewAvailable(): boolean {
  return getWebViewConstructor() !== null
}

let probedRender: boolean | null = null
let probeInFlight: Promise<boolean> | null = null

/**
 * Probe whether the runtime can actually render through Bun.WebView, not just
 * expose the constructor. Constructs a 1×1 headless view and runs a trivial
 * `data:` navigation under a short timeout; caches the result for the lifetime
 * of the process. Safe to call from tests that want to skip real-capture
 * assertions on environments without a working browser backend (e.g. headless
 * Linux CI without WebKit/Chromium).
 */
export async function canRenderWithWebView(timeoutMs = 1500): Promise<boolean> {
  if (probedRender !== null) return probedRender
  if (probeInFlight) return probeInFlight

  probeInFlight = (async () => {
    const WebView = getWebViewConstructor()
    if (!WebView) return false

    // Defer construction one tick so we can race it against the timeout.
    // Some backends throw synchronously when they can't initialize (expected);
    // if the runtime were to hang synchronously we'd still block the whole
    // event loop, but Bun.WebView today only blocks inside async ops.
    const probe = (async () => {
      let view: BunWebViewInstance | null = null
      try {
        view = new WebView({ width: 1, height: 1, headless: true, dataStore: 'ephemeral' })
      }
      catch {
        return false
      }
      try {
        await view.navigate('data:text/html,<!doctype html>')
        return true
      }
      catch {
        return false
      }
      finally {
        disposeView(view)
      }
    })()

    return Promise.race([
      probe,
      new Promise<boolean>(resolve => setTimeout(() => resolve(false), timeoutMs)),
    ])
  })().then((result) => {
    probedRender = result
    probeInFlight = null
    return result
  })

  return probeInFlight
}

/**
 * Thrown when WebView-backed capture is requested but Bun.WebView is unavailable.
 */
export class WebViewUnavailableError extends Error {
  constructor() {
    super(
      'Bun.WebView is not available in this runtime. '
      + 'Requires a Bun version that ships WebView, and (on non-macOS) a Chromium backend.',
    )
    this.name = 'WebViewUnavailableError'
  }
}

/**
 * Thrown when a capture exceeds its `timeout` budget.
 */
export class WebViewTimeoutError extends Error {
  constructor(phase: string, ms: number) {
    super(`Bun.WebView ${phase} timed out after ${ms}ms`)
    this.name = 'WebViewTimeoutError'
  }
}

/**
 * Return type of a capture call, determined by the requested encoding.
 */
export type WebViewScreenshotResult = Buffer | string | Blob | { name: string, size: number }

/**
 * WebView-backed screenshot capture.
 */
export class WebViewCapture {
  private init: WebViewCaptureConstructorOptions
  private pooled: BunWebViewInstance | null = null
  private pooledKey = ''

  constructor(init: WebViewCaptureConstructorOptions = {}) {
    this.init = init
  }

  /**
   * Navigate to a URL inside a headless Bun.WebView and capture a screenshot.
   */
  async capture(url: string, options: WebViewScreenshotOptions = {}): Promise<WebViewScreenshotResult> {
    const WebView = getWebViewConstructor()
    if (!WebView)
      throw new WebViewUnavailableError()

    const {
      width = this.init.width ?? 1024,
      height = this.init.height ?? 768,
      format = 'png',
      quality = 90,
      encoding = 'buffer',
      backend = this.init.backend,
      headless = this.init.headless ?? true,
      dataStore = this.init.dataStore ?? 'ephemeral',
      waitFor = 0,
      timeout,
      path,
      console: consoleOpt = this.init.console,
    } = options

    // 'binary' is a project-local alias for Bun's 'buffer' encoding.
    const bunEncoding: 'buffer' | 'base64' | 'blob' | 'shmem'
      = encoding === 'binary' ? 'buffer' : encoding

    const viewConfig: BunWebViewConstructorOptions = {
      width,
      height,
      backend,
      headless,
      dataStore,
      console: consoleOpt,
    }

    const view = this.acquire(WebView, viewConfig)

    try {
      await withTimeout(view.navigate(url), timeout, 'navigate')
      if (waitFor > 0)
        await new Promise(resolve => setTimeout(resolve, waitFor))

      const shot = await withTimeout(
        view.screenshot({ encoding: bunEncoding, format, quality }),
        timeout,
        'screenshot',
      )

      if (path)
        await writeScreenshotToPath(path, shot)

      return shot
    }
    finally {
      this.release(view)
    }
  }

  /**
   * Capture a screenshot of an HTML string by loading it as a data URL.
   * When `css`, `baseUrl`, or `fonts` are provided, they are injected into
   * the document head before encoding.
   */
  async captureHtml(html: string, options: WebViewScreenshotOptions = {}): Promise<WebViewScreenshotResult> {
    const decorated = decorateHtml(html, options)
    const url = `data:text/html;charset=utf-8,${encodeURIComponent(decorated)}`
    return this.capture(url, options)
  }

  /**
   * Capture a screenshot of a live URL.
   */
  async captureUrl(url: string, options: WebViewScreenshotOptions = {}): Promise<WebViewScreenshotResult> {
    return this.capture(url, options)
  }

  /**
   * Close any pooled WebView. Safe to call repeatedly.
   */
  dispose(): void {
    if (this.pooled) {
      disposeView(this.pooled)
      this.pooled = null
      this.pooledKey = ''
    }
  }

  [Symbol.dispose](): void {
    this.dispose()
  }

  private acquire(WebView: BunWebViewConstructor, config: BunWebViewConstructorOptions): BunWebViewInstance {
    if (!this.init.reuse)
      return new WebView(config)

    const key = poolKey(config)
    if (this.pooled && this.pooledKey === key)
      return this.pooled

    // Config changed (e.g. dimensions) — drop the stale instance.
    if (this.pooled)
      disposeView(this.pooled)

    this.pooled = new WebView(config)
    this.pooledKey = key
    return this.pooled
  }

  private release(view: BunWebViewInstance): void {
    if (this.init.reuse && this.pooled === view)
      return
    disposeView(view)
  }
}

function disposeView(view: BunWebViewInstance): void {
  const disposer = view.close ?? view[Symbol.dispose]
  if (typeof disposer === 'function')
    disposer.call(view)
}

function poolKey(config: BunWebViewConstructorOptions): string {
  const ds = typeof config.dataStore === 'string' ? config.dataStore : config.dataStore?.directory ?? ''
  return `${config.width ?? ''}x${config.height ?? ''}|${config.backend ?? ''}|${config.headless ?? ''}|${ds}`
}

async function withTimeout<T>(promise: Promise<T>, timeout: number | undefined, phase: string): Promise<T> {
  if (!timeout || timeout <= 0)
    return promise

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new WebViewTimeoutError(phase, timeout)), timeout)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  }
  finally {
    if (timer)
      clearTimeout(timer)
  }
}

async function writeScreenshotToPath(path: string, shot: WebViewScreenshotResult): Promise<void> {
  // shmem returns a descriptor, not raw bytes — caller is responsible for reading the handle.
  if (typeof shot === 'object' && shot !== null && 'name' in shot && 'size' in shot)
    return

  await Bun.write(path, shot as Blob | Buffer | string)
}

function decorateHtml(html: string, options: WebViewScreenshotOptions): string {
  const { css, baseUrl, fonts } = options
  const hasExtras = Boolean(css || baseUrl || (fonts && fonts.length > 0))
  if (!hasExtras)
    return html

  const parts: string[] = []
  if (baseUrl)
    parts.push(`<base href="${escapeAttr(baseUrl)}">`)

  const fontRules = (fonts ?? []).map((font) => {
    const weight = font.weight != null ? ` font-weight: ${font.weight};` : ''
    const style = font.style ? ` font-style: ${font.style};` : ''
    return `@font-face { font-family: '${escapeAttr(font.family)}'; src: url('${escapeAttr(font.url)}');${weight}${style} }`
  }).join('\n')

  if (fontRules || css)
    parts.push(`<style>${fontRules}${css ?? ''}</style>`)

  const injection = parts.join('')

  if (/<\/head>/i.test(html))
    return html.replace(/<\/head>/i, `${injection}</head>`)

  const htmlOpen = /<html\b[^>]*>/i.exec(html)
  if (htmlOpen)
    return html.replace(htmlOpen[0], `${htmlOpen[0]}<head>${injection}</head>`)

  return `<!DOCTYPE html><html><head>${injection}</head><body>${html}</body></html>`
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Convenience: capture a screenshot from HTML via Bun.WebView.
 */
export async function captureHtmlWithWebView(
  html: string,
  options: WebViewScreenshotOptions = {},
): Promise<WebViewScreenshotResult> {
  return new WebViewCapture().captureHtml(html, options)
}

/**
 * Convenience: capture a screenshot from a URL via Bun.WebView.
 */
export async function captureUrlWithWebView(
  url: string,
  options: WebViewScreenshotOptions = {},
): Promise<WebViewScreenshotResult> {
  return new WebViewCapture().captureUrl(url, options)
}
