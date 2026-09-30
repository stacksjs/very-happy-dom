/**
 * Network Request Interception
 * Allows intercepting, modifying, and mocking network requests
 */

export interface InterceptedRequest {
  url: string
  method: string
  headers: Record<string, string>
  postData?: string | null
  resourceType: string

  continue: (overrides?: { url?: string, method?: string, headers?: Record<string, string>, postData?: string }) => void
  abort: (errorCode?: string) => void
  respond: (response: { status: number, headers?: Record<string, string>, body: string | ArrayBuffer }) => void
}

export interface RequestInterceptionHandler {
  (request: InterceptedRequest): void | Promise<void>
}

/**
 * Notified with every intercepted request, before any handler runs.
 *
 * Deliberately separate from a handler. A handler can rewrite, abort or fulfil
 * the request and is awaited; an observer only watches, which is what reporting
 * an event is — and, because `clear()` drops handlers, an observer is the only
 * place a permanent listener can safely live.
 */
export interface RequestObserver {
  // eslint-disable-next-line pickier/no-unused-vars
  (request: InterceptedRequest): void
}

/**
 * Notified with the response every intercepted request settled on, whether it
 * came from a route's `fulfill()` or from the network.
 *
 * Handlers see requests; nothing saw responses, so `page.on('response')` could
 * only ever report a navigation — not the `fetch` a page's own code makes,
 * which is what `waitForResponse` is almost always waiting for (#1606).
 */
export interface ResponseObserver {
  // eslint-disable-next-line pickier/no-unused-vars
  (response: Response, request: InterceptedRequest): void
}

/**
 * Request Interceptor manages network request interception
 */
export class RequestInterceptor {
  private _enabled = false
  private _handlers = new Set<RequestInterceptionHandler>()
  private _requestObservers = new Set<RequestObserver>()
  private _observers = new Set<ResponseObserver>()
  private _originalFetch: typeof fetch

  constructor() {
    this._originalFetch = globalThis.fetch
  }

  /** Whether the global `fetch` is currently intercepted. */
  get enabled(): boolean {
    return this._enabled
  }

  enable(): void {
    if (this._enabled)
      return
    this._enabled = true

    // Override global fetch
    // eslint-disable-next-line ts/no-this-alias
    const interceptor = this
    const overriddenFetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const method = init?.method || 'GET'
      const headers: Record<string, string> = {}

      // Extract headers
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((value, key) => {
            headers[key] = value
          })
        }
        else if (Array.isArray(init.headers)) {
          init.headers.forEach(([key, value]) => {
            headers[key] = value
          })
        }
        else {
          Object.assign(headers, init.headers)
        }
      }

      let aborted = false
      let responded = false
      let mockResponse: Response | null = null
      let overrides: any = {}

      const interceptedRequest: InterceptedRequest = {
        url,
        method,
        headers,
        postData: init?.body ? String(init.body) : null,
        resourceType: 'fetch',

        continue(reqOverrides = {}) {
          overrides = reqOverrides
        },

        abort(_errorCode = 'failed') {
          aborted = true
        },

        respond(response) {
          responded = true
          mockResponse = new Response(response.body, {
            status: response.status,
            headers: response.headers,
          })
          // A Response built from a body carries no url, so a listener could not
          // tell which request it answered (#1602). Filled in here, where the
          // request is still in hand, rather than at each place one is emitted.
          Object.defineProperty(mockResponse, 'url', { value: url, configurable: true })
        },
      }

      // Before the handlers, so a request a route goes on to abort is still
      // reported — the attempt happened either way.
      interceptor._announceRequest(interceptedRequest)

      // Call handlers
      for (const handler of interceptor._handlers) {
        await handler(interceptedRequest)
      }

      // Handle abort
      if (aborted) {
        throw new Error('Request aborted')
      }

      // Every path out of here goes through one announcement, so a new branch
      // cannot quietly stop reporting its response.
      const settle = (response: Response): Response => {
        interceptor._announce(response, interceptedRequest)
        return response
      }

      // Handle mock response
      if (responded && mockResponse) {
        return settle(mockResponse)
      }

      // Continue with overrides or original request
      const finalUrl = overrides.url || url
      const finalMethod = overrides.method || method
      const finalHeaders = overrides.headers || headers
      const finalBody = overrides.postData !== undefined ? overrides.postData : init?.body

      return settle(await interceptor._originalFetch(finalUrl, {
        ...init,
        method: finalMethod,
        headers: finalHeaders,
        body: finalBody,
      }))
    }
    // Add the preconnect property to match fetch signature
    Object.assign(overriddenFetch, { preconnect: () => {} })
    globalThis.fetch = overriddenFetch as typeof fetch
  }

  disable(): void {
    if (!this._enabled)
      return
    this._enabled = false
    globalThis.fetch = this._originalFetch
  }

  addHandler(handler: RequestInterceptionHandler): void {
    this._handlers.add(handler)
  }

  removeHandler(handler: RequestInterceptionHandler): void {
    this._handlers.delete(handler)
  }

  /** Drop every handler. Observers are listeners and are left alone. */
  clear(): void {
    this._handlers.clear()
  }

  /** Watch every intercepted request. Not cleared by `clear()`. */
  addRequestObserver(observer: RequestObserver): void {
    this._requestObservers.add(observer)
  }

  removeRequestObserver(observer: RequestObserver): void {
    this._requestObservers.delete(observer)
  }

  /** Watch the response of every intercepted request. Not cleared by `clear()`. */
  addResponseObserver(observer: ResponseObserver): void {
    this._observers.add(observer)
  }

  removeResponseObserver(observer: ResponseObserver): void {
    this._observers.delete(observer)
  }

  /**
   * Tell the observers, without letting one of them break the request.
   *
   * An observer is a listener, so a handler that throws must not turn a
   * perfectly good response into a failed `fetch` — the page would report a
   * network error for a bug in an event handler.
   */
  private _announce(response: Response, request: InterceptedRequest): void {
    for (const observer of this._observers) {
      try {
        observer(response, request)
      }
      catch {
        // Deliberately swallowed; see above.
      }
    }
  }

  private _announceRequest(request: InterceptedRequest): void {
    for (const observer of this._requestObservers) {
      try {
        observer(request)
      }
      catch {
        // As above: a listener must not be able to fail the request.
      }
    }
  }
}
