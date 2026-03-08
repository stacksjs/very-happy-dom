export enum CookieSameSiteEnum {
  none = 'None',
  lax = 'Lax',
  strict = 'Strict',
}

export interface ICookie {
  key: string
  value?: string
  originURL: string
  domain?: string
  hostOnly?: boolean
  path?: string
  expires?: Date
  httpOnly?: boolean
  secure?: boolean
  sameSite?: CookieSameSiteEnum
}

function domainMatches(hostname: string, cookieDomain: string, hostOnly: boolean): boolean {
  if (hostOnly) {
    return hostname === cookieDomain
  }

  return hostname === cookieDomain || hostname.endsWith(`.${cookieDomain}`)
}

function pathMatches(pathname: string, cookiePath: string): boolean {
  if (pathname === cookiePath) {
    return true
  }
  if (!pathname.startsWith(cookiePath)) {
    return false
  }
  if (cookiePath.endsWith('/')) {
    return true
  }
  return pathname[cookiePath.length] === '/'
}

/**
 * CookieContainer manages cookies stored in memory for a BrowserContext
 */
export class CookieContainer {
  private _cookies: ICookie[] = []

  /**
   * Adds cookies to the container
   */
  addCookies(cookies: ICookie[]): void {
    for (const cookie of cookies) {
      const normalizedDomain = (cookie.domain || new URL(cookie.originURL).hostname).replace(/^\./, '').toLowerCase()
      const normalizedPath = cookie.path || '/'

      // Remove existing cookie with same key, domain, and path
      this._cookies = this._cookies.filter(c =>
        !(c.key === cookie.key
          && (c.domain || new URL(c.originURL).hostname).toLowerCase() === normalizedDomain
          && (c.path || '/') === normalizedPath),
      )

      if (cookie.expires && cookie.expires <= new Date()) {
        continue
      }

      // Add new cookie
      this._cookies.push({
        ...cookie,
        value: cookie.value || '',
        domain: normalizedDomain,
        hostOnly: cookie.hostOnly ?? !cookie.domain,
        path: normalizedPath,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || false,
        sameSite: cookie.sameSite || CookieSameSiteEnum.lax,
      })
    }
  }

  /**
   * Gets cookies for a specific URL
   */
  getCookies(url: string, includeHttpOnly = false): ICookie[] {
    const parsedURL = new URL(url)
    const hostname = parsedURL.hostname.toLowerCase()
    const pathname = parsedURL.pathname
    const isSecure = parsedURL.protocol === 'https:'
    const now = new Date()

    return this._cookies.filter((cookie) => {
      // Check if expired
      if (cookie.expires && cookie.expires < now) {
        return false
      }

      // Check httpOnly flag
      if (cookie.httpOnly && !includeHttpOnly) {
        return false
      }

      // Check secure flag
      if (cookie.secure && !isSecure) {
        return false
      }

      // Check domain match
      const cookieDomain = (cookie.domain || new URL(cookie.originURL).hostname).toLowerCase()
      if (!domainMatches(hostname, cookieDomain, cookie.hostOnly === true)) {
        return false
      }

      // Check path match
      const cookiePath = cookie.path || '/'
      if (!pathMatches(pathname, cookiePath)) {
        return false
      }

      return true
    }).sort((left, right) => (right.path?.length || 0) - (left.path?.length || 0))
  }

  /**
   * Clears all cookies
   */
  clearCookies(): void {
    this._cookies = []
  }
}
