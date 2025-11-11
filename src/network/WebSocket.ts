/**
 * WebSocket implementation
 * Wraps Bun's native WebSocket for browser-like API
 */

export enum WebSocketReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

export class VeryHappyWebSocket {
  static readonly CONNECTING: number = WebSocketReadyState.CONNECTING
  static readonly OPEN: number = WebSocketReadyState.OPEN
  static readonly CLOSING: number = WebSocketReadyState.CLOSING
  static readonly CLOSED: number = WebSocketReadyState.CLOSED

  public readyState: WebSocketReadyState = WebSocketReadyState.CONNECTING
  public url: string
  public protocol = ''
  public extensions = ''
  public binaryType: 'blob' | 'arraybuffer' = 'blob'
  public bufferedAmount = 0

  // Event handlers
  public onopen: ((event: Event) => void) | null = null
  public onmessage: ((event: MessageEvent) => void) | null = null
  public onerror: ((event: Event) => void) | null = null
  public onclose: ((event: CloseEvent) => void) | null = null

  private _ws: WebSocket | null = null
  private _eventListeners = new Map<string, Set<EventListener>>()

  constructor(url: string, protocols?: string | string[]) {
    this.url = url

    // Connect using native WebSocket (browser or Bun)
    try {
      this._ws = new WebSocket(url, protocols)

      this._ws.addEventListener('open', (_event) => {
        this.readyState = WebSocketReadyState.OPEN
        this.dispatchEvent({ type: 'open' } as Event)
      })

      this._ws.addEventListener('message', (event: any) => {
        const messageEvent = {
          type: 'message',
          data: event.data,
          origin: this.url,
          lastEventId: '',
          source: null,
          ports: [],
        } as unknown as MessageEvent
        this.dispatchEvent(messageEvent)
      })

      this._ws.addEventListener('error', (_event) => {
        this.dispatchEvent({ type: 'error' } as Event)
      })

      this._ws.addEventListener('close', (event: any) => {
        this.readyState = WebSocketReadyState.CLOSED
        const closeEvent = {
          type: 'close',
          code: event.code || 1000,
          reason: event.reason || '',
          wasClean: event.wasClean !== false,
        } as CloseEvent
        this.dispatchEvent(closeEvent)
      })
    }
    catch {
      this.readyState = WebSocketReadyState.CLOSED
      setTimeout(() => {
        this.dispatchEvent({ type: 'error' } as Event)
      }, 0)
    }
  }

  send(data: string | ArrayBuffer | Blob): void {
    if (this.readyState !== WebSocketReadyState.OPEN) {
      throw new Error(`WebSocket is not open: readyState ${this.readyState}`)
    }

    if (this._ws) {
      if (data instanceof Blob) {
        // Convert Blob to ArrayBuffer
        data.arrayBuffer().then((buffer) => {
          this._ws?.send(buffer)
        })
      }
      else {
        this._ws.send(data as any)
      }
    }
  }

  close(code?: number, reason?: string): void {
    if (this.readyState === WebSocketReadyState.CLOSING || this.readyState === WebSocketReadyState.CLOSED) {
      return
    }

    this.readyState = WebSocketReadyState.CLOSING
    if (this._ws) {
      this._ws.close(code, reason)
    }
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

  dispatchEvent(event: Event | MessageEvent | CloseEvent): boolean {
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
}

type EventListener = (event: Event | MessageEvent | CloseEvent) => void

interface MessageEvent extends Event {
  data: any
  origin: string
  lastEventId: string
  source: any
  ports: any[]
}

interface CloseEvent extends Event {
  code: number
  reason: string
  wasClean: boolean
}
