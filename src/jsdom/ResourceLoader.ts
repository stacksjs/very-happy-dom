/**
 * ResourceLoader
 * jsdom-compatible resource fetcher. Extend this and override `fetch()` to
 * intercept network requests from the JSDOM instance. The default
 * implementation uses global fetch and returns a Buffer of the response body.
 */

import { Buffer } from 'node:buffer'

export interface ResourceLoaderConstructorOptions {
  strictSSL?: boolean
  proxy?: string
  userAgent?: string
}

export interface FetchOptions {
  accept?: string
  cookieJar?: unknown
  element?: unknown
  referrer?: string
}

export class ResourceLoader {
  protected _strictSSL: boolean
  protected _proxy: string | undefined
  protected _userAgent: string

  constructor(options: ResourceLoaderConstructorOptions = {}) {
    this._strictSSL = options.strictSSL ?? true
    this._proxy = options.proxy
    this._userAgent = options.userAgent ?? 'Mozilla/5.0 (VeryHappyDOM)'
  }

  get userAgent(): string {
    return this._userAgent
  }

  /**
   * Fetch a resource. Override to customize. The return value may be a
   * Promise that resolves to the resource bytes, or `null` to signal the
   * request was ignored (matches jsdom's signalling).
   */
  // eslint-disable-next-line pickier/no-unused-vars
  fetch(url: string, options: FetchOptions = {}): Promise<Buffer> | null {
    return globalThis.fetch(url, {
      headers: {
        'User-Agent': this._userAgent,
        ...(options.accept ? { Accept: options.accept } : {}),
        ...(options.referrer ? { Referer: options.referrer } : {}),
      },
    })
      .then(response => response.arrayBuffer())
      .then(ab => Buffer.from(ab))
  }
}
