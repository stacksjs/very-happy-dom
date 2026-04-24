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

interface BunWebViewConstructor {
  new (options: {
    url?: string
    width?: number
    height?: number
    backend?: 'webkit' | 'chrome'
    headless?: boolean
    dataStore?: 'ephemeral' | { directory: string }
  }): BunWebViewInstance
}

function getWebViewConstructor(): BunWebViewConstructor | null {
  const bun = (globalThis as { Bun?: { WebView?: unknown } }).Bun
  const WebView = bun?.WebView
  return typeof WebView === 'function' ? (WebView as BunWebViewConstructor) : null
}

/**
 * Returns true if the current runtime exposes Bun.WebView.
 */
export function isWebViewAvailable(): boolean {
  return getWebViewConstructor() !== null
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
 * Return type of a capture call, determined by the requested encoding.
 */
export type WebViewScreenshotResult = Buffer | string | Blob | { name: string, size: number }

/**
 * WebView-backed screenshot capture.
 */
export class WebViewCapture {
  /**
   * Navigate to a URL inside a headless Bun.WebView and capture a screenshot.
   */
  async capture(url: string, options: WebViewScreenshotOptions = {}): Promise<WebViewScreenshotResult> {
    const WebView = getWebViewConstructor()
    if (!WebView)
      throw new WebViewUnavailableError()

    const {
      width = 1024,
      height = 768,
      format = 'png',
      quality = 90,
      encoding = 'buffer',
      backend,
      headless = true,
      dataStore = 'ephemeral',
      waitFor = 0,
      path,
    } = options

    // 'binary' is a project-local alias for Bun's 'buffer' encoding.
    const bunEncoding: 'buffer' | 'base64' | 'blob' | 'shmem'
      = encoding === 'binary' ? 'buffer' : encoding

    const view = new WebView({ width, height, backend, headless, dataStore })

    try {
      await view.navigate(url)
      if (waitFor > 0)
        await new Promise(resolve => setTimeout(resolve, waitFor))

      const shot = await view.screenshot({ encoding: bunEncoding, format, quality })

      if (path)
        await writeScreenshotToPath(path, shot)

      return shot
    }
    finally {
      const disposer = view.close ?? view[Symbol.dispose]
      if (typeof disposer === 'function')
        disposer.call(view)
    }
  }

  /**
   * Capture a screenshot of an HTML string by loading it as a data URL.
   */
  async captureHtml(html: string, options: WebViewScreenshotOptions = {}): Promise<WebViewScreenshotResult> {
    const url = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
    return this.capture(url, options)
  }

  /**
   * Capture a screenshot of a live URL.
   */
  async captureUrl(url: string, options: WebViewScreenshotOptions = {}): Promise<WebViewScreenshotResult> {
    return this.capture(url, options)
  }
}

async function writeScreenshotToPath(path: string, shot: WebViewScreenshotResult): Promise<void> {
  // shmem returns a descriptor, not raw bytes — caller is responsible for reading the handle.
  if (typeof shot === 'object' && shot !== null && 'name' in shot && 'size' in shot)
    return

  // Bun.write accepts Blob | BufferSource | string.
  await Bun.write(path, shot as Blob | Buffer | string)
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
