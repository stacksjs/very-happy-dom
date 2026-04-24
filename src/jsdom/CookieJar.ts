/**
 * CookieJar
 * Thin jsdom-compatible facade over CookieContainer. Supports the
 * callback-or-promise shape used by tough-cookie / jsdom tests.
 */

import type { ICookie } from '../browser/CookieContainer'
import { CookieContainer } from '../browser/CookieContainer'

export interface CookieJarSetCookieOptions {
  http?: boolean
  secure?: boolean
  now?: Date
  ignoreError?: boolean
  sameSiteContext?: 'strict' | 'lax' | 'none'
}

export interface CookieJarGetCookiesOptions {
  http?: boolean
  secure?: boolean
  now?: Date
  expire?: boolean
  allPaths?: boolean
  sameSiteContext?: 'strict' | 'lax' | 'none'
}

// eslint-disable-next-line pickier/no-unused-vars
type Callback<T> = (err: Error | null, result?: T) => void

function parseSetCookie(header: string, originURL: string): ICookie {
  const [nameValue, ...attrs] = header.split(';').map(s => s.trim())
  const eq = nameValue.indexOf('=')
  const key = eq === -1 ? nameValue : nameValue.slice(0, eq)
  const value = eq === -1 ? '' : nameValue.slice(eq + 1)

  const cookie: ICookie = { key, value, originURL }
  for (const attr of attrs) {
    const [rawName, rawVal = ''] = attr.split('=').map(s => s.trim())
    const name = rawName.toLowerCase()
    switch (name) {
      case 'domain':
        cookie.domain = rawVal.replace(/^\./, '').toLowerCase()
        break
      case 'path':
        cookie.path = rawVal
        break
      case 'expires': {
        const d = new Date(rawVal)
        if (!Number.isNaN(d.getTime()))
          cookie.expires = d
        break
      }
      case 'max-age': {
        const n = Number(rawVal)
        if (Number.isFinite(n))
          cookie.expires = new Date(Date.now() + n * 1000)
        break
      }
      case 'httponly':
        cookie.httpOnly = true
        break
      case 'secure':
        cookie.secure = true
        break
      case 'samesite': {
        const v = rawVal.toLowerCase()
        if (v === 'strict' || v === 'lax' || v === 'none')
          cookie.sameSite = (v.charAt(0).toUpperCase() + v.slice(1)) as any
        break
      }
    }
  }
  return cookie
}

function formatCookieHeader(cookies: ICookie[]): string {
  return cookies.map(c => `${c.key}=${c.value ?? ''}`).join('; ')
}

export class CookieJar {
  private _container: CookieContainer

  constructor(container?: CookieContainer) {
    this._container = container ?? new CookieContainer()
  }

  /** @internal */
  _getContainer(): CookieContainer {
    return this._container
  }

  setCookie(cookie: string, url: string): Promise<ICookie>
  // eslint-disable-next-line pickier/no-unused-vars
  setCookie(cookie: string, url: string, options: CookieJarSetCookieOptions): Promise<ICookie>
  // eslint-disable-next-line pickier/no-unused-vars
  setCookie(cookie: string, url: string, cb: Callback<ICookie>): void
  setCookie(
    cookie: string,
    url: string,
    // eslint-disable-next-line pickier/no-unused-vars
    options: CookieJarSetCookieOptions,
    // eslint-disable-next-line pickier/no-unused-vars
    cb: Callback<ICookie>,
  ): void
  setCookie(
    cookie: string,
    url: string,
    optionsOrCb?: CookieJarSetCookieOptions | Callback<ICookie>,
    cb?: Callback<ICookie>,
  ): Promise<ICookie> | void {
    const callback = typeof optionsOrCb === 'function' ? optionsOrCb : cb
    try {
      const parsed = parseSetCookie(cookie, url)
      this._container.addCookies([parsed])
      if (callback) return callback(null, parsed)
      return Promise.resolve(parsed)
    }
    catch (err) {
      if (callback) return callback(err as Error)
      return Promise.reject(err)
    }
  }

  getCookies(url: string): Promise<ICookie[]>
  // eslint-disable-next-line pickier/no-unused-vars
  getCookies(url: string, options: CookieJarGetCookiesOptions): Promise<ICookie[]>
  // eslint-disable-next-line pickier/no-unused-vars
  getCookies(url: string, cb: Callback<ICookie[]>): void
  getCookies(
    url: string,
    // eslint-disable-next-line pickier/no-unused-vars
    options: CookieJarGetCookiesOptions,
    // eslint-disable-next-line pickier/no-unused-vars
    cb: Callback<ICookie[]>,
  ): void
  getCookies(
    url: string,
    optionsOrCb?: CookieJarGetCookiesOptions | Callback<ICookie[]>,
    cb?: Callback<ICookie[]>,
  ): Promise<ICookie[]> | void {
    const options = typeof optionsOrCb === 'object' && optionsOrCb !== null
      ? optionsOrCb as CookieJarGetCookiesOptions
      : {}
    const callback = typeof optionsOrCb === 'function' ? optionsOrCb : cb
    try {
      const cookies = this._container.getCookies(url, options.http === true)
      if (callback) return callback(null, cookies)
      return Promise.resolve(cookies)
    }
    catch (err) {
      if (callback) return callback(err as Error)
      return Promise.reject(err)
    }
  }

  getCookieString(url: string): Promise<string>
  // eslint-disable-next-line pickier/no-unused-vars
  getCookieString(url: string, cb: Callback<string>): void
  getCookieString(url: string, cb?: Callback<string>): Promise<string> | void {
    try {
      const str = formatCookieHeader(this._container.getCookies(url))
      if (cb) return cb(null, str)
      return Promise.resolve(str)
    }
    catch (err) {
      if (cb) return cb(err as Error)
      return Promise.reject(err)
    }
  }
}
