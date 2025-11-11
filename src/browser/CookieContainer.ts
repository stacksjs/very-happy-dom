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
  path?: string
  expires?: Date
  httpOnly?: boolean
  secure?: boolean
  sameSite?: CookieSameSiteEnum
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
      // Remove existing cookie with same key, domain, and path
      this._cookies = this._cookies.filter(c =>
        !(c.key === cookie.key
          && (c.domain || new URL(c.originURL).hostname) === (cookie.domain || new URL(cookie.originURL).hostname)
          && (c.path || '/') === (cookie.path || '/')),
      )

      // Add new cookie
      this._cookies.push({
        ...cookie,
        value: cookie.value || '',
        domain: cookie.domain || new URL(cookie.originURL).hostname,
        path: cookie.path || '/',
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
    const hostname = parsedURL.hostname
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
      const cookieDomain = cookie.domain || new URL(cookie.originURL).hostname
      if (!hostname.endsWith(cookieDomain) && hostname !== cookieDomain) {
        return false
      }

      // Check path match
      const cookiePath = cookie.path || '/'
      if (!pathname.startsWith(cookiePath)) {
        return false
      }

      return true
    })
  }

  /**
   * Clears all cookies
   */
  clearCookies(): void {
    this._cookies = []
  }
}
