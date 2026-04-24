/**
 * EventSource (Server-Sent Events)
 * Minimal fetch-backed implementation sufficient for tests that verify
 * streaming semantics. Reconnection + retry hint are honored; CORS is
 * trusted to Bun's fetch.
 */

import { VirtualEventTarget } from '../events/VirtualEventTarget'
import { MessageEvent, ErrorEvent } from '../events/EventClasses'
import { VirtualEvent } from '../events/VirtualEvent'

export interface EventSourceInit {
  withCredentials?: boolean
}

export class EventSource extends VirtualEventTarget {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSED = 2

  readonly CONNECTING = 0
  readonly OPEN = 1
  readonly CLOSED = 2

  readonly url: string
  readonly withCredentials: boolean
  readyState: number = EventSource.CONNECTING

  // eslint-disable-next-line pickier/no-unused-vars
  public onopen: ((event: Event) => void) | null = null
  // eslint-disable-next-line pickier/no-unused-vars
  public onmessage: ((event: MessageEvent) => void) | null = null
  // eslint-disable-next-line pickier/no-unused-vars
  public onerror: ((event: Event) => void) | null = null

  private _abort: AbortController
  private _reconnectTimeout = 3000
  private _lastEventId = ''
  private _closed = false

  constructor(url: string | URL, init: EventSourceInit = {}) {
    super()
    this.url = typeof url === 'string' ? url : url.href
    this.withCredentials = init.withCredentials === true
    this._abort = new AbortController()
    this._connect()
  }

  close(): void {
    this._closed = true
    this.readyState = EventSource.CLOSED
    this._abort.abort()
  }

  private async _connect(): Promise<void> {
    while (!this._closed) {
      try {
        const response = await globalThis.fetch(this.url, {
          signal: this._abort.signal,
          headers: {
            Accept: 'text/event-stream',
            ...(this._lastEventId ? { 'Last-Event-ID': this._lastEventId } : {}),
          },
          credentials: this.withCredentials ? 'include' : 'same-origin',
        } as RequestInit)

        if (!response.ok || !response.body) {
          this._fireError()
          return
        }

        this.readyState = EventSource.OPEN
        const openEvent = new VirtualEvent('open') as unknown as Event
        try { this.onopen?.(openEvent) }
        catch {}
        this.dispatchEvent(openEvent)

        await this._pump(response.body)
      }
      catch {
        if (this._closed)
          return
        this._fireError()
      }

      if (this._closed)
        return

      await new Promise(r => setTimeout(r, this._reconnectTimeout))
      this.readyState = EventSource.CONNECTING
    }
  }

  private async _pump(stream: ReadableStream<Uint8Array>): Promise<void> {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      while (!this._closed) {
        const { value, done } = await reader.read()
        if (done)
          return
        buffer += decoder.decode(value, { stream: true })
        let eolIdx: number
        // SSE frames are separated by a blank line (double newline)
        // eslint-disable-next-line no-cond-assign
        while ((eolIdx = buffer.indexOf('\n\n')) >= 0 || (eolIdx = buffer.indexOf('\r\n\r\n')) >= 0) {
          const sep = buffer[eolIdx + 1] === '\n' ? 4 : 2
          const frame = buffer.slice(0, eolIdx)
          buffer = buffer.slice(eolIdx + sep)
          this._dispatchFrame(frame)
        }
      }
    }
    finally {
      reader.releaseLock()
    }
  }

  private _dispatchFrame(frame: string): void {
    let eventName = 'message'
    const dataLines: string[] = []
    let id: string | undefined

    for (const rawLine of frame.split(/\r?\n/)) {
      if (!rawLine || rawLine.startsWith(':'))
        continue
      const colon = rawLine.indexOf(':')
      const field = colon === -1 ? rawLine : rawLine.slice(0, colon)
      let value = colon === -1 ? '' : rawLine.slice(colon + 1)
      if (value.startsWith(' '))
        value = value.slice(1)

      switch (field) {
        case 'event':
          eventName = value
          break
        case 'data':
          dataLines.push(value)
          break
        case 'id':
          id = value
          break
        case 'retry': {
          const ms = Number(value)
          if (Number.isFinite(ms))
            this._reconnectTimeout = ms
          break
        }
      }
    }

    if (id !== undefined)
      this._lastEventId = id

    if (dataLines.length === 0)
      return

    const event = new MessageEvent(eventName, {
      data: dataLines.join('\n'),
      lastEventId: this._lastEventId,
      origin: new URL(this.url, 'http://localhost').origin,
    } as MessageEventInit)

    if (eventName === 'message') {
      try { this.onmessage?.(event) }
      catch {}
    }
    this.dispatchEvent(event as unknown as Event)
  }

  private _fireError(): void {
    this.readyState = EventSource.CLOSED
    const event = new ErrorEvent('error') as unknown as Event
    try { this.onerror?.(event) }
    catch {}
    this.dispatchEvent(event)
  }
}
