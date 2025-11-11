/**
 * XMLHttpRequest implementation
 * Wraps Bun's native fetch API to provide legacy XHR interface
 */
export class XMLHttpRequest {
  // Ready states
  static readonly UNSENT = 0
  static readonly OPENED = 1
  static readonly HEADERS_RECEIVED = 2
  static readonly LOADING = 3
  static readonly DONE = 4

  // Instance properties
  public readyState: number = XMLHttpRequest.UNSENT
  public response: any = null
  public responseText: string = ''
  public responseType: '' | 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' = ''
  public responseURL: string = ''
  public responseXML: Document | null = null
  public status: number = 0
  public statusText: string = ''
  public timeout: number = 0
  public upload: XMLHttpRequestUpload = new XMLHttpRequestUpload()
  public withCredentials: boolean = false

  // Event handlers
  public onreadystatechange: ((this: XMLHttpRequest, ev: Event) => any) | null = null
  public onload: ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null = null
  public onerror: ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null = null
  public onabort: ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null = null
  public onloadstart: ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null = null
  public onloadend: ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null = null
  public onprogress: ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null = null
  public ontimeout: ((this: XMLHttpRequest, ev: ProgressEvent) => any) | null = null

  private _method = ''
  private _url = ''
  private _requestHeaders = new Map<string, string>()
  private _responseHeaders = new Map<string, string>()
  private _aborted = false
  private _eventListeners = new Map<string, Set<EventListener>>()

  constructor() {}

  open(method: string, url: string, _async = true, _username?: string | null, _password?: string | null): void {
    this._method = method.toUpperCase()
    this._url = url
    this.readyState = XMLHttpRequest.OPENED
    this._triggerEvent('readystatechange')
  }

  send(body?: Document | XMLHttpRequestBodyInit | null): void {
    if (this.readyState !== XMLHttpRequest.OPENED) {
      throw new Error('InvalidStateError: Object state must be OPENED')
    }

    this._triggerEvent('loadstart', true)

    const headers: Record<string, string> = {}
    for (const [key, value] of this._requestHeaders) {
      headers[key] = value
    }

    const fetchOptions: RequestInit = {
      method: this._method,
      headers,
      body: body as any,
      credentials: this.withCredentials ? 'include' : 'same-origin',
    }

    const controller = new AbortController()
    let timeoutId: NodeJS.Timeout | null = null

    if (this.timeout > 0) {
      timeoutId = setTimeout(() => {
        controller.abort()
        this._triggerEvent('timeout', true)
      }, this.timeout)
    }

    fetch(this._url, { ...fetchOptions, signal: controller.signal })
      .then(async (response) => {
        if (timeoutId)
          clearTimeout(timeoutId)
        if (this._aborted)
          return

        this.status = response.status
        this.statusText = response.statusText
        this.responseURL = response.url

        // Parse response headers
        response.headers.forEach((value, key) => {
          this._responseHeaders.set(key.toLowerCase(), value)
        })

        this.readyState = XMLHttpRequest.HEADERS_RECEIVED
        this._triggerEvent('readystatechange')

        this.readyState = XMLHttpRequest.LOADING
        this._triggerEvent('readystatechange')

        // Handle response based on responseType
        if (this.responseType === '' || this.responseType === 'text') {
          this.responseText = await response.text()
          this.response = this.responseText
        }
        else if (this.responseType === 'json') {
          this.response = await response.json()
          this.responseText = JSON.stringify(this.response)
        }
        else if (this.responseType === 'arraybuffer') {
          this.response = await response.arrayBuffer()
        }
        else if (this.responseType === 'blob') {
          this.response = await response.blob()
        }

        this.readyState = XMLHttpRequest.DONE
        this._triggerEvent('readystatechange')
        this._triggerEvent('load', true)
        this._triggerEvent('loadend', true)
      })
      .catch(() => {
        if (timeoutId)
          clearTimeout(timeoutId)
        if (this._aborted) {
          this._triggerEvent('abort', true)
          this._triggerEvent('loadend', true)
          return
        }

        this.readyState = XMLHttpRequest.DONE
        this._triggerEvent('readystatechange')
        this._triggerEvent('error', true)
        this._triggerEvent('loadend', true)
      })
  }

  abort(): void {
    this._aborted = true
    if (this.readyState !== XMLHttpRequest.UNSENT && this.readyState !== XMLHttpRequest.DONE) {
      this.readyState = XMLHttpRequest.UNSENT
      this._triggerEvent('abort', true)
      this._triggerEvent('loadend', true)
    }
  }

  setRequestHeader(name: string, value: string): void {
    if (this.readyState !== XMLHttpRequest.OPENED) {
      throw new Error('InvalidStateError: Object state must be OPENED')
    }
    this._requestHeaders.set(name.toLowerCase(), value)
  }

  getResponseHeader(name: string): string | null {
    return this._responseHeaders.get(name.toLowerCase()) || null
  }

  getAllResponseHeaders(): string {
    const headers: string[] = []
    for (const [key, value] of this._responseHeaders) {
      headers.push(`${key}: ${value}`)
    }
    return headers.join('\r\n')
  }

  overrideMimeType(_mime: string): void {
    // No-op in this implementation
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this._eventListeners.has(type)) {
      this._eventListeners.set(type, new Set())
    }
    this._eventListeners.get(type)!.add(listener)
  }

  removeEventListener(type: string, listener: EventListener): void {
    const listeners = this._eventListeners.get(type)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this._eventListeners.get(event.type)
    if (listeners) {
      for (const listener of listeners) {
        listener(event)
      }
    }

    // Call handler if exists
    const handler = (this as any)[`on${event.type}`]
    if (handler) {
      handler.call(this, event)
    }

    return true
  }

  private _triggerEvent(type: string, isProgressEvent = false): void {
    const event = isProgressEvent
      ? { type, lengthComputable: false, loaded: 0, total: 0 }
      : { type }

    this.dispatchEvent(event as any)
  }
}

/**
 * XMLHttpRequestUpload placeholder
 */
class XMLHttpRequestUpload {
  public onprogress: ((this: XMLHttpRequestUpload, ev: ProgressEvent) => any) | null = null
  public onload: ((this: XMLHttpRequestUpload, ev: ProgressEvent) => any) | null = null
  public onerror: ((this: XMLHttpRequestUpload, ev: ProgressEvent) => any) | null = null

  addEventListener(_type: string, _listener: EventListener): void {}
  removeEventListener(_type: string, _listener: EventListener): void {}
  dispatchEvent(_event: Event): boolean {
    return true
  }
}

type XMLHttpRequestBodyInit = Blob | BufferSource | FormData | URLSearchParams | string
type EventListener = (event: Event) => void

interface ProgressEvent extends Event {
  lengthComputable: boolean
  loaded: number
  total: number
}
