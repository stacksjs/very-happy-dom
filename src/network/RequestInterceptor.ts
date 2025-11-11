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
 * Request Interceptor manages network request interception
 */
export class RequestInterceptor {
  private _enabled = false
  private _handlers = new Set<RequestInterceptionHandler>()
  private _originalFetch: typeof fetch

  constructor() {
    this._originalFetch = globalThis.fetch
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
        },
      }

      // Call handlers
      for (const handler of interceptor._handlers) {
        await handler(interceptedRequest)
      }

      // Handle abort
      if (aborted) {
        throw new Error('Request aborted')
      }

      // Handle mock response
      if (responded && mockResponse) {
        return mockResponse
      }

      // Continue with overrides or original request
      const finalUrl = overrides.url || url
      const finalMethod = overrides.method || method
      const finalHeaders = overrides.headers || headers
      const finalBody = overrides.postData !== undefined ? overrides.postData : init?.body

      return interceptor._originalFetch(finalUrl, {
        ...init,
        method: finalMethod,
        headers: finalHeaders,
        body: finalBody,
      })
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

  clear(): void {
    this._handlers.clear()
  }
}
