/**
 * URL-pattern request routing.
 *
 * The Puppeteer-shaped path — `page.on('request')` plus
 * `setRequestInterception(true)` — hands every request to every handler, so each
 * one has to pattern-match by hand and remember to continue the requests it does
 * not care about, or they hang. `route()` scopes a handler to the URLs it is
 * about and leaves everything else untouched.
 *
 * This sits on top of the existing `RequestInterceptor` rather than replacing
 * it, so both surfaces keep working.
 */

/** What a route can be keyed on. */
export type RoutePattern = string | RegExp | ((url: string) => boolean)

export interface RouteRequest {
  url: string
  method: string
  headers: Record<string, string>
  postData: string | null
  resourceType: string
}

export interface FulfillOptions {
  status?: number
  headers?: Record<string, string>
  body?: string
  /** Serialized as JSON, with a matching content type unless one is given. */
  json?: unknown
  contentType?: string
}

export interface ContinueOverrides {
  url?: string
  method?: string
  headers?: Record<string, string>
  postData?: string
}

export interface Route {
  /** The request being routed. */
  request: () => RouteRequest
  /** Answer without touching the network. */
  fulfill: (options?: FulfillOptions) => Promise<void>
  /** Fail the request. */
  abort: (errorCode?: string) => Promise<void>
  /** Let it through, optionally rewritten. */
  continue: (overrides?: ContinueOverrides) => Promise<void>
  /** Perform the request and hand back the response, for rewriting. */
  fetch: () => Promise<Response>
  /** Decline to handle it, so the next matching route gets a turn. */
  fallback: () => Promise<void>
}

export type RouteHandler = (route: Route, request: RouteRequest) => void | Promise<void>

export interface RegisteredRoute {
  pattern: RoutePattern
  handler: RouteHandler
}

/**
 * Translate a Playwright-style glob to a RegExp.
 *
 * `*` stops at a path separator and `**` crosses them, which is what makes
 * `** /api/**` match a whole subtree while `/api/*` stays on one segment.
 */
export function globToRegExp(glob: string): RegExp {
  let source = ''

  for (let index = 0; index < glob.length; index++) {
    const char = glob[index]

    if (char === '*') {
      if (glob[index + 1] === '*') {
        source += '.*'
        index++
      }
      else {
        source += '[^/]*'
      }
      continue
    }

    if (char === '?') {
      source += '[^/]'
      continue
    }

    // Everything else is literal, so regex metacharacters must be escaped.
    source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  }

  return new RegExp(`^${source}$`)
}

/** Whether `url` is covered by `pattern`. */
export function matchesPattern(pattern: RoutePattern, url: string): boolean {
  if (typeof pattern === 'function')
    return pattern(url)

  if (pattern instanceof RegExp)
    return pattern.test(url)

  return globToRegExp(pattern).test(url)
}

/**
 * The routes registered against one page or context.
 *
 * Matching runs most-recently-registered first, so a later route overrides an
 * earlier one for the same URL — and `fallback()` walks down the list.
 */
export class RouteRegistry {
  private _routes: RegisteredRoute[] = []

  get size(): number {
    return this._routes.length
  }

  add(pattern: RoutePattern, handler: RouteHandler): void {
    this._routes.unshift({ pattern, handler })
  }

  /**
   * Drop routes for `pattern`, or only the one using `handler`.
   *
   * Patterns are compared by identity for a RegExp or function and by value for
   * a glob, which is how a caller can realistically refer back to one.
   */
  remove(pattern?: RoutePattern, handler?: RouteHandler): void {
    if (pattern === undefined) {
      this._routes = []
      return
    }

    this._routes = this._routes.filter((route) => {
      const samePattern = typeof pattern === 'string' && typeof route.pattern === 'string'
        ? route.pattern === pattern
        : route.pattern === pattern
      if (!samePattern)
        return true
      return handler !== undefined && route.handler !== handler
    })
  }

  /** Routes whose pattern covers `url`, in priority order. */
  matching(url: string): RegisteredRoute[] {
    return this._routes.filter(route => matchesPattern(route.pattern, url))
  }
}
